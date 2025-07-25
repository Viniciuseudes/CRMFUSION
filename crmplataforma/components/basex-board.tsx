"use client";

import { useState, useEffect, useCallback } from "react";
import { basexAPI, type BaseXLead } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Loader2,
  Search,
  MessageSquare,
  Instagram,
  Info,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Componente auxiliar para exibir badges booleanos
const BooleanBadge = ({ value, text }: { value: boolean; text: string }) => (
  <Badge variant={value ? "default" : "secondary"}>{text}</Badge>
);

export function BaseXBoard() {
  const [leads, setLeads] = useState<BaseXLead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<BaseXLead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBaseXLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await basexAPI.getAll();
      setLeads(data);
      setFilteredLeads(data);
    } catch (error) {
      toast({ title: "Erro ao carregar a BaseX", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBaseXLeads();
  }, [fetchBaseXLeads]);

  useEffect(() => {
    const results = leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.specialty &&
          lead.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredLeads(results);
  }, [searchTerm, leads]);

  const handleSaveLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const leadData = {
      name: formData.get("name") as string,
      specialty: formData.get("specialty") as string,
      whatsapp: formData.get("whatsapp") as string,
      instagram: formData.get("instagram") as string,
      is_accessible: formData.get("is_accessible") === "on",
      needs_room: formData.get("needs_room") === "on",
      patient_demand: formData.get("patient_demand") === "on",
      valid_council: formData.get("valid_council") === "on",
      general_info: formData.get("general_info") as string,
    };

    try {
      await basexAPI.create(leadData as any);
      toast({ title: "Contato adicionado à BaseX!" });
      setIsDialogOpen(false);
      await fetchBaseXLeads();
    } catch (error) {
      toast({ title: "Erro ao adicionar contato", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeetingStatusToggle = async (leadToUpdate: BaseXLead) => {
    const currentStatus = leadToUpdate.meeting_status;
    const nextStatus: BaseXLead["meeting_status"] =
      currentStatus === "none"
        ? "pending"
        : currentStatus === "pending"
        ? "confirmed"
        : "none";

    // Atualização otimista da UI
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadToUpdate.id ? { ...l, meeting_status: nextStatus } : l
      )
    );

    try {
      await basexAPI.updateMeetingStatus(leadToUpdate.id, nextStatus);
      toast({ title: `Status da reunião atualizado para: ${nextStatus}` });
    } catch (error) {
      // Reverte a UI em caso de erro
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadToUpdate.id ? { ...l, meeting_status: currentStatus } : l
        )
      );
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const formatWhatsAppLink = (phone?: string) => {
    if (!phone) return "#";
    const justDigits = phone.replace(/\D/g, "");
    return `https://wa.me/55${justDigits}`;
  };

  const formatInstagramLink = (username?: string) => {
    if (!username) return "#";
    const handle = username.startsWith("@") ? username.substring(1) : username;
    return `https://instagram.com/${handle}`;
  };

  const getMeetingButtonClass = (status: BaseXLead["meeting_status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-400 hover:bg-yellow-500 text-white";
      case "confirmed":
        return "bg-green-500 hover:bg-green-600 text-white";
      default:
        return "bg-gray-200 hover:bg-gray-300 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BaseX</h1>
          <p className="text-muted-foreground">
            Banco de leads potenciais para prospecção futura.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar à BaseX</DialogTitle>
              <DialogDescription>
                Insira as informações do lead potencial.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveLead} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Input id="specialty" name="specialty" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    name="instagram"
                    placeholder="@usuario"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <Switch id="is_accessible" name="is_accessible" />
                  <Label htmlFor="is_accessible">Acessível?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="needs_room" name="needs_room" />
                  <Label htmlFor="needs_room">Precisa de Sala?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="patient_demand" name="patient_demand" />
                  <Label htmlFor="patient_demand">Tem Demanda?</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="valid_council" name="valid_council" />
                  <Label htmlFor="valid_council">Conselho Válido?</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="general_info">Informações Gerais</Label>
                <Textarea id="general_info" name="general_info" />
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
                  Salvar Contato
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou especialidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <span className="text-lg break-words flex-1">
                    {lead.name}
                  </span>
                  <div className="flex items-center shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6 rounded-full",
                        getMeetingButtonClass(lead.meeting_status)
                      )}
                      onClick={() => handleMeetingStatusToggle(lead)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    {lead.general_info && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                          >
                            <Info className="h-4 w-4 text-blue-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <p className="text-sm">{lead.general_info}</p>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {lead.specialty}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <BooleanBadge value={lead.is_accessible} text="Acessível" />
                    <BooleanBadge
                      value={lead.needs_room}
                      text="Precisa de Sala"
                    />
                    <BooleanBadge
                      value={lead.patient_demand}
                      text="Tem Demanda"
                    />
                    <BooleanBadge
                      value={lead.valid_council}
                      text="Conselho Válido"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {lead.whatsapp && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                      >
                        <a
                          href={formatWhatsAppLink(lead.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageSquare className="h-3 w-3 mr-1.5 text-green-500" />{" "}
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    {lead.instagram && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2"
                      >
                        <a
                          href={formatInstagramLink(lead.instagram)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Instagram className="h-3 w-3 mr-1.5 text-pink-500" />{" "}
                          Instagram
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 pt-2 border-t mt-2">
                  Adicionado por: {lead.created_by_name}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {filteredLeads.length === 0 && !isLoading && (
        <div className="text-center py-10 text-muted-foreground">
          Nenhum contato encontrado na BaseX.
        </div>
      )}
    </div>
  );
}
