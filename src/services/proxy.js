const axios = require('axios');
const config = require('../config');

class ProxyService {
  constructor() {
    this.services = config.services;
    this.defaultTimeout = config.proxy.timeout;
    this.retries = config.proxy.retries;
    this.retryDelay = config.proxy.retryDelay;
  }

  // Fazer requisição para um microsserviço específico
  async request(serviceName, options = {}) {
    const service = this.services[serviceName];
    
    if (!service) {
      throw new Error(`Serviço '${serviceName}' não encontrado`);
    }

    const {
      method = 'GET',
      path = '',
      data = null,
      headers = {},
      timeout = service.timeout || this.defaultTimeout,
      retries = this.retries
    } = options;

    // Preparar headers com API key
    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Fature-API-Gateway/2.0',
      ...headers
    };

    if (service.apiKey) {
      requestHeaders['X-API-Key'] = service.apiKey;
    }

    // Configuração da requisição
    const requestConfig = {
      method: method.toUpperCase(),
      url: `${service.url}${path}`,
      headers: requestHeaders,
      timeout,
      validateStatus: (status) => status < 500 // Não rejeitar para status 4xx
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      requestConfig.data = data;
    }

    // Tentar fazer a requisição com retry
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await axios(requestConfig);
        const responseTime = Date.now() - startTime;

        // Log da requisição
        console.log(`🔗 Proxy ${serviceName}: ${method.toUpperCase()} ${path} - ${response.status} (${responseTime}ms)`);

        return {
          success: true,
          status: response.status,
          data: response.data,
          headers: response.headers,
          responseTime,
          service: serviceName
        };

      } catch (error) {
        lastError = error;
        
        // Se não for erro de rede/timeout, não tentar novamente
        if (error.response && error.response.status < 500) {
          console.log(`🔗 Proxy ${serviceName}: ${method.toUpperCase()} ${path} - ${error.response.status}`);
          
          return {
            success: false,
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
            error: error.response.data?.message || 'Erro no serviço',
            service: serviceName
          };
        }

        // Log do erro e retry se necessário
        console.error(`❌ Proxy ${serviceName} (tentativa ${attempt + 1}/${retries + 1}):`, error.message);
        
        if (attempt < retries) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    console.error(`❌ Proxy ${serviceName}: Todas as tentativas falharam`);
    
    return {
      success: false,
      status: 503,
      data: {
        error: 'Serviço indisponível',
        message: `Não foi possível conectar ao serviço ${serviceName}`,
        service: serviceName,
        attempts: retries + 1
      },
      error: lastError?.message || 'Serviço indisponível',
      service: serviceName
    };
  }

  // Fazer múltiplas requisições em paralelo
  async requestMultiple(requests = []) {
    const promises = requests.map(async (req) => {
      try {
        const result = await this.request(req.service, req.options);
        return {
          ...result,
          requestId: req.id || req.service
        };
      } catch (error) {
        return {
          success: false,
          status: 500,
          error: error.message,
          service: req.service,
          requestId: req.id || req.service
        };
      }
    });

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          status: 500,
          error: result.reason?.message || 'Erro desconhecido',
          service: requests[index].service,
          requestId: requests[index].id || requests[index].service
        };
      }
    });
  }

  // Verificar saúde de um serviço
  async healthCheck(serviceName) {
    try {
      const result = await this.request(serviceName, {
        path: '/health',
        timeout: 5000
      });

      return {
        service: serviceName,
        healthy: result.success && result.status === 200,
        status: result.status,
        responseTime: result.responseTime,
        data: result.data
      };
    } catch (error) {
      return {
        service: serviceName,
        healthy: false,
        error: error.message
      };
    }
  }

  // Verificar saúde de todos os serviços
  async healthCheckAll() {
    const serviceNames = Object.keys(this.services);
    const healthChecks = await Promise.allSettled(
      serviceNames.map(name => this.healthCheck(name))
    );

    return healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: serviceNames[index],
          healthy: false,
          error: result.reason?.message || 'Erro no health check'
        };
      }
    });
  }

  // Utilitário para delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obter estatísticas dos serviços
  getServicesInfo() {
    return Object.entries(this.services).map(([name, service]) => ({
      name,
      url: service.url,
      timeout: service.timeout || this.defaultTimeout,
      hasApiKey: !!service.apiKey
    }));
  }
}

// Singleton instance
const proxyService = new ProxyService();

module.exports = proxyService;

