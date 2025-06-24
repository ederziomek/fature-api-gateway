const cacheService = require('../cache/redis');
const config = require('../config');

// Middleware de cache para respostas
const cacheMiddleware = (options = {}) => {
  const {
    ttl = config.redis.ttl,
    keyGenerator = null,
    skipCache = false,
    cacheOnlySuccess = true
  } = options;

  return async (req, res, next) => {
    // Pular cache se desabilitado ou se skipCache for true
    if (!config.redis.enabled || skipCache) {
      return next();
    }

    // Gerar chave do cache
    let cacheKey;
    if (keyGenerator && typeof keyGenerator === 'function') {
      cacheKey = keyGenerator(req);
    } else {
      // Chave padrão baseada na URL e query params
      const queryString = Object.keys(req.query).length > 0 
        ? '?' + new URLSearchParams(req.query).toString()
        : '';
      cacheKey = cacheService.generateKey('api', req.method, req.path + queryString);
    }

    try {
      // Tentar obter do cache
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        console.log(`📦 Cache HIT: ${cacheKey}`);
        
        // Adicionar headers de cache
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Content-Type': 'application/json'
        });
        
        return res.json(cachedResponse);
      }

      console.log(`📦 Cache MISS: ${cacheKey}`);

      // Interceptar a resposta para cachear
      const originalJson = res.json;
      res.json = function(data) {
        // Cachear apenas respostas de sucesso se cacheOnlySuccess for true
        if (!cacheOnlySuccess || (res.statusCode >= 200 && res.statusCode < 300)) {
          // Cachear de forma assíncrona para não bloquear a resposta
          setImmediate(async () => {
            try {
              await cacheService.set(cacheKey, data, ttl);
              console.log(`📦 Cache SET: ${cacheKey}`);
            } catch (error) {
              console.error('❌ Erro ao cachear resposta:', error);
            }
          });
        }

        // Adicionar headers de cache
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });

        // Chamar o método original
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      console.error('❌ Erro no middleware de cache:', error);
      // Em caso de erro, continuar sem cache
      next();
    }
  };
};

// Middleware para invalidar cache
const invalidateCacheMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    // Executar a operação primeiro
    const originalJson = res.json;
    res.json = function(data) {
      // Invalidar cache de forma assíncrona após a resposta
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            for (const pattern of patterns) {
              const keys = await cacheService.client?.keys(pattern);
              if (keys && keys.length > 0) {
                await Promise.all(keys.map(key => cacheService.del(key)));
                console.log(`📦 Cache invalidado: ${keys.length} chaves removidas para padrão ${pattern}`);
              }
            }
          } catch (error) {
            console.error('❌ Erro ao invalidar cache:', error);
          }
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware para estatísticas de cache
const cacheStatsMiddleware = () => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    const originalJson = res.json;
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Adicionar estatísticas aos headers
      res.set({
        'X-Response-Time': `${responseTime}ms`,
        'X-Timestamp': new Date().toISOString()
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  cacheStatsMiddleware
};

