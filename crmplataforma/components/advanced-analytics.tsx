"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  Target,
  Brain,
  Zap,
} from "lucide-react";
import {
  analyticsEngine,
  type Prediction,
  type Insight,
} from "@/lib/analytics-engine";
import { db } from "@/lib/database";

export function AdvancedAnalytics() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateAnalytics();
  }, []);

  const generateAnalytics = () => {
    setIsLoading(true);

    // Obter dados do sistema
    const stats = db.getAdvancedStats();

    // Simular dados históricos (em produção, viria do banco)
    const historicalData = [
      { date: "2024-04-01", leads: 15, conversions: 3, revenue: 45000 },
      { date: "2024-04-08", leads: 18, conversions: 5, revenue: 67000 },
      { date: "2024-04-15", leads: 12, conversions: 4, revenue: 52000 },
      { date: "2024-04-22", leads: 22, conversions: 7, revenue: 89000 },
      { date: "2024-04-29", leads: 19, conversions: 6, revenue: 76000 },
    ];

    // Gerar previsões e insights
    const newPredictions = analyticsEngine.generatePredictions(
      stats,
      historicalData
    );
    const newInsights = analyticsEngine.generateInsights(stats, historicalData);

    setPredictions(newPredictions);
    setInsights(newInsights);
    setIsLoading(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "opportunity":
        return <Zap className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 animate-pulse" />
          <span>Analisando dados e gerando insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Analytics Avançado</h2>
            <p className="text-muted-foreground">
              Previsões e insights baseados em IA
            </p>
          </div>
        </div>
        <Button onClick={generateAnalytics} variant="outline">
          Atualizar Análise
        </Button>
      </div>

      {/* Previsões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Previsões para Próximo Período
          </CardTitle>
          <CardDescription>
            Projeções baseadas em análise de tendências e machine learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {predictions.map((prediction, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{prediction.metric}</h4>
                  {getTrendIcon(prediction.trend)}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Atual:</span>
                    <span>{prediction.currentValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Previsto:</span>
                    <span className="font-semibold">
                      {prediction.metric === "Receita"
                        ? `R$ ${prediction.predictedValue.toLocaleString()}`
                        : prediction.predictedValue.toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Confiança:</span>
                      <span>{(prediction.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={prediction.confidence * 100}
                      className="h-2"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {prediction.reasoning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Insights Automáticos
          </CardTitle>
          <CardDescription>
            Recomendações baseadas na análise dos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                      <Badge variant="outline">
                        Impacto: {insight.impact}/10
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>

                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="text-sm font-medium text-blue-900">
                        💡 Ação Recomendada:
                      </p>
                      <p className="text-sm text-blue-700">{insight.action}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle>Como as Previsões são Geradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold">Algoritmos Utilizados:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Regressão Linear para tendências
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Média móvel ponderada
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Análise de sazonalidade
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Detecção de correlações
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Fontes de Dados:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Histórico de leads e conversões
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Dados de receita e ticket médio
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Comportamento por funil
                </li>
                <li className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Benchmarks da indústria
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
