import { forbidden } from "../utils/httpError.js";
import { hasPermission } from "../utils/permissions.js";

export const authorizeRoles = (...allowedRoles) => (req, _res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return next(forbidden());
  }

  return next();
};

export const requirePermission = (permission) => (req, _res, next) => {
  if (!hasPermission(req.user.role, permission)) {
    return next(forbidden());
  }

  return next();
};
