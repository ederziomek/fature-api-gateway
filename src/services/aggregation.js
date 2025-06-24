const proxyService = require('./proxy');
const cacheService = require('../cache/redis');
const config = require('../config');

class AggregationService {
  constructor() {
    this.timeout = config.aggregation.timeout;
    this.maxConcurrent = config.aggregation.maxConcurrent;
    this.enabled = config.aggregation.enabled;
  }

  // Agregar dados do dashboard de um afiliado
  async getAffiliateDashboard(affiliateId, options = {}) {
    if (!this.enabled) {
      throw new Error('Agregação de dados está desabilitada');
    }

    const { useCache = true, cacheTtl = 300 } = options; // 5 minutos de cache padrão
    const cacheKey = cacheService.generateKey('dashboard', affiliateId);

    // Tentar obter do cache primeiro
    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`📊 Dashboard agregado (cache): ${affiliateId}`);
        return cached;
      }
    }

    try {
      // Requisições paralelas para diferentes serviços
      const requests = [
        {
          id: 'affiliate',
          service: 'affiliate',
          options: {
            path: `/api/v1/affiliates/${affiliateId}`,
            method: 'GET'
          }
        },
        {
          id: 'mlm_structure',
          service: 'affiliate',
          options: {
            path: `/api/v1/affiliates/${affiliateId}/mlm-structure`,
            method: 'GET'
          }
        },
        {
          id: 'config',
          service: 'config',
          options: {
            path: '/api/v1/config/cpa_level_amounts/value',
            method: 'GET'
          }
        }
      ];

      const results = await proxyService.requestMultiple(requests);
      
      // Processar resultados
      const affiliateData = results.find(r => r.requestId === 'affiliate');
      const mlmData = results.find(r => r.requestId === 'mlm_structure');
      const configData = results.find(r => r.requestId === 'config');

      // Verificar se dados essenciais estão disponíveis
      if (!affiliateData?.success) {
        throw new Error('Dados do afiliado não disponíveis');
      }

      // Montar dashboard agregado
      const dashboard = {
        affiliate: affiliateData.data,
        mlm_structure: mlmData?.success ? mlmData.data : null,
        cpa_config: configData?.success ? configData.data : null,
        aggregated_at: new Date().toISOString(),
        services_status: {
          affiliate: affiliateData.success,
          mlm: mlmData?.success || false,
          config: configData?.success || false
        }
      };

      // Calcular métricas adicionais
      if (dashboard.mlm_structure && dashboard.cpa_config) {
        dashboard.calculated_metrics = this.calculateMetrics(
          dashboard.affiliate,
          dashboard.mlm_structure,
          dashboard.cpa_config
        );
      }

      // Cachear resultado
      if (useCache) {
        await cacheService.set(cacheKey, dashboard, cacheTtl);
      }

      console.log(`📊 Dashboard agregado (novo): ${affiliateId}`);
      return dashboard;

    } catch (error) {
      console.error(`❌ Erro ao agregar dashboard ${affiliateId}:`, error);
      throw error;
    }
  }

  // Agregar estatísticas gerais do sistema
  async getSystemStats(options = {}) {
    const { useCache = true, cacheTtl = 600 } = options; // 10 minutos de cache
    const cacheKey = cacheService.generateKey('system', 'stats');

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log('📊 Estatísticas do sistema (cache)');
        return cached;
      }
    }

    try {
      const requests = [
        {
          id: 'affiliate_stats',
          service: 'affiliate',
          options: {
            path: '/api/v1/affiliates/stats',
            method: 'GET'
          }
        },
        {
          id: 'config_stats',
          service: 'config',
          options: {
            path: '/api/v1/config/stats',
            method: 'GET'
          }
        }
      ];

      const results = await proxyService.requestMultiple(requests);
      
      const affiliateStats = results.find(r => r.requestId === 'affiliate_stats');
      const configStats = results.find(r => r.requestId === 'config_stats');

      const systemStats = {
        affiliate_stats: affiliateStats?.success ? affiliateStats.data : null,
        config_stats: configStats?.success ? configStats.data : null,
        aggregated_at: new Date().toISOString(),
        services_status: {
          affiliate: affiliateStats?.success || false,
          config: configStats?.success || false
        }
      };

      if (useCache) {
        await cacheService.set(cacheKey, systemStats, cacheTtl);
      }

      console.log('📊 Estatísticas do sistema (novo)');
      return systemStats;

    } catch (error) {
      console.error('❌ Erro ao agregar estatísticas do sistema:', error);
      throw error;
    }
  }

  // Agregar ranking de afiliados com dados adicionais
  async getAffiliateRanking(options = {}) {
    const { 
      limit = 50, 
      orderBy = 'cpa',
      useCache = true, 
      cacheTtl = 300 
    } = options;
    
    const cacheKey = cacheService.generateKey('ranking', orderBy, limit);

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`📊 Ranking de afiliados (cache): ${orderBy}`);
        return cached;
      }
    }

    try {
      const requests = [
        {
          id: 'ranking',
          service: 'affiliate',
          options: {
            path: `/api/v1/affiliates/ranking?limit=${limit}&order_by=${orderBy}`,
            method: 'GET'
          }
        },
        {
          id: 'config',
          service: 'config',
          options: {
            path: '/api/v1/config/cpa_level_amounts/value',
            method: 'GET'
          }
        }
      ];

      const results = await proxyService.requestMultiple(requests);
      
      const rankingData = results.find(r => r.requestId === 'ranking');
      const configData = results.find(r => r.requestId === 'config');

      if (!rankingData?.success) {
        throw new Error('Dados de ranking não disponíveis');
      }

      const ranking = {
        ranking: rankingData.data.ranking,
        config: configData?.success ? configData.data : null,
        order_by: orderBy,
        limit,
        aggregated_at: new Date().toISOString()
      };

      if (useCache) {
        await cacheService.set(cacheKey, ranking, cacheTtl);
      }

      console.log(`📊 Ranking de afiliados (novo): ${orderBy}`);
      return ranking;

    } catch (error) {
      console.error(`❌ Erro ao agregar ranking ${orderBy}:`, error);
      throw error;
    }
  }

  // Calcular métricas adicionais
  calculateMetrics(affiliateData, mlmData, configData) {
    const metrics = {};

    try {
      // Calcular potencial de ganhos por nível
      if (mlmData.structure_by_level && configData) {
        metrics.potential_earnings = {};
        
        Object.entries(mlmData.structure_by_level).forEach(([level, data]) => {
          const levelNum = parseInt(level.split('_')[1]);
          const cpaValue = configData[`level_${levelNum}`] || 0;
          
          metrics.potential_earnings[level] = {
            current_cpa: data.cpa,
            potential_cpa: data.count * cpaValue,
            efficiency: data.count > 0 ? (data.cpa / (data.count * cpaValue)) * 100 : 0
          };
        });
      }

      // Calcular taxa de conversão
      if (affiliateData.total_referrals && affiliateData.total_validated_referrals) {
        metrics.conversion_rate = (affiliateData.total_validated_referrals / affiliateData.total_referrals) * 100;
      }

      // Calcular valor médio por indicação
      if (affiliateData.total_validated_referrals && affiliateData.total_cpa_earned) {
        metrics.avg_cpa_per_referral = affiliateData.total_cpa_earned / affiliateData.total_validated_referrals;
      }

      // Calcular crescimento da rede
      if (mlmData.total_network_size) {
        metrics.network_growth = {
          total_size: mlmData.total_network_size,
          direct_referrals: mlmData.structure_by_level?.level_1?.count || 0,
          indirect_referrals: mlmData.total_network_size - (mlmData.structure_by_level?.level_1?.count || 0)
        };
      }

    } catch (error) {
      console.error('❌ Erro ao calcular métricas:', error);
      metrics.calculation_error = error.message;
    }

    return metrics;
  }

  // Invalidar cache relacionado a um afiliado
  async invalidateAffiliateCache(affiliateId) {
    const patterns = [
      `dashboard:${affiliateId}`,
      'ranking:*',
      'system:stats'
    ];

    for (const pattern of patterns) {
      try {
        if (pattern.includes('*')) {
          const keys = await cacheService.client?.keys(pattern);
          if (keys && keys.length > 0) {
            await Promise.all(keys.map(key => cacheService.del(key)));
          }
        } else {
          await cacheService.del(pattern);
        }
      } catch (error) {
        console.error(`❌ Erro ao invalidar cache ${pattern}:`, error);
      }
    }
  }
}

// Singleton instance
const aggregationService = new AggregationService();

module.exports = aggregationService;

