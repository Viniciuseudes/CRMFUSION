// crmplataforma/components/client-analytics-dashboard.tsx
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
  RefreshCw,
  Users,
  DollarSign,
  Clock,
  Loader2,
  PieChartIcon,
  LineChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#6b7280",
  "#22d3ee",
  "#f97316",
];

export function ClientAnalyticsDashboard() {
  const [period, setPeriod] = useState("all"); // 'all', '90', '180', '365'
  const [isLoading, setIsLoading] = useState(true);

  // States para os dados dos relatórios
  const [specialtyData, setSpecialtyData] = useState<any[]>([]);
  const [ltvData, setLtvData] = useState<any>(null);
  const [mrrData, setMrrData] = useState<any>(null);

  const fetchClientReports = useCallback(async (currentPeriod: string) => {
    setIsLoading(true);
    try {
      // Determine the 'months' parameter for MRR based on the selected period
      let mrrMonths: string;
      if (currentPeriod === "all") {
        mrrMonths = "12"; // Default to 12 months for 'all'
      } else {
        // Convert days to months, rounding up to ensure full periods are covered
        mrrMonths = Math.ceil(Number(currentPeriod) / 30).toString();
      }

      const promises = [
        reportsAPI.getClientSpecialtyAnalysis({ period: currentPeriod }),
        reportsAPI.getLtvAnalysis({ period: currentPeriod }),
        reportsAPI.getMrrAnalysis({ months: mrrMonths }), // Pass calculated months
      ];

      const [specialtyRes, ltvRes, mrrRes] = await Promise.all(promises);

      setSpecialtyData(specialtyRes || []);
      setLtvData(ltvRes);
      setMrrData(mrrRes);
    } catch (error) {
      console.error("Erro ao carregar relatórios de clientes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientReports(period);
  }, [period, fetchClientReports]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg">Carregando análise de clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Análise de Clientes
          </h1>
          <p className="text-muted-foreground">
            Entenda o perfil e o valor dos seus clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar período..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="365">Últimos 365 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => fetchClientReports(period)}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="overview">Métricas Chave</TabsTrigger>
          <TabsTrigger value="specialty">Por Especialidade</TabsTrigger>
          <TabsTrigger value="revenue-trends">
            Receita e Recorrência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Clientes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ltvData?.totalClients?.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Clientes ativos neste período
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R${" "}
                  {ltvData?.averageLTV?.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0,00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor médio vitalício por cliente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MRR Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R${" "}
                  {mrrData?.averageMRR?.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0,00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receita Média Recorrente (últimos{" "}
                  {mrrData?.calculatedOverMonths || 0} meses)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receita Total por Período</CardTitle>
              <CardDescription>
                Soma da receita total gerada pelos clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: "Receita",
                      value: ltvData?.totalLifetimeRevenue || 0,
                    },
                  ]}
                >
                  <XAxis dataKey="name" />
                  <YAxis
                    tickFormatter={(value) =>
                      `R$ ${value.toLocaleString("pt-BR")}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      `R$ ${value.toLocaleString("pt-BR")}`,
                      "Receita Total",
                    ]}
                  />
                  <Bar dataKey="value" fill={COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes por Especialidade</CardTitle>
              <CardDescription>
                Distribuição de clientes e receita por especialidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={specialtyData}
                    dataKey="totalClients"
                    nameKey="specialty"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ specialty, totalClients, percent }) =>
                      `${specialty} (${totalClients}) ${(percent * 100).toFixed(
                        0
                      )}%`
                    }
                    fill="#8884d8"
                  >
                    {specialtyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} clientes`,
                      props.payload.specialty,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receita por Especialidade</CardTitle>
              <CardDescription>
                Total de receita gerada por cada especialidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={specialtyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="specialty" />
                  <YAxis
                    tickFormatter={(value) =>
                      `R$ ${value.toLocaleString("pt-BR")}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      `R$ ${value.toLocaleString("pt-BR")}`,
                      "Receita Total",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill={COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue-trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MRR Mensal (Receita Média Recorrente)</CardTitle>
              <CardDescription>
                Variação mensal da receita recorrente.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mrrData?.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) =>
                      format(parseISO(`${value}-01`), "MMM/yy", {
                        locale: ptBR,
                      })
                    }
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      `R$ ${value.toLocaleString("pt-BR")}`
                    }
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString("pt-BR")}`,
                      "Receita",
                    ]}
                    labelFormatter={(label) =>
                      format(parseISO(`${label}-01`), "MMMM yyyy", {
                        locale: ptBR,
                      })
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS[2]}
                    strokeWidth={2}
                    name="Receita Mensal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 Especialidades por Receita</CardTitle>
              <CardDescription>
                As especialidades que mais geraram receita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Total Clientes</TableHead>
                    <TableHead>Receita Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialtyData
                    .sort((a, b) => b.totalRevenue - a.totalRevenue)
                    .slice(0, 5)
                    .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.specialty}
                        </TableCell>
                        <TableCell>{item.totalClients}</TableCell>
                        <TableCell>
                          R${" "}
                          {item.totalRevenue.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
