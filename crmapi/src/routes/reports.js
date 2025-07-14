// crmapi/src/routes/reports.js
const express = require("express")
const pool = require("../config/database")
const { startOfMonth, endOfMonth, subMonths, format, subDays, subWeeks } = require("date-fns")

const router = express.Router()

// Helper para calcular a data de início com base no período
function getStartDate(periodValue) {
  let startDate = new Date(); // Inicia com a data atual
  
  if (periodValue === "all") {
    // Para 'all', retorna uma data muito antiga para incluir tudo
    return new Date(0); // Epoch, 1970-01-01T00:00:00.000Z
  }

  const numericPeriod = Number.parseInt(periodValue);

  if (Number.isNaN(numericPeriod)) {
    // Fallback caso periodValue não seja um número (embora o frontend deva enviar números)
    switch(periodValue) {
      case 'month':
        return startOfMonth(subMonths(new Date(), 1));
      case 'week':
        return subWeeks(new Date(), 1);
      case 'day':
        return subDays(new Date(), 1);
      default:
        return new Date(0); // Fallback seguro
    }
  } else {
    // Se for um número (30, 90, 365, etc.)
    return subDays(startDate, numericPeriod);
  }
}


// Estatísticas gerais
router.get("/stats", async (req, res, next) => {
  try {
    const { period = "30" } = req.query;
    const startDate = getStartDate(period);

    const [totalLeads, totalClients, totalPipelineValue, totalRevenue, avgPipelineTime, clientsNeedingReactivation] =
      await Promise.all([
        pool.query(
          `
        SELECT COUNT(*) as count FROM leads 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),
        pool.query(
          `
        SELECT COUNT(*) as count FROM clients 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),
        pool.query(
          `
        SELECT COALESCE(SUM(value), 0) as total FROM leads 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),
        pool.query(
          `
        SELECT COALESCE(SUM(total_spent), 0) as total FROM clients 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),
        pool.query(
          `
        SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days FROM leads 
        WHERE updated_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),
        pool.query(
          `
        SELECT COUNT(*) as count FROM clients 
        WHERE last_purchase < $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin"
            ? [subDays(new Date(), 60), req.user.id]
            : [subDays(new Date(), 60)],
        ),
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

    if (req.user.role !== "admin") {
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

    if (req.user.role !== "admin") {
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

    let query = `
      SELECT 
        DATE_TRUNC('month', a.date) as month,
        COUNT(*) as conversions
      FROM activities a
    `

    const startDate = subMonths(new Date(), monthsBack);
    let params = [];
    let paramCount = 0;

    if (req.user.role !== "admin") {
      query += ` WHERE a.user_id = $${++paramCount} AND a.date >= $${++paramCount}`;
      params.push(req.user.id, startDate);
    } else {
      query += ` WHERE a.date >= $${++paramCount}`;
      params.push(startDate);
    }

    query += ` AND a.type = 'conversion'
      GROUP BY DATE_TRUNC('month', a.date)
      ORDER BY month DESC
    `;
    
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

// Performance por usuário (apenas admin)
router.get("/user-performance", async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores" })
    }

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

// Relatório de leads por período
router.get("/leads-timeline", async (req, res, next) => {
  try {
    const { period = "week", limit = "10" } = req.query

    let dateFormat
    let startDate = new Date();

    switch (period) {
      case "day":
        dateFormat = "YYYY-MM-DD"
        startDate = subDays(startDate, Number.parseInt(limit));
        break
      case "week":
        dateFormat = 'YYYY-"W"WW'
        startDate = subWeeks(startDate, Number.parseInt(limit));
        break
      case "month":
        dateFormat = "YYYY-MM"
        startDate = subMonths(startDate, Number.parseInt(limit));
        break
      default:
        dateFormat = "YYYY-MM-DD"
        startDate = subDays(startDate, Number.parseInt(limit));
    }

    let query = `
      SELECT 
        TO_CHAR(created_at, '${dateFormat}') as period,
        COUNT(*) as leads,
        SUM(value) as total_value
      FROM leads 
      WHERE created_at >= $1
    `
    const params = [startDate]

    if (req.user.role !== "admin") {
      query += ` AND assigned_to = $2`
      params.push(req.user.id)
    }

    query += ` GROUP BY TO_CHAR(created_at, '${dateFormat}') ORDER BY period DESC`

    const result = await pool.query(query, params)

    res.json(
      result.rows.map((row) => ({
        period: row.period,
        leads: Number.parseInt(row.leads),
        totalValue: Number.parseFloat(row.total_value) || 0,
      })),
    )
  } catch (error) {
    next(error)
  }
})


// ***** NOVAS ROTAS DE ANÁLISE DE CLIENTES *****

// Análise de clientes por especialidade
router.get("/client-specialty-analysis", async (req, res, next) => {
  try {
    const { period = "all" } = req.query;
    let dateFilter = '';
    const params = [];
    let paramCount = 0;

    const startDate = getStartDate(period);

    if (period !== "all") {
      paramCount++;
      dateFilter = ` AND c.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    // Permissão: Colaborador vê apenas seus clientes
    if (req.user.role !== "admin") {
      paramCount++;
      dateFilter += ` AND c.assigned_to = $${paramCount}`;
      params.push(req.user.id);
    }

    const result = await pool.query(
      `
      SELECT 
        specialty,
        COUNT(id) as total_clients,
        COALESCE(SUM(total_spent), 0) as total_revenue,
        COALESCE(AVG(total_spent), 0) as avg_revenue_per_client
      FROM clients c
      WHERE 1=1 ${dateFilter}
      GROUP BY specialty
      ORDER BY total_clients DESC
      `,
      params
    );

    res.json(result.rows.map(row => ({
      specialty: row.specialty,
      totalClients: Number.parseInt(row.total_clients),
      totalRevenue: Number.parseFloat(row.total_revenue),
      avgRevenuePerClient: Number.parseFloat(row.avg_revenue_per_client),
    })));

  } catch (error) {
    next(error);
  }
});


// Análise de Lifetime Value (LTV)
router.get("/ltv-analysis", async (req, res, next) => {
  try {
    const { period = "all" } = req.query;
    let dateFilter = '';
    const params = [];
    let paramCount = 0;

    const startDate = getStartDate(period);

    if (period !== "all") {
      paramCount++;
      dateFilter = ` AND c.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (req.user.role !== "admin") {
      paramCount++;
      dateFilter += ` AND c.assigned_to = $${paramCount}`;
      params.push(req.user.id);
    }

    const result = await pool.query(
      `
      SELECT 
        COUNT(id) as total_clients,
        COALESCE(SUM(total_spent), 0) as total_lifetime_revenue,
        AVG(EXTRACT(DAY FROM (CURRENT_DATE - entry_date))) as avg_client_days
      FROM clients c
      WHERE 1=1 ${dateFilter}
      `,
      params
    );

    const data = result.rows[0];
    const totalClients = Number.parseInt(data.total_clients) || 0;
    const totalLifetimeRevenue = Number.parseFloat(data.total_lifetime_revenue) || 0;
    const avgClientLifespanDays = Number.parseFloat(data.avg_client_days) || 0;

    let ltv = 0;
    if (totalClients > 0) {
      ltv = totalLifetimeRevenue / totalClients;
    }

    res.json({
      totalClients,
      totalLifetimeRevenue: totalLifetimeRevenue,
      averageLTV: ltv,
      avgClientLifespanDays: Math.round(avgClientLifespanDays),
    });

  } catch (error) {
    next(error);
  }
});


// Análise de Monthly Recurring Revenue (MRR)
router.get("/mrr-analysis", async (req, res, next) => {
  try {
    const { months = "12" } = req.query;
    const monthsBack = Number.parseInt(months);
    const startDate = subMonths(new Date(), monthsBack);

    let query = `
      SELECT 
        to_char(date_trunc('month', c.first_purchase_date), 'YYYY-MM') as month,
        SUM(c.total_spent) as monthly_revenue
      FROM clients c
      WHERE c.first_purchase_date IS NOT NULL
    `;
    const params = [];
    let paramCount = 0;

    if (req.user.role !== 'admin') {
      paramCount++;
      query += ` AND c.assigned_to = $${paramCount}`;
      params.push(req.user.id);
    }

    query += `
      GROUP BY date_trunc('month', c.first_purchase_date)
      ORDER BY month ASC
    `;

    const result = await pool.query(query, params);
    
    const monthlyRevenueMap = new Map();
    result.rows.forEach(row => {
        monthlyRevenueMap.set(row.month, parseFloat(row.monthly_revenue));
    });

    const monthlyDataArray = [];
    let totalRevenueSum = 0;
    for (let i = monthsBack -1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, "yyyy-MM");
        const revenueForMonth = monthlyRevenueMap.get(monthKey) || 0;
        monthlyDataArray.push({ month: monthKey, revenue: revenueForMonth });
        totalRevenueSum += revenueForMonth;
    }

    const averageMRR = monthsBack > 0 ? totalRevenueSum / monthsBack : 0;
    
    res.json({
      monthlyRevenue: monthlyDataArray,
      averageMRR: averageMRR,
      calculatedOverMonths: monthsBack,
    });

  } catch (error) {
    next(error);
  }
});


// Exportar dados para backup
router.get("/export", async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores" })
    }

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

router.get("/clients-by-state", async (req, res, next) => {
  try {
    let query = `
      SELECT 
        state,
        COUNT(id) as count
      FROM clients 
      WHERE state IS NOT NULL
    `;
    const params = [];
    let paramCount = 0;

    if (req.user.role !== "admin") {
      paramCount++;
      query += ` AND c.assigned_to = $${paramCount}`;
      params.push(req.user.id);
    }

    query += ` GROUP BY state ORDER BY count DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      state: row.state,
      clients: Number.parseInt(row.count)
    })));

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
    let paramCount = 0;

    if (req.user.role !== "admin") {
      paramCount++;
      query += ` AND assigned_to = $${paramCount}`;
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

router.get("/purchase-history", async (req, res, next) => {
  try {
    const query = `
      SELECT
        TO_CHAR(date_trunc('month', date), 'YYYY-MM') as month,
        SUM(
          COALESCE(
            (regexp_matches(description, 'R\\$ ([0-9,.]+)'))[1],
            '0'
          )::NUMERIC
        ) as total_value
      FROM activities
      WHERE type = 'note' AND description LIKE 'Nova compra registrada no valor de R$%'
      GROUP BY month
      ORDER BY month ASC;
    `;
    const result = await pool.query(query);

    res.json(result.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.total_value)
    })));


  } catch (error) {
    next(error);
  }
});

// ROTA NOVA: Retorna o MRR (Receita Mensal Recorrente) baseado em contratos ativos.
router.get("/mrr-contracts", async (req, res, next) => {
  try {
    let query = `
      SELECT COALESCE(SUM(monthly_value), 0) as current_mrr
      FROM contracts
      WHERE status = 'ativo' AND CURRENT_DATE BETWEEN start_date AND end_date
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.role !== 'gerente') {
      // Se for colaborador, pode ser necessário filtrar por clientes atribuídos a ele.
      // Esta lógica depende de como os contratos são atribuídos. Assumindo que o acesso é restrito.
      query += ` AND created_by = $1`;
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ROTA NOVA: Retorna as vendas detalhadas para um mês específico.
router.get("/monthly-sales", async (req, res, next) => {
  try {
    const { month } = req.query; // Formato esperado: 'YYYY-MM'

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Formato de mês inválido. Use YYYY-MM." });
    }

    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().split('T')[0];

    const query = `
      SELECT
        client_id,
        c.name as client_name,
        SUM(
            COALESCE(
                (regexp_matches(a.description, 'R\\$ ([0-9,.]+)'))[1],
                '0'
            )::NUMERIC
        ) as total_spent_in_month
      FROM activities a
      JOIN clients c ON a.client_id = c.id
      WHERE a.type = 'note'
        AND a.description LIKE 'Nova compra registrada no valor de R$%'
        AND a.date >= $1 AND a.date < $2
      GROUP BY a.client_id, c.name
      ORDER BY total_spent_in_month DESC;
    `;
    
    const result = await pool.query(query, [startDate, endDate]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router
