const express = require('express');
const router = express.Router();
const proxyService = require('../services/proxy');
const aggregationService = require('../services/aggregation');
const { cacheMiddleware } = require('../middleware/cache');
const config = require('../config');

// Health check endpoint para /api/v1/health
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar status básico do gateway
    const gatewayStatus = {
      status: 'ok',
      message: 'API Gateway funcionando'
    };

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
        gateway: gatewayStatus
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

// Rota para dashboard agregado de afiliado
router.get('/affiliates/:id/dashboard', 
  cacheMiddleware({ ttl: 300 }), // 5 minutos de cache
  async (req, res) => {
    try {
      const affiliateId = req.params.id;
      const useCache = req.query.cache !== 'false';
      
      const dashboard = await aggregationService.getAffiliateDashboard(affiliateId, {
        useCache,
        cacheTtl: 300
      });

      res.json({
        success: true,
        data: dashboard,
        source: 'aggregated',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro no dashboard agregado:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível obter o dashboard agregado',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Rota para estatísticas do sistema
router.get('/system/stats',
  cacheMiddleware({ ttl: 600 }), // 10 minutos de cache
  async (req, res) => {
    try {
      const useCache = req.query.cache !== 'false';
      
      const stats = await aggregationService.getSystemStats({
        useCache,
        cacheTtl: 600
      });

      res.json({
        success: true,
        data: stats,
        source: 'aggregated',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro nas estatísticas do sistema:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível obter as estatísticas do sistema',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Rota para ranking agregado
router.get('/affiliates/ranking',
  cacheMiddleware({ ttl: 300 }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const orderBy = req.query.order_by || 'cpa';
      const useCache = req.query.cache !== 'false';
      
      const ranking = await aggregationService.getAffiliateRanking({
        limit,
        orderBy,
        useCache,
        cacheTtl: 300
      });

      res.json({
        success: true,
        data: ranking,
        source: 'aggregated',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro no ranking agregado:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível obter o ranking agregado',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Proxy direto para Affiliate Service
router.use('/affiliates', async (req, res) => {
  try {
    const result = await proxyService.request('affiliate', {
      method: req.method,
      path: `/api/v1/affiliates${req.path}`,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Authorization': req.headers.authorization
      }
    });

    res.status(result.status).json(result.data);

  } catch (error) {
    console.error('❌ Erro no proxy para Affiliate Service:', error);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível conectar ao Affiliate Service',
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy direto para Config Service
router.use('/config', async (req, res) => {
  try {
    const result = await proxyService.request('config', {
      method: req.method,
      path: `/api/v1/config${req.path}`,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Authorization': req.headers.authorization
      }
    });

    res.status(result.status).json(result.data);

  } catch (error) {
    console.error('❌ Erro no proxy para Config Service:', error);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível conectar ao Config Service',
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy direto para MLM Service
router.use('/mlm', async (req, res) => {
  try {
    const result = await proxyService.request('mlm', {
      method: req.method,
      path: `/api/v1/mlm${req.path}`,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Authorization': req.headers.authorization
      }
    });

    res.status(result.status).json(result.data);

  } catch (error) {
    console.error('❌ Erro no proxy para MLM Service:', error);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível conectar ao MLM Service',
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy direto para Commission Service
router.use('/commission', async (req, res) => {
  try {
    const result = await proxyService.request('commission', {
      method: req.method,
      path: `/api/v1/commission${req.path}`,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Authorization': req.headers.authorization
      }
    });

    res.status(result.status).json(result.data);

  } catch (error) {
    console.error('❌ Erro no proxy para Commission Service:', error);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível conectar ao Commission Service',
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy direto para Data Service
router.use('/data', async (req, res) => {
  try {
    const result = await proxyService.request('data', {
      method: req.method,
      path: `/api/v1/data${req.path}`,
      data: req.body,
      headers: {
        'Content-Type': req.headers['content-type'],
        'Authorization': req.headers.authorization
      }
    });

    res.status(result.status).json(result.data);

  } catch (error) {
    console.error('❌ Erro no proxy para Data Service:', error);
    res.status(503).json({
      error: 'Serviço indisponível',
      message: 'Não foi possível conectar ao Data Service',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

