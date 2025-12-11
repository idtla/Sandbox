import type { Role } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: Role;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
