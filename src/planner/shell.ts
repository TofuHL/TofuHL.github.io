// Shared page behaviour: theme toggle, toast messages and the assistant drawer.

import { chat, clearConversation, conversationLines, loadConversation } from './ai';
import { escapeHtml } from './store';

const THEME_KEY = 'planner.theme';

function currentTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('planner:theme'));
}

export function getThemePref(): 'light' | 'dark' | 'system' {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

let toastTimer: number | undefined;
export function toast(message: string, ms = 3200): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), ms);
}

export function openAssistant(prefill?: string): void {
  const drawer = document.getElementById('ai-drawer')!;
  const scrim = document.getElementById('ai-scrim')!;
  drawer.hidden = false;
  scrim.hidden = false;
  renderChat();
  const input = document.getElementById('ai-input') as HTMLTextAreaElement;
  if (prefill) input.value = prefill;
  input.focus();
}

function closeAssistant(): void {
  document.getElementById('ai-drawer')!.hidden = true;
  document.getElementById('ai-scrim')!.hidden = true;
}

const SUGGESTIONS = [
  'What does my week look like?',
  'When am I working next?',
  'Add a shift tomorrow 09:00–17:00',
  'Do I have any free evenings this week?',
];

function bubble(role: string, text: string): string {
  return `<div class="bubble ${role}">${escapeHtml(text)}</div>`;
}

function renderChat(extra = ''): void {
  const log = document.getElementById('ai-log')!;
  const lines = conversationLines(loadConversation());
  if (!lines.length && !extra) {
    log.innerHTML = `<div class="chat-empty">
      <p><strong>Hi! I'm your planning assistant.</strong><br/>I know your calendar and I learn your routine as we talk.</p>
      <div class="chips">${SUGGESTIONS.map((s) => `<button class="chip" type="button">${escapeHtml(s)}</button>`).join('')}</div>
    </div>`;
    log.querySelectorAll<HTMLButtonElement>('.chip').forEach((b) =>
      b.addEventListener('click', () => send(b.textContent ?? '')),
    );
    return;
  }
  log.innerHTML = lines.map((l) => bubble(l.role, l.text)).join('') + extra;
  log.scrollTop = log.scrollHeight;
}

let busy = false;
async function send(text: string): Promise<void> {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  const input = document.getElementById('ai-input') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('ai-send') as HTMLButtonElement;
  const status = document.getElementById('ai-status')!;
  input.value = '';
  sendBtn.disabled = true;
  renderChat(bubble('user', text));
  status.textContent = 'Thinking…';
  try {
    await chat(text, (label) => (status.textContent = label));
    renderChat();
  } catch (err) {
    renderChat(bubble('user', text) + bubble('error', err instanceof Error ? err.message : String(err)));
  } finally {
    status.textContent = '';
    sendBtn.disabled = false;
    busy = false;
    input.focus();
  }
}

export function initShell(): void {
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('ai-open')?.addEventListener('click', () => openAssistant());
  document.getElementById('ai-close')?.addEventListener('click', closeAssistant);
  document.getElementById('ai-scrim')?.addEventListener('click', closeAssistant);
  document.getElementById('ai-new')?.addEventListener('click', () => {
    clearConversation();
    renderChat();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('ai-drawer')!.hidden) closeAssistant();
  });

  const form = document.getElementById('ai-form') as HTMLFormElement;
  const input = document.getElementById('ai-input') as HTMLTextAreaElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void send(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input.value);
    }
  });
}
