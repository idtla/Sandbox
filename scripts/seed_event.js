import { insertEvent } from '../server/repo/events.js';

const opensAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
const event = {
  slug: 'preestreno-demo',
  title: 'Preestreno demo',
  opens_at: opensAt,
  state: 'pre',
  total: 50,
  remaining: 50,
  per_user_limit: 2,
  location: 'Madrid',
  hero_url: '',
  description_md: '',
  legal_md: '',
};
insertEvent(event);
console.log('Evento demo creado');
