import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';

const extractToken = (req: Request) => {
  const bearer = req.headers.authorization;
  if (bearer?.startsWith('Bearer ')) {
    return bearer.replace('Bearer ', '').trim();
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
};

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, name: true, email: true, color: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    req.user = { id: user.id, role: user.role };
    res.locals.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};
