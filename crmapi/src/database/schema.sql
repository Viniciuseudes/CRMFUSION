-- FusionClinic CRM Database Schema

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'gerente', 'colaborador');
-- <--- MUDANÇA AQUI na linha abaixo
CREATE TYPE lead_source AS ENUM ('whatsapp', 'instagram', 'google', 'indicacao', 'plataforma', 'site');
CREATE TYPE lead_funnel AS ENUM ('marketing', 'pre-sales', 'sales', 'onboarding', 'ongoing');
CREATE TYPE client_status AS ENUM ('Ativo', 'Inativo');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'conversion', 'stage_change', 'funnel_change');
CREATE TYPE goal_type AS ENUM ('leads', 'conversions', 'revenue', 'pipeline_time');
CREATE TYPE goal_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'colaborador',
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de leads
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    funnel lead_funnel NOT NULL DEFAULT 'marketing',
    stage VARCHAR(100) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tags TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    source lead_source NOT NULL,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    last_purchase DATE NOT NULL,
    doctor VARCHAR(255),
    specialty VARCHAR(255) NOT NULL,
    status client_status DEFAULT 'Ativo',
    avatar_url TEXT,
    total_spent DECIMAL(10,2) DEFAULT 0,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de atividades
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    type activity_type NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de metas
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type goal_type NOT NULL,
    target DECIMAL(10,2) NOT NULL,
    period goal_period NOT NULL,
    funnel lead_funnel,
    source lead_source,
    assigned_to UUID REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_leads_funnel_stage ON leads(funnel, stage);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_assigned_to ON clients(assigned_to);
CREATE INDEX idx_activities_lead_id ON activities(lead_id);
CREATE INDEX idx_activities_client_id ON activities(client_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goals_period ON goals(period);
CREATE INDEX idx_goals_is_active ON goals(is_active);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views para relatórios
CREATE VIEW lead_stats AS
SELECT 
    funnel,
    stage,
    source,
    COUNT(*) as count,
    SUM(value) as total_value,
    AVG(value) as avg_value,
    DATE_TRUNC('month', created_at) as month
FROM leads
GROUP BY funnel, stage, source, DATE_TRUNC('month', created_at);

CREATE VIEW conversion_stats AS
SELECT 
    DATE_TRUNC('month', a.date) as month,
    COUNT(*) as conversions,
    l.source,
    l.funnel
FROM activities a
JOIN leads l ON a.lead_id = l.id
WHERE a.type = 'conversion'
GROUP BY DATE_TRUNC('month', a.date), l.source, l.funnel;

CREATE VIEW user_performance AS
SELECT 
    u.id,
    u.name,
    COUNT(CASE WHEN a.type = 'conversion' THEN 1 END) as conversions,
    COUNT(a.id) as total_activities,
    CASE 
        WHEN COUNT(a.id) > 0 THEN 
            ROUND((COUNT(CASE WHEN a.type = 'conversion' THEN 1 END)::DECIMAL / COUNT(a.id)) * 100, 2)
        ELSE 0 
    END as efficiency_rate
FROM users u
LEFT JOIN activities a ON u.id = a.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name;