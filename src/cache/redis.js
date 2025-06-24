const redis = require('redis');
const config = require('../config');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
  }

  async connect() {
    if (!config.redis.enabled) {
      console.log('📦 Cache Redis desabilitado');
      return;
    }

    try {
      this.client = redis.createClient({
        url: config.redis.url,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis: Conexão recusada');
            return new Error('Redis: Conexão recusada');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis: Timeout de retry excedido');
            return new Error('Redis: Timeout de retry excedido');
          }
          if (options.attempt > this.maxRetries) {
            console.error('❌ Redis: Máximo de tentativas excedido');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔗 Redis: Conectando...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Conectado e pronto');
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on('end', () => {
        console.log('📴 Redis: Conexão encerrada');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('❌ Erro ao conectar Redis:', error);
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('❌ Erro ao obter cache:', error);
      return null;
    }
  }

  async set(key, value, ttl = config.redis.ttl) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('❌ Erro ao definir cache:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar cache:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Erro ao verificar existência no cache:', error);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
      return false;
    }
  }

  async getStats() {
    if (!this.isConnected || !this.client) {
      return {
        connected: false,
        error: 'Redis não conectado'
      };
    }

    try {
      const info = await this.client.info();
      return {
        connected: true,
        info: info
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('📴 Redis: Desconectado');
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;

