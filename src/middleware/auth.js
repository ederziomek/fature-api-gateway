const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware de autenticação JWT
const jwtAuth = (options = {}) => {
  const {
    required = true,
    skipPaths = [],
    extractToken = null
  } = options;

  return (req, res, next) => {
    // Verificar se o path deve ser pulado
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    let token;

    // Extrair token customizado se fornecido
    if (extractToken && typeof extractToken === 'function') {
      token = extractToken(req);
    } else {
      // Extrair token do header Authorization
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // Se token não for fornecido
    if (!token) {
      if (!required) {
        return next();
      }
      
      return res.status(401).json({
        error: 'Token de acesso obrigatório',
        message: 'Forneça um token JWT válido no header Authorization',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Verificar e decodificar o token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Adicionar informações do usuário ao request
      req.user = decoded;
      req.token = token;
      
      next();
      
    } catch (error) {
      let message = 'Token inválido';
      
      if (error.name === 'TokenExpiredError') {
        message = 'Token expirado';
      } else if (error.name === 'JsonWebTokenError') {
        message = 'Token malformado';
      }
      
      return res.status(403).json({
        error: 'Falha na autenticação',
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Middleware de autenticação por API Key
const apiKeyAuth = (options = {}) => {
  const {
    required = true,
    skipPaths = [],
    headerName = 'x-api-key',
    validKeys = []
  } = options;

  return (req, res, next) => {
    // Verificar se o path deve ser pulado
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const apiKey = req.headers[headerName.toLowerCase()];

    // Se API key não for fornecida
    if (!apiKey) {
      if (!required) {
        return next();
      }
      
      return res.status(401).json({
        error: 'API Key obrigatória',
        message: `Forneça uma API Key válida no header ${headerName}`,
        timestamp: new Date().toISOString()
      });
    }

    // Verificar se a API key é válida
    const isValidKey = validKeys.length === 0 || validKeys.includes(apiKey);
    
    if (!isValidKey) {
      return res.status(403).json({
        error: 'API Key inválida',
        message: 'A API Key fornecida não é válida',
        timestamp: new Date().toISOString()
      });
    }

    // Adicionar informações da API key ao request
    req.apiKey = apiKey;
    
    next();
  };
};

// Middleware de autorização por roles
const roleAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado',
        message: 'Autenticação necessária para acessar este recurso',
        timestamp: new Date().toISOString()
      });
    }

    // Verificar se o usuário tem role necessária
    const userRoles = req.user.roles || [];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso',
        requiredRoles: allowedRoles,
        userRoles: userRoles,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// Utilitário para gerar tokens JWT
const generateToken = (payload, options = {}) => {
  const {
    expiresIn = config.jwt.expiresIn,
    issuer = 'fature-api-gateway',
    audience = 'fature-system'
  } = options;

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn,
    issuer,
    audience
  });
};

// Utilitário para verificar tokens JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  jwtAuth,
  apiKeyAuth,
  roleAuth,
  generateToken,
  verifyToken
};

