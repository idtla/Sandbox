import { getTime } from './api.js';
import { startCountdown } from './countdown.js';

const eventSlug = 'preestreno-demo';
const countdownEl = document.getElementById('countdown');
const cta = document.getElementById('cta');

getTime(eventSlug).then((data) => {
  startCountdown(data.saleOpensAtUtc, countdownEl);
  const diff = new Date(data.saleOpensAtUtc) - new Date(data.serverNowUtc);
  setTimeout(() => (cta.disabled = false), diff);
});
