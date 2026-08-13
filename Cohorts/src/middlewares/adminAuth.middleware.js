const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const { env } = require('../config/env');

const JWT_SECRET = env.jwtSecret || process.env.JWT_SECRET || 'turingwings_admin_secret_key_2026';

function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || decoded.role !== 'ADMIN') {
      throw new AppError(HTTP_STATUS.FORBIDDEN, 'Access denied. Administrator privileges required.');
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired session token. Please log in again.'));
    }
  }
}

module.exports = { requireAdmin, JWT_SECRET };
