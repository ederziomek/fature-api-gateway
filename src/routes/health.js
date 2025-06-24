const express = require('express');
const router = express.Router();
const proxyService = require('../services/proxy');
const cacheService = require('../cache/redis');
const config = require('../config');

// Health check básico
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar status básico do gateway
    const gatewayStatus = {
      status: 'ok',
      message: 'API Gateway funcionando'
    };

    // Verificar cache Redis
    let cacheStatus = 'unknown';
    let cacheMessage = 'Cache não configurado';
    
    if (config.redis.enabled) {
      try {
        const cacheStats = await cacheService.getStats();
        cacheStatus = cacheStats.connected ? 'ok' : 'error';
        cacheMessage = cacheStats.connected ? 'Cache conectado' : cacheStats.error;
      } catch (error) {
        cacheStatus = 'error';
        cacheMessage = error.message;
      }
    }

    const responseTime = Date.now() - startTime;
    
    const healthData = {
      success: true,
      message: 'API Gateway funcionando',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      service: config.server.serviceName,
      environment: config.server.env,
      uptime: process.uptime(),
      checks: {
        gateway: gatewayStatus,
        cache: {
          status: cacheStatus,
          message: cacheMessage,
          enabled: config.redis.enabled
        }
      },
      responseTime
    };

    res.status(200).json(healthData);
    
  } catch (error) {
    console.error('❌ Erro no health check:', error);
    
    res.status(503).json({
      success: false,
      message: 'API Gateway com problemas',
      timestamp: new Date().toISOString(),
      service: config.server.serviceName,
      error: error.message
    });
  }
});

// Health check detalhado com status dos microsserviços
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar todos os microsserviços
    const servicesHealth = await proxyService.healthCheckAll();
    
    // Estatísticas do cache
    let cacheStats = null;
    if (config.redis.enabled) {
      cacheStats = await cacheService.getStats();
    }

    // Informações dos serviços configurados
    const servicesInfo = proxyService.getServicesInfo();

    const responseTime = Date.now() - startTime;
    
    const detailedHealth = {
      success: true,
      service: config.server.serviceName,
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: config.server.env,
      uptime: {
        process: process.uptime(),
        system: require('os').uptime()
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      },
      configuration: {
        cacheEnabled: config.redis.enabled,
        aggregationEnabled: config.aggregation.enabled,
        monitoringEnabled: config.monitoring.enabled,
        rateLimitMax: config.rateLimit.max,
        rateLimitWindow: config.rateLimit.windowMs
      },
      services: {
        configured: servicesInfo,
        health: servicesHealth
      },
      cache: cacheStats,
      responseTime
    };

    // Determinar status geral baseado na saúde dos serviços
    const healthyServices = servicesHealth.filter(s => s.healthy).length;
    const totalServices = servicesHealth.length;
    
    if (healthyServices === totalServices) {
      detailedHealth.overallStatus = 'healthy';
    } else if (healthyServices > 0) {
      detailedHealth.overallStatus = 'degraded';
    } else {
      detailedHealth.overallStatus = 'unhealthy';
    }

    res.status(200).json(detailedHealth);
    
  } catch (error) {
    console.error('❌ Erro no health check detalhado:', error);
    
    res.status(503).json({
      success: false,
      error: 'Erro no health check detalhado',
      message: error.message,
      service: config.server.serviceName,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para métricas de performance
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      eventLoop: {
        delay: await getEventLoopDelay()
      },
      cache: {
        enabled: config.redis.enabled,
        stats: config.redis.enabled ? await cacheService.getStats() : null
      },
      services: {
        configured: proxyService.getServicesInfo().length,
        healthy: (await proxyService.healthCheckAll()).filter(s => s.healthy).length
      }
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao obter métricas:', error);
    res.status(500).json({
      error: 'Erro ao obter métricas',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para status dos serviços
router.get('/services', async (req, res) => {
  try {
    const servicesHealth = await proxyService.healthCheckAll();
    const servicesInfo = proxyService.getServicesInfo();

    const servicesStatus = servicesInfo.map(info => {
      const health = servicesHealth.find(h => h.service === info.name);
      return {
        ...info,
        healthy: health?.healthy || false,
        responseTime: health?.responseTime || null,
        lastCheck: new Date().toISOString(),
        error: health?.error || null
      };
    });

    res.json({
      success: true,
      data: {
        services: servicesStatus,
        summary: {
          total: servicesStatus.length,
          healthy: servicesStatus.filter(s => s.healthy).length,
          unhealthy: servicesStatus.filter(s => !s.healthy).length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao obter status dos serviços:', error);
    res.status(500).json({
      error: 'Erro ao obter status dos serviços',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Utilitário para medir delay do event loop
function getEventLoopDelay() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delta = process.hrtime.bigint() - start;
      resolve(Number(delta) / 1000000); // Converter para ms
    });
  });
}

module.exports = router;

