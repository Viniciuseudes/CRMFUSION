# FusionClinic CRM Backend

Backend completo para o sistema de gestão de clínicas FusionClinic, desenvolvido com Node.js, Express e PostgreSQL.

## 🚀 Funcionalidades

### 🔐 Autenticação e Autorização
- Login/logout com JWT
- Controle de acesso baseado em roles (admin, gerente, colaborador)
- Sistema de permissões por funil
- Middleware de autenticação e autorização

### 👥 Gestão de Usuários
- CRUD completo de usuários
- Diferentes níveis de acesso
- Alteração de senha
- Perfil do usuário

### 🎯 Gestão de Leads
- CRUD completo de leads
- Sistema de funis (marketing, pré-vendas, vendas, onboarding, ongoing)
- Rastreamento de origem (WhatsApp, Instagram, Google, Indicação)
- Movimentação entre estágios e funis
- Conversão de leads em clientes

### 👤 Gestão de Clientes
- CRUD completo de clientes
- Histórico de atividades
- Controle de status (ativo/inativo)
- Rastreamento de última compra

### 📊 Sistema de Metas
- Criação e gestão de metas (apenas admin)
- Diferentes tipos: leads, conversões, receita, tempo pipeline
- Períodos: diário, semanal, mensal, trimestral
- Acompanhamento de progresso

### 📈 Relatórios e Analytics
- Estatísticas gerais do pipeline
- Análise por funil e origem
- Performance da equipe
- Conversões por período
- Timeline de leads
- Exportação de dados

### 🔄 Sistema de Atividades
- Log automático de ações
- Histórico completo de interações
- Rastreamento de mudanças

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Joi** - Validação de dados
- **Helmet** - Segurança
- **CORS** - Cross-origin requests
- **Rate Limiting** - Proteção contra spam
- **Docker** - Containerização

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 13+
- npm ou yarn

## 🚀 Instalação

### 1. Clone o repositório
\`\`\`bash
git clone <repository-url>
cd fusionclinic-backend
\`\`\`

### 2. Instale as dependências
\`\`\`bash
npm install
\`\`\`

### 3. Configure as variáveis de ambiente
\`\`\`bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
\`\`\`

### 4. Configure o banco de dados
\`\`\`bash
# Execute as migrações
npm run migrate

# Execute o seed (dados de exemplo)
npm run seed
\`\`\`

### 5. Inicie o servidor
\`\`\`bash
# Desenvolvimento
npm run dev

# Produção
npm start
\`\`\`

## 🐳 Docker

### Usando Docker Compose (Recomendado)
\`\`\`bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
\`\`\`

### Build manual
\`\`\`bash
# Build da imagem
docker build -t fusionclinic-backend .

# Executar container
docker run -p 3001:3001 --env-file .env fusionclinic-backend
\`\`\`

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (admin only)
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/refresh` - Renovar token

### Usuários
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Buscar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário
- `GET /api/users/me/profile` - Perfil atual
- `PUT /api/users/me/profile` - Atualizar perfil
- `PUT /api/users/:id/password` - Alterar senha

### Leads
- `GET /api/leads` - Listar leads
- `GET /api/leads/:id` - Buscar lead
- `POST /api/leads` - Criar lead
- `PUT /api/leads/:id` - Atualizar lead
- `DELETE /api/leads/:id` - Deletar lead
- `POST /api/leads/:id/convert` - Converter em cliente

### Clientes
- `GET /api/clients` - Listar clientes
- `GET /api/clients/:id` - Buscar cliente
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Deletar cliente
- `GET /api/clients/:id/activities` - Atividades do cliente

### Metas (Admin only)
- `GET /api/goals` - Listar metas
- `GET /api/goals/:id` - Buscar meta
- `POST /api/goals` - Criar meta
- `PUT /api/goals/:id` - Atualizar meta
- `DELETE /api/goals/:id` - Deletar meta
- `GET /api/goals/:id/progress` - Progresso da meta

### Atividades
- `GET /api/activities` - Listar atividades
- `GET /api/activities/:id` - Buscar atividade
- `POST /api/activities` - Criar atividade
- `DELETE /api/activities/:id` - Deletar atividade

### Relatórios
- `GET /api/reports/stats` - Estatísticas gerais
- `GET /api/reports/funnel-stats` - Stats por funil
- `GET /api/reports/source-stats` - Stats por origem
- `GET /api/reports/conversions-by-month` - Conversões mensais
- `GET /api/reports/user-performance` - Performance da equipe
- `GET /api/reports/leads-timeline` - Timeline de leads
- `GET /api/reports/export` - Exportar dados

## 🔒 Segurança

- Autenticação JWT
- Hash de senhas com bcrypt
- Rate limiting
- Validação de entrada com Joi
- Headers de segurança com Helmet
- CORS configurado
- SQL injection protection

## 🗄️ Estrutura do Banco

### Tabelas Principais
- `users` - Usuários do sistema
- `leads` - Leads do pipeline
- `clients` - Clientes convertidos
- `activities` - Log de atividades
- `goals` - Metas do sistema

### Enums
- `user_role` - Tipos de usuário
- `lead_source` - Origens dos leads
- `lead_funnel` - Funis do pipeline
- `client_status` - Status dos clientes
- `activity_type` - Tipos de atividade
- `goal_type` - Tipos de meta
- `goal_period` - Períodos das metas

## 📊 Monitoramento

### Health Check
\`\`\`bash
curl http://localhost:3001/health
\`\`\`

### Logs
Os logs são gerados automaticamente usando Morgan e incluem:
- Requisições HTTP
- Erros de aplicação
- Conexões de banco
- Autenticação

## 🧪 Testes

\`\`\`bash
# Executar testes
npm test

# Executar com coverage
npm run test:coverage
\`\`\`

## 🚀 Deploy

### Variáveis de Ambiente de Produção
\`\`\`env
NODE_ENV=production
PORT=3001
DB_HOST=your-db-host
DB_NAME=fusionclinic
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-super-secure-jwt-secret
\`\`\`

### Comandos de Deploy
\`\`\`bash
# Build
npm run build

# Start em produção
npm start
\`\`\`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para suporte, entre em contato através do email: suporte@fusionclinic.com
