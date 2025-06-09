"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Save, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db, type User } from "@/lib/database"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const funnelOptions = [
  { id: "marketing", label: "Marketing" },
  { id: "pre-sales", label: "Pré-Vendas" },
  { id: "sales", label: "Vendas" },
  { id: "contracts", label: "Contratos" },
  { id: "onboarding", label: "Onboarding" },
  { id: "ongoing", label: "Ongoing" },
]

export function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    const dbUsers = db.getUsers()
    setUsers(dbUsers)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCreateUser = (formData: FormData) => {
    const permissions = funnelOptions
      .filter((option) => formData.get(`permission-${option.id}`) === "on")
      .map((option) => option.id)

    const userData = {
      id: `user_${Date.now()}`,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as "admin" | "manager" | "sales" | "support",
      permissions,
      isActive: true,
    }

    db.saveUser(userData)
    loadUsers()
    setIsUserDialogOpen(false)
    toast({
      title: "Usuário criado",
      description: `${userData.name} foi adicionado à equipe`,
    })
  }

  const toggleUserStatus = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      db.updateUser(userId, { isActive: !user.isActive })
      loadUsers()
      toast({
        title: user.isActive ? "Usuário desativado" : "Usuário ativado",
        description: `${user.name} foi ${user.isActive ? "desativado" : "ativado"}`,
      })
    }
  }

  const getRoleColor = (role: string) => {
    const colors = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-blue-100 text-blue-800",
      sales: "bg-green-100 text-green-800",
      support: "bg-yellow-100 text-yellow-800",
    }
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: "Administrador",
      manager: "Gerente",
      sales: "Vendas",
      support: "Suporte",
    }
    return labels[role as keyof typeof labels] || role
  }

  const currentUser = db.getCurrentUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do seu CRM</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>Atualize as informações básicas da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da Empresa</Label>
                  <Input id="company-name" defaultValue="HealthSpace" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" defaultValue="https://healthspace.com.br" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contato</Label>
                  <Input id="email" defaultValue="contato@healthspace.com.br" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue="(11) 3333-4444" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {saved ? "Salvo" : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalização</CardTitle>
              <CardDescription>Personalize a aparência do seu CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select defaultValue="pt-BR">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {saved ? "Salvo" : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gerenciamento de Equipe</CardTitle>
                  <CardDescription>Gerencie os membros da sua equipe e suas permissões</CardDescription>
                </div>
                {currentUser?.role === "admin" && (
                  <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                        <DialogDescription>Crie uma nova conta para um membro da equipe</DialogDescription>
                      </DialogHeader>
                      <form action={handleCreateUser} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Nome
                          </Label>
                          <Input id="name" name="name" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="email" className="text-right">
                            Email
                          </Label>
                          <Input id="email" name="email" type="email" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="role" className="text-right">
                            Função
                          </Label>
                          <Select name="role" required>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Gerente</SelectItem>
                              <SelectItem value="sales">Vendas</SelectItem>
                              <SelectItem value="support">Suporte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                          <Label className="text-right">Permissões</Label>
                          <div className="col-span-3 space-y-2">
                            {funnelOptions.map((option) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <Switch id={`permission-${option.id}`} name={`permission-${option.id}`} />
                                <Label htmlFor={`permission-${option.id}`}>{option.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit">Criar Usuário</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.slice(0, 2).map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {funnelOptions.find((f) => f.id === permission)?.label}
                            </Badge>
                          ))}
                          {user.permissions.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.permissions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {currentUser?.role === "admin" && user.id !== "admin" && (
                          <Button
                            size="sm"
                            variant={user.isActive ? "outline" : "default"}
                            onClick={() => toggleUserStatus(user.id)}
                          >
                            {user.isActive ? "Desativar" : "Ativar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perfis de Acesso</CardTitle>
              <CardDescription>Entenda os diferentes níveis de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {[
                  {
                    role: "Administrador",
                    description: "Acesso completo a todas as funcionalidades",
                    permissions: [
                      "Gerenciar usuários",
                      "Todos os funis",
                      "Configurações do sistema",
                      "Relatórios completos",
                    ],
                  },
                  {
                    role: "Gerente",
                    description: "Acesso a relatórios e gerenciamento de equipe",
                    permissions: ["Ver todos os leads", "Relatórios avançados", "Gerenciar permissões"],
                  },
                  {
                    role: "Vendas",
                    description: "Acesso aos funis de vendas atribuídos",
                    permissions: ["Funis específicos", "Leads próprios", "Relatórios básicos"],
                  },
                  {
                    role: "Suporte",
                    description: "Acesso a clientes e suporte",
                    permissions: ["Gerenciar clientes", "Onboarding", "Suporte ongoing"],
                  },
                ].map((profile, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <h4 className="font-medium">{profile.role}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
                    <div className="mt-2">
                      <h5 className="text-xs font-medium text-muted-foreground">Permissões:</h5>
                      <ul className="mt-1 space-y-1">
                        {profile.permissions.map((permission, i) => (
                          <li key={i} className="text-xs flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            {permission}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
