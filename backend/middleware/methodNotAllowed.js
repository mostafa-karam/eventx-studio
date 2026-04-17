const logger = require('../utils/logger');

const normalizePath = (value) => {
  if (!value) return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash !== '/' && withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
};

const collectAllowedMethods = (stack, requestPath, methods = new Set()) => {
  for (const layer of stack) {
    if (typeof layer.match !== 'function' || !layer.match(requestPath)) {
      continue;
    }

    if (layer.route?.methods) {
      Object.entries(layer.route.methods).forEach(([method, enabled]) => {
        if (enabled) methods.add(method.toUpperCase());
      });
      continue;
    }

    if (layer.name === 'router' && Array.isArray(layer.handle?.stack)) {
      const nestedPath = layer.path ? requestPath.slice(layer.path.length) || '/' : requestPath;
      collectAllowedMethods(layer.handle.stack, normalizePath(nestedPath), methods);
    }
  }

  return methods;
};

const methodNotAllowed = (app) => (req, res, next) => {
  if (!app?._router?.stack) return next();
  const requestPath = normalizePath(req.path);
  const allowedMethods = collectAllowedMethods(app._router.stack, requestPath);

  if (allowedMethods.size === 0 || allowedMethods.has(req.method)) {
    return next();
  }

  const allowHeader = Array.from(new Set([...allowedMethods, 'OPTIONS'])).sort().join(', ');
  res.set('Allow', allowHeader);

  logger.warn('Method not allowed', {
    method: req.method,
    path: req.originalUrl,
    allow: allowHeader,
  });

  return res.status(405).json({
    success: false,
    data: null,
    error: `Method ${req.method} not allowed for this route`,
    message: `Method ${req.method} not allowed for this route`,
  });
};

module.exports = methodNotAllowed;
