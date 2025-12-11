import { NextFunction, Request, Response } from 'express';
import type { Role } from '../generated/prisma/client';

export const roleGuard =
  (accepted: Role[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!accepted.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permisos insuficientes' });
    }

    return next();
  };
