import { create } from 'zustand';
import type { User } from '../types';

type SessionState = {
  user?: User;
  token?: string;
  setSession: (data: { user: User; token?: string }) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: undefined,
  token: undefined,
  setSession: ({ user, token }) =>
    set({
      user,
      token,
    }),
  clear: () =>
    set({
      user: undefined,
      token: undefined,
    }),
}));
