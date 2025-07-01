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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Filter,
  Download,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  AlertCircle,
  Edit,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientsAPI, type Client } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // <--- Importação dos componentes de paginação

const CLIENTS_PER_PAGE = 10; // <--- Definindo um limite menor para facilitar a visualização da paginação

const brazilianStates = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

export function ClientsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  // ***** ESTADOS DE PAGINAÇÃO *****
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClientsCount, setTotalClientsCount] = useState(0); // Para guardar o total retornado pela API
  // ***** FIM DOS ESTADOS DE PAGINAÇÃO *****

  // Modificada para aceitar parâmetros de paginação
  const loadClients = async (
    page: number = currentPage,
    limit: number = CLIENTS_PER_PAGE
  ) => {
    setIsLoading(true);
    try {
      const response = await clientsAPI.getAll(); // <--- Chamada sem argumentos
      setClients(response.clients || []);
      setFilteredClients(response.clients || []); // Já filtrou pela API, então filteredClients é o mesmo aqui
      setTotalPages(response.pagination.pages); // <--- Atualiza o total de páginas
      setTotalClientsCount(response.pagination.total); // <--- Atualiza o total de clientes
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({ title: "Erro ao carregar clientes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients(currentPage, CLIENTS_PER_PAGE); // Carrega a primeira página na montagem
  }, [currentPage]); // Recarrega quando a página atual muda

  useEffect(() => {
    // A filtragem local pelo searchTerm agora age sobre os clientes da PÁGINA ATUAL
    // Para filtrar em toda a base, precisaríamos de uma API de busca mais complexa
    const filtered = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.doctor &&
          c.doctor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleOpenFormDialog = (client: Client | null) => {
    setSelectedClient(client);
    setIsFormDialogOpen(true);
  };

  const handleOpenPurchaseDialog = (client: Client) => {
    setSelectedClient(client);
    setIsPurchaseDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const clientData = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      entry_date: formData.get("entry_date") as string,
      first_purchase_date: formData.get("first_purchase_date") as string,
      last_purchase: formData.get("last_purchase") as string,
      doctor: formData.get("doctor") as string,
      specialty: formData.get("specialty") as string,
      status: (formData.get("status") as "Ativo" | "Inativo") || "Ativo",
      total_spent: Number(formData.get("total_spent")) || 0,
    };

    try {
      if (selectedClient) {
        await clientsAPI.update(selectedClient.id, clientData);
        toast({ title: "Cliente atualizado" });
      } else {
        await clientsAPI.create(clientData as any);
        toast({ title: "Cliente criado" });
      }
      setCurrentPage(1); // Volta para a primeira página ao criar/atualizar
      await loadClients(1, CLIENTS_PER_PAGE); // Recarrega a primeira página
      setIsFormDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro ao salvar cliente",
        description:
          (error as any).response?.data?.message ||
          (error as any).response?.data?.error ||
          "Verifique os dados.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const value = Number(formData.get("purchase_value"));

    try {
      await clientsAPI.addPurchase(selectedClient.id, { value });
      toast({ title: "Compra adicionada com sucesso!" });
      await loadClients(currentPage, CLIENTS_PER_PAGE); // Recarrega a página atual
      setIsPurchaseDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      toast({ title: "Erro ao adicionar compra", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return "";
    const justDigits = phone.replace(/\D/g, "");
    return `https://wa.me/55${justDigits}`;
  };
  const getStatusColor = (status: string) =>
    status === "Ativo"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  const needsReactivation = (lastPurchase: string) =>
    (new Date().getTime() - new Date(lastPurchase).getTime()) /
      (1000 * 3600 * 24) >
    60;
  const getRowClass = (lastPurchase: string) => {
    const diffDays =
      (new Date().getTime() - new Date(lastPurchase).getTime()) /
      (1000 * 3600 * 24);
    if (diffDays > 90) return "bg-red-50 dark:bg-red-900/20";
    if (diffDays > 60) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "";
  };

  // Gerar array de números de página para os controles de paginação
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Limite de botões de página para exibir
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie todos os clientes da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => handleOpenFormDialog(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Clientes ({totalClientsCount} no total)
          </CardTitle>{" "}
          {/* <--- Exibindo o total de clientes */}
          <CardDescription>
            Visualize e gerencie todos os clientes cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative flex-1 mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, profissional ou especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Última Compra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className={getRowClass(client.last_purchase)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                          //src={client.avatar_url || "/placeholder.svg"}
                          />
                          <AvatarFallback>
                            {client.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(client.last_purchase).toLocaleDateString(
                          "pt-BR"
                        )}
                        {needsReactivation(client.last_purchase) && (
                          <AlertCircle className="h-4 w-4 text-red-500 ml-1" />
                        )}
                      </div>
                      {needsReactivation(client.last_purchase) && (
                        <div className="text-xs text-red-500 mt-1">
                          Reativação necessária
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        R$ {client.total_spent.toLocaleString("pt-BR")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenPurchaseDialog(client)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <a
                            href={formatWhatsAppLink(client.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenFormDialog(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {filteredClients.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* ***** CONTROLES DE PAGINAÇÃO ***** */}
          {totalPages > 1 && ( // Exibe paginação apenas se houver mais de uma página
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    aria-disabled={currentPage === 1}
                    tabIndex={currentPage === 1 ? -1 : 0}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {getPageNumbers().map((pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNumber)}
                      isActive={pageNumber === currentPage}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {totalPages > 5 &&
                  currentPage < totalPages - 2 && ( // Exibir elipsis se houver muitas páginas e não estiver perto do fim
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                {totalPages > 5 &&
                  currentPage < totalPages - 2 && ( // Exibir última página se houver muitas e não for a última
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => setCurrentPage(totalPages)}
                        isActive={totalPages === currentPage}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1)
                        );
                      }
                    }}
                    aria-disabled={currentPage === totalPages}
                    tabIndex={currentPage === totalPages ? -1 : 0}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          {/* ***** FIM DOS CONTROLES DE PAGINAÇÃO ***** */}
        </CardContent>
      </Card>

      {/* Diálogo para Adicionar/Editar Cliente */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedClient ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>Preencha os dados abaixo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedClient?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={selectedClient?.phone}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={selectedClient?.email}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry_date">Data de Entrada</Label>
                <Input
                  id="entry_date"
                  name="entry_date"
                  type="date"
                  defaultValue={
                    selectedClient?.entry_date
                      ? new Date(selectedClient.entry_date)
                          .toISOString()
                          .split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_purchase_date">Primeira Compra</Label>
                <Input
                  id="first_purchase_date"
                  name="first_purchase_date"
                  type="date"
                  defaultValue={
                    selectedClient?.first_purchase_date
                      ? new Date(selectedClient.first_purchase_date)
                          .toISOString()
                          .split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="last_purchase">Última Compra</Label>
                <Input
                  id="last_purchase"
                  name="last_purchase"
                  type="date"
                  defaultValue={selectedClient?.last_purchase.split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_spent">Valor Total Gasto</Label>
                <Input
                  id="total_spent"
                  name="total_spent"
                  type="number"
                  defaultValue={selectedClient?.total_spent}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctor">Profissional</Label>
                <Input
                  id="doctor"
                  name="doctor"
                  defaultValue={selectedClient?.doctor}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Select
                  name="specialty"
                  defaultValue={selectedClient?.specialty}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                    <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                    <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                    <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                    <SelectItem value="Farmacia">Farmacia</SelectItem>
                    <SelectItem value="Medicina">Medicina</SelectItem>
                    <SelectItem value="Biomedicina">Biomedicina</SelectItem>
                    <SelectItem value="Esteticista">Esteticista</SelectItem>
                    <SelectItem value="Psicologia">Psicologia</SelectItem>
                    <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                    <SelectItem value="Odontologia">Odontologia</SelectItem>
                    <SelectItem value="Pediatria">Pediatria</SelectItem>
                    <SelectItem value="Neurologia">Neurologia</SelectItem>
                    <SelectItem value="Ginecologia">Ginecologia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Select name="state" defaultValue={selectedClient?.state}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={selectedClient?.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Nova Compra */}
      <Dialog
        open={isPurchaseDialogOpen}
        onOpenChange={setIsPurchaseDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Nova Compra</DialogTitle>
            <DialogDescription>
              Cliente:{" "}
              <span className="font-semibold">{selectedClient?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPurchase} className="space-y-4">
            <div>
              <Label htmlFor="purchase_value">Valor da Compra (R$)</Label>
              <Input
                id="purchase_value"
                name="purchase_value"
                type="number"
                step="0.01"
                placeholder="Ex: 250.00"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPurchaseDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Adicionar Compra
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
