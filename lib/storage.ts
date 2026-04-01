import { Dessert } from './types';

const STORAGE_KEY = 'postres_inventory';
const NOTIF_KEY = 'postres_last_notification';

const INITIAL_DATA: Dessert[] = [
  { id: '1', name: 'Brownie keto', quantity: 0, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
  { id: '2', name: 'Brownie vegano', quantity: 0, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
  { id: '3', name: 'Brownie tradicional', quantity: 3, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
  { id: '4', name: 'Cheesecake keto', quantity: 5, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
  { id: '5', name: 'Cheesecake', quantity: 6, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
  { id: '6', name: 'Panacotta keto', quantity: 5, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
  { id: '7', name: 'Panacotta', quantity: 6, unit: 'paq de 1 und', expirationDate: '2026-04-10', createdAt: new Date().toISOString() },
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
