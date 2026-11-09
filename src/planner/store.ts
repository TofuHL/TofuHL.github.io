// Planner data store. Everything lives in this browser's localStorage:
// events, settings, the AI's notes about you, and which emails were scanned.

export type EventType = 'shift' | 'plan' | 'meeting' | 'reminder' | 'other';
export type EventSource = 'manual' | 'email' | 'assistant';

export interface PlannerEvent {
  id: string;
  title: string;
  type: EventType;
  /** Local date, YYYY-MM-DD */
  date: string;
  /** Local time HH:mm, empty for all-day */
  start: string;
  /** Local time HH:mm, empty for all-day */
  end: string;
  location: string;
  notes: string;
  source: EventSource;
  /** Gmail message id the event was found in */
  emailId?: string;
  createdAt: number;
}

export interface Settings {
  name: string;
  aboutMe: string;
  anthropicApiKey: string;
  model: string;
  googleClientId: string;
  autoAddFromEmail: boolean;
  emailScanCount: number;
}

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'shift', label: 'Work shift' },
  { value: 'plan', label: 'Plan' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'other', label: 'Other' },
];

const KEYS = {
  events: 'planner.events.v1',
  settings: 'planner.settings.v1',
  memory: 'planner.memory.v1',
  scanned: 'planner.scannedEmails.v1',
  chat: 'planner.chat.v1',
};

const DEFAULT_SETTINGS: Settings = {
  name: '',
  aboutMe: '',
  anthropicApiKey: '',
  model: 'claude-opus-5-5',
  googleClientId: '',
  autoAddFromEmail: true,
  emailScanCount: 25,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: nothing more we can do */
  }
  window.dispatchEvent(new CustomEvent('planner:change', { detail: key }));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ---------- settings ---------- */

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
}

/* ---------- events ---------- */

export function getEvents(): PlannerEvent[] {
  return read<PlannerEvent[]>(KEYS.events, []).sort(compareEvents);
}

export function compareEvents(a: PlannerEvent, b: PlannerEvent): number {
  return (a.date + (a.start || '00:00')).localeCompare(b.date + (b.start || '00:00'));
}

export function addEvent(input: Omit<PlannerEvent, 'id' | 'createdAt'>): PlannerEvent {
  const event: PlannerEvent = { ...input, id: uid(), createdAt: Date.now() };
  write(KEYS.events, [...getEvents(), event]);
  return event;
}

export function updateEvent(id: string, patch: Partial<PlannerEvent>): PlannerEvent | undefined {
  let updated: PlannerEvent | undefined;
  const events = getEvents().map((e) => {
    if (e.id !== id) return e;
    updated = { ...e, ...patch, id: e.id };
    return updated;
  });
  write(KEYS.events, events);
  return updated;
}

export function deleteEvent(id: string): boolean {
  const events = getEvents();
  const next = events.filter((e) => e.id !== id);
  write(KEYS.events, next);
  return next.length !== events.length;
}

export function eventsOn(date: string): PlannerEvent[] {
  return getEvents().filter((e) => e.date === date);
}

export function eventsBetween(from: string, to: string): PlannerEvent[] {
  return getEvents().filter((e) => e.date >= from && e.date <= to);
}

/* ---------- AI memory: things the assistant learned about you ---------- */

export function getMemory(): string[] {
  return read<string[]>(KEYS.memory, []);
}

export function addMemory(note: string): void {
  write(KEYS.memory, [...getMemory(), note].slice(-50));
}

export function setMemory(notes: string[]): void {
  write(KEYS.memory, notes);
}

/* ---------- which emails were already scanned ---------- */

export function getScannedEmailIds(): Set<string> {
  return new Set(read<string[]>(KEYS.scanned, []));
}

export function markEmailsScanned(ids: string[]): void {
  const all = [...getScannedEmailIds(), ...ids];
  write(KEYS.scanned, all.slice(-2000));
}

/* ---------- chat history (display only) ---------- */

export interface ChatLine {
  role: 'user' | 'assistant';
  text: string;
}

export function getChat(): ChatLine[] {
  return read<ChatLine[]>(KEYS.chat, []);
}

export function saveChat(lines: ChatLine[]): void {
  write(KEYS.chat, lines.slice(-60));
}

/* ---------- backup ---------- */

export function exportAll(): string {
  return JSON.stringify(
    { events: getEvents(), memory: getMemory(), settings: { ...getSettings(), anthropicApiKey: '' } },
    null,
    2,
  );
}

export function importAll(json: string): void {
  const data = JSON.parse(json) as { events?: PlannerEvent[]; memory?: string[] };
  if (Array.isArray(data.events)) write(KEYS.events, data.events);
  if (Array.isArray(data.memory)) write(KEYS.memory, data.memory);
}

/* ---------- date helpers (all local time) ---------- */

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: string, days: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function today(): string {
  return toISODate(new Date());
}

export function formatTimeRange(e: PlannerEvent): string {
  if (!e.start) return 'All day';
  return e.end ? `${e.start}–${e.end}` : e.start;
}

export function formatLongDate(s: string): string {
  return parseISODate(s).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
