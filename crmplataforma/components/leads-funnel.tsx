"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Mail,
  Calendar,
  Plus,
  Filter,
  Download,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  MoveRight,
  Search,
  X,
  MessageSquare,
  Clock,
  Loader2,
  PauseCircle,
  PlayCircle,
  MoreVertical,
  Info, // Ícone para detalhes
  Edit, // Ícone para editar
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { leadsAPI, type Lead } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { TimeAgo } from "@/components/time-ago";

const funnels = [
  {
    id: "marketing",
    title: "Marketing",
    color: "bg-purple-100 text-purple-800",
    stages: [
      { id: "lead-capture", title: "Captura de Lead", color: "bg-purple-50" },
      {
        id: "lead-qualification",
        title: "Qualificação",
        color: "bg-purple-100",
      },
      { id: "nurturing", title: "Nutrição", color: "bg-purple-200" },
    ],
  },
  {
    id: "pre-sales",
    title: "Pré-Vendas",
    color: "bg-blue-100 text-blue-800",
    stages: [
      { id: "discovery", title: "Descoberta", color: "bg-blue-50" },
      {
        id: "needs-analysis",
        title: "Análise de Necessidades",
        color: "bg-blue-100",
      },
      {
        id: "demo-presentation",
        title: "Demo/Apresentação",
        color: "bg-blue-200",
      },
    ],
  },
  {
    id: "sales",
    title: "Vendas",
    color: "bg-green-100 text-green-800",
    stages: [
      { id: "proposal", title: "Proposta", color: "bg-green-50" },
      { id: "negotiation", title: "Negociação", color: "bg-green-100" },
      { id: "closing", title: "Fechamento", color: "bg-green-200" },
    ],
  },
  {
    id: "onboarding",
    title: "Customer Success (Onboarding)",
    color: "bg-orange-100 text-orange-800",
    stages: [
      { id: "welcome", title: "Boas-vindas", color: "bg-orange-50" },
      { id: "setup", title: "Configuração", color: "bg-orange-100" },
      { id: "training", title: "Treinamento", color: "bg-orange-200" },
    ],
  },
  {
    id: "ongoing",
    title: "Customer Success (Ongoing)",
    color: "bg-teal-100 text-teal-800",
    stages: [
      { id: "active-usage", title: "Uso Ativo", color: "bg-teal-50" },
      { id: "expansion", title: "Expansão", color: "bg-teal-100" },
      { id: "renewal", title: "Renovação", color: "bg-teal-200" },
    ],
  },
];

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

export function LeadsFunnel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState("marketing");

  // --- Estados dos diálogos atualizados ---
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [leadForDetails, setLeadForDetails] = useState<Lead | null>(null);

  const [moveFunnelDialogOpen, setMoveFunnelDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    specialty: "",
    tags: [] as string[],
    valueRange: "",
    source: "",
  });
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [saleValue, setSaleValue] = useState<number | "">("");
  const [conversionDate, setConversionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { standby?: boolean } = {};
      if (selectedFunnel === "standby") {
        params.standby = true;
      } else {
        params.standby = false;
      }
      const response = await leadsAPI.getAll(params);
      setLeads(response.leads || []);
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
      toast({
        title: "Erro ao carregar leads",
        description: "Não foi possível buscar os leads do servidor.",
        variant: "destructive",
      });
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedFunnel]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    let currentFilteredLeads = [...leads];
    if (searchTerm) {
      currentFilteredLeads = currentFilteredLeads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filters.specialty && filters.specialty !== "all") {
      currentFilteredLeads = currentFilteredLeads.filter(
        (lead) =>
          lead.specialty.toLowerCase() === filters.specialty.toLowerCase()
      );
    }
    if (filters.tags.length > 0) {
      currentFilteredLeads = currentFilteredLeads.filter((lead) =>
        filters.tags.some((tag) => lead.tags && lead.tags.includes(tag))
      );
    }
    if (filters.valueRange && filters.valueRange !== "all") {
      const [minStr, maxStr] = filters.valueRange.split("-");
      const min = Number(minStr);
      const max = maxStr ? Number(maxStr) : Infinity;
      currentFilteredLeads = currentFilteredLeads.filter((lead) => {
        const value = lead.value || 0;
        if (max === Infinity) return value >= min;
        return value >= min && value <= max;
      });
    }
    if (filters.source && filters.source !== "all") {
      currentFilteredLeads = currentFilteredLeads.filter(
        (lead) => lead.source === filters.source
      );
    }
    setFilteredLeads(currentFilteredLeads);
  }, [leads, searchTerm, filters]);

  const handleOpenLeadForm = (lead: Lead | null) => {
    setEditingLead(lead);
    setIsLeadFormOpen(true);
  };

  const handleOpenDetailsDialog = (lead: Lead) => {
    setLeadForDetails(lead);
    setIsDetailsDialogOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentFunnelData = funnels.find((f) => f.id === selectedFunnel);

    if (!currentFunnelData && !editingLead) {
      toast({
        title: "Erro de Funil",
        description: "Funil selecionado não é válido.",
        variant: "destructive",
      });
      return;
    }

    const leadData = {
      name: formData.get("name") as string,
      specialty: formData.get("specialty") as string,
      state: formData.get("state") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      value: Number(formData.get("value")) || 0,
      notes: formData.get("notes") as string,
      source: formData.get("source") as Lead["source"],
    };

    try {
      if (editingLead) {
        await leadsAPI.update(editingLead.id, leadData);
        toast({ title: "Lead atualizado com sucesso!" });
      } else {
        const createData = {
          ...leadData,
          funnel: currentFunnelData!.id,
          stage: currentFunnelData!.stages[0].id,
          tags: ["Novo"],
        };
        await leadsAPI.create(createData);
        toast({ title: "Lead criado com sucesso!" });
      }
      fetchLeads();
      setIsLeadFormOpen(false);
      setEditingLead(null);
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      toast({ title: "Erro ao salvar lead", variant: "destructive" });
    }
  };

  const handleToggleStandby = async (lead: Lead) => {
    const newStandbyState = !lead.is_standby;
    const actionText = newStandbyState ? "movido para stand-by" : "reativado";

    try {
      await leadsAPI.setStandby(lead.id, newStandbyState);
      toast({
        title: `Lead ${actionText}!`,
        description: `${lead.name} foi ${actionText}.`,
      });
      fetchLeads();
    } catch (error) {
      console.error(`Erro ao ${actionText} o lead:`, error);
      toast({
        title: "Erro na operação",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      specialty: "",
      tags: [],
      valueRange: "",
      source: "",
    });
  };

  const handleOpenConvertDialog = (lead: Lead) => {
    setLeadToConvert(lead);
    setSaleValue(lead.value > 0 ? lead.value : "");
    setConversionDate(new Date().toISOString().split("T")[0]);
    setIsConvertDialogOpen(true);
  };

  const handleConfirmConversion = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!leadToConvert || saleValue === "") {
      toast({
        title: "Erro na conversão",
        description: "Valor da venda é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const ongoingFunnel = funnels.find((f) => f.id === "ongoing");
      if (!ongoingFunnel || ongoingFunnel.stages.length === 0) {
        toast({
          title: "Erro de Configuração",
          description:
            "Funil 'Ongoing' ou seus estágios não configurados. Não foi possível converter.",
          variant: "destructive",
        });
        return;
      }

      const response = await leadsAPI.convert(leadToConvert.id, {
        saleValue: Number(saleValue),
        targetFunnel: "ongoing",
        targetStage: ongoingFunnel.stages[0].id,
        conversionDate: conversionDate,
      });

      if (response.lead) {
        setLeads((prevLeads) =>
          prevLeads.map((l) => (l.id === response.lead.id ? response.lead : l))
        );
        toast({
          title: "Lead convertido!",
          description: `${response.lead.name} foi convertido em cliente e movido para o funil 'Ongoing'.`,
        });
      } else {
        toast({
          title: "Lead convertido!",
          description: `${leadToConvert.name} foi convertido em cliente. Recarregando dados...`,
        });
        fetchLeads();
      }

      setIsConvertDialogOpen(false);
      setLeadToConvert(null);
      setSaleValue("");
      setConversionDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Erro ao converter lead:", error);
      toast({
        title: "Erro ao converter lead",
        description: "Não foi possível converter o lead em cliente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateLeadOnAPI = async (leadId: number, updates: Partial<Lead>) => {
    try {
      await leadsAPI.update(leadId, updates);
      fetchLeads();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      toast({
        title: "Erro ao atualizar lead",
        description: "Não foi possível mover o lead.",
        variant: "destructive",
      });
      return false;
    }
  };

  const moveToNextStage = async (lead: Lead) => {
    const currentFunnelData = funnels.find((f) => f.id === lead.funnel);
    if (!currentFunnelData) return;

    const currentStageIndex = currentFunnelData.stages.findIndex(
      (s) => s.id === lead.stage
    );
    if (
      currentStageIndex === -1 ||
      currentStageIndex >= currentFunnelData.stages.length - 1
    )
      return;

    const nextStageId = currentFunnelData.stages[currentStageIndex + 1].id;
    const nextStageTitle =
      currentFunnelData.stages[currentStageIndex + 1].title;

    const success = await updateLeadOnAPI(lead.id, { stage: nextStageId });
    if (success) {
      toast({
        title: "Lead avançou",
        description: `${lead.name} movido para ${nextStageTitle}.`,
      });
    }
  };

  const moveToPreviousStage = async (lead: Lead) => {
    const currentFunnelData = funnels.find((f) => f.id === lead.funnel);
    if (!currentFunnelData) return;

    const currentStageIndex = currentFunnelData.stages.findIndex(
      (s) => s.id === lead.stage
    );
    if (currentStageIndex <= 0) return;

    const prevStageId = currentFunnelData.stages[currentStageIndex - 1].id;
    const prevStageTitle =
      currentFunnelData.stages[currentStageIndex - 1].title;

    const success = await updateLeadOnAPI(lead.id, { stage: prevStageId });
    if (success) {
      toast({
        title: "Lead retornou",
        description: `${lead.name} movido para ${prevStageTitle}.`,
      });
    }
  };

  const moveToFunnel = async (leadId: number, newFunnel: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const targetFunnelData = funnels.find((f) => f.id === newFunnel);
    if (!targetFunnelData) return;

    const firstStageId = targetFunnelData.stages[0].id;

    const success = await updateLeadOnAPI(leadId, {
      funnel: newFunnel,
      stage: firstStageId,
    });

    if (success) {
      setSelectedFunnel(newFunnel);
      setMoveFunnelDialogOpen(false);
      setSelectedLeadId(null);
      toast({
        title: "Lead movido",
        description: `${lead.name} movido para ${targetFunnelData.title}.`,
      });
    }
  };

  const getLeadsByFunnelAndStage = (funnelId: string, stageId: string) => {
    return filteredLeads.filter(
      (lead) =>
        lead.funnel === funnelId && lead.stage === stageId && !lead.is_standby
    );
  };

  const getStandbyLeads = () => {
    return filteredLeads.filter((lead) => lead.is_standby);
  };

  const currentFunnelData =
    funnels.find((f) => f.id === selectedFunnel) || funnels[0];

  const allowedFunnels = funnels.filter(
    (funnel) =>
      currentUser?.role === "admin" ||
      (currentUser?.permissions && currentUser.permissions.includes(funnel.id))
  );

  const allSpecialties = [
    ...new Set(leads.map((lead) => lead.specialty).filter(Boolean)),
  ];
  const allTags = [
    ...new Set(leads.flatMap((lead) => lead.tags || []).filter(Boolean)),
  ];
  const allSources = [
    ...new Set(leads.map((lead) => lead.source).filter(Boolean)),
  ];

  const hasActiveFilters =
    searchTerm ||
    (filters.specialty && filters.specialty !== "all") ||
    filters.tags.length > 0 ||
    (filters.valueRange && filters.valueRange !== "all") ||
    (filters.source && filters.source !== "all");

  const getTagColor = (tag: string) => {
    const colors: { [key: string]: string } = {
      Premium: "bg-purple-100 text-purple-800",
      VIP: "bg-red-100 text-red-800",
      Urgente: "bg-red-100 text-red-800",
      Recorrente: "bg-blue-100 text-blue-800",
      Enterprise: "bg-gray-100 text-gray-800",
      Upsell: "bg-green-100 text-green-800",
      Novo: "bg-blue-100 text-blue-800",
    };
    return colors[tag] || "bg-gray-100 text-gray-800";
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<Lead["source"] | string, string> = {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      google: "Google",
      indicacao: "Indicação",
      plataforma: "Plataforma",
      site: "Site",
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<Lead["source"] | string, string> = {
      whatsapp: "bg-green-100 text-green-800",
      instagram: "bg-pink-100 text-pink-800",
      google: "bg-blue-100 text-blue-800",
      indicacao: "bg-yellow-100 text-yellow-800",
      plataforma: "bg-gray-100 text-gray-800",
      site: "bg-indigo-100 text-indigo-800",
    };
    return colors[source] || "bg-gray-100 text-gray-800";
  };

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return "";
    const justDigits = phone.replace(/\D/g, "");
    if (justDigits.length > 11) {
      return `https://wa.me/${justDigits}`;
    }
    return `https://wa.me/55${justDigits}`;
  };

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2">Carregando leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pipeline de Vendas
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus leads através dos funis de vendas
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros{" "}
                {hasActiveFilters && (
                  <Badge
                    variant="destructive"
                    className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Nome, email ou especialidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select
                    value={filters.source}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        source: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as origens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as origens</SelectItem>
                      {allSources.map((source) => (
                        <SelectItem key={source} value={source}>
                          {getSourceLabel(source)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Select
                    value={filters.specialty}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        specialty: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as especialidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        Todas as especialidades
                      </SelectItem>
                      {allSpecialties.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {allTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-tag-${tag}`}
                          checked={filters.tags.includes(tag)}
                          onCheckedChange={(checked) => {
                            setFilters((prevFilters) => ({
                              ...prevFilters,
                              tags: checked
                                ? [...prevFilters.tags, tag]
                                : prevFilters.tags.filter((t) => t !== tag),
                            }));
                          }}
                        />
                        <Label
                          htmlFor={`filter-tag-${tag}`}
                          className="text-sm font-normal"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Faixa de Valor</Label>
                  <Select
                    value={filters.valueRange}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        valueRange: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os valores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os valores</SelectItem>
                      <SelectItem value="0-10000">Até R$ 10.000</SelectItem>
                      <SelectItem value="10000-20000">
                        R$ 10.000 - R$ 20.000
                      </SelectItem>
                      <SelectItem value="20000-30000">
                        R$ 20.000 - R$ 30.000
                      </SelectItem>
                      <SelectItem value="30000-">Acima de R$ 30.000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Funcionalidade de Backup",
                description: "Esta funcionalidade ainda será implementada.",
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Backup
          </Button>
          <Button onClick={() => handleOpenLeadForm(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {allowedFunnels.map((funnel) => (
          <Button
            key={funnel.id}
            variant={selectedFunnel === funnel.id ? "default" : "outline"}
            onClick={() => setSelectedFunnel(funnel.id)}
            className="whitespace-nowrap"
          >
            {funnel.title}
            <Badge variant="secondary" className="ml-2">
              {
                leads.filter((l) => l.funnel === funnel.id && !l.is_standby)
                  .length
              }
            </Badge>
          </Button>
        ))}
        <Button
          key="standby"
          variant={selectedFunnel === "standby" ? "default" : "outline"}
          onClick={() => setSelectedFunnel("standby")}
          className="whitespace-nowrap bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
        >
          Stand-by
          <Badge variant="secondary" className="ml-2">
            {leads.filter((l) => l.is_standby).length}
          </Badge>
        </Button>
      </div>

      {selectedFunnel !== "standby" ? (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
            {currentFunnelData.stages.map((stage) => {
              const stageLeads = getLeadsByFunnelAndStage(
                currentFunnelData.id,
                stage.id
              );
              const totalValue = stageLeads.reduce(
                (sum, lead) => sum + (Number(lead.value) || 0),
                0
              );
              return (
                <Card key={stage.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stage.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stageLeads.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      R$ {totalValue.toLocaleString("pt-BR")} em oportunidades
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentFunnelData.stages.map((stage, stageIndex) => {
              const stageLeads = getLeadsByFunnelAndStage(
                currentFunnelData.id,
                stage.id
              );
              return (
                <div
                  key={stage.id}
                  className={`p-1 rounded-lg ${stage.color.replace(
                    "bg-",
                    "border-"
                  )}`}
                >
                  <div
                    className={`p-3 rounded-t-md text-center font-medium ${stage.color}`}
                  >
                    {stage.title} ({stageLeads.length})
                  </div>
                  <div className="space-y-3 min-h-[400px] flex flex-col p-2 bg-muted/20 rounded-b-md">
                    {stageLeads.length > 0 ? (
                      stageLeads.map((lead) => (
                        <Card
                          key={lead.id}
                          className={`relative hover:shadow-lg transition-shadow w-full bg-card ${
                            lead.is_converted_client
                              ? "border-green-400 border-2"
                              : ""
                          }`}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7"
                            onClick={() => handleOpenDetailsDialog(lead)}
                          >
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={
                                    lead.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      lead.name
                                    )}&background=random`
                                  }
                                />
                                <AvatarFallback>
                                  {lead.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1.5 pr-6">
                                <div>
                                  <h4 className="font-semibold text-sm">
                                    {lead.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {lead.specialty}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <Badge
                                    className={`${getSourceColor(
                                      lead.source
                                    )} text-xs px-1.5 py-0.5`}
                                    variant="secondary"
                                  >
                                    {getSourceLabel(lead.source)}
                                  </Badge>
                                  {(lead.tags || []).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className={`text-xs px-1.5 py-0.5 ${getTagColor(
                                        tag
                                      )}`}
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {lead.is_converted_client && (
                                    <Badge
                                      variant="default"
                                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-1.5 py-0.5"
                                    >
                                      Cliente Convertido
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-0.5 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {lead.phone}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {lead.email}
                                  </div>
                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-sky-600" />
                                      <span>
                                        {new Date(
                                          lead.entry_date
                                        ).toLocaleDateString("pt-BR")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-amber-600" />
                                      <TimeAgo date={lead.updated_at} />
                                    </div>
                                  </div>
                                  {lead.value > 0 && (
                                    <div className="text-sm pt-1 font-semibold text-green-600">
                                      R$ {lead.value.toLocaleString("pt-BR")}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 pt-1.5">
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                  >
                                    <a
                                      href={formatWhatsAppLink(lead.phone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" />{" "}
                                      WhatsApp
                                    </a>
                                  </Button>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2"
                                  >
                                    <a href={`mailto:${lead.email}`}>
                                      <Mail className="h-3 w-3 mr-1" /> Email
                                    </a>
                                  </Button>
                                  {stageIndex > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs px-2"
                                      onClick={() => moveToPreviousStage(lead)}
                                      disabled={lead.is_converted_client}
                                    >
                                      <ChevronLeft className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {stageIndex <
                                    currentFunnelData.stages.length - 1 && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-6 text-xs px-2"
                                      onClick={() => moveToNextStage(lead)}
                                      disabled={lead.is_converted_client}
                                    >
                                      <ChevronRight className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-6 text-xs px-2"
                                    onClick={() => {
                                      setSelectedLeadId(lead.id);
                                      setMoveFunnelDialogOpen(true);
                                    }}
                                    disabled={lead.is_converted_client}
                                  >
                                    <MoveRight className="h-3 w-3 mr-1" /> Mover
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2 text-amber-600 border-amber-300 hover:bg-amber-100"
                                    onClick={() => handleToggleStandby(lead)}
                                  >
                                    <PauseCircle className="h-3 w-3 mr-1" />{" "}
                                    Stand-by
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleOpenLeadForm(lead)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar Lead
                                      </DropdownMenuItem>
                                      {currentFunnelData.id === "sales" &&
                                        stage.id === "closing" && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleOpenConvertDialog(lead)
                                            }
                                            disabled={lead.is_converted_client}
                                          >
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            {lead.is_converted_client
                                              ? "Convertido"
                                              : "Converter"}
                                          </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                        Nenhum lead neste estágio.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leads em Stand-by</CardTitle>
            <CardDescription>
              Leads que estão aguardando resposta ou foram pausados manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getStandbyLeads().length > 0 ? (
              getStandbyLeads().map((lead) => (
                <Card
                  key={lead.id}
                  className="hover:shadow-lg transition-shadow w-full bg-card border-amber-400 border-2"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={
                            lead.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              lead.name
                            )}&background=random`
                          }
                        />
                        <AvatarFallback>
                          {lead.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5">
                        <div>
                          <h4 className="font-semibold text-sm">{lead.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {lead.specialty}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            className={`${getSourceColor(
                              lead.source
                            )} text-xs px-1.5 py-0.5`}
                            variant="secondary"
                          >
                            {getSourceLabel(lead.source)}
                          </Badge>
                          {(lead.tags || []).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={`text-xs px-1.5 py-0.5 ${getTagColor(
                                tag
                              )}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-sky-600" />
                              <span>
                                {new Date(lead.entry_date).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-600" />
                              <TimeAgo date={lead.updated_at} />
                            </div>
                          </div>
                          {lead.value > 0 && (
                            <div className="text-sm pt-1 font-semibold text-green-600">
                              R$ {lead.value.toLocaleString("pt-BR")}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                          >
                            <a
                              href={formatWhatsAppLink(lead.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />{" "}
                              WhatsApp
                            </a>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs px-2"
                          >
                            <a href={`mailto:${lead.email}`}>
                              <Mail className="h-3 w-3 mr-1" /> Email
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 text-xs px-2 bg-green-500 hover:bg-green-600"
                            onClick={() => handleToggleStandby(lead)}
                          >
                            <PlayCircle className="h-3 w-3 mr-1" /> Reativar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-8">
                Nenhum lead em stand-by.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <Dialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingLead ? "Editar Lead" : "Adicionar Novo Lead"}
            </DialogTitle>
            <DialogDescription>
              {editingLead
                ? "Altere as informações do lead abaixo."
                : "Preencha as informações do novo lead."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLead} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome
              </Label>
              <Input
                id="name"
                name="name"
                className="col-span-3"
                defaultValue={editingLead?.name ?? ""}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="specialty" className="text-right">
                Especialidade
              </Label>
              <Select
                name="specialty"
                defaultValue={editingLead?.specialty}
                required
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                  <SelectItem value="Farmacia">Farmacia</SelectItem>
                  <SelectItem value="Medicina">Medicina</SelectItem>
                  <SelectItem value="Biomedicina">Biomedicina</SelectItem>
                  <SelectItem value="Esteticista">Esteticista</SelectItem>
                  <SelectItem value="Psicologia">Psicologia</SelectItem>
                  <SelectItem value="Nutricionista">Nutricionista</SelectItem>
                  <SelectItem value="Odontologia">Odontologia</SelectItem>
                  <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                  <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                  <SelectItem value="Pediatria">Pediatria</SelectItem>
                  <SelectItem value="Neurologia">Neurologia</SelectItem>
                  <SelectItem value="Ginecologia">Ginecologia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="state" className="text-right">
                Estado
              </Label>
              <Select name="state" defaultValue={editingLead?.state}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o estado..." />
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="source" className="text-right">
                Origem
              </Label>
              <Select name="source" defaultValue={editingLead?.source} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="plataforma">Plataforma</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefone
              </Label>
              <Input
                id="phone"
                name="phone"
                className="col-span-3"
                defaultValue={editingLead?.phone ?? ""}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="col-span-3"
                defaultValue={editingLead?.email ?? ""}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Valor Estimado
              </Label>
              <Input
                id="value"
                name="value"
                type="number"
                className="col-span-3"
                defaultValue={editingLead?.value ?? 0}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">
                Observações
              </Label>
              <Textarea
                id="notes"
                name="notes"
                className="col-span-3"
                defaultValue={editingLead?.notes ?? ""}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLeadFormOpen(false);
                  setEditingLead(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingLead ? "Salvar Alterações" : "Salvar Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes de {leadForDetails?.name}</DialogTitle>
            <DialogDescription>
              Anotações e informações adicionais sobre este lead.
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4 max-h-[400px] overflow-y-auto">
            <p>
              {leadForDetails?.notes ||
                "Nenhuma anotação cadastrada para este lead."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={moveFunnelDialogOpen}
        onOpenChange={setMoveFunnelDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mover para outro funil</DialogTitle>
            <DialogDescription>Selecione o funil de destino</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {allowedFunnels.map((funnel) => (
              <Button
                key={funnel.id}
                variant="outline"
                className="justify-start"
                onClick={() => {
                  if (selectedLeadId !== null) {
                    moveToFunnel(selectedLeadId, funnel.id);
                  }
                }}
              >
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    funnel.color.split(" ")[0]
                  }`}
                />
                {funnel.title}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Converter Lead em Cliente</DialogTitle>
            <DialogDescription>
              Confirme o valor da venda e a data para converter{" "}
              <span className="font-semibold">{leadToConvert?.name}</span> em
              cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmConversion} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="saleValue">Valor da Venda (R$)</Label>
              <Input
                id="saleValue"
                name="saleValue"
                type="number"
                step="0.01"
                placeholder="Ex: 1500.00"
                value={saleValue}
                onChange={(e) =>
                  setSaleValue(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conversionDate">Data da Venda</Label>
              <Input
                id="conversionDate"
                name="conversionDate"
                type="date"
                value={conversionDate}
                onChange={(e) => setConversionDate(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConvertDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Conversão
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
