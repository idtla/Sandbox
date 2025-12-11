import { prisma } from '../lib/prisma';
import { verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          select: {
            projectId: true,
            teamId: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error('Usuario o contraseña incorrectos');
    }

    const token = signToken({ userId: user.id, role: user.role });
    const { password: _pw, ...safeUser } = user;
    return { token, user: safeUser };
  }

  static async profile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        color: true,
        hourlyRate: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    return user;
  }
}
