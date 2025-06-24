const app = require('./app');
const config = require('./config');
const cacheService = require('./cache/redis');

const PORT = config.server.port;
const SERVICE_NAME = config.server.serviceName;

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ${SERVICE_NAME} v2.0 rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
  console.log(`📚 Documentação: http://localhost:${PORT}/docs`);
  console.log(`🌍 Ambiente: ${config.server.env}`);
  
  // Log das funcionalidades ativas
  console.log('\n🎯 Funcionalidades Ativas:');
  console.log(`   ✅ Roteamento Inteligente`);
  console.log(`   ${config.redis.enabled ? '✅' : '❌'} Cache Redis`);
  console.log(`   ${config.aggregation.enabled ? '✅' : '❌'} Agregação de Dados`);
  console.log(`   ✅ Rate Limiting (${config.rateLimit.max} req/${config.rateLimit.windowMs/60000}min)`);
  console.log(`   ${config.monitoring.enabled ? '✅' : '❌'} Monitoramento`);
  
  console.log('\n🔗 Microsserviços Configurados:');
  Object.entries(config.services).forEach(([name, service]) => {
    console.log(`   • ${name}: ${service.url}`);
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n📴 Recebido ${signal}, encerrando API Gateway...`);
  
  // Fechar servidor HTTP
  server.close(async () => {
    console.log('✅ Servidor HTTP encerrado');
    
    try {
      // Fechar conexão Redis
      if (config.redis.enabled) {
        await cacheService.disconnect();
      }
      
      console.log('✅ Recursos liberados com sucesso');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro ao liberar recursos:', error);
      process.exit(1);
    }
  });

  // Forçar encerramento após 15 segundos
  setTimeout(() => {
    console.error('❌ Forçando encerramento do API Gateway');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado no API Gateway:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada no API Gateway:', reason);
  process.exit(1);
});

// Log de inicialização
console.log('\n🚀 API Gateway Robusto - Sistema Fature CPA');
console.log('================================================');

module.exports = server;

