"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/auth-context";
import {
  reportsAPI,
  leadsAPI,
  activitiesAPI,
  goalsAPI,
  type Lead,
  type Activity,
  type Goal,
} from "@/lib/api-client";
import {
  Users,
  UserPlus,
  TrendingUp,
  DollarSign,
  Target,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  FileText,
  Loader2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid, // <-- IMPORTAÇÃO CORRIGIDA
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Legend,
  Area,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Cores para os gráficos
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

interface GoalWithProgress extends Goal {
  progress?: number;
  current?: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [funnelStats, setFunnelStats] = useState<any>(null);
  const [sourceStats, setSourceStats] = useState<any>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        statsData,
        leadsData,
        activitiesData,
        funnelData,
        sourceData,
        goalsData,
      ] = await Promise.all([
        reportsAPI.getStats({ period: "month" }),
        leadsAPI.getAll(),
        activitiesAPI.getAll({ limit: 5 } as any), // Cast to any to avoid type error if getAll doesn't expect args
        reportsAPI.getFunnelStats({ period: "month" }),
        reportsAPI.getSourceStats({ period: "month" }),
        goalsAPI.getAll({ limit: 5, is_active: true } as any), // Cast to any
      ]);

      setStats(statsData);
      setLeads(leadsData.leads || []);
      setActivities(activitiesData.activities || []);
      setFunnelStats(funnelData);
      setSourceStats(sourceData);

      // Buscar progresso de cada meta
      const goalsWithProgress = await Promise.all(
        (goalsData.goals || []).map(async (goal: Goal) => {
          try {
            const progressData = await goalsAPI.getProgress(goal.id);
            return { ...goal, ...progressData };
          } catch (e) {
            return { ...goal, progress: 0, current: 0 }; // Lidar com erro
          }
        })
      );
      setGoals(goalsWithProgress);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Preparando dados para os gráficos
  const funnelChartData = funnelStats
    ? Object.keys(funnelStats).map((key) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        Leads: funnelStats[key].count,
        Valor: funnelStats[key].value,
      }))
    : [];

  const sourceChartData = sourceStats
    ? Object.keys(sourceStats).map((key) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        Leads: sourceStats[key].count,
      }))
    : [];

  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4 text-blue-500" />;
      case "email":
        return <Mail className="h-4 w-4 text-orange-500" />;
      case "meeting":
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case "conversion":
        return <UserCheck className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, {user?.name}! Aqui está um resumo do seu CRM.
          </p>
        </div>
        <Button onClick={loadDashboardData} disabled={isLoading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Atualizar Dados
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pipeline Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.totalPipelineValue?.toLocaleString("pt-BR") || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              +15.2% vs. mês passado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Leads
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12.1% vs. mês passado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.conversionRate?.toFixed(1) || "0"}%
            </div>
            <p className="text-xs text-muted-foreground">
              +2.1% vs. mês passado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Médio no Pipeline
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgPipelineTime || 0} dias
            </div>
            <p className="text-xs text-muted-foreground">
              -5 dias vs. mês passado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Performance do Funil</CardTitle>
            <CardDescription>
              Quantidade de leads e valor por funil.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#3b82f6"
                  label={{ value: "Leads", angle: -90, position: "insideLeft" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  label={{
                    value: "Valor (R$)",
                    angle: -90,
                    position: "insideRight",
                  }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "Valor"
                      ? `R$ ${value.toLocaleString("pt-BR")}`
                      : value,
                    name,
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="Leads" fill="#3b82f6" />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="Valor"
                  fill="#10b981"
                  stroke="#10b981"
                  fillOpacity={0.3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Origem dos Leads</CardTitle>
            <CardDescription>Distribuição de leads por canal.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="Leads"
                >
                  {sourceChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Leads"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metas e Atividades */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Progresso das Metas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length > 0 ? (
              goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="font-medium">{goal.title}</span>
                    <span className="text-muted-foreground">
                      {goal.current?.toLocaleString("pt-BR") || 0} /{" "}
                      {goal.target.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Progress value={goal.progress || 0} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma meta ativa no momento.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              Ações Recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 shrink-0"></div>
              <div>
                <p className="text-sm font-medium">
                  {
                    leads.filter(
                      (l) =>
                        (new Date().getTime() -
                          new Date(l.updated_at).getTime()) /
                          (1000 * 3600 * 24) >
                        7
                    ).length
                  }{" "}
                  leads parados
                </p>
                <p className="text-xs text-muted-foreground">
                  Contate leads sem interação há mais de 7 dias.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 shrink-0"></div>
              <div>
                <p className="text-sm font-medium">
                  {stats?.clientsNeedingReactivation || 0} clientes para
                  reativar
                </p>
                <p className="text-xs text-muted-foreground">
                  Última compra há mais de 60 dias.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
              <div>
                <p className="text-sm font-medium">
                  Verificar novas atividades
                </p>
                <p className="text-xs text-muted-foreground">
                  Novas interações podem precisar de sua atenção.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Últimas ações realizadas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.user_name || "Sistema"}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(activity.date), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
