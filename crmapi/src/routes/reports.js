// crmapi/src/routes/reports.js
const express = require("express")
const pool = require("../config/database")
const { startOfMonth, endOfMonth, subMonths, format, subDays,parseISO,eachMonthOfInterval, subWeeks } = require("date-fns")
const { requireRole } = require("../middleware/auth"); // Importando o requireRole
const { ptBR } = require("date-fns/locale");

const router = express.Router()

// Helper para calcular a data de início com base no período
function getStartDate(periodValue) {
  let startDate = new Date();
  if (periodValue === "all") return new Date(0);
  const numericPeriod = parseInt(periodValue, 10);
  if (isNaN(numericPeriod)) return new Date(0);
  return subDays(startDate, numericPeriod);
}

// Estatísticas gerais
router.get("/stats", async (req, res, next) => {
  try {
    const { period = "30" } = req.query;
    const startDate = getStartDate(period);

    let permissionFilter = "";
    const params = [startDate];
    let paramIndex = 2;

    if (req.user.role === 'colaborador') {
        permissionFilter = `AND assigned_to = $${paramIndex++}`;
        params.push(req.user.id);
    }
    
    const [totalLeads, totalClients, totalPipelineValue, totalRevenue, avgPipelineTime, clientsNeedingReactivation] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM leads WHERE created_at >= $1 ${permissionFilter}`, params),
        pool.query(`SELECT COUNT(*) as count FROM clients WHERE created_at >= $1 ${permissionFilter}`, params),
        pool.query(`SELECT COALESCE(SUM(value), 0) as total FROM leads WHERE created_at >= $1 ${permissionFilter}`, params),
        pool.query(`SELECT COALESCE(SUM(total_spent), 0) as total FROM clients WHERE created_at >= $1 ${permissionFilter}`, params),
        pool.query(`SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days FROM leads WHERE updated_at >= $1 ${permissionFilter}`, params),
        pool.query(`SELECT COUNT(*) as count FROM clients WHERE last_purchase < $1 ${permissionFilter.replace('$2', `$${paramIndex}`)}`, [subDays(new Date(), 60), ...params.slice(1)]),
      ])

    const totalLeadsCount = Number.parseInt(totalLeads.rows[0].count)
    const totalClientsCount = Number.parseInt(totalClients.rows[0].count)
    const conversionRate = totalLeadsCount > 0 ? (totalClientsCount / (totalLeadsCount + totalClientsCount)) * 100 : 0

    res.json({
      totalLeads: totalLeadsCount,
      totalClients: totalClientsCount,
      totalPipelineValue: Number.parseFloat(totalPipelineValue.rows[0].total),
      totalRevenue: Number.parseFloat(totalRevenue.rows[0].total),
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgPipelineTime: Math.round(Number.parseFloat(avgPipelineTime.rows[0].avg_days) || 0),
      clientsNeedingReactivation: Number.parseInt(clientsNeedingReactivation.rows[0].count),
    })
  } catch (error) {
    next(error)
  }
})

// Estatísticas por funil
router.get("/funnel-stats", async (req, res, next) => {
  try {
    const { period = "30" } = req.query
    const startDate = getStartDate(period);

    let query = `
      SELECT 
        funnel,
        stage,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(value) as avg_value
      FROM leads 
      WHERE created_at >= $1
    `
    const params = [startDate]

    if (req.user.role === 'colaborador') {
      query += ` AND assigned_to = $2`
      params.push(req.user.id)
    }

    query += ` GROUP BY funnel, stage ORDER BY funnel, stage`

    const result = await pool.query(query, params)

    const funnelStats = {}
    result.rows.forEach((row) => {
      if (!funnelStats[row.funnel]) {
        funnelStats[row.funnel] = {
          count: 0,
          value: 0,
          stages: {},
        }
      }

      funnelStats[row.funnel].count += Number.parseInt(row.count)
      funnelStats[row.funnel].value += Number.parseFloat(row.total_value) || 0
      funnelStats[row.funnel].stages[row.stage] = {
        count: Number.parseInt(row.count),
        value: Number.parseFloat(row.total_value) || 0,
        avg_value: Number.parseFloat(row.avg_value) || 0,
      }
    })

    res.json(funnelStats)
  } catch (error) {
    next(error)
  }
})

// Estatísticas por origem
router.get("/source-stats", async (req, res, next) => {
  try {
    const { period = "30" } = req.query
    const startDate = getStartDate(period);

    let query = `
      SELECT 
        source,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(value) as avg_value
      FROM leads 
      WHERE created_at >= $1
    `
    const params = [startDate]

    if (req.user.role === 'colaborador') {
      query += ` AND assigned_to = $2`
      params.push(req.user.id)
    }

    query += ` GROUP BY source ORDER BY count DESC`

    const result = await pool.query(query, params)

    const sourceStats = {}
    result.rows.forEach((row) => {
      sourceStats[row.source] = {
        count: Number.parseInt(row.count),
        value: Number.parseFloat(row.total_value) || 0,
        avg_value: Number.parseFloat(row.avg_value) || 0,
      }
    })

    res.json(sourceStats)
  } catch (error) {
    next(error)
  }
})

// Conversões por mês
router.get("/conversions-by-month", async (req, res, next) => {
  try {
    const { months = "6" } = req.query
    const monthsBack = Number.parseInt(months)
    const startDate = subMonths(new Date(), monthsBack);
    
    let query = `
      SELECT 
        DATE_TRUNC('month', a.date) as month,
        COUNT(*) as conversions
      FROM activities a
      WHERE a.type = 'conversion' AND a.date >= $1
    `
    const params = [startDate];

    if (req.user.role === 'colaborador') {
      query += ` AND a.user_id = $2`;
      params.push(req.user.id);
    }
    
    query += ` GROUP BY DATE_TRUNC('month', a.date) ORDER BY month DESC`;
    
    const result = await pool.query(query, params)

    const conversionsByMonth = {}
    result.rows.forEach((row) => {
      const monthKey = format(new Date(row.month), "yyyy-MM")
      conversionsByMonth[monthKey] = Number.parseInt(row.conversions)
    })

    res.json(conversionsByMonth)
  } catch (error) {
    next(error)
  }
})

// Performance por usuário
router.get("/user-performance", requireRole(["admin", "gerente"]), async (req, res, next) => {
  try {
    const { period = "30" } = req.query
    const startDate = getStartDate(period);

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        COUNT(CASE WHEN a.type = 'conversion' THEN 1 END) as conversions,
        COUNT(a.id) as total_activities,
        CASE 
          WHEN COUNT(a.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN a.type = 'conversion' THEN 1 END)::DECIMAL / COUNT(a.id)) * 100, 2)
          ELSE 0 
        END as efficiency_rate
      FROM users u
      LEFT JOIN activities a ON u.id = a.user_id AND a.date >= $1
      WHERE u.is_active = true
      GROUP BY u.id, u.name
      ORDER BY conversions DESC
    `,
      [startDate],
    )

    const userPerformance = {}
    result.rows.forEach((row) => {
      userPerformance[row.id] = {
        name: row.name,
        conversions: Number.parseInt(row.conversions),
        totalActivities: Number.parseInt(row.total_activities),
        efficiencyRate: Number.parseFloat(row.efficiency_rate),
      }
    })

    res.json(userPerformance)
  } catch (error) {
    next(error)
  }
})

// ***** NOVAS ROTAS DE ANÁLISE DE CLIENTES (CORRIGIDAS) *****

// ROTA FINAL: LTV Analysis
router.get("/ltv-analysis", async (req, res, next) => {
  try {
    let query = "SELECT id, total_spent, entry_date FROM clients c";
    const params = [];

    if (req.user.role === 'colaborador') {
      query += ` WHERE c.assigned_to = $1`;
      params.push(req.user.id);
    }
    
    const { rows: clients } = await pool.query(query, params);
    const totalClients = clients.length;

    if (totalClients === 0) {
      return res.json({ totalClients: 0, totalLifetimeRevenue: 0, averageLTV: 0, avgClientLifespanDays: 0 });
    }

    const totalLifetimeRevenue = clients.reduce((sum, client) => sum + parseFloat(client.total_spent || '0'), 0);
    const totalDaysAsClient = clients.reduce((sum, client) => {
      const entry = new Date(client.entry_date);
      return sum + (new Date() - entry) / (1000 * 60 * 60 * 24);
    }, 0);

    const avgClientLifespanDays = totalClients > 0 ? totalDaysAsClient / totalClients : 0;
    const averageLTV = totalClients > 0 ? totalLifetimeRevenue / totalClients : 0;

    res.json({
      totalClients,
      totalLifetimeRevenue,
      averageLTV,
      avgClientLifespanDays: Math.round(avgClientLifespanDays),
    });
  } catch (error) {
    console.error("ERRO DETALHADO em /ltv-analysis:", error);
    next(error);
  }
});

// ROTA FINAL: MRR de Contratos
router.get("/mrr-contracts", async (req, res, next) => {
  try {
    let query = `
      SELECT COALESCE(SUM(monthly_value), 0) as current_mrr
      FROM contracts
      WHERE status = 'ativo' AND CURRENT_DATE BETWEEN start_date AND end_date
    `;
    const params = [];
    if (req.user.role === 'colaborador') {
      query += ` AND created_by = $1`;
      params.push(req.user.id);
    }
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ROTA FINAL: Análise por Especialidade
router.get("/client-specialty-analysis", async (req, res, next) => {
  try {
    let query = "SELECT specialty, COUNT(id) as total_clients, COALESCE(SUM(total_spent), 0) as total_revenue FROM clients c";
    const params = [];
    if (req.user.role === 'colaborador') {
      query += ` WHERE c.assigned_to = $1`;
      params.push(req.user.id);
    }
    query += " GROUP BY specialty ORDER BY total_revenue DESC";
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      specialty: row.specialty || 'Não especificada',
      totalClients: parseInt(row.total_clients, 10),
      totalRevenue: parseFloat(row.total_revenue),
    })));
  } catch (error) {
    next(error);
  }
});

// ROTA FINAL: Vendas mensais detalhadas
router.get("/monthly-sales", async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Formato de mês inválido. Use YYYY-MM." });
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().split('T')[0];
    let query = `
      SELECT a.client_id, c.name as client_name, a.date as purchase_date,
             COALESCE(substring(a.description from 'R\\$ *([0-9.,]+)')::NUMERIC, 0) as purchase_value
      FROM activities a JOIN clients c ON a.client_id = c.id
      WHERE a.type = 'note' AND a.description LIKE 'Nova compra registrada%' AND a.date >= $1 AND a.date < $2
    `;
    const params = [startDate, endDate];
    if (req.user.role === 'colaborador') {
      query += ` AND a.user_id = $3`;
      params.push(req.user.id);
    }
    query += ` ORDER BY a.date DESC;`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// ROTA FINAL: Histórico de compras para o gráfico
rrouter.get("/reservations-revenue-history", async (req, res, next) => {
  try {
    // CORREÇÃO: A extração do número agora preserva o ponto decimal.
    const query = `
      SELECT 
        TO_CHAR(date_trunc('month', date), 'YYYY-MM') as month, 
        SUM(COALESCE(substring(description from 'R\\$\\s*([0-9.]+)'), '0')::NUMERIC) as revenue 
      FROM activities 
      WHERE type = 'note' AND description LIKE 'Nova compra registrada%' 
      GROUP BY month 
      ORDER BY month ASC
    `;
    const { rows } = await pool.query(query);
    res.json(rows.map(row => ({
      month: format(parseISO(row.month + '-01'), "MMM/yy", { locale: ptBR }),
      revenue: parseFloat(row.revenue)
    })));
  } catch (error) {
    next(error);
  }
});


router.get("/mrr-history", async (req, res, next) => {
  try {
    const { rows: contracts } = await pool.query("SELECT start_date, end_date, monthly_value FROM contracts WHERE status = 'ativo'");
    if (contracts.length === 0) return res.json([]);

    const firstDate = new Date('2025-07-01'); // Início fixo em Julho de 2025
    const lastContractEndDate = new Date(Math.max(...contracts.map(c => new Date(c.end_date))));
    
    // O intervalo do gráfico vai de Julho de 2025 até a data final do último contrato
    const interval = eachMonthOfInterval({ start: firstDate, end: lastContractEndDate });

    const history = interval.map(monthDate => {
      const mrrForMonth = contracts.reduce((sum, contract) => {
        const start = startOfMonth(new Date(contract.start_date));
        const end = startOfMonth(new Date(contract.end_date));
        if (monthDate >= start && monthDate <= end) {
          return sum + parseFloat(contract.monthly_value);
        }
        return sum;
      }, 0);
      return {
        month: format(monthDate, "MMM/yy", { locale: ptBR }),
        mrr: mrrForMonth,
      };
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
});




// ROTA FINAL: Clientes por Estado
router.get("/clients-by-state", async (req, res, next) => {
  try {
    let query = "SELECT state, COUNT(id) as count FROM clients WHERE state IS NOT NULL AND state <> ''";
    const params = [];
    if (req.user.role === 'colaborador') {
      query += ` AND assigned_to = $1`;
      params.push(req.user.id);
    }
    query += ` GROUP BY state ORDER BY count DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({ state: row.state, clients: parseInt(row.count, 10) })));
  } catch (error) {
    next(error);
  }
});

// Leads por estado
router.get("/leads-by-state", async (req, res, next) => {
  try {
    let query = `
      SELECT 
        state,
        COUNT(id) as count
      FROM leads 
      WHERE state IS NOT NULL AND is_converted_client = FALSE AND is_standby = FALSE
    `;
    const params = [];

    if (req.user.role !== "admin") {
      query += ` AND assigned_to = $1`;
      params.push(req.user.id);
    }

    query += ` GROUP BY state ORDER BY count DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      state: row.state,
      leads: Number.parseInt(row.count)
    })));
  } catch (error) {
    next(error);
  }
});

// Exportar dados para backup
router.get("/export", requireRole(["admin"]), async (req, res, next) => {
  try {
    const [leads, clients, activities, users, goals] = await Promise.all([
      pool.query("SELECT * FROM leads ORDER BY created_at DESC"),
      pool.query("SELECT * FROM clients ORDER BY created_at DESC"),
      pool.query("SELECT * FROM activities ORDER BY date DESC"),
      pool.query("SELECT id, name, email, role, permissions, is_active, created_at FROM users"),
      pool.query("SELECT * FROM goals ORDER BY created_at DESC"),
    ])

    const exportData = {
      leads: leads.rows,
      clients: clients.rows,
      activities: activities.rows,
      users: users.rows,
      goals: goals.rows,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    }

    res.setHeader("Content-Type", "application/json")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=fusionclinic-backup-${format(new Date(), "yyyy-MM-dd")}.json`,
    )
    res.json(exportData)
  } catch (error) {
    next(error)
  }
});

module.exports = router;