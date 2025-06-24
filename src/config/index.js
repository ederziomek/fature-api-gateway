require('dotenv').config();

const config = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    serviceName: 'api-gateway'
  },

  // Redis para cache
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hora
    enabled: process.env.CACHE_ENABLED !== 'false'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fature_gateway_jwt_secret_2025',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: true
  },

  // Slow down (proteção adicional)
  slowDown: {
    windowMs: parseInt(process.env.SLOW_DOWN_WINDOW_MS) || 900000, // 15 minutos
    delayAfter: parseInt(process.env.SLOW_DOWN_DELAY_AFTER) || 50,
    delayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS) || 500
  },

  // Microsserviços
  services: {
    affiliate: {
      url: process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3001',
      apiKey: process.env.AFFILIATE_SERVICE_API_KEY,
      timeout: parseInt(process.env.AFFILIATE_SERVICE_TIMEOUT) || 10000
    },
    config: {
      url: process.env.CONFIG_SERVICE_URL || 'https://fature-config-service-production.up.railway.app',
      apiKey: process.env.CONFIG_SERVICE_API_KEY,
      timeout: parseInt(process.env.CONFIG_SERVICE_TIMEOUT) || 10000
    },
    mlm: {
      url: process.env.MLM_SERVICE_URL || 'https://fature-mlm-service-v2-production.up.railway.app',
      apiKey: process.env.MLM_SERVICE_API_KEY,
      timeout: parseInt(process.env.MLM_SERVICE_TIMEOUT) || 10000
    },
    commission: {
      url: process.env.COMMISSION_SERVICE_URL || 'https://fature-commission-service-production.up.railway.app',
      apiKey: process.env.COMMISSION_SERVICE_API_KEY,
      timeout: parseInt(process.env.COMMISSION_SERVICE_TIMEOUT) || 10000
    },
    data: {
      url: process.env.DATA_SERVICE_URL || 'https://fature-data-service-v2-production.up.railway.app',
      apiKey: process.env.DATA_SERVICE_API_KEY,
      timeout: parseInt(process.env.DATA_SERVICE_TIMEOUT) || 10000
    }
  },

  // Configurações de proxy
  proxy: {
    timeout: parseInt(process.env.PROXY_TIMEOUT) || 30000,
    retries: parseInt(process.env.PROXY_RETRIES) || 3,
    retryDelay: parseInt(process.env.PROXY_RETRY_DELAY) || 1000
  },

  // Configurações de agregação
  aggregation: {
    enabled: process.env.AGGREGATION_ENABLED !== 'false',
    timeout: parseInt(process.env.AGGREGATION_TIMEOUT) || 5000,
    maxConcurrent: parseInt(process.env.AGGREGATION_MAX_CONCURRENT) || 5
  },

  // Configurações de monitoramento
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info',
    metricsEnabled: process.env.METRICS_ENABLED !== 'false'
  }
};

module.exports = config;

