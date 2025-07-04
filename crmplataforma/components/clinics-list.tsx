// crmplataforma/components/clinics-list.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { clinicsAPI, usersAPI, type Clinic, type User } from "@/lib/api-client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export function ClinicsList() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchClinics = useCallback(async () => {
    try {
      const data = await clinicsAPI.getAll();
      setClinics(data);
    } catch (error) {
      toast({ title: "Erro ao carregar clínicas", variant: "destructive" });
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await usersAPI.getAll();
      // Filtra para mostrar apenas admins e gerentes como possíveis anfitriões
      const potentialHosts = data.users.filter(
        (u) => u.role === "admin" || u.role === "gerente"
      );
      setUsers(potentialHosts);
    } catch (error) {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchClinics(), fetchUsers()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchClinics, fetchUsers]);

  const handleSaveClinic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const clinicData = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip_code: formData.get("zip_code") as string,
      phone: formData.get("phone") as string,
      host_id: Number(formData.get("host_id")),
    };

    try {
      await clinicsAPI.create(clinicData as any);
      toast({ title: "Clínica criada com sucesso!" });
      setIsDialogOpen(false);
      await fetchClinics(); // Re-fetch para atualizar a lista
    } catch (error) {
      toast({ title: "Erro ao criar clínica", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Clínica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Clínica</DialogTitle>
                <DialogDescription>
                  Preencha os dados abaixo para cadastrar uma nova clínica.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveClinic} className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Clínica</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" name="address" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" name="city" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select name="state">
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
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input id="zip_code" name="zip_code" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="host_id">Anfitrião Responsável</Label>
                    <Select name="host_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um anfitrião..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Clínica
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
