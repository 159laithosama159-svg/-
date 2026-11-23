// Pure Authorized WhatsApp Groups Parser & Whitelist Manager for VALDRION Omni-Commander
// Parses official WhatsApp exported chat (.txt) or pasted group messages (Arabic & English formats),
// respects strict per-group user authorization (allowed: true/false), extracts topics & Xtream servers,
// and enables consent-gated searching inside ONLY user-permitted WhatsApp groups.

import { parseSmartXtreamCredentials, type ParsedXtreamCredential } from './cinemaLogic';

export interface WhatsAppMessageEntry {
  id: string;
  timestamp: string;
  sender: string;
  text: string;
}

export interface AuthorizedWhatsAppGroup {
  id: string;
  name: string;
  allowed: boolean;
  importedAt: number;
  messages: WhatsAppMessageEntry[];
  extractedServers: ParsedXtreamCredential[];
  summaryAr: string;
}

export const WHATSAPP_GROUPS_STORAGE_KEY = 'valdrion_whatsapp_allowed_groups_v1';

// Matches standard WhatsApp export formats:
// 1) [12/05/2026, 14:30:12] Ahmad: Hello
// 2) 12/05/2026, 2:30 PM - Ahmad: Hello
// 3) 2026/05/12, 14:30 - أبو آدم: ...
const WA_LINE_REGEX =
  /^(?:\[?(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}[,،]?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapmصم\.]+)?)\]?\s*[-–]?\s*)([^:：]{1,60})[:：]\s*(.+)$/;

export function parseWhatsAppExportText(rawText: string): WhatsAppMessageEntry[] {
  const lines = String(rawText || '')
    .replace(/\u200e|\u200f|\ufeff/g, '')
    .split(/\r?\n/);

  const messages: WhatsAppMessageEntry[] = [];
  let current: WhatsAppMessageEntry | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(WA_LINE_REGEX);
    if (match) {
      if (current) messages.push(current);
      current = {
        id: `wam_${messages.length + 1}`,
        timestamp: match[1].trim(),
        sender: match[2].trim(),
        text: match[3].trim(),
      };
    } else if (current) {
      current.text = `${current.text}\n${line}`.slice(0, 1800);
    } else {
      // Fallback for plain pasted messages without timestamps
      current = {
        id: `wam_${messages.length + 1}`,
        timestamp: 'مستورد',
        sender: 'عضو المجموعة',
        text: line.slice(0, 1800),
      };
    }

    if (messages.length >= 400) break;
  }

  if (current && messages.length < 400) {
    messages.push(current);
  }
  return messages;
}

export function buildAuthorizedWhatsAppGroup(
  groupName: string,
  rawText: string
): AuthorizedWhatsAppGroup {
  const cleanName = groupName.trim().slice(0, 64) || 'مجموعة واتساب مصرّح بها';
  const messages = parseWhatsAppExportText(rawText);
  const extractedServers = parseSmartXtreamCredentials(rawText);
  const uniqueSenders = Array.from(new Set(messages.map((m) => m.sender))).slice(0, 8);

  const summaryAr =
    messages.length === 0
      ? 'مجموعة فارغة — الصق رسائل أو استورد ملف تصدير واتساب.'
      : `${messages.length} رسالة · ${uniqueSenders.length} مشاركين${
          extractedServers.length > 0 ? ` · تم رصد ${extractedServers.length} سيرفر تلقائياً` : ''
        }`;

  return {
    id: `wag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    allowed: true,
    importedAt: Date.now(),
    messages,
    extractedServers,
    summaryAr,
  };
}

export interface WhatsAppGroupSearchHit {
  groupId: string;
  groupName: string;
  sender: string;
  timestamp: string;
  text: string;
}

/**
 * Searches strictly inside groups where `allowed === true`.
 * Blocked/disabled groups are NEVER read.
 */
export function searchAuthorizedWhatsAppGroups(
  groups: AuthorizedWhatsAppGroup[],
  query: string,
  limit = 10
): WhatsAppGroupSearchHit[] {
  const allowedGroups = groups.filter((g) => g.allowed);
  if (allowedGroups.length === 0) return [];

  const tokens = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const hits: WhatsAppGroupSearchHit[] = [];

  for (const grp of allowedGroups) {
    for (let i = grp.messages.length - 1; i >= 0; i--) {
      const msg = grp.messages[i];
      const hay = `${grp.name} ${msg.sender} ${msg.text}`.toLowerCase();
      const matched =
        tokens.length === 0 || tokens.some((tok) => hay.includes(tok));
      if (matched) {
        hits.push({
          groupId: grp.id,
          groupName: grp.name,
          sender: msg.sender,
          timestamp: msg.timestamp,
          text: msg.text.slice(0, 240),
        });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

export function loadAuthorizedWhatsAppGroups(): AuthorizedWhatsAppGroup[] {
  try {
    const raw = localStorage.getItem(WHATSAPP_GROUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AuthorizedWhatsAppGroup[]).slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function saveAuthorizedWhatsAppGroups(groups: AuthorizedWhatsAppGroup[]): void {
  try {
    localStorage.setItem(WHATSAPP_GROUPS_STORAGE_KEY, JSON.stringify(groups.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}
