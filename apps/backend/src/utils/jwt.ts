import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

type Payload = {
  userId: string;
  role: string;
};

const secret: Secret = env.jwtSecret as Secret;

export const signToken = (
  payload: Payload,
  expiresIn: SignOptions['expiresIn'] = '12h',
) => {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string) => jwt.verify(token, secret) as Payload;
