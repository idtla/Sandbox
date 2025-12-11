import ky from 'ky';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 10000,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set('Accept', 'application/json');
        request.headers.set('Content-Type', 'application/json');
      },
    ],
  },
  credentials: 'include',
});
