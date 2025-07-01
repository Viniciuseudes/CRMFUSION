"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { reportsAPI } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  BarChart2,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

export function ReportsDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("30");
  const [isLoading, setIsLoading] = useState(true);

  // States for each report type
  const [stats, setStats] = useState<any>(null);
  const [funnelStats, setFunnelStats] = useState<any>(null);
  const [sourceStats, setSourceStats] = useState<any>(null);
  const [userPerformance, setUserPerformance] = useState<any>(null);
  const [conversionsByMonth, setConversionsByMonth] = useState<any[]>([]);
  const [leadsByState, setLeadsByState] = useState<any[]>([]);

  const fetchReports = useCallback(
    async (currentPeriod: string) => {
      setIsLoading(true);
      try {
        const promises: Promise<any>[] = [
          reportsAPI.getStats({ period: currentPeriod }),
          reportsAPI.getFunnelStats({ period: currentPeriod }),
          reportsAPI.getSourceStats({ period: currentPeriod }),
          reportsAPI.getConversionsByMonth(),
          reportsAPI.getLeadsByState(),
        ];

        if (user?.role === "admin") {
          promises.push(
            reportsAPI.getUserPerformance({ period: currentPeriod })
          );
        }

        const results = await Promise.allSettled(promises);

        if (results[0].status === "fulfilled") setStats(results[0].value);
        if (results[1].status === "fulfilled") setFunnelStats(results[1].value);
        if (results[2].status === "fulfilled") setSourceStats(results[2].value);
        if (results[3].status === "fulfilled") {
          const formattedConversions = Object.entries(results[3].value).map(
            ([month, count]) => ({
              month: format(parseISO(`${month}-01`), "MMM/yy", {
                locale: ptBR,
              }),
              conversões: count,
            })
          );
          setConversionsByMonth(formattedConversions);
        }
        if (results[4].status === "fulfilled")
          setLeadsByState(results[4].value);
        if (user?.role === "admin" && results[5]?.status === "fulfilled") {
          setUserPerformance(results[5].value);
        }
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.role]
  );

  useEffect(() => {
    fetchReports(period);
  }, [period, fetchReports]);

  const funnelChartData = funnelStats
    ? Object.keys(funnelStats).map((key) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        Leads: funnelStats[key].count,
        Valor: funnelStats[key].value,
      }))
    : [];

  const sourceChartData = sourceStats
    ? Object.entries(sourceStats).map(([key, value]: [string, any]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        Leads: value.count,
        Valor: value.value,
      }))
    : [];

  const performanceChartData = userPerformance
    ? Object.values(userPerformance).map((u: any) => ({
        name: u.name,
        Conversões: u.conversions,
        Atividades: u.totalActivities,
        Eficiência: parseFloat(u.efficiencyRate),
      }))
    : [];

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada do seu pipeline de vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="funnel">Análise de Funil</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="performance">Performance</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                  +15.2% vs. período anterior
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
                  +3.2% vs. período anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tempo Médio Pipeline
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.avgPipelineTime || 0} dias
                </div>
                <p className="text-xs text-muted-foreground">
                  -5 dias vs. período anterior
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Clientes para Reativar
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.clientsNeedingReactivation || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sem compras há {">"}60 dias
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Conversões Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={conversionsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="conversões"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Leads por Estado
              </CardTitle>
              <CardDescription>
                Distribuição dos leads ativos por estado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={leadsByState}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, "Leads"]} />
                  <Legend />
                  <Bar dataKey="leads" fill="#8884d8" name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leads por Funil</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={funnelChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip
                    formatter={(value: number) => value.toLocaleString("pt-BR")}
                  />
                  <Legend />
                  <Bar dataKey="Leads" fill="#3b82f6" />
                  <Bar dataKey="Valor" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leads por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    dataKey="Leads"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    label={(props) => `${props.name}: ${props.value}`}
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
        </TabsContent>

        {user?.role === "admin" && (
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance da Equipe</CardTitle>
                <CardDescription>
                  Análise de conversões e atividades por membro da equipe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Conversões" fill="#8884d8" />
                    <Bar dataKey="Atividades" fill="#82ca9d" />
                    <Bar dataKey="Eficiência" fill="#ffc658" unit="%" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
