const express = require("express")
const pool = require("../config/database")
const { startOfMonth, endOfMonth, subMonths, format } = require("date-fns")

const router = express.Router()

// Estatísticas gerais
router.get("/stats", async (req, res, next) => {
  try {
    const { period = "30" } = req.query
    const days = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Estatísticas básicas
    const [totalLeads, totalClients, totalPipelineValue, totalRevenue, avgPipelineTime, clientsNeedingReactivation] =
      await Promise.all([
        // Total de leads
        pool.query(
          `
        SELECT COUNT(*) as count FROM leads 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),

        // Total de clientes
        pool.query(
          `
        SELECT COUNT(*) as count FROM clients 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),

        // Valor total do pipeline
        pool.query(
          `
        SELECT COALESCE(SUM(value), 0) as total FROM leads 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),

        // Receita total
        pool.query(
          `
        SELECT COALESCE(SUM(total_spent), 0) as total FROM clients 
        WHERE created_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),

        // Tempo médio no pipeline
        pool.query(
          `
        SELECT AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_days FROM leads 
        WHERE updated_at >= $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin" ? [startDate, req.user.id] : [startDate],
        ),

        // Clientes precisando reativação
        pool.query(
          `
        SELECT COUNT(*) as count FROM clients 
        WHERE last_purchase < $1 ${req.user.role !== "admin" ? "AND assigned_to = $2" : ""}
      `,
          req.user.role !== "admin"
            ? [new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), req.user.id]
            : [new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)],
        ),
      ])

    // Calcular taxa de conversão
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
    const days = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

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

    // Organizar dados por funil
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
    const days = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

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

    // Organizar dados por origem
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

    if (req.user.role !== "admin") {
      query += ` WHERE a.user_id = $1 AND`
    } else {
      query += ` WHERE`
    }

    query += ` a.type = 'conversion' AND a.date >= $${req.user.role !== "admin" ? "2" : "1"}
      GROUP BY DATE_TRUNC('month', a.date)
      ORDER BY month DESC
    `

    const startDate = subMonths(new Date(), monthsBack)
    const params = req.user.role !== "admin" ? [req.user.id, startDate] : [startDate]

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
    const days = Number.parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

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
    const startDate = new Date()

    switch (period) {
      case "day":
        dateFormat = "YYYY-MM-DD"
        startDate.setDate(startDate.getDate() - Number.parseInt(limit))
        break
      case "week":
        dateFormat = 'YYYY-"W"WW'
        startDate.setDate(startDate.getDate() - Number.parseInt(limit) * 7)
        break
      case "month":
        dateFormat = "YYYY-MM"
        startDate.setMonth(startDate.getMonth() - Number.parseInt(limit))
        break
      default:
        dateFormat = "YYYY-MM-DD"
        startDate.setDate(startDate.getDate() - Number.parseInt(limit))
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
})

module.exports = router
