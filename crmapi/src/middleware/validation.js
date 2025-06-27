const Joi = require("joi")

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.details.map((detail) => detail.message),
      })
    }
    next()
  }
}

// Schemas de validação
const schemas = {
  // Auth schemas (sem mudanças)
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Email deve ter um formato válido",
      "any.required": "Email é obrigatório",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Senha deve ter pelo menos 6 caracteres",
      "any.required": "Senha é obrigatória",
    }),
  }),

  register: Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
      "string.min": "Nome deve ter pelo menos 2 caracteres",
      "string.max": "Nome deve ter no máximo 255 caracteres",
      "any.required": "Nome é obrigatório",
    }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "gerente", "colaborador").default("colaborador"),
    permissions: Joi.array().items(Joi.string()).default([]),
  }),

  // User schemas (sem mudanças)
  updateUser: Joi.object({
    name: Joi.string().min(2).max(255),
    email: Joi.string().email(),
    role: Joi.string().valid("admin", "gerente", "colaborador"),
    permissions: Joi.array().items(Joi.string()),
    is_active: Joi.boolean(),
  }),

  // Lead schemas (sem mudanças)
  createLead: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    specialty: Joi.string().min(2).max(255).required(),
    phone: Joi.string().min(10).max(20).required(),
    email: Joi.string().email().required(),
    funnel: Joi.string().valid("marketing", "pre-sales", "sales", "onboarding", "ongoing").default("marketing"),
    stage: Joi.string().max(100).required(),
    tags: Joi.array().items(Joi.string()).default([]),
    value: Joi.number().min(0).default(0),
    notes: Joi.string().allow(""),
    source: Joi.string().valid("whatsapp", "instagram", "google", "indicacao", "plataforma", "site").required(),
  }),

  updateLead: Joi.object({
    name: Joi.string().min(2).max(255),
    specialty: Joi.string().min(2).max(255),
    phone: Joi.string().min(10).max(20),
    email: Joi.string().email(),
    funnel: Joi.string().valid("marketing", "pre-sales", "sales", "onboarding", "ongoing"),
    stage: Joi.string().max(100),
    tags: Joi.array().items(Joi.string()),
    value: Joi.number().min(0),
    notes: Joi.string().allow(""),
    source: Joi.string().valid("whatsapp", "instagram", "google", "indicacao", "plataforma", "site"),
  }),

  // Client schemas (sem mudanças)
  createClient: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    phone: Joi.string().min(10).max(20).required(),
    email: Joi.string().email().required(),
    entry_date: Joi.date().default(new Date()),
    first_purchase_date: Joi.date().required(),
    last_purchase: Joi.date().required(),
    doctor: Joi.string().max(255).allow(null, ''),
    specialty: Joi.string().min(2).max(255).required(),
    status: Joi.string().valid("Ativo", "Inativo").default("Ativo"),
    total_spent: Joi.number().min(0).default(0),
  }),

  updateClient: Joi.object({
    name: Joi.string().min(2).max(255),
    phone: Joi.string().min(10).max(20),
    email: Joi.string().email(),
    entry_date: Joi.date(),
    first_purchase_date: Joi.date(),
    last_purchase: Joi.date(),
    doctor: Joi.string().max(255).allow(null, ''),
    specialty: Joi.string().min(2).max(255),
    status: Joi.string().valid("Ativo", "Inativo"),
    total_spent: Joi.number().min(0),
  }),

  addPurchase: Joi.object({
    value: Joi.number().min(0).required(),
  }),

  // Goal schemas
  createGoal: Joi.object({
    title: Joi.string().min(2).max(255).required(),
    description: Joi.string().allow(""),
    type: Joi.string().valid("leads", "conversions", "revenue", "pipeline_time").required(),
    target: Joi.number().min(0).required(),
    period: Joi.string().valid("daily", "weekly", "monthly", "quarterly").required(),
    funnel: Joi.string().valid("marketing", "pre-sales", "sales", "onboarding", "ongoing").allow(null),
    source: Joi.string().valid("whatsapp", "instagram", "google", "indicacao", "plataforma", "site").allow(null),
    assigned_to: Joi.string().uuid().allow(null),
    start_date: Joi.date().required(),
    end_date: Joi.date().greater(Joi.ref("start_date")).required(),
    is_active: Joi.boolean().default(true), // <--- MUDANÇA AQUI: Permite is_active na criação
  }),

  updateGoal: Joi.object({
    title: Joi.string().min(2).max(255),
    description: Joi.string().allow(""),
    type: Joi.string().valid("leads", "conversions", "revenue", "pipeline_time"),
    target: Joi.number().min(0),
    period: Joi.string().valid("daily", "weekly", "monthly", "quarterly"),
    funnel: Joi.string().valid("marketing", "pre-sales", "sales", "onboarding", "ongoing").allow(null),
    source: Joi.string().valid("whatsapp", "instagram", "google", "indicacao", "plataforma", "site").allow(null),
    start_date: Joi.date(),
    end_date: Joi.date(),
    is_active: Joi.boolean(),
  }),

  // Activity schemas (sem mudanças)
  createActivity: Joi.object({
    lead_id: Joi.number().integer().allow(null),
    client_id: Joi.number().integer().allow(null),
    type: Joi.string()
      .valid("call", "email", "meeting", "note", "conversion", "stage_change", "funnel_change")
      .required(),
    description: Joi.string().min(1).required(),
    date: Joi.date().default(new Date()),
    metadata: Joi.object().default({}),
  }),

  // Schema para a conversão de lead em cliente (sem mudanças)
  convertLead: Joi.object({
    saleValue: Joi.number().min(0).required().messages({
      "any.required": "O valor da venda é obrigatório",
      "number.min": "O valor da venda deve ser maior ou igual a 0",
    }),
    targetFunnel: Joi.string().valid("marketing", "pre-sales", "sales", "onboarding", "ongoing").required(),
    targetStage: Joi.string().max(100).required(),
    conversionDate: Joi.date().required(),
  }),
}

module.exports = {
  validateRequest,
  schemas,
}