// crmapi/src/routes/reports.js
const express = require("express")
const pool = require("../config/database")
const { startOfMonth, endOfMonth, subMonths, format, subDays, subWeeks } = require("date-fns")

const router = express.Router()

// Helper para calcular a data de início com base no período
function getStartDate(periodValue) {
  let startDate = new Date(); // Inicia com a data atual
  
  if (periodValue === "all" || !periodValue) {
    // Para 'all', não aplicamos filtro de data
    return null;
  }

  const numericPeriod = Number.parseInt(periodValue);

  if (Number.isNaN(numericPeriod)) {
    // Fallback para strings como 'month', 'week', etc.
    switch(periodValue) {
      case 'month':
        return startOfMonth(subMonths(new Date(), 1));
      case 'week':
        return subWeeks(new Date(), 1);
      case 'day':
        return subDays(new Date(), 1);
      default:
        return null; // Fallback seguro
    }
  } else {
    // Se for um número (30, 90, 365, etc.)
    return subDays(startDate, numericPeriod);
  }
}

// =================================================================
// ROTAS PARA O DASHBOARD PRINCIPAL (RELATÓRIOS)
// =================================================================

// Estatísticas gerais
router.get("/stats", async (req, res, next) => {
  try {
    const { period = "30" } = req.query;
    const startDate = getStartDate(period);
    const params = [];
    let dateFilter = '';

    if (startDate) {
        dateFilter = `WHERE created_at >= $1`;
        params.push(startDate);
    }
    
    const userFilter = req.user.role !== "admin" ? `AND assigned_to = $${params.length + 1}` : "";
    if (req.user.role !== "admin") {
      params.push(req.user.id);
    }

    const [totalLeads, totalClients, totalPipelineValue, totalRevenue, avgPipelineTime, clientsNeedingReactivation] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM leads ${dateFilter ? dateFilter : 'WHERE 1=1'} ${userFilter}`, params),
        pool.query(`SELECT COUNT(*) as count FROM clients ${dateFilter ? dateFilter : 'WHERE 1=1'} ${userFilter}`, params),
        pool.query(`SELECT COALESCE(SUM(value), 0) as total FROM leads ${dateFilter ? dateFilter : 'WHERE 1=1'} ${userFilter}`, params),
        pool.query(`SELECT COALESCE(SUM(total_spent), 0) as total FROM clients ${dateFilter ? dateFilter : 'WHERE 1=1'} ${userFilter}`, params),
        pool.query(`SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days FROM leads ${dateFilter ? dateFilter.replace('created_at', 'updated_at') : 'WHERE 1=1'} ${userFilter}`, params),
        pool.query(`SELECT COUNT(*) as count FROM clients WHERE last_purchase < $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}`, req.user.role !== "admin" ? [subDays(new Date(), 60), req.user.id] : [subDays(new Date(), 60)]),
      ]);

    const totalLeadsCount = Number.parseInt(totalLeads.rows[0].count);
    const totalClientsCount = Number.parseInt(totalClients.rows[0].count);
    const conversionRate = totalLeadsCount > 0 ? (totalClientsCount / (totalLeadsCount + totalClientsCount)) * 100 : 0;

    res.json({
      totalLeads: totalLeadsCount,
      totalClients: totalClientsCount,
      totalPipelineValue: Number.parseFloat(totalPipelineValue.rows[0].total),
      totalRevenue: Number.parseFloat(totalRevenue.rows[0].total),
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgPipelineTime: Math.round(Number.parseFloat(avgPipelineTime.rows[0].avg_days) || 0),
      clientsNeedingReactivation: Number.parseInt(clientsNeedingReactivation.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
});

// Estatísticas por funil
router.get("/funnel-stats", async (req, res, next) => {
    try {
        const { period = "30" } = req.query;
        const startDate = getStartDate(period);
        let query = `SELECT funnel, stage, COUNT(*) as count, SUM(value) as total_value FROM leads WHERE created_at >= $1`;
        const params = [startDate];

        if (req.user.role !== "admin") {
            query += ` AND assigned_to = $2`;
            params.push(req.user.id);
        }
        query += ` GROUP BY funnel, stage ORDER BY funnel, stage`;
        const result = await pool.query(query, params);

        const funnelStats = {};
        result.rows.forEach((row) => {
            if (!funnelStats[row.funnel]) {
                funnelStats[row.funnel] = { count: 0, value: 0, stages: {} };
            }
            funnelStats[row.funnel].count += Number(row.count);
            funnelStats[row.funnel].value += Number(row.total_value) || 0;
            funnelStats[row.funnel].stages[row.stage] = {
                count: Number(row.count),
                value: Number(row.total_value) || 0
            };
        });
        res.json(funnelStats);
    } catch (error) {
        next(error);
    }
});

// Estatísticas por origem
router.get("/source-stats", async (req, res, next) => {
    try {
        const { period = "30" } = req.query;
        const startDate = getStartDate(period);
        let query = `SELECT source, COUNT(*) as count, SUM(value) as total_value FROM leads WHERE created_at >= $1`;
        const params = [startDate];
        if (req.user.role !== "admin") {
            query += ` AND assigned_to = $2`;
            params.push(req.user.id);
        }
        query += ` GROUP BY source ORDER BY count DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Conversões por mês
router.get("/conversions-by-month", async (req, res, next) => {
    try {
        const { months = "6" } = req.query;
        const startDate = subMonths(new Date(), Number(months));
        let query = `SELECT DATE_TRUNC('month', a.date) as month, COUNT(*) as conversions FROM activities a WHERE a.type = 'conversion' AND a.date >= $1`;
        const params = [startDate];
        if (req.user.role !== "admin") {
            query += ` AND a.user_id = $2`;
            params.push(req.user.id);
        }
        query += ` GROUP BY DATE_TRUNC('month', a.date) ORDER BY month ASC`;
        const result = await pool.query(query, params);
        const conversionsByMonth = {};
        result.rows.forEach(row => {
            conversionsByMonth[format(new Date(row.month), "yyyy-MM")] = Number(row.conversions);
        });
        res.json(conversionsByMonth);
    } catch (error) {
        next(error);
    }
});

// Performance por usuário
router.get("/user-performance", async (req, res, next) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Acesso restrito" });
        const { period = "30" } = req.query;
        const startDate = getStartDate(period);
        const result = await pool.query(`
            SELECT u.id, u.name, COUNT(CASE WHEN a.type = 'conversion' THEN 1 END) as conversions, COUNT(a.id) as total_activities,
                   CASE WHEN COUNT(a.id) > 0 THEN ROUND((COUNT(CASE WHEN a.type = 'conversion' THEN 1 END)::DECIMAL / COUNT(a.id)) * 100, 2) ELSE 0 END as efficiency_rate
            FROM users u LEFT JOIN activities a ON u.id = a.user_id AND a.date >= $1
            WHERE u.is_active = true GROUP BY u.id, u.name ORDER BY conversions DESC
        `, [startDate]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Relatório de leads por período
router.get("/leads-timeline", async (req, res, next) => {
  try {
    const { period = "week", limit = "10" } = req.query;
    let dateFormat;
    let startDate = new Date();

    switch (period) {
      case "day":
        dateFormat = "YYYY-MM-DD";
        startDate = subDays(startDate, Number.parseInt(limit));
        break;
      case "week":
        dateFormat = 'YYYY-"W"WW';
        startDate = subWeeks(startDate, Number.parseInt(limit));
        break;
      case "month":
        dateFormat = "YYYY-MM";
        startDate = subMonths(startDate, Number.parseInt(limit));
        break;
      default:
        dateFormat = "YYYY-MM-DD";
        startDate = subDays(startDate, Number.parseInt(limit));
    }
    let query = `SELECT TO_CHAR(created_at, '${dateFormat}') as period, COUNT(*) as leads, SUM(value) as total_value FROM leads WHERE created_at >= $1`;
    const params = [startDate];
    if (req.user.role !== "admin") {
      query += ` AND assigned_to = $2`;
      params.push(req.user.id);
    }
    query += ` GROUP BY TO_CHAR(created_at, '${dateFormat}') ORDER BY period DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows.map((row) => ({
        period: row.period,
        leads: Number.parseInt(row.leads),
        totalValue: Number.parseFloat(row.total_value) || 0,
    })));
  } catch (error) {
    next(error);
  }
});

// Leads por estado
router.get("/leads-by-state", async (req, res, next) => {
  try {
    let query = `SELECT state, COUNT(id) as count FROM leads WHERE state IS NOT NULL AND is_converted_client = FALSE AND is_standby = FALSE`;
    const params = [];
    if (req.user.role !== "admin") {
      query += ` AND assigned_to = $1`;
      params.push(req.user.id);
    }
    query += ` GROUP BY state ORDER BY count DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({ state: row.state, leads: Number.parseInt(row.count) })));
  } catch (error) {
    next(error);
  }
});

// Exportar dados para backup
router.get("/export", async (req, res, next) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Acesso restrito a administradores" });
        }
        const [leads, clients, activities, users, goals] = await Promise.all([
            pool.query("SELECT * FROM leads ORDER BY created_at DESC"),
            pool.query("SELECT * FROM clients ORDER BY created_at DESC"),
            pool.query("SELECT * FROM activities ORDER BY date DESC"),
            pool.query("SELECT id, name, email, role, permissions, is_active, created_at FROM users"),
            pool.query("SELECT * FROM goals ORDER BY created_at DESC"),
        ]);
        const exportData = {
            leads: leads.rows,
            clients: clients.rows,
            activities: activities.rows,
            users: users.rows,
            goals: goals.rows,
            exportDate: new Date().toISOString(),
            version: "1.0.0",
        };
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=fusionclinic-backup-${format(new Date(), "yyyy-MM-dd")}.json`);
        res.json(exportData);
    } catch (error) {
        next(error);
    }
});

// =====================================================================
// ROTAS PARA A TELA DE ANÁLISE DE CLIENTES
// =====================================================================

// Análise de Lifetime Value (LTV)
router.get("/ltv-analysis", async (req, res, next) => {
    try {
        const result = await pool.query(`SELECT COUNT(id) as totalClients, COALESCE(SUM(total_spent), 0) as totalLifetimeRevenue FROM clients`);
        const data = result.rows[0];
        const totalClients = Number(data.totalclients) || 0;
        const totalLifetimeRevenue = Number(data.totallifetimerevenue) || 0;
        const averageLTV = totalClients > 0 ? totalLifetimeRevenue / totalClients : 0;
        res.json({ totalClients, totalLifetimeRevenue, averageLTV });
    } catch (error) {
        next(error);
    }
});

// MRR (Receita Recorrente Mensal) de Contratos
router.get("/mrr-contracts", async (req, res, next) => {
    try {
        const query = `SELECT COALESCE(SUM(monthly_value), 0) as current_mrr FROM contracts WHERE status = 'ativo' AND CURRENT_DATE BETWEEN start_date AND end_date`;
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Vendas Mensais Detalhadas (para o calendário)
router.get("/monthly-sales", async (req, res, next) => {
    try {
        const { month } = req.query;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: "Formato de mês inválido. Use YYYY-MM." });
        }
        const startDate = `${month}-01`;
        const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().split('T')[0];
        const query = `
            SELECT
                a.client_id,
                c.name as client_name,
                SUM(CAST(regexp_replace(substring(a.description from 'R\\$\\s*([0-9.,]+)'), '[^0-9,]', '', 'g') AS NUMERIC)) as total_spent_in_month
            FROM activities a JOIN clients c ON a.client_id = c.id
            WHERE a.type = 'note' AND a.description LIKE 'Nova compra registrada no valor de R$%' AND a.date >= $1 AND a.date < $2
            GROUP BY a.client_id, c.name ORDER BY total_spent_in_month DESC;
        `;
        const result = await pool.query(query, [startDate, endDate]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Análise por Especialidade
router.get("/client-specialty-analysis", async (req, res, next) => {
    try {
        const result = await pool.query(`SELECT specialty, COUNT(id) as "totalClients", COALESCE(SUM(total_spent), 0) as "totalRevenue" FROM clients GROUP BY specialty ORDER BY "totalClients" DESC`);
        res.json(result.rows.map(row => ({ ...row, totalClients: Number(row.totalClients), totalRevenue: Number(row.totalRevenue) })));
    } catch (e) {
        next(e);
    }
});

// Clientes por Estado
router.get("/clients-by-state", async (req, res, next) => {
    try {
        const result = await pool.query(`SELECT state, COUNT(id) as clients FROM clients WHERE state IS NOT NULL AND state <> '' GROUP BY state ORDER BY clients DESC`);
        res.json(result.rows.map(r => ({ ...r, clients: Number(r.clients) })));
    } catch (e) {
        next(e);
    }
});

module.exports = router;