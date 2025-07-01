"use client";

import { useState, useEffect, useCallback } from "react";
import { contractsAPI, type Contract } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export function ContractsManagement() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await contractsAPI.getAll();
      setContracts(response.contracts || []);
    } catch (error) {
      toast({ title: "Erro ao carregar contratos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleUpdateStatus = async (id: number, status: Contract["status"]) => {
    try {
      await contractsAPI.updateStatus(id, status);
      toast({ title: "Status do contrato atualizado!" });
      loadContracts(); // Recarrega a lista
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const getStatusColor = (status: Contract["status"]) => {
    return {
      ativo: "bg-green-100 text-green-800",
      expirado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
    }[status];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Gestão de Contratos
        </h1>
        <p className="text-muted-foreground">
          Visualize e gerencie todos os contratos fixos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contratos Ativos e Passados</CardTitle>
          <CardDescription>
            Lista de todos os contratos registrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div className="font-medium">{contract.client_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {contract.client_email}
                      </div>
                    </TableCell>
                    <TableCell>{contract.title}</TableCell>
                    <TableCell>
                      {format(new Date(contract.start_date), "dd/MM/yy")} -{" "}
                      {format(new Date(contract.end_date), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      R$ {contract.monthly_value.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(contract.status)}>
                        {contract.status.charAt(0).toUpperCase() +
                          contract.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(contract.id, "ativo")
                            }
                          >
                            Marcar como Ativo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(contract.id, "expirado")
                            }
                          >
                            Marcar como Expirado
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(contract.id, "cancelado")
                            }
                            className="text-red-600"
                          >
                            Cancelar Contrato
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
