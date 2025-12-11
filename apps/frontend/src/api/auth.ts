import { api } from './client';
import type { User } from '../types';

type LoginResponse = {
  user: User;
  token: string;
};

export const loginRequest = (email: string, password: string) =>
  api.post('auth/login', { json: { email, password } }).json<LoginResponse>();

export const logoutRequest = () => api.post('auth/logout').json<{ message: string }>();

export const meRequest = () => api.get('auth/me').json<User>();
