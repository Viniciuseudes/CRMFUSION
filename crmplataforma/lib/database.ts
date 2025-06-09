// Sistema de banco de dados local usando localStorage

export interface Lead {
  id: number
  name: string
  specialty: string
  phone: string
  email: string
  funnel: string
  stage: string
  entryDate: string
  tags: string[]
  avatar?: string
  value: number
  notes?: string
  source: "whatsapp" | "instagram" | "google" | "indicacao" // Nova propriedade
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: number
  name: string
  phone: string
  email: string
  lastPurchase: string
  doctor: string
  specialty: string
  status: "Ativo" | "Inativo"
  avatar?: string
  totalSpent: number
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: number
  leadId?: number
  clientId?: number
  type: "call" | "email" | "meeting" | "note" | "conversion" | "stage_change" | "funnel_change"
  description: string
  date: string
  userId: string
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "gerente" | "colaborador"
  permissions: string[]
  createdAt: string
  isActive: boolean
}

export interface Goal {
  id: string
  title: string
  description: string
  type: "leads" | "conversions" | "revenue" | "pipeline_time"
  target: number
  period: "daily" | "weekly" | "monthly" | "quarterly"
  funnel?: string
  source?: string
  assignedTo?: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

class LocalDatabase {
  private getFromStorage<T>(key: string): T[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(key, JSON.stringify(data))
  }

  // CURRENT USER
  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null
    const userData = localStorage.getItem("current_user")
    return userData ? JSON.parse(userData) : null
  }

  setCurrentUser(user: User): void {
    if (typeof window === "undefined") return
    localStorage.setItem("current_user", JSON.stringify(user))
  }

  logout(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem("current_user")
  }

  // USERS
  getUsers(): User[] {
    return this.getFromStorage<User>("crm_users")
  }

  saveUser(user: Omit<User, "createdAt">): User {
    const users = this.getUsers()
    const newUser: User = {
      ...user,
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
    this.saveToStorage("crm_users", users)
    return newUser
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getUsers()
    const index = users.findIndex((user) => user.id === id)
    if (index === -1) return null

    users[index] = { ...users[index], ...updates }
    this.saveToStorage("crm_users", users)
    return users[index]
  }

  // GOALS
  getGoals(): Goal[] {
    return this.getFromStorage<Goal>("crm_goals")
  }

  saveGoal(goal: Omit<Goal, "id" | "createdAt" | "updatedAt">): Goal {
    const goals = this.getGoals()
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    goals.push(newGoal)
    this.saveToStorage("crm_goals", goals)
    return newGoal
  }

  updateGoal(id: string, updates: Partial<Goal>): Goal | null {
    const goals = this.getGoals()
    const index = goals.findIndex((goal) => goal.id === id)
    if (index === -1) return null

    goals[index] = { ...goals[index], ...updates, updatedAt: new Date().toISOString() }
    this.saveToStorage("crm_goals", goals)
    return goals[index]
  }

  deleteGoal(id: string): boolean {
    const goals = this.getGoals()
    const filteredGoals = goals.filter((goal) => goal.id !== id)
    if (filteredGoals.length === goals.length) return false

    this.saveToStorage("crm_goals", filteredGoals)
    return true
  }

  // LEADS
  getLeads(): Lead[] {
    const currentUser = this.getCurrentUser()
    const allLeads = this.getFromStorage<Lead>("crm_leads")

    if (!currentUser) return []
    if (currentUser.role === "admin") return allLeads

    // Filtrar por permissões do usuário
    return allLeads.filter((lead) => {
      if (currentUser.permissions.includes(lead.funnel)) return true
      if (lead.assignedTo === currentUser.id) return true
      return false
    })
  }

  saveLead(lead: Omit<Lead, "id" | "createdAt" | "updatedAt">): Lead {
    const leads = this.getFromStorage<Lead>("crm_leads")
    const currentUser = this.getCurrentUser()
    const newLead: Lead = {
      ...lead,
      id: Date.now() + Math.floor(Math.random() * 1000),
      assignedTo: currentUser?.id || "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    leads.push(newLead)
    this.saveToStorage("crm_leads", leads)

    // Registrar atividade
    this.saveActivity({
      leadId: newLead.id,
      type: "note",
      description: `Lead ${newLead.name} criado`,
      date: new Date().toISOString(),
      userId: currentUser?.id || "admin",
    })

    return newLead
  }

  updateLead(id: number, updates: Partial<Lead>): Lead | null {
    const leads = this.getFromStorage<Lead>("crm_leads")
    const index = leads.findIndex((lead) => lead.id === id)
    if (index === -1) return null

    const oldLead = { ...leads[index] }
    const updatedLead = {
      ...leads[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    leads[index] = updatedLead
    this.saveToStorage("crm_leads", leads)

    // Registrar mudanças de estágio/funil
    const currentUser = this.getCurrentUser()
    if (updates.stage && updates.stage !== oldLead.stage) {
      this.saveActivity({
        leadId: id,
        type: "stage_change",
        description: `Lead ${oldLead.name} movido para ${updates.stage}`,
        date: new Date().toISOString(),
        userId: currentUser?.id || "admin",
      })
    }
    if (updates.funnel && updates.funnel !== oldLead.funnel) {
      this.saveActivity({
        leadId: id,
        type: "funnel_change",
        description: `Lead ${oldLead.name} movido para funil ${updates.funnel}`,
        date: new Date().toISOString(),
        userId: currentUser?.id || "admin",
      })
    }

    return updatedLead
  }

  deleteLead(id: number): boolean {
    const leads = this.getFromStorage<Lead>("crm_leads")
    const filteredLeads = leads.filter((lead) => lead.id !== id)
    if (filteredLeads.length === leads.length) return false

    this.saveToStorage("crm_leads", filteredLeads)
    return true
  }

  // CLIENTS
  getClients(): Client[] {
    const currentUser = this.getCurrentUser()
    const allClients = this.getFromStorage<Client>("crm_clients")

    if (!currentUser) return []
    if (currentUser.role === "admin") return allClients

    return allClients.filter((client) => client.assignedTo === currentUser.id)
  }

  saveClient(client: Omit<Client, "id" | "createdAt" | "updatedAt">): Client {
    const clients = this.getFromStorage<Client>("crm_clients")
    const currentUser = this.getCurrentUser()
    const newClient: Client = {
      ...client,
      id: Date.now() + Math.floor(Math.random() * 1000),
      assignedTo: currentUser?.id || "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    clients.push(newClient)
    this.saveToStorage("crm_clients", clients)
    return newClient
  }

  updateClient(id: number, updates: Partial<Client>): Client | null {
    const clients = this.getFromStorage<Client>("crm_clients")
    const index = clients.findIndex((client) => client.id === id)
    if (index === -1) return null

    clients[index] = {
      ...clients[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.saveToStorage("crm_clients", clients)
    return clients[index]
  }

  // ACTIVITIES
  getActivities(): Activity[] {
    return this.getFromStorage<Activity>("crm_activities")
  }

  saveActivity(activity: Omit<Activity, "id" | "createdAt">): Activity {
    const activities = this.getActivities()
    const newActivity: Activity = {
      ...activity,
      id: Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
    }
    activities.push(newActivity)
    this.saveToStorage("crm_activities", activities)
    return newActivity
  }

  // CONVERSÃO: Lead → Cliente
  convertLeadToClient(leadId: number): Client | null {
    const allLeads = this.getFromStorage<Lead>("crm_leads")
    const lead = allLeads.find((l) => l.id === leadId)
    if (!lead) return null

    // Criar cliente baseado no lead
    const client = this.saveClient({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      lastPurchase: new Date().toISOString().split("T")[0],
      doctor: "A definir",
      specialty: lead.specialty,
      status: "Ativo",
      avatar: lead.avatar,
      totalSpent: lead.value,
      assignedTo: lead.assignedTo,
    })

    // Registrar atividade de conversão
    this.saveActivity({
      leadId: leadId,
      clientId: client.id,
      type: "conversion",
      description: `Lead ${lead.name} convertido em cliente`,
      date: new Date().toISOString(),
      userId: lead.assignedTo || "admin",
    })

    // Remover lead
    this.deleteLead(leadId)

    return client
  }

  // ESTATÍSTICAS AVANÇADAS
  getAdvancedStats() {
    const currentUser = this.getCurrentUser()
    const leads = this.getLeads()
    const clients = this.getClients()
    const activities = this.getActivities()

    // Estatísticas por funil
    const funnelStats = leads.reduce((acc, lead) => {
      if (!acc[lead.funnel]) {
        acc[lead.funnel] = { count: 0, value: 0, stages: {} }
      }
      acc[lead.funnel].count++
      acc[lead.funnel].value += lead.value

      if (!acc[lead.funnel].stages[lead.stage]) {
        acc[lead.funnel].stages[lead.stage] = { count: 0, value: 0 }
      }
      acc[lead.funnel].stages[lead.stage].count++
      acc[lead.funnel].stages[lead.stage].value += lead.value

      return acc
    }, {} as any)

    // Estatísticas por origem
    const sourceStats = leads.reduce((acc, lead) => {
      if (!acc[lead.source]) {
        acc[lead.source] = { count: 0, value: 0, conversions: 0 }
      }
      acc[lead.source].count++
      acc[lead.source].value += lead.value
      return acc
    }, {} as any)

    // Conversões por mês
    const conversionsByMonth = activities
      .filter((a) => a.type === "conversion")
      .reduce(
        (acc, activity) => {
          const month = new Date(activity.date).toISOString().slice(0, 7)
          acc[month] = (acc[month] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

    // Performance por usuário
    const userPerformance = activities.reduce((acc, activity) => {
      if (!acc[activity.userId]) {
        acc[activity.userId] = {
          conversions: 0,
          stageChanges: 0,
          totalActivities: 0,
        }
      }
      acc[activity.userId].totalActivities++
      if (activity.type === "conversion") acc[activity.userId].conversions++
      if (activity.type === "stage_change") acc[activity.userId].stageChanges++
      return acc
    }, {} as any)

    // Tempo médio no pipeline
    const pipelineTimes = leads.map((lead) => {
      const created = new Date(lead.createdAt)
      const now = new Date()
      return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    })

    const avgPipelineTime =
      pipelineTimes.length > 0 ? pipelineTimes.reduce((a, b) => a + b, 0) / pipelineTimes.length : 0

    return {
      totalLeads: leads.length,
      totalClients: clients.length,
      totalPipelineValue: leads.reduce((sum, lead) => sum + lead.value, 0),
      totalRevenue: clients.reduce((sum, client) => sum + client.totalSpent, 0),
      conversionRate: leads.length > 0 ? (clients.length / (leads.length + clients.length)) * 100 : 0,
      avgPipelineTime: Math.round(avgPipelineTime),
      funnelStats,
      sourceStats, // Nova estatística
      conversionsByMonth,
      userPerformance,
      clientsNeedingReactivation: clients.filter((c) => {
        const lastDate = new Date(c.lastPurchase)
        const now = new Date()
        const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays > 60
      }).length,
    }
  }

  // INICIALIZAR COM DADOS DE EXEMPLO
  initializeWithSampleData(): void {
    // Criar usuário admin se não existir
    const users = this.getUsers()
    if (users.length === 0) {
      this.saveUser({
        id: "admin",
        name: "Administrador",
        email: "admin@fusionclinic.com",
        role: "admin",
        permissions: ["marketing", "pre-sales", "sales", "onboarding", "ongoing"],
        isActive: true,
      })

      // Definir como usuário atual
      this.setCurrentUser({
        id: "admin",
        name: "Administrador",
        email: "admin@fusionclinic.com",
        role: "admin",
        permissions: ["marketing", "pre-sales", "sales", "onboarding", "ongoing"],
        isActive: true,
        createdAt: new Date().toISOString(),
      })
    }
  }

  // BACKUP E RESTORE
  exportData() {
    return {
      leads: this.getFromStorage<Lead>("crm_leads"),
      clients: this.getFromStorage<Client>("crm_clients"),
      activities: this.getFromStorage<Activity>("crm_activities"),
      users: this.getFromStorage<User>("crm_users"),
      goals: this.getFromStorage<Goal>("crm_goals"),
      exportDate: new Date().toISOString(),
    }
  }

  importData(data: any) {
    if (data.leads) this.saveToStorage("crm_leads", data.leads)
    if (data.clients) this.saveToStorage("crm_clients", data.clients)
    if (data.activities) this.saveToStorage("crm_activities", data.activities)
    if (data.users) this.saveToStorage("crm_users", data.users)
    if (data.goals) this.saveToStorage("crm_goals", data.goals)
  }

  clearAllData() {
    localStorage.removeItem("crm_leads")
    localStorage.removeItem("crm_clients")
    localStorage.removeItem("crm_activities")
    localStorage.removeItem("crm_users")
    localStorage.removeItem("crm_goals")
    localStorage.removeItem("current_user")
  }
}

export const db = new LocalDatabase()
