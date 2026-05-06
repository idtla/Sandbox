const mockReservations = [
  {
    id: 'RES-2026-0506',
    status: 'reservado_con_senal',
    bookingType: 'daily_partial',
    vehicleId: 'v300d',
    customer: { name: 'Marta Gil', phone: '+34 600 123 123' },
    payment: { depositPaid: 224, finalTotal: 560, pending: 336 },
    occupancy: {
      '2026-05-10': { mode: 'partial', slots: [
        { id: 's1', start: '12:00', end: '14:00' },
        { id: 's2', start: '17:00', end: '20:00' }
      ] },
      '2026-05-11': { mode: 'partial', slots: [
        { id: 's3', start: '09:00', end: '11:00' }
      ] }
    }
  },
  {
    id: 'RES-2026-0510',
    status: 'reservado_con_senal',
    bookingType: 'daily_full',
    vehicleId: 'sprinter-lux',
    customer: { name: 'Grupo Atlas', phone: '+34 600 999 001' },
    payment: { depositPaid: 500, finalTotal: 1800, pending: 1300 },
    occupancy: {
      '2026-05-14': { mode: 'full_day', slots: [] },
      '2026-05-15': { mode: 'full_day', slots: [] },
      '2026-05-16': { mode: 'full_day', slots: [] }
    }
  },
  {
    id: 'RES-2026-0520',
    status: 'confirmada',
    bookingType: 'hourly',
    vehicleId: 'v-class',
    customer: { name: 'Lucía Flores', phone: '+34 600 000 777' },
    payment: { depositPaid: 150, finalTotal: 350, pending: 0 },
    occupancy: { '2026-05-20': { mode: 'partial', slots: [{ id: 's4', start: '10:00', end: '13:00' }] } }
  },
  {
    id: 'RES-2026-0530',
    status: 'cancelada',
    bookingType: 'daily_partial',
    vehicleId: 'vito',
    customer: { name: 'Carlos Redondo', phone: '+34 600 222 333' },
    payment: { depositPaid: 100, finalTotal: 300, pending: 200 },
    occupancy: {}
  }
];

const state = { reservations: mockReservations, selectedReservationId: mockReservations[0].id, selectedDate: null, currentMonth: new Date('2026-05-01') };
const els = {
  reservationList: document.getElementById('reservation-list'), calendar: document.getElementById('calendar'), calendarMonth: document.getElementById('calendar-month'),
  reservationTitle: document.getElementById('reservation-title'), reservationMeta: document.getElementById('reservation-meta'), selectedDayTitle: document.getElementById('selected-day-title'),
  daySlots: document.getElementById('day-slots'), financeBox: document.getElementById('finance-box'), hourCheckboxes: document.getElementById('hour-checkboxes')
};

const getReservation = () => state.reservations.find(r => r.id === state.selectedReservationId);
const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const getDayMode = (reservation, day) => reservation.occupancy[day]?.mode ?? 'free';

function addSlot(reservation, day, slot) {
  if (!reservation.occupancy[day] || reservation.occupancy[day].mode === 'full_day') reservation.occupancy[day] = { mode: 'partial', slots: [] };
  reservation.occupancy[day].slots.push({ ...slot, id: crypto.randomUUID() });
}
function ensureFullDay(reservation, day) { reservation.occupancy[day] = { mode: 'full_day', slots: [] }; }
function clearDay(reservation, day) { delete reservation.occupancy[day]; }
function removeSlot(reservation, day, slotId) {
  const dayData = reservation.occupancy[day]; if (!dayData || dayData.mode !== 'partial') return;
  dayData.slots = dayData.slots.filter(s => s.id !== slotId); if (!dayData.slots.length) delete reservation.occupancy[day];
}

function renderReservationList() {
  els.reservationList.innerHTML = state.reservations.map(r => `<li class="reservation-item ${r.id===state.selectedReservationId?'active':''}" data-id="${r.id}"><strong>${r.id}</strong><div>${r.customer.name}</div><div class="status">${r.status}</div></li>`).join('');
}
function renderCalendar() {
  const res = getReservation();
  const y = state.currentMonth.getFullYear(); const m = state.currentMonth.getMonth();
  els.calendarMonth.textContent = state.currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const days = new Date(y, m+1, 0).getDate();
  els.calendar.innerHTML = Array.from({ length: days }, (_, i) => {
    const d = new Date(y,m,i+1); const key = dateKey(d); const mode = getDayMode(res,key); const sel = state.selectedDate===key?'selected':'';
    return `<button class="day-cell ${mode} ${sel}" data-day="${key}"><div>${i+1}</div><small>${mode}</small></button>`;
  }).join('');
}
function renderDayEditor() {
  const res = getReservation();
  const day = state.selectedDate;
  els.selectedDayTitle.textContent = day ? `Día seleccionado: ${day}` : 'Selecciona un día';
  if (!day) { els.daySlots.innerHTML = ''; return; }
  const dayData = res.occupancy[day];
  if (!dayData) { els.daySlots.innerHTML = '<li>Sin slots (libre)</li>'; return; }
  if (dayData.mode === 'full_day') { els.daySlots.innerHTML = '<li>Día completo ocupado (sin slots horarios)</li>'; return; }
  els.daySlots.innerHTML = dayData.slots.map(s => `<li class="slot-item"><span>${s.start} - ${s.end}</span><button data-slot-id="${s.id}">Eliminar</button></li>`).join('');
}
function renderFinance() {
  const r = getReservation();
  r.payment.pending = Math.max(r.payment.finalTotal - r.payment.depositPaid, 0);
  els.financeBox.innerHTML = `
  <div class="finance-row"><span>Estado</span><strong>${r.status}</strong></div>
  <div class="finance-row"><span>Señal pagada</span><strong>${r.payment.depositPaid}€</strong></div>
  <label>Total final <input id="final-total" type="number" min="0" value="${r.payment.finalTotal}" /></label>
  <div class="finance-row"><span>Pendiente</span><strong id="pending-amount">${r.payment.pending}€</strong></div>
  <button id="mock-link" type="button">Generar enlace de pago mock</button>
  <small id="mock-link-out"></small>
  <button id="mark-paid" type="button">Marcar pago recibido</button>`;
}
function renderHourCheckboxes() {
  els.hourCheckboxes.innerHTML = Array.from({ length: 24 }, (_,h)=>`<label><input type="checkbox" value="${pad(h)}"/>${pad(h)}:00</label>`).join('');
}
function renderAll(){ renderReservationList(); renderCalendar(); renderDayEditor(); renderFinance(); renderHourCheckboxes();
  const r = getReservation(); els.reservationTitle.textContent = `${r.id} · ${r.customer.name}`; els.reservationMeta.textContent = `${r.bookingType} · Vehículo ${r.vehicleId}`;
}

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('.reservation-item')) { state.selectedReservationId = t.closest('.reservation-item').dataset.id; state.selectedDate = null; renderAll(); }
  if (t.closest('.day-cell')) { state.selectedDate = t.closest('.day-cell').dataset.day; renderAll(); }
  if (t.id === 'prev-month') { state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth()-1, 1); renderCalendar(); }
  if (t.id === 'next-month') { state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth()+1, 1); renderCalendar(); }
  if (t.id === 'mark-full-day' && state.selectedDate) { ensureFullDay(getReservation(), state.selectedDate); renderAll(); }
  if (t.id === 'free-day' && state.selectedDate) { clearDay(getReservation(), state.selectedDate); renderAll(); }
  if (t.id === 'add-checked-hours' && state.selectedDate) {
    const selected = [...document.querySelectorAll('#hour-checkboxes input:checked')].map(i=>Number(i.value)).sort((a,b)=>a-b);
    selected.forEach(h => addSlot(getReservation(), state.selectedDate, { start: `${pad(h)}:00`, end: `${pad((h+1)%24)}:00` }));
    renderAll();
  }
  if (t.id === 'add-manual-range' && state.selectedDate) {
    const start = document.getElementById('manual-start').value; const end = document.getElementById('manual-end').value;
    if (start && end && start < end) addSlot(getReservation(), state.selectedDate, { start, end });
    renderAll();
  }
  if (t.dataset.slotId && state.selectedDate) { removeSlot(getReservation(), state.selectedDate, t.dataset.slotId); renderAll(); }
  if (t.id === 'mock-link') {
    const r = getReservation(); document.getElementById('mock-link-out').textContent = `https://pay.vipvan.mock/${r.id}/${Date.now()}`;
  }
  if (t.id === 'mark-paid') {
    const r = getReservation(); r.payment.depositPaid = r.payment.finalTotal; r.payment.pending = 0; r.status = 'confirmada'; renderAll();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'final-total') { const r = getReservation(); r.payment.finalTotal = Number(e.target.value || 0); r.payment.pending = Math.max(r.payment.finalTotal - r.payment.depositPaid, 0); renderFinance(); }
});

renderAll();
