// Motor de análise e previsões

export interface TimeSeriesData {
  date: string
  leads: number
  conversions: number
  revenue: number
}

export interface Prediction {
  metric: string
  currentValue: number
  predictedValue: number
  confidence: number
  trend: "up" | "down" | "stable"
  reasoning: string
}

export interface Insight {
  type: "warning" | "opportunity" | "info" | "success"
  title: string
  description: string
  action: string
  priority: "high" | "medium" | "low"
  impact: number // 1-10
}

class AnalyticsEngine {
  // 1. ANÁLISE DE TENDÊNCIAS
  calculateTrend(data: number[]): { slope: number; direction: "up" | "down" | "stable" } {
    if (data.length < 2) return { slope: 0, direction: "stable" }

    // Regressão linear simples
    const n = data.length
    const x = Array.from({ length: n }, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = data.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((acc, xi, i) => acc + xi * data[i], 0)
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

    let direction: "up" | "down" | "stable" = "stable"
    if (Math.abs(slope) > 0.1) {
      direction = slope > 0 ? "up" : "down"
    }

    return { slope, direction }
  }

  // 2. PREVISÕES BASEADAS EM MÉDIA MÓVEL
  predictNextPeriod(historicalData: number[], periods = 1): number {
    if (historicalData.length === 0) return 0

    // Média móvel ponderada (últimos valores têm mais peso)
    const weights = historicalData.map((_, i) => i + 1)
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    const weightedAverage = historicalData.reduce((acc, value, i) => {
      return acc + (value * weights[i]) / totalWeight
    }, 0)

    // Aplicar tendência
    const trend = this.calculateTrend(historicalData)
    const trendAdjustment = trend.slope * periods

    return Math.max(0, Math.round(weightedAverage + trendAdjustment))
  }

  // 3. ANÁLISE DE SAZONALIDADE
  detectSeasonality(data: TimeSeriesData[]): { hasSeasonality: boolean; pattern: string } {
    if (data.length < 4) return { hasSeasonality: false, pattern: "insufficient_data" }

    const leads = data.map((d) => d.leads)
    const conversions = data.map((d) => d.conversions)

    // Detectar padrões semanais/mensais simples
    const avgLeads = leads.reduce((a, b) => a + b, 0) / leads.length
    const variance = leads.reduce((acc, val) => acc + Math.pow(val - avgLeads, 2), 0) / leads.length
    const coefficientOfVariation = Math.sqrt(variance) / avgLeads

    return {
      hasSeasonality: coefficientOfVariation > 0.2,
      pattern: coefficientOfVariation > 0.3 ? "high_variation" : "moderate_variation",
    }
  }

  // 4. GERAÇÃO DE INSIGHTS AUTOMÁTICOS
  generateInsights(stats: any, historicalData: TimeSeriesData[]): Insight[] {
    const insights: Insight[] = []

    // Insight 1: Clientes inativos
    if (stats.clientsNeedingReactivation > 0) {
      insights.push({
        type: "warning",
        title: "Clientes Precisam de Reativação",
        description: `${stats.clientsNeedingReactivation} clientes não fazem consultas há mais de 60 dias`,
        action: "Criar campanha de reengajamento com desconto especial",
        priority: "high",
        impact: 8,
      })
    }

    // Insight 2: Taxa de conversão
    if (stats.conversionRate > 30) {
      insights.push({
        type: "success",
        title: "Alta Taxa de Conversão",
        description: `Taxa de conversão de ${stats.conversionRate.toFixed(1)}% está acima da média`,
        action: "Aumentar investimento em marketing para capturar mais leads",
        priority: "medium",
        impact: 7,
      })
    } else if (stats.conversionRate < 15) {
      insights.push({
        type: "warning",
        title: "Taxa de Conversão Baixa",
        description: `Taxa de conversão de ${stats.conversionRate.toFixed(1)}% está abaixo do esperado`,
        action: "Revisar processo de qualificação de leads",
        priority: "high",
        impact: 9,
      })
    }

    // Insight 3: Tempo no pipeline
    if (stats.avgPipelineTime > 60) {
      insights.push({
        type: "warning",
        title: "Pipeline Lento",
        description: `Tempo médio de ${stats.avgPipelineTime} dias é muito alto`,
        action: "Automatizar etapas do processo de vendas",
        priority: "medium",
        impact: 6,
      })
    }

    // Insight 4: Análise de funil
    Object.entries(stats.funnelStats).forEach(([funnel, data]: [string, any]) => {
      const conversionRate = data.count > 0 ? (data.stages?.closing?.count || 0) / data.count : 0

      if (conversionRate > 0.4) {
        insights.push({
          type: "opportunity",
          title: `Funil ${funnel} Performando Bem`,
          description: `Taxa de conversão de ${(conversionRate * 100).toFixed(1)}% no funil ${funnel}`,
          action: "Replicar estratégias deste funil nos outros",
          priority: "low",
          impact: 5,
        })
      }
    })

    // Insight 5: Tendência de leads
    if (historicalData.length >= 3) {
      const recentLeads = historicalData.slice(-3).map((d) => d.leads)
      const trend = this.calculateTrend(recentLeads)

      if (trend.direction === "down" && Math.abs(trend.slope) > 2) {
        insights.push({
          type: "warning",
          title: "Queda na Geração de Leads",
          description: "Tendência de queda nos últimos períodos",
          action: "Revisar estratégias de marketing e captação",
          priority: "high",
          impact: 8,
        })
      }
    }

    return insights.sort((a, b) => {
      // Ordenar por prioridade e impacto
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] * b.impact - priorityOrder[a.priority] * a.impact
    })
  }

  // 5. PREVISÕES AVANÇADAS
  generatePredictions(stats: any, historicalData: TimeSeriesData[]): Prediction[] {
    const predictions: Prediction[] = []

    if (historicalData.length >= 3) {
      // Previsão de leads
      const leadsData = historicalData.map((d) => d.leads)
      const predictedLeads = this.predictNextPeriod(leadsData)
      const leadsTrend = this.calculateTrend(leadsData)

      predictions.push({
        metric: "Leads",
        currentValue: leadsData[leadsData.length - 1],
        predictedValue: predictedLeads,
        confidence: this.calculateConfidence(leadsData),
        trend: leadsTrend.direction,
        reasoning: `Baseado na tendência dos últimos ${leadsData.length} períodos`,
      })

      // Previsão de conversões
      const conversionsData = historicalData.map((d) => d.conversions)
      const predictedConversions = this.predictNextPeriod(conversionsData)
      const conversionsTrend = this.calculateTrend(conversionsData)

      predictions.push({
        metric: "Conversões",
        currentValue: conversionsData[conversionsData.length - 1],
        predictedValue: predictedConversions,
        confidence: this.calculateConfidence(conversionsData),
        trend: conversionsTrend.direction,
        reasoning: `Baseado no histórico de conversões e sazonalidade`,
      })

      // Previsão de receita
      const revenueData = historicalData.map((d) => d.revenue)
      const predictedRevenue = this.predictNextPeriod(revenueData)
      const revenueTrend = this.calculateTrend(revenueData)

      predictions.push({
        metric: "Receita",
        currentValue: revenueData[revenueData.length - 1],
        predictedValue: predictedRevenue,
        confidence: this.calculateConfidence(revenueData),
        trend: revenueTrend.direction,
        reasoning: `Projeção baseada no ticket médio e conversões esperadas`,
      })
    }

    return predictions
  }

  // 6. CÁLCULO DE CONFIANÇA
  private calculateConfidence(data: number[]): number {
    if (data.length < 3) return 0.3

    // Calcular variabilidade dos dados
    const mean = data.reduce((a, b) => a + b, 0) / data.length
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length
    const coefficientOfVariation = Math.sqrt(variance) / mean

    // Confiança inversamente proporcional à variabilidade
    const baseConfidence = Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation))

    // Ajustar pela quantidade de dados
    const dataBonus = Math.min(0.2, data.length * 0.05)

    return Math.min(0.95, baseConfidence + dataBonus)
  }

  // 7. ANÁLISE DE CORRELAÇÕES
  findCorrelations(stats: any): Array<{ factor: string; correlation: string; strength: number }> {
    const correlations = []

    // Correlação entre valor do lead e conversão
    if (stats.funnelStats) {
      Object.entries(stats.funnelStats).forEach(([funnel, data]: [string, any]) => {
        const avgValue = data.count > 0 ? data.value / data.count : 0
        const conversionRate = data.count > 0 ? (data.stages?.closing?.count || 0) / data.count : 0

        if (avgValue > 20000 && conversionRate > 0.3) {
          correlations.push({
            factor: `Leads de alto valor no funil ${funnel}`,
            correlation: "Maior taxa de conversão",
            strength: 0.7,
          })
        }
      })
    }

    return correlations
  }

  // 8. BENCHMARKING AUTOMÁTICO
  generateBenchmarks(
    stats: any,
  ): Array<{ metric: string; current: number; benchmark: number; status: "above" | "below" | "on_target" }> {
    // Benchmarks da indústria (podem vir de API externa)
    const industryBenchmarks = {
      conversionRate: 25, // 25%
      avgPipelineTime: 45, // 45 dias
      clientRetention: 80, // 80%
      responseTime: 24, // 24 horas
    }

    return [
      {
        metric: "Taxa de Conversão",
        current: stats.conversionRate,
        benchmark: industryBenchmarks.conversionRate,
        status: stats.conversionRate >= industryBenchmarks.conversionRate ? "above" : "below",
      },
      {
        metric: "Tempo no Pipeline",
        current: stats.avgPipelineTime,
        benchmark: industryBenchmarks.avgPipelineTime,
        status: stats.avgPipelineTime <= industryBenchmarks.avgPipelineTime ? "above" : "below",
      },
    ]
  }
}

export const analyticsEngine = new AnalyticsEngine()
