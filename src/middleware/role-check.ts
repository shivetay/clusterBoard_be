import type { NextFunction, Request, Response } from 'express';
import type { TUserRoleType } from '../model/types/userModel.type';
import { STATUSES } from '../utils';

export const checkRole = (...allowedRoles: TUserRoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(STATUSES.UNAUTHORIZED).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(STATUSES.FORBIDDEN).json({
        error: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

export const requireClusterGod = checkRole('cluster_god');
export const requireOwnerOrGod = checkRole('cluster_owner', 'cluster_god');
export const requireAnyAuthenticated = checkRole(
  'investor',
  'cluster_owner',
  'cluster_god',
  'team_member',
);
