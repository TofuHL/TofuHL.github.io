// Gmail access, entirely in the browser.
// Sign-in uses Google Identity Services (OAuth token flow) with the read-only
// Gmail scope, so the app can read mail but never send, delete or change it.

import { getSettings } from './store';

const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN_KEY = 'planner.gmailToken';

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface EmailFull extends EmailSummary {
  text: string;
  html: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { type: string; message?: string }) => void;
          }): TokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisLoading = null;
      reject(new Error('Could not load Google sign-in. Check your connection or ad blocker.'));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

function storedToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const { token, expires } = JSON.parse(raw) as { token: string; expires: number };
    return Date.now() < expires - 60_000 ? token : null;
  } catch {
    return null;
  }
}

export function isConnected(): boolean {
  return storedToken() !== null;
}

/** Opens the Google sign-in popup. Must be called from a click handler. */
export async function connect(): Promise<void> {
  const { googleClientId } = getSettings();
  if (!googleClientId) {
    throw new Error('Add your Google OAuth Client ID in Settings first.');
  }
  await loadGis();
  const oauth = window.google!.accounts.oauth2;
  await new Promise<void>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: googleClientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error_description || resp.error || 'Google sign-in failed.'));
          return;
        }
        try {
          sessionStorage.setItem(
            TOKEN_KEY,
            JSON.stringify({ token: resp.access_token, expires: Date.now() + (resp.expires_in ?? 3600) * 1000 }),
          );
        } catch {
          /* ignore */
        }
        resolve();
      },
      error_callback: (err) => reject(new Error(err.message || `Google sign-in: ${err.type}`)),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

export function disconnect(): void {
  const token = storedToken();
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token);
}

async function gmail<T>(path: string): Promise<T> {
  const token = storedToken();
  if (!token) throw new Error('Gmail is not connected (or the sign-in expired). Click "Connect Gmail".');
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    disconnect();
    throw new Error('Gmail sign-in expired. Click "Connect Gmail" again.');
  }
  if (!res.ok) throw new Error(`Gmail error ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

interface GmailHeader {
  name: string;
  value: string;
}
interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
}
interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  payload?: GmailPart;
}

function header(msg: GmailMessage, name: string): string {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function decode(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function findPart(part: GmailPart | undefined, mime: string): string {
  if (!part) return '';
  if (part.mimeType === mime && part.body?.data) return decode(part.body.data);
  for (const p of part.parts ?? []) {
    const found = findPart(p, mime);
    if (found) return found;
  }
  return '';
}

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style').forEach((n) => n.remove());
  return (doc.body?.textContent ?? '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function summary(msg: GmailMessage): EmailSummary {
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: header(msg, 'From'),
    to: header(msg, 'To'),
    subject: header(msg, 'Subject') || '(no subject)',
    date: header(msg, 'Date'),
    snippet: msg.snippet ?? '',
    unread: msg.labelIds?.includes('UNREAD') ?? false,
  };
}

/** Lists recent inbox messages (newest first). */
export async function listInbox(max: number, query = ''): Promise<EmailSummary[]> {
  const q = encodeURIComponent(query || 'in:inbox');
  const list = await gmail<{ messages?: { id: string }[] }>(`/messages?maxResults=${max}&q=${q}`);
  const ids = (list.messages ?? []).map((m) => m.id);
  const msgs = await Promise.all(
    ids.map((id) =>
      gmail<GmailMessage>(
        `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ),
  );
  return msgs.map(summary);
}

export async function getEmail(id: string): Promise<EmailFull> {
  const msg = await gmail<GmailMessage>(`/messages/${id}?format=full`);
  const html = findPart(msg.payload, 'text/html');
  const text = findPart(msg.payload, 'text/plain') || (html ? htmlToText(html) : msg.snippet ?? '');
  return { ...summary(msg), text, html };
}
