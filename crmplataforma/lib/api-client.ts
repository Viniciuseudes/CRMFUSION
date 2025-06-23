import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

// Criar instância do axios
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para adicionar token JWT
apiClient.interceptors.request.use(
  (config) => {
    // Verificar se o código está rodando no navegador antes de acessar localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor para tratar respostas
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Verificar se o código está rodando no navegador antes de acessar localStorage e window
    if (typeof window !== "undefined" && error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem("auth_token")
      localStorage.removeItem("current_user")
      window.location.href = "/login" // Para Next.js, o ideal seria usar o useRouter aqui se possível
    }
    return Promise.reject(error)
  },
)

// --- TIPOS DE DADOS ---
// Estes tipos devem refletir os dados retornados pela API do backend,
// incluindo quaisquer campos de junções (como assigned_to_name).

export interface User {
  id: string; // UUID do backend
  name: string;
  email: string;
  role: "admin" | "gerente" | "colaborador";
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string; // Adicionado como opcional
  last_login?: string; // Adicionado como opcional
  avatar_url?: string; // Adicionado como opcional
  avatar?: string; // Para consistência com o frontend, se usado
}

export interface Lead {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  funnel: string;
  stage: string;
  entry_date: string; // Backend usa 'entry_date'
  tags: string[];
  avatar?: string;
  value: number;
  notes?: string;
  source: "whatsapp" | "instagram" | "google" | "indicacao" | "plataforma" | "site";
  assigned_to?: string; // UUID do usuário
  is_converted_client?: boolean;
  client_id?: number;
  created_at: string;
  updated_at: string;
  assigned_to_name?: string; // Nome do usuário atribuído (via JOIN no backend)
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  email: string;
  entry_date: string; // <--- NOVA PROPRIEDADE
  first_purchase_date: string; // <--- NOVA PROPRIEDADE
  last_purchase: string;
  doctor: string;
  specialty: string;
  status: "Ativo" | "Inativo";
  avatar?: string;
  total_spent: number;
  assigned_to?: string; // UUID do usuário
  created_at: string;
  updated_at: string;
  assigned_to_name?: string; // Nome do usuário atribuído (via JOIN no backend)
}

export interface Goal {
  id: string; // UUID do backend
  title: string;
  description: string;
  type: "leads" | "conversions" | "revenue" | "pipeline_time";
  target: number;
  period: "daily" | "weekly" | "monthly" | "quarterly";
  funnel?: string;
  source?: string;
  assigned_to?: string; // UUID do usuário
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_to_name?: string; // Nome do usuário atribuído (via JOIN no backend)
}

export interface Activity {
  id: number;
  lead_id?: number;
  client_id?: number;
  type: "call" | "email" | "meeting" | "note" | "conversion" | "stage_change" | "funnel_change";
  description: string;
  date: string; // No backend, é TIMESTAMP. String é apropriado para o frontend.
  user_id: string; // UUID do usuário
  created_at: string;
  // Campos que podem vir de junções no backend
  user_name?: string;
  lead_name?: string;
  client_name?: string;
  metadata?: Record<string, any>; // Se sua API enviar metadados
}

// --- INTERFACES PARA RESPOSTAS PAGINADAS ---
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedUsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

export interface PaginatedLeadsResponse {
  leads: Lead[];
  pagination: PaginationInfo;
}

export interface PaginatedClientsResponse {
  clients: Client[];
  pagination: PaginationInfo;
}

export interface PaginatedActivitiesResponse {
  activities: Activity[];
  pagination: PaginationInfo;
}

export interface PaginatedGoalsResponse {
  goals: Goal[];
  pagination: PaginationInfo;
}

// --- FUNÇÕES DA API ---

// Auth
export const authAPI = {
  login: async (email: string, password: string): Promise<{ message: string; token: string; user: User }> => {
    const response = await apiClient.post("/auth/login", { email, password });
    return response.data;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "gerente" | "colaborador";
    permissions: string[];
  }): Promise<{ message: string; user: User }> => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },

  verify: async (): Promise<{ valid: boolean; user: User }> => {
    const response = await apiClient.get("/auth/verify");
    return response.data;
  },

  refresh: async (): Promise<{ token: string }> => {
    const response = await apiClient.post("/auth/refresh");
    return response.data;
  },
};

// Users
export const usersAPI = {
  getAll: async (): Promise<PaginatedUsersResponse> => {
    const response = await apiClient.get("/users");
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get("/users/me/profile");
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put("/users/me/profile", userData);
    return response.data;
  },

  changePassword: async (id: string, oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.put(`/users/${id}/password`, { oldPassword, newPassword });
  },
};

// Leads
type CreateLeadData = Omit<Lead, "id" | "created_at" | "updated_at" | "assigned_to" | "assigned_to_name" | "entry_date" | "is_converted_client" | "client_id">;
type UpdateLeadData = Partial<Omit<Lead, "id" | "created_at" | "updated_at" | "assigned_to" | "assigned_to_name" | "entry_date" | "is_converted_client" | "client_id">>;

export const leadsAPI = {
  getAll: async (): Promise<PaginatedLeadsResponse> => {
    const response = await apiClient.get("/leads");
    return response.data;
  },

  getById: async (id: number): Promise<Lead> => {
    const response = await apiClient.get(`/leads/${id}`);
    return response.data;
  },

  create: async (leadData: CreateLeadData): Promise<Lead> => {
    const response = await apiClient.post("/leads", leadData);
    return response.data;
  },

  update: async (id: number, leadData: UpdateLeadData): Promise<Lead> => {
    const response = await apiClient.put(`/leads/${id}`, leadData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  convert: async (
    id: number,
    conversionData: {
      saleValue: number;
      targetFunnel: string;
      targetStage: string;
      conversionDate: string;
    }
  ): Promise<{ message: string; lead: Lead; client: Client }> => {
    const response = await apiClient.post(`/leads/${id}/convert`, conversionData);
    return response.data;
  },
};

// Clients
type CreateClientData = Omit<Client, "id" | "created_at" | "updated_at" | "assigned_to" | "assigned_to_name">;
type UpdateClientData = Partial<Omit<Client, "id" | "created_at" | "updated_at" | "assigned_to" | "assigned_to_name">>;

export const clientsAPI = {
  getAll: async (): Promise<PaginatedClientsResponse> => {
    const response = await apiClient.get("/clients");
    return response.data;
  },

  getById: async (id: number): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data;
  },

  create: async (clientData: CreateClientData): Promise<Client> => {
    const response = await apiClient.post("/clients", clientData);
    return response.data;
  },

  update: async (id: number, clientData: UpdateClientData): Promise<Client> => {
    const response = await apiClient.put(`/clients/${id}`, clientData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  getActivities: async (clientId: number): Promise<PaginatedActivitiesResponse> => {
    const response = await apiClient.get(`/clients/${clientId}/activities`);
    return response.data;
  },

    addPurchase: async (id: number, purchaseData: { value: number }): Promise<Client> => {
    const response = await apiClient.post(`/clients/${id}/purchases`, purchaseData);
    return response.data;
  },
};

// Goals
type CreateGoalData = Omit<Goal, "id" | "created_at" | "updated_at" | "assigned_to" | "assigned_to_name">;
type UpdateGoalData = Partial<Omit<Goal, "id" | "created_at" | "updated_at" | "assigned_to" | "assigned_to_name">>;


export const goalsAPI = {
  getAll: async (p0: any): Promise<PaginatedGoalsResponse> => {
    const response = await apiClient.get("/goals");
    return response.data;
  },

  getById: async (id: string): Promise<Goal> => {
    const response = await apiClient.get(`/goals/${id}`);
    return response.data;
  },

  create: async (goalData: CreateGoalData): Promise<Goal> => {
    const response = await apiClient.post("/goals", goalData);
    return response.data;
  },

  update: async (id: string, goalData: UpdateGoalData): Promise<Goal> => {
    const response = await apiClient.put(`/goals/${id}`, goalData);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/goals/${id}`);
  },

  getProgress: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/goals/${id}/progress`);
    return response.data;
  },
};

// Activities
type CreateActivityData = Omit<Activity, "id" | "created_at" | "user_id" | "user_name" | "lead_name" | "client_name">;

export const activitiesAPI = {
  getAll: async (p0: any): Promise<PaginatedActivitiesResponse> => {
    const response = await apiClient.get("/activities");
    return response.data;
  },

  getById: async (id: number): Promise<Activity> => {
    const response = await apiClient.get(`/activities/${id}`);
    return response.data;
  },

  create: async (activityData: CreateActivityData): Promise<Activity> => {
    const response = await apiClient.post("/activities", activityData);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/activities/${id}`);
  },
};

// Reports
export const reportsAPI = {
  getStats: async (p0: { period: string }): Promise<any> => {
    const response = await apiClient.get("/reports/stats", { params: p0 }); // <--- Adicionado params
    return response.data;
  },

  getFunnelStats: async (p0: { period: string }): Promise<any> => {
    const response = await apiClient.get("/reports/funnel-stats", { params: p0 }); // <--- Adicionado params
    return response.data;
  },

  getSourceStats: async (p0: { period: string }): Promise<any> => {
    const response = await apiClient.get("/reports/source-stats", { params: p0 }); // <--- Adicionado params
    return response.data;
  },

  getConversionsByMonth: async (): Promise<any> => {
    const response = await apiClient.get("/reports/conversions-by-month");
    return response.data;
  },

  getUserPerformance: async (p0: { period: string }): Promise<any> => {
    const response = await apiClient.get("/reports/user-performance", { params: p0 }); // <--- Adicionado params
    return response.data;
  },

  getLeadsTimeline: async (): Promise<any> => {
    const response = await apiClient.get("/reports/leads-timeline");
    return response.data;
  },

    getLtvTimeline: async (): Promise<any[]> => {
    const response = await apiClient.get("/reports/ltv-timeline");
    return response.data;
  },

  // ***** NOVAS FUNÇÕES PARA ANÁLISE DE CLIENTES *****
  getClientSpecialtyAnalysis: async (params?: { period?: string }): Promise<any> => {
    const response = await apiClient.get("/reports/client-specialty-analysis", { params });
    return response.data;
  },

  getLtvAnalysis: async (params?: { period?: string }): Promise<any> => {
    const response = await apiClient.get("/reports/ltv-analysis", { params });
    return response.data;
  },

  getMrrAnalysis: async (params?: { months?: string }): Promise<any> => {
    const response = await apiClient.get("/reports/mrr-analysis", { params });
    return response.data;
  },
  // ***** FIM DAS NOVAS FUNÇÕES PARA ANÁLISE DE CLIENTES *****

  exportData: async (): Promise<any> => {
    const response = await apiClient.get("/reports/export");
    return response.data;
  },
};

export default apiClient;