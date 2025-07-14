"use client";

import { useState, useEffect, useCallback } from "react";
import { reportsAPI } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MapPin,
  CalendarDays,
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
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- IMPORTAÇÃO ESSENCIAL PARA ESTILIZAR O CALENDÁRIO ---
import "react-day-picker/dist/style.css";

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

type MonthlySale = {
  client_id: number;
  client_name: string;
  total_spent_in_month: number;
};

export function ClientAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);

  const [ltvData, setLtvData] = useState<any>(null);
  const [mrrData, setMrrData] = useState<any>(null);
  const [specialtyData, setSpecialtyData] = useState<any[]>([]);
  const [clientsByState, setClientsByState] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySale[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSalesLoading, setIsSalesLoading] = useState(false);

  const fetchAllReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ltv, mrr, specialty, byState] = await Promise.all([
        reportsAPI.getLtvAnalysis({ period: "all" }),
        reportsAPI.getContractsMrr(),
        reportsAPI.getClientSpecialtyAnalysis({ period: "all" }),
        reportsAPI.getClientsByState(),
      ]);
      setLtvData(ltv);
      setMrrData(mrr);
      setSpecialtyData(specialty || []);
      setClientsByState(byState || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMonthlySales = useCallback(async (date: Date) => {
    setIsSalesLoading(true);
    try {
      const monthString = format(date, "yyyy-MM");
      const sales = await reportsAPI.getMonthlySales(monthString);
      setMonthlySales(sales);
    } catch (error) {
      console.error("Erro ao carregar vendas do mês:", error);
    } finally {
      setIsSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllReports();
    fetchMonthlySales(selectedDate);
  }, [fetchAllReports, fetchMonthlySales, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg">Carregando análise de clientes...</p>
      </div>
    );
  }

  const totalSalesInMonth = monthlySales.reduce(
    (sum, sale) => sum + Number(sale.total_spent_in_month),
    0
  );

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
        <Button onClick={fetchAllReports} disabled={isLoading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Atualizar Métricas
        </Button>
      </div>

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
              {ltvData?.totalclients?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados na base
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
              {Number(ltvData?.averageltv || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio total por cliente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              MRR (Contratos)
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R${" "}
              {Number(mrrData?.current_mrr || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita recorrente de contratos ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue-calendar" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="revenue-calendar">
            Receita de Reservas
          </TabsTrigger>
          <TabsTrigger value="specialty">Análise por Especialidade</TabsTrigger>
          <TabsTrigger value="location">Análise por Localização</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue-calendar" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2 flex flex-col items-center justify-center p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(day) => day && setSelectedDate(day)}
                onMonthChange={(month) => fetchMonthlySales(month)}
                locale={ptBR}
                className="p-0"
              />
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  Vendas em{" "}
                  {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
                </CardTitle>
                <CardDescription>
                  Total vendido no mês:{" "}
                  <span className="font-bold text-primary">
                    R${" "}
                    {totalSalesInMonth.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSalesLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">
                          Valor Gasto
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySales.length > 0 ? (
                        monthlySales.map((sale) => (
                          <TableRow key={sale.client_id}>
                            <TableCell className="font-medium">
                              {sale.client_name}
                            </TableCell>
                            <TableCell className="text-right">
                              R${" "}
                              {Number(sale.total_spent_in_month).toLocaleString(
                                "pt-BR",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center h-24">
                            Nenhuma venda registrada para este mês.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="specialty" className="space-y-4 mt-4">
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
                    formatter={(value: number, name, props) => [
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
                    formatter={(value: number) => [
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

        <TabsContent value="location" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Clientes por Estado
              </CardTitle>
              <CardDescription>
                Distribuição geográfica dos seus clientes pelo Brasil.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={clientsByState}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [value, "Clientes"]} />
                  <Legend />
                  <Bar dataKey="clients" name="Nº de Clientes" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
