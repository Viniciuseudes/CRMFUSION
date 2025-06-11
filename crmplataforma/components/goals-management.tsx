// Em: TESTEFINAL/FRONTTESTE/components/goals-management.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context"; //
import { goalsAPI, usersAPI, type Goal, type User } from "@/lib/api-client"; //
import { useToast } from "@/hooks/use-toast"; //
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"; //
import { Button } from "@/components/ui/button"; //
import { Progress } from "@/components/ui/progress"; //
import { Badge } from "@/components/ui/badge"; //
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; //
import { Plus, Target, Calendar, Edit, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; //
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; //
import { Input } from "@/components/ui/input"; //
import { Label } from "@/components/ui/label"; //
import { Textarea } from "@/components/ui/textarea"; //
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; //
import { format } from "date-fns";

const goalTypeLabels: { [key: string]: string } = {
  leads: "Novos Leads",
  conversions: "Conversões",
  revenue: "Receita",
  pipeline_time: "Tempo no Pipeline",
};

const goalPeriodLabels: { [key: string]: string } = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
};

export function GoalsManagement() {
  const { user: currentUser } = useAuth(); //
  const { toast } = useToast(); //

  const [goals, setGoals] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // --- INÍCIO: NOVOS ESTADOS ---
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  // --- FIM: NOVOS ESTADOS ---

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const goalsPromise = goalsAPI.getAll({}); //
      const usersPromise =
        currentUser?.role === "admin" || currentUser?.role === "gerente"
          ? usersAPI.getAll() //
          : Promise.resolve({ users: [] });

      const [goalsResponse, usersResponse] = await Promise.all([
        goalsPromise,
        usersPromise,
      ]);

      const goalsWithProgress = await Promise.all(
        (goalsResponse.goals || []).map(async (goal: Goal) => {
          try {
            const progressData = await goalsAPI.getProgress(goal.id); //
            return { ...goal, ...progressData };
          } catch (e) {
            console.error(`Erro ao buscar progresso para meta ${goal.id}:`, e);
            return { ...goal, progress: 0, current: 0 };
          }
        })
      );

      setGoals(goalsWithProgress);
      setUsers(usersResponse.users || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.role, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- INÍCIO: FUNÇÃO MODIFICADA handleSaveGoal ---
  const handleSaveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const assignedTo = formData.get("assigned_to") as string;

    const goalData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as Goal["type"],
      target: Number(formData.get("target")),
      period: formData.get("period") as Goal["period"],
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      assigned_to: assignedTo === "geral" ? null : assignedTo,
      funnel: (formData.get("funnel") as Goal["funnel"]) || null,
      source: (formData.get("source") as Goal["source"]) || null,
      is_active: formData.get("is_active") === "on",
    };

    try {
      if (editingGoal) {
        await goalsAPI.update(editingGoal.id, goalData as any); //
        toast({ title: "Meta atualizada com sucesso!" });
      } else {
        await goalsAPI.create(goalData as any); //
        toast({ title: "Meta criada com sucesso!" });
      }
      setIsDialogOpen(false);
      setEditingGoal(null);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar meta:", error);
      const errorDetails =
        error.response?.data?.details?.join(", ") ||
        "Verifique os campos e tente novamente.";
      toast({
        title: "Erro ao salvar meta",
        description: errorDetails,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- FIM: FUNÇÃO MODIFICADA handleSaveGoal ---

  // --- INÍCIO: NOVAS FUNÇÕES ---
  const handleEditClick = (goal: Goal) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (goalId: string) => {
    setGoalToDelete(goalId);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;

    try {
      await goalsAPI.delete(goalToDelete); //
      toast({
        title: "Meta Removida",
        description: "A meta foi removida com sucesso.",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao remover meta",
        variant: "destructive",
      });
    } finally {
      setIsConfirmOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleOpenDialog = (goal: Goal | null = null) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };
  // --- FIM: NOVAS FUNÇÕES ---

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gerenciamento de Metas
          </h1>
          <p className="text-muted-foreground">
            Defina e acompanhe as metas da equipe
          </p>
        </div>
        {(currentUser?.role === "admin" || currentUser?.role === "gerente") && (
          // --- DIALOG TRIGGER ATUALIZADO ---
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingGoal(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingGoal ? "Editar Meta" : "Criar Nova Meta"}
                </DialogTitle>
                <DialogDescription>
                  {editingGoal
                    ? "Atualize os detalhes da meta."
                    : "Preencha os detalhes da nova meta para a equipe."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="title">Título da Meta</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={editingGoal?.title}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingGoal?.description}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="type">Tipo de Meta</Label>
                    <Select
                      name="type"
                      defaultValue={editingGoal?.type}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(goalTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="target">Valor Alvo</Label>
                    <Input
                      id="target"
                      name="target"
                      type="number"
                      defaultValue={editingGoal?.target}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="period">Período da Meta</Label>
                  <Select
                    name="period"
                    defaultValue={editingGoal?.period}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(goalPeriodLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start_date">Data de Início</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      defaultValue={
                        editingGoal
                          ? format(
                              new Date(editingGoal.start_date),
                              "yyyy-MM-dd"
                            )
                          : ""
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end_date">Prazo Final</Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="date"
                      defaultValue={
                        editingGoal
                          ? format(new Date(editingGoal.end_date), "yyyy-MM-dd")
                          : ""
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="assigned_to">Atribuir para</Label>
                  <Select
                    name="assigned_to"
                    defaultValue={editingGoal?.assigned_to || "geral"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">
                        Geral (Toda a Equipe)
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
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
                    )}{" "}
                    Salvar Meta
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <Card key={goal.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {goalPeriodLabels[goal.period] || goal.period}
                </Badge>
                {goal.assigned_to_name ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {goal.assigned_to_name}
                    </span>
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={`https://ui-avatars.com/api/?name=${goal.assigned_to_name?.replace(
                          " ",
                          "+"
                        )}`}
                      />
                      <AvatarFallback>
                        {goal.assigned_to_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ) : (
                  <Badge variant="outline">Meta Geral</Badge>
                )}
              </div>
              <CardTitle className="pt-2">{goal.title}</CardTitle>
              <CardDescription>
                {goalTypeLabels[goal.type] || goal.type}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2">
                <Progress value={goal.progress || 0} />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold">
                    {Math.round(goal.progress || 0)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Atual / Alvo</span>
                  <span className="font-semibold">
                    {goal.current || 0} / {goal.target}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Prazo: {format(new Date(goal.end_date), "dd/MM/yyyy")}
                </span>
              </div>
              {(currentUser?.role === "admin" ||
                currentUser?.role === "gerente") && (
                // --- BOTÕES COM ONCLICK ADICIONADO ---
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEditClick(goal)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteClick(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* --- INÍCIO: NOVO DIÁLOGO DE CONFIRMAÇÃO --- */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente a
              meta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- FIM: NOVO DIÁLOGO DE CONFIRMAÇÃO --- */}
    </div>
  );
}
