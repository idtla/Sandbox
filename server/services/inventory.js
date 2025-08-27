export function holdTickets(eventId, email, qty) {
  // TODO: implementar lógica de reservas con TTL
  return { id: 'mock-hold', expiresAt: new Date(Date.now() + 180000).toISOString() };
}

export function confirmHold(holdId) {
  // TODO: convertir hold en tickets reales
  return { locator: 'MOCK-LOC', codes: ['MOCK-QR'] };
}
