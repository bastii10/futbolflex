const adminMiddleware = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No autorizado' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
  next();
};

module.exports = adminMiddleware;
