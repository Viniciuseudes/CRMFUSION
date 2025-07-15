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
  BarChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
];

type Purchase = {
  client_id: number;
  client_name: string;
  purchase_date: string;
  purchase_value: number;
};

export function ClientAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Estados para cada dado, inicializados como nulos/vazios
  const [ltvData, setLtvData] = useState<any>(null);
  const [mrrData, setMrrData] = useState<any>(null);
  const [specialtyData, setSpecialtyData] = useState<any[]>([]);
  const [clientsByState, setClientsByState] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<
    { month: string; revenue: number }[]
  >([]);
  const [purchasesInMonth, setPurchasesInMonth] = useState<Purchase[]>([]);
  const [displayedSales, setDisplayedSales] = useState<Purchase[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [isSalesLoading, setIsSalesLoading] = useState(false);

  // Função para buscar as vendas de um mês específico
  const fetchPurchasesForMonth = useCallback(async (date: Date) => {
    setIsSalesLoading(true);
    try {
      const monthString = format(date, "yyyy-MM");
      const sales = await reportsAPI.getMonthlySales(monthString);
      setPurchasesInMonth(sales || []);
    } catch (error) {
      console.error("Erro ao carregar vendas do mês:", error);
      setPurchasesInMonth([]);
    } finally {
      setIsSalesLoading(false);
    }
  }, []);

  // Função principal que carrega todos os dados do dashboard de forma resiliente
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);

    // CORREÇÃO: Usando Promise.allSettled para que uma falha não impeça as outras
    const results = await Promise.allSettled([
      reportsAPI.getLtvAnalysis({ period: "all" }),
      reportsAPI.getContractsMrr(),
      reportsAPI.getClientSpecialtyAnalysis({ period: "all" }),
      reportsAPI.getClientsByState(),
      reportsAPI.getPurchaseHistoryByMonth(),
    ]);

    // Verificando o resultado de cada promessa individualmente
    if (results[0].status === "fulfilled") {
      setLtvData(results[0].value);
    } else {
      console.error("Falha ao buscar dados de LTV:", results[0].reason);
      toast({
        title: "Erro ao buscar LTV",
        description: "Não foi possível carregar os dados de LTV.",
        variant: "destructive",
      });
    }

    if (results[1].status === "fulfilled") {
      setMrrData(results[1].value);
    } else {
      console.error("Falha ao buscar dados de MRR:", results[1].reason);
    }

    if (results[2].status === "fulfilled") {
      setSpecialtyData(results[2].value || []);
    } else {
      console.error(
        "Falha ao buscar dados de especialidade:",
        results[2].reason
      );
    }

    if (results[3].status === "fulfilled") {
      setClientsByState(results[3].value || []);
    } else {
      console.error("Falha ao buscar dados de localização:", results[3].reason);
    }

    if (results[4].status === "fulfilled") {
      setPurchaseHistory(results[4].value || []);
    } else {
      console.error("Falha ao buscar histórico de compras:", results[4].reason);
    }

    await fetchPurchasesForMonth(selectedDate);
    setIsLoading(false);
  }, [fetchPurchasesForMonth, selectedDate, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Efeito para rebuscar as vendas quando o mês do calendário muda
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchPurchasesForMonth(selectedDate);
    }, 100);
    return () => clearTimeout(handler);
  }, [
    selectedDate.getMonth(),
    selectedDate.getFullYear(),
    fetchPurchasesForMonth,
  ]);

  // Efeito para filtrar as vendas a serem exibidas
  useEffect(() => {
    if (viewMode === "month") {
      setDisplayedSales(purchasesInMonth);
    } else {
      const dailySales = purchasesInMonth.filter((p) =>
        isSameDay(parseISO(p.purchase_date), selectedDate)
      );
      setDisplayedSales(dailySales);
    }
  }, [viewMode, purchasesInMonth, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalDisplayedSales = displayedSales.reduce(
    (sum, sale) => sum + Number(sale.purchase_value),
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
        <Button onClick={loadDashboardData} disabled={isLoading}>
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
              {ltvData?.totalClients?.toLocaleString("pt-BR") || "0"}
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
              {Number(ltvData?.averageLTV || 0).toLocaleString("pt-BR", {
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
        <TabsContent value="revenue-calendar" className="mt-4 space-y-4">
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardContent className="p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(day) => {
                    if (day) {
                      setSelectedDate(day);
                      setViewMode("day");
                    }
                  }}
                  onMonthChange={setSelectedDate}
                  locale={ptBR}
                  className="p-0"
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      Vendas em{" "}
                      {viewMode === "day"
                        ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                        : format(selectedDate, "MMMM yyyy", { locale: ptBR })}
                    </CardTitle>
                    <CardDescription>
                      Total vendido:{" "}
                      <span className="font-bold text-primary">
                        R${" "}
                        {totalDisplayedSales.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewMode(viewMode === "day" ? "month" : "day")
                    }
                  >
                    {viewMode === "day"
                      ? "Ver Mês Inteiro"
                      : "Ver Dia Selecionado"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] overflow-y-auto">
                  {isSalesLoading ? (
                    <div className="flex justify-center items-center h-full">
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
                        {displayedSales.length > 0 ? (
                          displayedSales.map((sale, index) => (
                            <TableRow key={`${sale.client_id}-${index}`}>
                              <TableCell className="font-medium">
                                {sale.client_name}
                              </TableCell>
                              <TableCell className="text-right">
                                R${" "}
                                {Number(sale.purchase_value).toLocaleString(
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
                              Nenhuma venda registrada para{" "}
                              {viewMode === "day" ? "este dia" : "este mês"}.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" /> Histórico de Receita de
                Reservas
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={purchaseHistory}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`,
                      "Receita",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Receita"
                    stroke="#10b981"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="specialty" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clientes por Especialidade</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={specialtyData}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => value.toString()}
                  />
                  <YAxis dataKey="specialty" type="category" width={120} />
                  <Tooltip formatter={(value) => [value, "Clientes"]} />
                  <Bar
                    dataKey="totalClients"
                    name="Nº de Clientes"
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Receita por Especialidade</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={specialtyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="specialty" />
                  <YAxis
                    tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`,
                      "Receita Total",
                    ]}
                  />
                  <Bar dataKey="totalRevenue" name="Receita" fill={COLORS[1]} />
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
            </CardHeader>
            <CardContent className="pl-2">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={clientsByState}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [value, "Clientes"]} />
                  <Bar dataKey="clients" name="Nº de Clientes" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
