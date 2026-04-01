import { Dessert } from './types';

const STORAGE_KEY = 'postres_inventory_v2';
const NOTIF_KEY = 'postres_last_notification';

function makeBatch(qty: number, exp: string) {
  return { id: Date.now().toString() + Math.random(), quantity: qty, expirationDate: exp, createdAt: new Date().toISOString() };
}

const INITIAL_DATA: Dessert[] = [
  { id: '1', name: 'Brownie keto', unit: 'paq de 1 und', batches: [makeBatch(0, '2026-04-10')] },
  { id: '2', name: 'Brownie vegano', unit: 'paq de 1 und', batches: [makeBatch(0, '2026-04-10')] },
  { id: '3', name: 'Brownie tradicional', unit: 'paq de 1 und', batches: [makeBatch(3, '2026-04-10')] },
  { id: '4', name: 'Cheesecake keto', unit: 'paq de 1 und', batches: [makeBatch(5, '2026-04-10')] },
  { id: '5', name: 'Cheesecake', unit: 'paq de 1 und', batches: [makeBatch(6, '2026-04-10')] },
  { id: '6', name: 'Panacotta keto', unit: 'paq de 1 und', batches: [makeBatch(5, '2026-04-10')] },
  { id: '7', name: 'Panacotta', unit: 'paq de 1 und', batches: [makeBatch(6, '2026-04-10')] },
];

export function loadInventory(): Dessert[] {
  if (typeof window === 'undefined') return INITIAL_DATA;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    saveInventory(INITIAL_DATA);
    return INITIAL_DATA;
  }
  return JSON.parse(stored);
}

export function saveInventory(data: Dessert[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function shouldSendNotification(level: 'warning' | 'danger'): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(NOTIF_KEY);
  const today = new Date().toISOString().split('T')[0];
  if (!stored) return true;
  const data = JSON.parse(stored);
  return data[level] !== today;
}

export function markNotificationSent(level: 'warning' | 'danger'): void {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(NOTIF_KEY);
  const today = new Date().toISOString().split('T')[0];
  const data = stored ? JSON.parse(stored) : {};
  data[level] = today;
  localStorage.setItem(NOTIF_KEY, JSON.stringify(data));
}
