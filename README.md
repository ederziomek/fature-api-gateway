# 🌐 Fature API Gateway v2.0

API Gateway Robusto com Roteamento Inteligente - Sistema Fature CPA

## 📋 Descrição

O **Fature API Gateway v2.0** é o ponto central de entrada para todos os microsserviços do sistema Fature CPA, fornecendo roteamento inteligente, cache, agregação de dados e monitoramento avançado.

### 🎯 Funcionalidades Principais

- **🔀 Roteamento Inteligente** - Proxy automático para microsserviços com retry e failover
- **📦 Cache Redis** - Cache inteligente de respostas com TTL configurável
- **📊 Agregação de Dados** - Combinação de dados de múltiplos serviços
- **🛡️ Rate Limiting** - Proteção contra abuso com limites configuráveis
- **📈 Monitoramento** - Health checks e métricas de performance
- **🔐 Autenticação** - Suporte a JWT e API Keys
- **⚡ Performance** - Compressão, cache e otimizações

## 🏗️ Arquitetura

### Microsserviços Integrados:
- **Affiliate Service** - Gerenciamento de afiliados e MLM
- **Config Service** - Configurações dinâmicas
- **MLM Service** - Processamento MLM
- **Commission Service** - Cálculo de comissões
- **Data Service** - Analytics e sincronização

### Fluxo de Dados:
```
Frontend → API Gateway → Cache/Agregação → Microsserviços → Resposta
```

## 🚀 Endpoints

### 📊 Endpoints Agregados (Otimizados)
- `GET /api/v1/affiliates/:id/dashboard` - Dashboard agregado (cache 5min)
- `GET /api/v1/system/stats` - Estatísticas do sistema (cache 10min)
- `GET /api/v1/affiliates/ranking` - Ranking agregado (cache 5min)

### 🔀 Proxy Direto para Microsserviços
- `ALL /api/v1/affiliates/*` - Affiliate Service
- `ALL /api/v1/config/*` - Config Service
- `ALL /api/v1/mlm/*` - MLM Service
- `ALL /api/v1/commission/*` - Commission Service
- `ALL /api/v1/data/*` - Data Service

### 📈 Monitoramento e Saúde
- `GET /health` - Health check básico
- `GET /health/detailed` - Health check detalhado
- `GET /health/metrics` - Métricas de performance
- `GET /health/services` - Status dos microsserviços

### 📚 Documentação
- `GET /` - Informações do gateway
- `GET /docs` - Documentação completa da API

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Servidor
NODE_ENV=development
PORT=3000

# Redis Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
CACHE_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Microsserviços
AFFILIATE_SERVICE_URL=http://localhost:3001
CONFIG_SERVICE_URL=https://fature-config-service-production.up.railway.app
MLM_SERVICE_URL=https://fature-mlm-service-v2-production.up.railway.app
COMMISSION_SERVICE_URL=https://fature-commission-service-production.up.railway.app
DATA_SERVICE_URL=https://fature-data-service-v2-production.up.railway.app

# API Keys
AFFILIATE_SERVICE_API_KEY=your_api_key
CONFIG_SERVICE_API_KEY=your_api_key
# ... outras API keys
```

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar em desenvolvimento
npm run dev

# Iniciar em produção
npm start
```

## 📦 Cache Inteligente

### Estratégia de Cache:
- **Dashboard de Afiliado:** 5 minutos
- **Estatísticas do Sistema:** 10 minutos
- **Ranking:** 5 minutos
- **Configurações:** 1 hora

### Headers de Cache:
- `X-Cache: HIT/MISS` - Status do cache
- `X-Cache-Key` - Chave utilizada
- `X-Response-Time` - Tempo de resposta

## 🛡️ Segurança e Rate Limiting

### Rate Limiting:
- **100 requisições por 15 minutos** (configurável)
- **Slow down** após 50 requisições
- **Headers informativos** sobre limites

### Segurança:
- **Helmet.js** para headers de segurança
- **CORS** configurado
- **Validação de entrada**
- **Logs de segurança**

## 📊 Monitoramento

### Métricas Disponíveis:
- **Uptime** do processo e sistema
- **Uso de memória** e CPU
- **Event loop delay**
- **Status dos microsserviços**
- **Estatísticas do cache**

### Health Checks:
- **Básico:** Status geral do gateway
- **Detalhado:** Status de todos os componentes
- **Serviços:** Status individual dos microsserviços

## 🔀 Roteamento Inteligente

### Funcionalidades:
- **Retry automático** em caso de falha
- **Timeout configurável** por serviço
- **Failover** para serviços indisponíveis
- **Load balancing** (futuro)

### Configuração de Proxy:
```javascript
{
  timeout: 30000,      // 30 segundos
  retries: 3,          // 3 tentativas
  retryDelay: 1000     // 1 segundo entre tentativas
}
```

## 📊 Agregação de Dados

### Dashboard Agregado:
Combina dados de múltiplos serviços:
- Dados do afiliado (Affiliate Service)
- Estrutura MLM (Affiliate Service)
- Configurações CPA (Config Service)
- Métricas calculadas

### Benefícios:
- **Redução de requisições** do frontend
- **Dados consistentes** em uma única resposta
- **Cache otimizado** para consultas frequentes
- **Fallback** em caso de falha de serviços

## 🚀 Performance

### Otimizações Implementadas:
- **Compressão gzip** de respostas
- **Cache Redis** para dados frequentes
- **Connection pooling** para microsserviços
- **Timeout otimizado** por serviço
- **Retry inteligente** com backoff

### Métricas de Performance:
- **Tempo de resposta:** < 500ms (com cache)
- **Throughput:** 100+ req/s
- **Disponibilidade:** 99.9%+

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
src/
├── app.js              # Aplicação Express principal
├── server.js           # Servidor HTTP
├── config/             # Configurações
├── cache/              # Serviço Redis
├── middleware/         # Middlewares (auth, cache)
├── routes/             # Rotas (api, health)
├── services/           # Serviços (proxy, aggregation)
└── utils/              # Utilitários
```

### Scripts Disponíveis

```bash
npm start          # Produção
npm run dev        # Desenvolvimento com nodemon
npm test           # Testes
npm run test:watch # Testes em modo watch
```

## 🐳 Deploy

### Railway

```bash
# Configurar variáveis no Railway
railway variables set NODE_ENV=production
railway variables set REDIS_URL=${{Redis.REDIS_URL}}
railway variables set AFFILIATE_SERVICE_URL=...

# Deploy
railway up
```

### Docker

```bash
# Build
docker build -t fature-api-gateway .

# Run
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis:6379 \
  fature-api-gateway
```

## 📈 Monitoramento em Produção

### Logs Estruturados:
- **Requisições** com tempo de resposta
- **Erros** com stack trace
- **Cache** hits/misses
- **Proxy** para microsserviços

### Alertas Recomendados:
- **Taxa de erro** > 5%
- **Tempo de resposta** > 2s
- **Microsserviços** indisponíveis
- **Cache** indisponível

## 🔄 Integração

### Frontend:
```javascript
// Usar o gateway como ponto único
const API_BASE = 'https://api-gateway.railway.app/api/v1';

// Dashboard agregado (otimizado)
const dashboard = await fetch(`${API_BASE}/affiliates/123/dashboard`);

// Proxy direto para serviços
const affiliates = await fetch(`${API_BASE}/affiliates`);
```

### Outros Serviços:
- **Autenticação** via headers
- **Rate limiting** respeitado
- **Retry** automático em falhas

## 📚 Documentação Adicional

- **Estratégia Arquitetural:** Documento completo da arquitetura
- **APIs dos Microsserviços:** Documentação individual
- **Guia de Deploy:** Instruções detalhadas

---

**Versão:** 2.0.0  
**Autor:** EderZiomek <ederziomek@upbet.com>  
**Data:** 24 de junho de 2025

**Funcionalidades v2.0:**
- ✅ Roteamento Inteligente
- ✅ Cache Redis
- ✅ Agregação de Dados
- ✅ Rate Limiting Avançado
- ✅ Monitoramento Completo
- ✅ Performance Otimizada

