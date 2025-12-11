import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    const body = loginSchema.parse(req.body);
    const { token, user } = await AuthService.login(body.email, body.password);
    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 12,
      })
      .json({ user, token });
  }

  static async me(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const profile = await AuthService.profile(req.user.id);
    return res.json(profile);
  }

  static async logout(_: Request, res: Response) {
    res.clearCookie('token').json({ message: 'Sesión cerrada' });
  }
}
