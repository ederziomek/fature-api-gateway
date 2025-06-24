const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const config = require('./config');
const cacheService = require('./cache/redis');
const { cacheStatsMiddleware } = require('./middleware/cache');

// Importar rotas
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');

const app = express();

// Conectar ao Redis (se habilitado)
if (config.redis.enabled) {
  cacheService.connect().catch(console.error);
}

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para APIs
  crossOriginEmbedderPolicy: false
}));

// Compressão de respostas
app.use(compression());

// CORS - permitir todas as origens para desenvolvimento
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
  message: {
    error: 'Muitas requisições',
    message: 'Limite de requisições excedido, tente novamente mais tarde',
    service: config.server.serviceName,
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Slow down para proteção adicional
const speedLimiter = slowDown({
  windowMs: config.slowDown.windowMs,
  delayAfter: config.slowDown.delayAfter,
  delayMs: config.slowDown.delayMs,
  maxDelayMs: 5000 // Máximo de 5 segundos de delay
});

app.use('/api/', speedLimiter);

// Logging
if (config.server.env !== 'test') {
  const logFormat = config.server.env === 'development' 
    ? 'dev' 
    : 'combined';
  app.use(morgan(logFormat));
}

// Middleware de estatísticas
app.use(cacheStatsMiddleware());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (sem autenticação)
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: config.server.serviceName,
    message: 'API Gateway Robusto - Sistema Fature CPA',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Roteamento Inteligente',
      'Cache Redis',
      'Agregação de Dados',
      'Rate Limiting',
      'Monitoramento',
      'Proxy para Microsserviços'
    ],
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      metrics: '/health/metrics',
      services: '/health/services',
      api: '/api/v1',
      docs: '/docs'
    }
  });
});

// Documentação da API
app.get('/docs', (req, res) => {
  res.json({
    service: config.server.serviceName,
    version: '2.0.0',
    description: 'API Gateway Robusto com Roteamento Inteligente e Cache',
    
    features: {
      'Roteamento Inteligente': 'Proxy automático para microsserviços com retry e timeout',
      'Cache Redis': 'Cache inteligente de respostas com TTL configurável',
      'Agregação de Dados': 'Combinação de dados de múltiplos serviços',
      'Rate Limiting': 'Proteção contra abuso com limites configuráveis',
      'Monitoramento': 'Health checks e métricas de performance',
      'Autenticação': 'Suporte a JWT e API Keys'
    },

    endpoints: {
      // Endpoints agregados
      'GET /api/v1/affiliates/:id/dashboard': 'Dashboard agregado de afiliado (cache 5min)',
      'GET /api/v1/system/stats': 'Estatísticas do sistema (cache 10min)',
      'GET /api/v1/affiliates/ranking': 'Ranking agregado (cache 5min)',
      
      // Proxy direto para serviços
      'ALL /api/v1/affiliates/*': 'Proxy para Affiliate Service',
      'ALL /api/v1/config/*': 'Proxy para Config Service',
      'ALL /api/v1/mlm/*': 'Proxy para MLM Service',
      'ALL /api/v1/commission/*': 'Proxy para Commission Service',
      'ALL /api/v1/data/*': 'Proxy para Data Service',
      
      // Monitoramento
      'GET /health': 'Health check básico',
      'GET /health/detailed': 'Health check detalhado com status dos serviços',
      'GET /health/metrics': 'Métricas de performance',
      'GET /health/services': 'Status individual dos microsserviços'
    },

    cache: {
      enabled: config.redis.enabled,
      defaultTtl: config.redis.ttl,
      description: 'Cache automático de respostas com invalidação inteligente'
    },

    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.max,
      description: `${config.rateLimit.max} requisições por ${config.rateLimit.windowMs / 60000} minutos`
    },

    services: Object.keys(config.services).map(name => ({
      name,
      url: config.services[name].url,
      timeout: config.services[name].timeout
    }))
  });
});

// API Routes principais
app.use('/api/v1', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `O endpoint ${req.method} ${req.originalUrl} não existe`,
    service: config.server.serviceName,
    availableEndpoints: [
      'GET /',
      'GET /docs',
      'GET /health',
      'GET /health/detailed',
      'GET /api/v1/*'
    ],
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Erro capturado no API Gateway:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Erro de rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Muitas requisições',
      message: 'Limite de requisições excedido',
      service: config.server.serviceName,
      timestamp: new Date().toISOString()
    });
  }

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      message: err.message,
      service: config.server.serviceName,
      timestamp: new Date().toISOString()
    });
  }

  // Erro genérico
  const statusCode = err.statusCode || err.status || 500;
  
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Erro interno do servidor' : err.message,
    message: config.server.env === 'development' ? err.message : 'Algo deu errado no gateway',
    service: config.server.serviceName,
    timestamp: new Date().toISOString(),
    ...(config.server.env === 'development' && { stack: err.stack })
  });
});

module.exports = app;

