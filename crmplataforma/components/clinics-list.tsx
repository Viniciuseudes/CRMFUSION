// crmplataforma/components/clinics-list.tsx
"use client";

import { useState, useEffect } from "react";
import { clinicsAPI, type Clinic } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
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
import { Plus, Loader2, Home, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Este será o componente do formulário, que pode ficar em um Dialog
// Por enquanto, vamos manter a lógica principal aqui.

export function ClinicsList() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const data = await clinicsAPI.getAll();
        setClinics(data);
      } catch (error) {
        toast({ title: "Erro ao carregar clínicas", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchClinics();
  }, [toast]);

  const canManage = user?.role === "admin" || user?.role === "gerente";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clínicas</h1>
          <p className="text-muted-foreground">
            Gerencie as clínicas e suas salas.
          </p>
        </div>
        {canManage && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Clínica
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clínicas</CardTitle>
          <CardDescription>
            Visualize todas as clínicas cadastradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Clínica</TableHead>
                  <TableHead>Anfitrião</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.map((clinic) => (
                  <TableRow
                    key={clinic.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell>{clinic.host_name || "N/A"}</TableCell>
                    <TableCell>
                      {clinic.city && clinic.state
                        ? `${clinic.city}, ${clinic.state}`
                        : "Não informado"}
                    </TableCell>
                    <TableCell>{clinic.phone || "Não informado"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
