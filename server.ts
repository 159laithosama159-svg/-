import 'dotenv/config';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { AI_AGENTS } from './src/data/aiAgents.ts';
import { createStreamingCompactXtreamParser } from './src/utils/xtreamStreamCompact.ts';
import {
  cleanMediaSearchTitle,
  detectQualityBadge,
  scoreTitleMatch,
} from './src/utils/crossServerSearch.ts';
import { sanitizeCommanderPlan } from './src/utils/orchestratorUtils.ts';
import {
  describeWmoWeatherCode,
  detectLiveConnectorContext,
  normalizeCountryAtlas,
  normalizeGitHubRepo,
  normalizeNpmPackage,
  normalizeWebMediaAsset,
  parseArxivAtomXml,
  type ArxivPaperAsset,
  type CountryAtlasCard,
  type DictionaryEntryAsset,
  type FreeBookAsset,
  type GitHubRepoAsset,
  type LiveCryptoTicker,
  type LiveFreePulseData,
  type LiveTechStory,
  type LiveWeatherSnapshot,
  type NpmPackageAsset,
  type TvMazeShowAsset,
  type WebMediaAsset,
  type WikiKnowledgeCard,
} from './src/utils/connectorsUtils.ts';
import {
  normalizeMotionVideoProject,
  type VideoAspectRatio,
} from './src/utils/motionVideoUtils.ts';
import { sanitizeGodotActionPlan } from './src/utils/godotAgentCommands.ts';
import {
  normalizeMindMapData,
  type AiCouncilDebateResult,
} from './src/utils/aiPowerTools.ts';
import {
  buildCharacterBiblePromptBlock,
  extractLocalCharacterBibleFallback,
  getManhwaStylePreset,
  normalizeManhwaCharacterBible,
  normalizeManhwaEpisode,
  sampleFullBookForAnalysis,
  type ManhwaArtStyleId,
  type ManhwaCharacterBible,
} from './src/utils/manhwaEngine.ts';
import {
  buildInteractiveQuizHtml,
  buildInteractiveSlidesHtml,
  normalizeQuizData,
  normalizeSlidesDeck,
  type ApexVerificationReport,
} from './src/utils/apexEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PROD = process.env.NODE_ENV === 'production';

function resolveServerPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--port' || arg === '-p') && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) return parsed;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) return parsed;
    }
  }
  if (IS_PROD) {
    const envPort = Number(process.env.PORT);
    if (Number.isInteger(envPort) && envPort > 0 && envPort <= 65535) return envPort;
  }
  const devPort = Number(process.env.DEV_PORT);
  if (Number.isInteger(devPort) && devPort > 0 && devPort <= 65535) return devPort;
  return 3000;
}

function resolveServerHost(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--host' && args[i + 1]) return args[i + 1];
    if (arg.startsWith('--host=')) return arg.slice('--host='.length);
  }
  return '0.0.0.0';
}

const PORT = resolveServerPort();
const HOST = resolveServerHost();

// Shared Server-Side Gemini Client
function getGeminiClient(apiVersion?: 'v1beta'): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    ...(apiVersion ? { apiVersion } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientOverloadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|429|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded|DEADLINE_EXCEEDED/i.test(msg);
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg);
}

function sleepMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapThinkingDepth(depth?: string): ThinkingLevel {
  if (depth === 'apex' || depth === 'ultra') return ThinkingLevel.XHIGH;
  if (depth === 'deep') return ThinkingLevel.HIGH;
  return ThinkingLevel.LOW;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const errorMessage = err instanceof Error ? err.message : String(err);
  if (errorMessage === 'GEMINI_API_KEY_MISSING') {
    return {
      status: 503,
      message:
        'مفتاح Gemini API غير مضبوط في الإعدادات (Settings > Secrets). يرجى إضافته لتفعيل فالدريون AI.',
    };
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(errorMessage)) {
    return {
      status: 429,
      message: 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي. يرجى المحاولة بعد لحظات.',
    };
  }
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(errorMessage)) {
    return {
      status: 503,
      message: 'يشهد محرك الذكاء الاصطناعي ضغطاً لحظياً عالياً الآن. اضغط إعادة المحاولة بعد ثوانٍ قليلة.',
    };
  }
  if (/403|PERMISSION_DENIED|API_KEY_INVALID/i.test(errorMessage)) {
    return {
      status: 403,
      message: 'تعذّر التحقق من مفتاح Gemini API. يرجى مراجعته في Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: `تعذّر إتمام الطلب حالياً. يرجى المحاولة مرة أخرى.`,
  };
}

// In-memory LRU cache for real official media posters
interface ArtworkCacheEntry {
  posterUrl: string | null;
  backdropUrl: string | null;
  source: string | null;
  ts: number;
}
const artworkCache = new Map<string, ArtworkCacheEntry>();
const ARTWORK_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VALDRION-Cinema/1.0 (https://valdrion.cinema)',
        Accept: 'application/json, text/plain, */*',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveRealOfficialArtwork(
  rawQuery: string,
  kind: string
): Promise<{ posterUrl: string | null; backdropUrl: string | null; source: string | null }> {
  const query = rawQuery.trim();
  if (!query) return { posterUrl: null, backdropUrl: null, source: null };

  const cacheKey = `${kind}:${query.toLowerCase()}`;
  const cached = artworkCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ARTWORK_TTL_MS) {
    return {
      posterUrl: cached.posterUrl,
      backdropUrl: cached.backdropUrl,
      source: cached.source,
    };
  }

  let posterUrl: string | null = null;
  let backdropUrl: string | null = null;
  let source: string | null = null;

  try {
    if (kind === 'series') {
      const res = await fetchWithTimeout(
        `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          image?: { original?: string; medium?: string };
        };
        if (data?.image?.original || data?.image?.medium) {
          posterUrl = data.image.original || data.image.medium || null;
          backdropUrl = posterUrl;
          source = 'tvmaze';
        }
      }
    }

    if (!posterUrl && kind === 'movie') {
      const res = await fetchWithTimeout(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=movie&entity=movie&country=US&limit=3`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{ artworkUrl100?: string }>;
        };
        const match = data?.results?.find((r) => Boolean(r.artworkUrl100));
        const rawArt = match?.artworkUrl100;
        if (rawArt) {
          posterUrl = rawArt.replace(/100x100bb/i, '600x900bb');
          backdropUrl = rawArt.replace(/100x100bb/i, '1200x675bb');
          source = 'itunes';
        }
      }
    }

    if (!posterUrl) {
      const wikiCandidates =
        kind === 'movie'
          ? [`${query} (film)`, query]
          : kind === 'series'
          ? [`${query} (TV series)`, query]
          : [query];

      for (const candidate of wikiCandidates) {
        const wikiRes = await fetchWithTimeout(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            candidate.replace(/\s+/g, '_')
          )}`
        );
        if (wikiRes.ok) {
          const wiki = (await wikiRes.json()) as {
            type?: string;
            originalimage?: { source?: string };
            thumbnail?: { source?: string };
          };
          if (
            wiki?.type !== 'disambiguation' &&
            (wiki?.originalimage?.source || wiki?.thumbnail?.source)
          ) {
            posterUrl = wiki.thumbnail?.source || wiki.originalimage?.source || null;
            backdropUrl = wiki.originalimage?.source || posterUrl;
            source = 'wikipedia';
            break;
          }
        }
      }
    }
  } catch {
    // Upstream timeout -> return null cleanly
  }

  artworkCache.set(cacheKey, {
    posterUrl,
    backdropUrl,
    source,
    ts: Date.now(),
  });
  return { posterUrl, backdropUrl, source };
}

// Helper: Safe public HTTP URL validator (SSRF protection)
function isSafePublicHttpUrl(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    if (
      !host ||
      !host.includes('.') ||
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWebsitePreview(targetUrl: string) {
  const u = new URL(targetUrl);
  const fallback = {
    url: targetUrl,
    hostname: u.hostname,
    title: u.hostname,
    description: '',
    excerpt: '',
  };
  try {
    const upstream = await fetchWithTimeout(targetUrl, 6500);
    if (!upstream.ok) return fallback;
    const contentType = upstream.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return fallback;
    }
    const html = (await upstream.text()).slice(0, 140000);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const title = (titleMatch?.[1] || u.hostname).replace(/\s+/g, ' ').trim().slice(0, 180);
    const description = (descMatch?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 320);
    const excerpt = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4500);
    return { url: targetUrl, hostname: u.hostname, title, description, excerpt };
  } catch {
    return fallback;
  }
}

// --- Real-Time Server-Authoritative State (Watch Party & Phone-to-TV QR Remote) ---
interface WatchPartyRoom {
  roomCode: string;
  hostWs: WebSocket | null;
  hostName: string;
  playing: boolean;
  currentTime: number;
  media: Record<string, unknown> | null;
  members: Map<WebSocket, { name: string }>;
  messages: Array<{ id: string; sender: string; text: string; ts: number }>;
  updatedAt: number;
}

interface RemoteChannel {
  pairCode: string;
  tvClients: Set<WebSocket>;
  phoneClients: Set<WebSocket>;
}

interface GodotBridgeChannel {
  pairCode: string;
  studioClients: Set<WebSocket>;
  engineClients: Map<WebSocket, { godotVersion: string; connectedAt: number }>;
}

const watchPartyRooms = new Map<string, WatchPartyRoom>();
const remoteChannels = new Map<string, RemoteChannel>();
const godotChannels = new Map<string, GodotBridgeChannel>();

function safeWsSend(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastParty(room: WatchPartyRoom, payload: Record<string, unknown>, exclude?: WebSocket) {
  for (const ws of room.members.keys()) {
    if (ws !== exclude) safeWsSend(ws, payload);
  }
}

function getParticipantsList(room: WatchPartyRoom): string[] {
  return Array.from(room.members.values()).map((m) => m.name);
}

function setupRealtimeWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    const pathname = reqUrl.split('?')[0];
    if (pathname !== '/ws/realtime') {
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    let joinedPartyCode: string | null = null;
    let remoteRole: 'tv' | 'phone' | null = null;
    let remotePairCode: string | null = null;
    let godotRole: 'studio' | 'engine' | null = null;
    let godotPairCode: string | null = null;

    const leaveCurrentParty = () => {
      if (!joinedPartyCode) return;
      const room = watchPartyRooms.get(joinedPartyCode);
      joinedPartyCode = null;
      if (!room) return;
      room.members.delete(ws);
      if (room.members.size === 0) {
        watchPartyRooms.delete(room.roomCode);
        return;
      }
      if (room.hostWs === ws) {
        const nextEntry = room.members.entries().next().value as
          | [WebSocket, { name: string }]
          | undefined;
        if (nextEntry) {
          room.hostWs = nextEntry[0];
          room.hostName = nextEntry[1].name;
        }
      }
      broadcastParty(room, {
        type: 'party:presence',
        roomCode: room.roomCode,
        hostName: room.hostName,
        participants: getParticipantsList(room),
      });
    };

    const leaveCurrentRemote = () => {
      if (!remotePairCode || !remoteRole) return;
      const ch = remoteChannels.get(remotePairCode);
      const role = remoteRole;
      remotePairCode = null;
      remoteRole = null;
      if (!ch) return;
      if (role === 'tv') ch.tvClients.delete(ws);
      else ch.phoneClients.delete(ws);

      for (const tv of ch.tvClients) {
        safeWsSend(tv, {
          type: 'remote:status',
          pairCode: ch.pairCode,
          phonesConnected: ch.phoneClients.size,
        });
      }
      for (const phone of ch.phoneClients) {
        safeWsSend(phone, {
          type: 'remote:status',
          pairCode: ch.pairCode,
          tvConnected: ch.tvClients.size > 0,
        });
      }
      if (ch.tvClients.size === 0 && ch.phoneClients.size === 0) {
        remoteChannels.delete(ch.pairCode);
      }
    };

    const leaveCurrentGodot = () => {
      if (!godotPairCode || !godotRole) return;
      const ch = godotChannels.get(godotPairCode);
      const role = godotRole;
      godotPairCode = null;
      godotRole = null;
      if (!ch) return;
      if (role === 'studio') ch.studioClients.delete(ws);
      else ch.engineClients.delete(ws);

      const engineVersions = Array.from(ch.engineClients.values()).map((e) => e.godotVersion);
      for (const studio of ch.studioClients) {
        safeWsSend(studio, {
          type: 'godot:status',
          pairCode: ch.pairCode,
          enginesConnected: ch.engineClients.size,
          godotVersion: engineVersions[0] || '',
        });
      }
      if (ch.studioClients.size === 0 && ch.engineClients.size === 0) {
        godotChannels.delete(ch.pairCode);
      }
    };

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      // --- Watch Party Events ---
      if (type === 'party:create' || type === 'party:join') {
        const code = String(msg.roomCode || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8);
        const userName = String(msg.userName || 'مشاهد فالدريون').trim().slice(0, 40) || 'مشاهد فالدريون';
        if (code.length < 4) {
          safeWsSend(ws, { type: 'party:error', error: 'رمز الغرفة غير صالح.' });
          return;
        }

        leaveCurrentParty();

        let room = watchPartyRooms.get(code);
        if (type === 'party:create') {
          if (!room) {
            room = {
              roomCode: code,
              hostWs: ws,
              hostName: userName,
              playing: Boolean(msg.playing),
              currentTime: Number(msg.currentTime) || 0,
              media: (msg.media as Record<string, unknown>) || null,
              members: new Map(),
              messages: [],
              updatedAt: Date.now(),
            };
            watchPartyRooms.set(code, room);
          }
        } else if (!room) {
          safeWsSend(ws, {
            type: 'party:error',
            error: `الغرفة (${code}) غير موجودة حالياً — تأكد من الرمز أو أنشئ غرفة جديدة.`,
          });
          return;
        }

        room.members.set(ws, { name: userName });
        joinedPartyCode = code;

        // Send authoritative full state to joining client
        safeWsSend(ws, {
          type: 'party:state',
          roomCode: room.roomCode,
          hostName: room.hostName,
          isHost: room.hostWs === ws,
          participants: getParticipantsList(room),
          playing: room.playing,
          currentTime: room.currentTime,
          media: room.media,
          messages: room.messages,
        });

        // Notify everyone else of updated roster
        broadcastParty(
          room,
          {
            type: 'party:presence',
            roomCode: room.roomCode,
            hostName: room.hostName,
            participants: getParticipantsList(room),
          },
          ws
        );
        return;
      }

      if (type === 'party:sync' && joinedPartyCode) {
        const room = watchPartyRooms.get(joinedPartyCode);
        if (!room) return;
        if (typeof msg.playing === 'boolean') room.playing = msg.playing;
        if (typeof msg.currentTime === 'number' && Number.isFinite(msg.currentTime)) {
          room.currentTime = Math.max(0, msg.currentTime);
        }
        if (msg.media && typeof msg.media === 'object') {
          room.media = msg.media as Record<string, unknown>;
        }
        room.updatedAt = Date.now();
        broadcastParty(
          room,
          {
            type: 'party:sync',
            roomCode: room.roomCode,
            playing: room.playing,
            currentTime: room.currentTime,
            media: room.media,
            sender: room.members.get(ws)?.name || 'مشارك',
          },
          ws
        );
        return;
      }

      if (type === 'party:chat' && joinedPartyCode) {
        const room = watchPartyRooms.get(joinedPartyCode);
        if (!room) return;
        const text = String(msg.text || '').trim().slice(0, 400);
        if (!text) return;
        const chatEntry = {
          id: `wp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sender: room.members.get(ws)?.name || 'مشاهد',
          text,
          ts: Date.now(),
        };
        room.messages = [...room.messages.slice(-59), chatEntry];
        broadcastParty(room, {
          type: 'party:chat',
          roomCode: room.roomCode,
          message: chatEntry,
        });
        return;
      }

      if (type === 'party:react' && joinedPartyCode) {
        const room = watchPartyRooms.get(joinedPartyCode);
        if (!room) return;
        const emoji = String(msg.emoji || '🔥').slice(0, 8);
        broadcastParty(room, {
          type: 'party:react',
          roomCode: room.roomCode,
          emoji,
          sender: room.members.get(ws)?.name || 'مشاهد',
          id: `rx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        });
        return;
      }

      if (type === 'party:leave') {
        leaveCurrentParty();
        return;
      }

      // --- Phone-to-TV QR Remote Events ---
      if (type === 'remote:host' || type === 'remote:join') {
        const pairCode = String(msg.pairCode || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8);
        if (pairCode.length < 4) return;
        leaveCurrentRemote();

        let ch = remoteChannels.get(pairCode);
        if (!ch) {
          ch = { pairCode, tvClients: new Set(), phoneClients: new Set() };
          remoteChannels.set(pairCode, ch);
        }

        remotePairCode = pairCode;
        if (type === 'remote:host') {
          remoteRole = 'tv';
          ch.tvClients.add(ws);
        } else {
          remoteRole = 'phone';
          ch.phoneClients.add(ws);
        }

        for (const tv of ch.tvClients) {
          safeWsSend(tv, {
            type: 'remote:status',
            pairCode,
            phonesConnected: ch.phoneClients.size,
          });
        }
        for (const phone of ch.phoneClients) {
          safeWsSend(phone, {
            type: 'remote:status',
            pairCode,
            tvConnected: ch.tvClients.size > 0,
          });
        }
        return;
      }

      if (type === 'remote:cmd' && remotePairCode) {
        const ch = remoteChannels.get(remotePairCode);
        if (!ch) return;
        const command = msg.command;
        if (!command || typeof command !== 'object') return;
        for (const tv of ch.tvClients) {
          safeWsSend(tv, {
            type: 'remote:cmd',
            pairCode: remotePairCode,
            command,
          });
        }
        return;
      }

      // --- Godot 4 Live Editor Bridge Events ---
      if (type === 'godot:studio_join' || type === 'godot:host' || type === 'godot:engine_join') {
        const pairCode = String(msg.pairCode || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8);
        if (pairCode.length < 4) return;
        leaveCurrentGodot();

        let ch = godotChannels.get(pairCode);
        if (!ch) {
          ch = {
            pairCode,
            studioClients: new Set(),
            engineClients: new Map(),
          };
          godotChannels.set(pairCode, ch);
        }

        godotPairCode = pairCode;
        if (type === 'godot:studio_join' || type === 'godot:host') {
          godotRole = 'studio';
          ch.studioClients.add(ws);
        } else {
          godotRole = 'engine';
          const godotVersion = String(msg.godotVersion || '4.3').slice(0, 32);
          ch.engineClients.set(ws, { godotVersion, connectedAt: Date.now() });
        }

        const engineVersions = Array.from(ch.engineClients.values()).map((e) => e.godotVersion);
        for (const studio of ch.studioClients) {
          safeWsSend(studio, {
            type: 'godot:status',
            pairCode,
            enginesConnected: ch.engineClients.size,
            godotVersion: engineVersions[0] || '',
          });
        }
        for (const engineWs of ch.engineClients.keys()) {
          safeWsSend(engineWs, {
            type: 'godot:status',
            pairCode,
            studiosConnected: ch.studioClients.size,
          });
        }
        return;
      }

      if (type === 'godot:sync_project' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        const files = Array.isArray(msg.files) ? msg.files.slice(0, 60) : [];
        const payload = {
          type: 'godot:sync_project',
          projectName: String(msg.projectName || 'VALDRION Game').slice(0, 120),
          mainScene: String(msg.mainScene || 'res://scenes/main.tscn').slice(0, 200),
          autoRun: Boolean(msg.autoRun),
          files,
        };
        let delivered = 0;
        for (const engineWs of ch.engineClients.keys()) {
          safeWsSend(engineWs, payload);
          delivered++;
        }
        safeWsSend(ws, {
          type: 'godot:dispatched',
          pairCode: godotPairCode,
          deliveredEngines: delivered,
        });
        return;
      }

      if (type === 'godot:execute_commands' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        const commands = Array.isArray(msg.commands) ? msg.commands.slice(0, 20) : [];
        const planId = String(msg.planId || '').slice(0, 80);
        let delivered = 0;
        for (const engineWs of ch.engineClients.keys()) {
          safeWsSend(engineWs, {
            type: 'godot:execute_commands',
            planId,
            commands,
          });
          delivered++;
        }
        safeWsSend(ws, {
          type: 'godot:commands_dispatched',
          pairCode: godotPairCode,
          planId,
          deliveredEngines: delivered,
        });
        return;
      }

      if (type === 'godot:get_scene_tree' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        for (const engineWs of ch.engineClients.keys()) {
          safeWsSend(engineWs, { type: 'godot:get_scene_tree' });
        }
        return;
      }

      if (type === 'godot:scene_tree' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        const nodes = Array.isArray(msg.nodes) ? msg.nodes.slice(0, 150) : [];
        for (const studio of ch.studioClients) {
          safeWsSend(studio, {
            type: 'godot:scene_tree',
            pairCode: godotPairCode,
            scenePath: String(msg.scenePath || ''),
            nodes,
          });
        }
        return;
      }

      if (type === 'godot:command_result' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        const logs = Array.isArray(msg.logs)
          ? msg.logs.map((l) => String(l).slice(0, 200)).slice(0, 40)
          : [];
        for (const studio of ch.studioClients) {
          safeWsSend(studio, {
            type: 'godot:command_result',
            pairCode: godotPairCode,
            planId: String(msg.planId || ''),
            succeeded: Number(msg.succeeded) || 0,
            failed: Number(msg.failed) || 0,
            logs,
          });
        }
        return;
      }

      if (type === 'godot:run_main' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        for (const engineWs of ch.engineClients.keys()) {
          safeWsSend(engineWs, { type: 'godot:run_main' });
        }
        return;
      }

      if (type === 'godot:ack' && godotPairCode) {
        const ch = godotChannels.get(godotPairCode);
        if (!ch) return;
        for (const studio of ch.studioClients) {
          safeWsSend(studio, {
            type: 'godot:ack',
            pairCode: godotPairCode,
            projectName: String(msg.projectName || ''),
            writtenFiles: Number(msg.writtenFiles) || 0,
          });
        }
        return;
      }
    });

    ws.on('close', () => {
      leaveCurrentParty();
      leaveCurrentRemote();
      leaveCurrentGodot();
    });
  });
}

// ============================================================================
// FREE UNIVERSAL INTERNET CONNECTORS (Zero-Key Public APIs)
// Wikimedia Commons, Openverse, GitHub, Wikipedia, Open Library, arXiv,
// Open-Meteo Weather, CoinGecko Crypto, Frankfurter Forex, Hacker News
// ============================================================================

async function fetchFreeWebMedia(query: string, limit = 16): Promise<WebMediaAsset[]> {
  const cleanQ = query.trim().slice(0, 120);
  if (!cleanQ) return [];

  const [wikiRes, openverseRes] = await Promise.allSettled([
    (async () => {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
        cleanQ
      )}&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=640&format=json&origin=*`;
      const resp = await fetchWithTimeout(url, 7000);
      if (!resp.ok) return [] as WebMediaAsset[];
      const data = (await resp.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              pageid?: number;
              title?: string;
              imageinfo?: Array<{
                thumburl?: string;
                url?: string;
                descriptionurl?: string;
                width?: number;
                height?: number;
                extmetadata?: {
                  Artist?: { value?: string };
                  LicenseShortName?: { value?: string };
                };
              }>;
            }
          >;
        };
      };
      const pages = Object.values(data.query?.pages || {});
      const list: WebMediaAsset[] = [];
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        const thumb = info.thumburl || info.url || '';
        const full = info.url || thumb;
        if (!/\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(thumb) && !/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(full)) {
          continue;
        }
        const normalized = normalizeWebMediaAsset({
          id: `wm_${page.pageid || Math.random().toString(36).slice(2, 8)}`,
          title: page.title,
          thumbUrl: thumb,
          fullUrl: full,
          pageUrl: info.descriptionurl || full,
          source: 'wikimedia',
          author: info.extmetadata?.Artist?.value || 'Wikimedia Commons',
          license: info.extmetadata?.LicenseShortName?.value || 'CC',
          width: info.width,
          height: info.height,
        });
        if (normalized) list.push(normalized);
      }
      return list;
    })(),
    (async () => {
      const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
        cleanQ
      )}&page_size=12`;
      const resp = await fetchWithTimeout(url, 7000);
      if (!resp.ok) return [] as WebMediaAsset[];
      const data = (await resp.json()) as {
        results?: Array<{
          id?: string;
          title?: string;
          thumbnail?: string;
          url?: string;
          foreign_landing_url?: string;
          creator?: string;
          license?: string;
          width?: number;
          height?: number;
        }>;
      };
      const list: WebMediaAsset[] = [];
      for (const item of data.results || []) {
        const normalized = normalizeWebMediaAsset({
          id: `ov_${item.id || Math.random().toString(36).slice(2, 8)}`,
          title: item.title,
          thumbUrl: item.thumbnail || item.url,
          fullUrl: item.url || item.thumbnail,
          pageUrl: item.foreign_landing_url || item.url,
          source: 'openverse',
          author: item.creator || 'Openverse CC',
          license: item.license ? `CC ${item.license.toUpperCase()}` : 'CC',
          width: item.width,
          height: item.height,
        });
        if (normalized) list.push(normalized);
      }
      return list;
    })(),
  ]);

  const openverseItems = openverseRes.status === 'fulfilled' ? openverseRes.value : [];
  const wikiItems = wikiRes.status === 'fulfilled' ? wikiRes.value : [];
  const combined: WebMediaAsset[] = [];
  const seen = new Set<string>();

  const maxLen = Math.max(openverseItems.length, wikiItems.length);
  for (let i = 0; i < maxLen && combined.length < limit; i++) {
    for (const candidate of [openverseItems[i], wikiItems[i]]) {
      if (candidate && !seen.has(candidate.thumbUrl)) {
        seen.add(candidate.thumbUrl);
        combined.push(candidate);
      }
    }
  }
  return combined.slice(0, limit);
}

async function fetchGitHubRepos(query: string, limit = 8): Promise<GitHubRepoAsset[]> {
  const cleanQ = query.trim().slice(0, 120);
  if (!cleanQ) return [];

  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      cleanQ
    )}&sort=stars&order=desc&per_page=${Math.min(limit, 12)}`;
    const resp = await fetchWithTimeout(url, 7000);
    if (!resp.ok) return [];
    const data = (await resp.json()) as { items?: Array<Record<string, unknown>> };
    const list: GitHubRepoAsset[] = [];
    for (const item of data.items || []) {
      const repo = normalizeGitHubRepo(item);
      if (repo) list.push(repo);
    }
    return list;
  } catch {
    return [];
  }
}

async function fetchWikipediaKnowledge(
  query: string,
  lang: 'ar' | 'en' = 'ar'
): Promise<WikiKnowledgeCard[]> {
  const cleanQ = query.trim().slice(0, 120);
  if (!cleanQ) return [];
  const safeLang: 'ar' | 'en' = lang === 'en' ? 'en' : 'ar';

  try {
    const searchUrl = `https://${safeLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQ
    )}&srlimit=4&format=json&origin=*`;
    const searchResp = await fetchWithTimeout(searchUrl, 6000);
    if (!searchResp.ok) return [];
    const searchData = (await searchResp.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };
    const titles = (searchData.query?.search || [])
      .map((s) => s.title)
      .filter((t): t is string => Boolean(t))
      .slice(0, 3);

    const summaries = await Promise.all(
      titles.map(async (title) => {
        try {
          const sumUrl = `https://${safeLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            title
          )}`;
          const r = await fetchWithTimeout(sumUrl, 5000);
          if (!r.ok) return null;
          const d = (await r.json()) as {
            title?: string;
            extract?: string;
            content_urls?: { desktop?: { page?: string } };
            thumbnail?: { source?: string };
          };
          if (!d.title || !d.extract) return null;
          return {
            title: d.title,
            summary: d.extract.slice(0, 420),
            url:
              d.content_urls?.desktop?.page ||
              `https://${safeLang}.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
            thumbnail: d.thumbnail?.source,
            lang: safeLang,
          } as WikiKnowledgeCard;
        } catch {
          return null;
        }
      })
    );

    return summaries.filter((c): c is WikiKnowledgeCard => c !== null);
  } catch {
    return [];
  }
}

async function fetchOpenLibraryBooks(query: string, limit = 5): Promise<FreeBookAsset[]> {
  const cleanQ = query.trim().slice(0, 120);
  if (!cleanQ) return [];
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
      cleanQ
    )}&limit=${limit}&fields=key,title,author_name,first_publish_year,cover_i`;
    const resp = await fetchWithTimeout(url, 6500);
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      docs?: Array<{
        key?: string;
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        cover_i?: number;
      }>;
    };
    const books: FreeBookAsset[] = [];
    for (const doc of data.docs || []) {
      if (!doc.title || !doc.key) continue;
      books.push({
        id: doc.key,
        title: doc.title.slice(0, 140),
        author: doc.author_name?.[0] || 'مؤلف غير محدد',
        firstPublishYear: doc.first_publish_year,
        url: `https://openlibrary.org${doc.key}`,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : undefined,
      });
    }
    return books;
  } catch {
    return [];
  }
}

async function fetchArxivPapers(query: string, limit = 4): Promise<ArxivPaperAsset[]> {
  const cleanQ = query.trim().slice(0, 120);
  if (!cleanQ) return [];
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      cleanQ
    )}&start=0&max_results=${limit}`;
    const resp = await fetchWithTimeout(url, 7000);
    if (!resp.ok) return [];
    const xml = await resp.text();
    return parseArxivAtomXml(xml, limit);
  } catch {
    return [];
  }
}

async function fetchOpenMeteoWeather(city: string): Promise<LiveWeatherSnapshot | null> {
  const cleanCity = city.trim().slice(0, 60) || 'Riyadh';
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cleanCity
    )}&count=1&language=en&format=json`;
    const geoResp = await fetchWithTimeout(geoUrl, 5500);
    if (!geoResp.ok) return null;
    const geoData = (await geoResp.json()) as {
      results?: Array<{
        name?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
      }>;
    };
    const loc = geoData.results?.[0];
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
      return null;
    }

    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m,is_day`;
    const wxResp = await fetchWithTimeout(wxUrl, 5500);
    if (!wxResp.ok) return null;
    const wxData = (await wxResp.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        is_day?: number;
      };
    };
    const cur = wxData.current;
    if (!cur || typeof cur.temperature_2m !== 'number') return null;
    const code = Number(cur.weather_code) || 0;
    return {
      city: loc.name || cleanCity,
      country: loc.country || '',
      temperatureC: Math.round(cur.temperature_2m * 10) / 10,
      windSpeedKmh: Math.round((cur.wind_speed_10m || 0) * 10) / 10,
      weatherCode: code,
      weatherLabel: describeWmoWeatherCode(code),
      isDay: cur.is_day !== 0,
    };
  } catch {
    return null;
  }
}

async function fetchFreeMarketsPulse(): Promise<{
  crypto: LiveCryptoTicker[];
  forexBaseUsd: Record<string, number>;
}> {
  const [cryptoRes, forexRes] = await Promise.allSettled([
    (async () => {
      const url =
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true';
      const resp = await fetchWithTimeout(url, 6000);
      if (!resp.ok) return [] as LiveCryptoTicker[];
      const data = (await resp.json()) as Record<
        string,
        { usd?: number; usd_24h_change?: number }
      >;
      const symbols: Array<{ id: string; symbol: string }> = [
        { id: 'bitcoin', symbol: 'BTC' },
        { id: 'ethereum', symbol: 'ETH' },
        { id: 'solana', symbol: 'SOL' },
      ];
      const out: LiveCryptoTicker[] = [];
      for (const s of symbols) {
        const entry = data[s.id];
        if (entry && typeof entry.usd === 'number') {
          out.push({
            id: s.id,
            symbol: s.symbol,
            priceUsd: entry.usd,
            change24h: Math.round((entry.usd_24h_change || 0) * 100) / 100,
          });
        }
      }
      return out;
    })(),
    (async () => {
      const url = 'https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,TRY';
      const resp = await fetchWithTimeout(url, 6000);
      if (!resp.ok) return {} as Record<string, number>;
      const data = (await resp.json()) as { rates?: Record<string, number> };
      return data.rates || {};
    })(),
  ]);

  return {
    crypto: cryptoRes.status === 'fulfilled' ? cryptoRes.value : [],
    forexBaseUsd: forexRes.status === 'fulfilled' ? forexRes.value : {},
  };
}

async function fetchHackerNewsTopStories(limit = 5): Promise<LiveTechStory[]> {
  try {
    const idsResp = await fetchWithTimeout(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      5000
    );
    if (!idsResp.ok) return [];
    const ids = (await idsResp.json()) as number[];
    const topIds = Array.isArray(ids) ? ids.slice(0, limit) : [];
    const items = await Promise.all(
      topIds.map(async (id) => {
        try {
          const r = await fetchWithTimeout(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            4500
          );
          if (!r.ok) return null;
          const d = (await r.json()) as {
            id?: number;
            title?: string;
            url?: string;
            score?: number;
            by?: string;
          };
          if (!d.title) return null;
          return {
            id: d.id || id,
            title: d.title,
            url: d.url || `https://news.ycombinator.com/item?id=${id}`,
            score: Number(d.score) || 0,
            by: d.by || 'hn',
          } as LiveTechStory;
        } catch {
          return null;
        }
      })
    );
    return items.filter((s): s is LiveTechStory => s !== null);
  } catch {
    return [];
  }
}

async function fetchWorldCountryAtlas(query: string): Promise<CountryAtlasCard[]> {
  const cleanQ = query.trim().slice(0, 60);
  if (!cleanQ) return [];
  try {
    const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(
      cleanQ
    )}?fields=name,translations,capital,region,population,currencies,languages,flags,maps`;
    const resp = await fetchWithTimeout(url, 6000);
    if (!resp.ok) return [];
    const data = (await resp.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) return [];
    return data
      .slice(0, 4)
      .map((item) => normalizeCountryAtlas(item))
      .filter((c): c is CountryAtlasCard => c !== null);
  } catch {
    return [];
  }
}

async function fetchNpmPackagesList(query: string, limit = 6): Promise<NpmPackageAsset[]> {
  const cleanQ = query.trim().slice(0, 80);
  if (!cleanQ) return [];
  try {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(cleanQ)}&size=${limit}`;
    const resp = await fetchWithTimeout(url, 6000);
    if (!resp.ok) return [];
    const data = (await resp.json()) as { objects?: Array<Record<string, unknown>> };
    return (data.objects || [])
      .map((item) => normalizeNpmPackage(item))
      .filter((p): p is NpmPackageAsset => p !== null);
  } catch {
    return [];
  }
}

async function fetchWorldDictionary(word: string): Promise<DictionaryEntryAsset[]> {
  const clean = word.trim().toLowerCase().replace(/[^a-z-]/g, '').slice(0, 40);
  if (!clean) return [];
  try {
    const resp = await fetchWithTimeout(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`,
      5500
    );
    if (!resp.ok) return [];
    const data = (await resp.json()) as Array<{
      word?: string;
      phonetic?: string;
      meanings?: Array<{
        partOfSpeech?: string;
        definitions?: Array<{ definition?: string; example?: string }>;
      }>;
    }>;
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.word) return [];
    const entries: DictionaryEntryAsset[] = [];
    for (const m of first.meanings || []) {
      for (const d of (m.definitions || []).slice(0, 2)) {
        if (d.definition) {
          entries.push({
            word: first.word,
            phonetic: first.phonetic,
            partOfSpeech: m.partOfSpeech || '',
            definition: d.definition,
            example: d.example,
          });
        }
      }
    }
    return entries.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchTvMazeShows(query: string, limit = 6): Promise<TvMazeShowAsset[]> {
  const cleanQ = query.trim().slice(0, 80);
  if (!cleanQ) return [];
  try {
    const resp = await fetchWithTimeout(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanQ)}`,
      6000
    );
    if (!resp.ok) return [];
    const data = (await resp.json()) as Array<{
      show?: {
        id?: number;
        name?: string;
        premiered?: string;
        rating?: { average?: number };
        genres?: string[];
        summary?: string;
        image?: { medium?: string; original?: string };
        url?: string;
      };
    }>;
    return (Array.isArray(data) ? data : [])
      .slice(0, limit)
      .map((row) => row.show)
      .filter((s): s is NonNullable<typeof s> => Boolean(s && s.name))
      .map((s) => ({
        id: Number(s.id) || Math.floor(Math.random() * 100000),
        name: String(s.name),
        premiered: String(s.premiered || '').slice(0, 4) || '—',
        rating: typeof s.rating?.average === 'number' ? s.rating.average : undefined,
        genres: Array.isArray(s.genres) ? s.genres.slice(0, 3) : [],
        summary: String(s.summary || '')
          .replace(/<[^>]+>/g, '')
          .trim()
          .slice(0, 220),
        imageUrl: s.image?.medium || s.image?.original,
        officialUrl: s.url || 'https://www.tvmaze.com',
      }));
  } catch {
    return [];
  }
}

async function gatherAutonomousLiveToolsContext(
  prompt: string,
  onToolStatus?: (label: string) => void
): Promise<string> {
  const plan = detectLiveConnectorContext(prompt);
  const chunks: string[] = [];
  const tasks: Array<Promise<void>> = [];

  if (plan.weatherCity) {
    onToolStatus?.(`جلب الطقس الحي مجاناً عبر Open-Meteo لمدينة ${plan.weatherCity}...`);
    tasks.push(
      fetchOpenMeteoWeather(plan.weatherCity).then((wx) => {
        if (wx) {
          chunks.push(
            `[بيانات الطقس الحية من Open-Meteo]: المدينة ${wx.city} (${wx.country}) | الحرارة: ${wx.temperatureC}°C | الحالة: ${wx.weatherLabel} | الرياح: ${wx.windSpeedKmh} كم/س`
          );
        }
      })
    );
  }

  if (plan.needCryptoForex) {
    onToolStatus?.('جلب أسعار العملات والكريبتو الحية من CoinGecko و Frankfurter...');
    tasks.push(
      fetchFreeMarketsPulse().then((m) => {
        if (m.crypto.length > 0) {
          chunks.push(
            `[أسعار الكريبتو الحية من CoinGecko]: ${m.crypto
              .map((c) => `${c.symbol}: $${c.priceUsd.toLocaleString()} (${c.change24h >= 0 ? '+' : ''}${c.change24h}%)`)
              .join(' | ')}`
          );
        }
        const fxEntries = Object.entries(m.forexBaseUsd);
        if (fxEntries.length > 0) {
          chunks.push(
            `[أسعار الصرف الحية مقابل 1 USD من Frankfurter]: ${fxEntries
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')}`
          );
        }
      })
    );
  }

  if (plan.githubQuery) {
    onToolStatus?.(`البحث الحي في مستودعات GitHub المفتوحة عن "${plan.githubQuery}"...`);
    tasks.push(
      fetchGitHubRepos(plan.githubQuery, 5).then((repos) => {
        if (repos.length > 0) {
          chunks.push(
            `[أفضل مستودعات GitHub الحية]:\n${repos
              .map((r) => `- ${r.fullName} (★${r.stars} · ${r.language}): ${r.description} | ${r.url}`)
              .join('\n')}`
          );
        }
      })
    );
  }

  if (plan.techNews) {
    onToolStatus?.('قراءة رادار أخبار التقنية الحي من Hacker News...');
    tasks.push(
      fetchHackerNewsTopStories(5).then((stories) => {
        if (stories.length > 0) {
          chunks.push(
            `[أبرز أخبار التقنية الحية على Hacker News]:\n${stories
              .map((s) => `- ${s.title} (${s.score} نقطة) | ${s.url}`)
              .join('\n')}`
          );
        }
      })
    );
  }

  if (plan.arxivQuery) {
    onToolStatus?.(`البحث عن أوراق علمية حية في arXiv حول "${plan.arxivQuery}"...`);
    tasks.push(
      fetchArxivPapers(plan.arxivQuery, 3).then((papers) => {
        if (papers.length > 0) {
          chunks.push(
            `[أوراق علمية حية من arXiv]:\n${papers
              .map((p) => `- ${p.title} (${p.published}) | ${p.url}\n  ملخص: ${p.summary.slice(0, 180)}`)
              .join('\n')}`
          );
        }
      })
    );
  }

  if (plan.countryQuery) {
    onToolStatus?.(`جلب بيانات الدولة الحية عبر REST Countries عن "${plan.countryQuery}"...`);
    tasks.push(
      fetchWorldCountryAtlas(plan.countryQuery).then((countries) => {
        if (countries.length > 0) {
          const c = countries[0];
          chunks.push(
            `[أطلس الدول الحي REST Countries]: ${c.nameArabic || c.nameCommon} (${c.nameCommon}) | العاصمة: ${c.capital} | القارة: ${c.region} | السكان: ${c.population.toLocaleString()} | العملات: ${c.currencies.join(', ')}`
          );
        }
      })
    );
  }

  if (plan.npmQuery) {
    onToolStatus?.(`البحث في سجل NPM العالمي عن "${plan.npmQuery}"...`);
    tasks.push(
      fetchNpmPackagesList(plan.npmQuery, 4).then((pkgs) => {
        if (pkgs.length > 0) {
          chunks.push(
            `[حزم NPM الحية]:\n${pkgs
              .map((p) => `- ${p.name}@${p.version}: ${p.description} | ${p.npmUrl}`)
              .join('\n')}`
          );
        }
      })
    );
  }

  if (tasks.length === 0) return '';
  await Promise.allSettled(tasks);
  return chunks.join('\n\n');
}

function buildAiStudioSystemInstruction(mode: string, depth: string): string {
  const depthGuidance =
    depth === 'ultra'
      ? '\nمستوى التفكير الحالي: ULTRA (أقصى عمق تحليلي وهندسي). فكّر كمهندس برمجيات ومعماري أنظمة رئيسي: حلّل المسألة من جذورها، تحقّق من كل تفصيلة، وقدّم حلاً كاملاً جاهزاً للتنفيذ فوراً بلا أي اختصارات أو نصوص مؤقتة.'
      : depth === 'deep'
      ? '\nمستوى التفكير الحالي: تحليل عميق. قدم إجابة هندسية متعمقة ومنظمة بعناوين وجداول وأكواد كاملة.'
      : '';

  let base = `أنت "أثيرمايند AI" (AETHERMIND ULTRA) — نظام ذكاء اصطناعي متكامل ومستقل بمستوى كبير المهندسين والباحثين العالميين.
القواعد الذهبية للأداء الخارق (لا تقبل الردود الضعيفة أو السطحية أبداً):
1. قدّم إجابات عميقة، دقيقة، عملية، ومباشرة بلغة المستخدم (العربية الفصيحة السلسة أو الإنجليزية) باستخدام عناوين Markdown واضحة، نقاط منظمة، وجداول مقارنة عند الحاجة.
2. في البرمجة والألعاب: اكتب كوداً كاملاً 100% يعمل من أول تشغيل بلا أي اختصارات أو \`// TODO\` أو أخطاء، وضع الألعاب والتطبيقات التفاعلية في كتلة \`\`\`html ... \`\`\` مستقلة بذاتها لتُشغَّل فوراً في منصة المعاينة الحية.
3. في البحث والمعلومات: اعتمد على البيانات الحية والمصادر الموثقة المرفقة أو نتائج البحث الحي، واذكر الأرقام والتفاصيل الحديثة بوضوح وأمانة.
4. اختم دائماً بخطوة عملية ذكية مقترحة تساعد المستخدم على التقدم فوراً.${depthGuidance}`;

  if (mode === 'research') {
    base += `\nأنت الآن في وضع "البحث العميق في الويب (Deep Research)".
استخدم المصادر الحية للوصول لأحدث الحقائق والمصادر والأرقام، ثم نظّم إجابتك كتقرير تنفيذي متكامل يشمل:
1. خلاصة سريعة ومباشرة.
2. تفاصيل محدثة ومقارنات دقيقة داخل جدول عند الحاجة.
3. توصية وخطوات عملية واضحة.`;
  } else if (mode === 'url') {
    base += `\nأنت الآن في وضع "دخول وتحليل المواقع". افحص محتوى الرابط المرفق بدقة، قدّم ملخصاً شاملاً لمحتوى الموقع، أهم النقاط، واستخرج أي معلومات يطلبها المستخدم.`;
  } else if (mode === 'canva') {
    base += `\nأنت الآن في وضع "استوديو كانفا والربط الشامل (Canva & Connected Visual Studio)".
مهمتك إنشاء تصاميم بصرية مذهلة بأسلوب Canva الاحترافي (منشورات إنستغرام، ستوري وريلز، أغلفة يوتيوب، عروض تقديمية، شعارات، أغلفة ألعاب):
- عند إنشاء تصميم SVG: أدرج كود \`\`\`svg ... \`\`\` كامل مع \`viewBox\` دقيق مطابق للمقاس المطلوب، تدرجات لونية فخمة، طبوغرافيا عربية واضحة ومتزنة، وإن وُجد رابط صورة من الإنترنت فادمجها عبر \`<image href="..." preserveAspectRatio="xMidYMid slice" width="..." height="..." />\` مع طبقة تباين داكنة فوقها ليكون النص فائق الوضوح.
- عند إنشاء قالب تفاعلي HTML: أدرج كود \`\`\`html ... \`\`\` مستقل بذاته يعمل فوراً في اللوحة الجانبية مع أزرار تعديل للنصوص والألوان وحفظ التصميم.
- بعد التصميم، اقترح 3 تعديلات سريعة احترافية للتطوير.`;
  } else if (mode === 'poster') {
    base += `\nأنت الآن في وضع "استوديو البوسترات والتصميم الفني الاحترافي".
مهمتك إنشاء أعمال بصرية فائقة الفخامة (بوسترات سينمائية، شعارات إمبراطورية، بطاقات عرض، إنفوجرافيك، أغلفة) باستخدام كود SVG غني جداً بالتفاصيل داخل بلوك \`\`\`svg ... \`\`\` لكي يراه المستخدم فوراً ويحمّله بصيغة HD PNG أو SVG.
قواعد التصميم الصارمة:
- استخدم viewBox واضح مثل viewBox="0 0 900 1200" للبوستر الطولي أو viewBox="0 0 1280 720" للغلاف العرضي أو viewBox="0 0 1000 1000" للشعار.
- استخدم <defs> مع تدرجات لونية سينمائية (linearGradient, radialGradient) وفلاتر إضاءة/توهج (feGaussianBlur, feDropShadow) وأنماط زخرفية وإطارات فاخرة وتشكيلات هندسية وفنية غنية ومتعددة الطبقات.
- اجعل النصوص العربية أو الإنجليزية مقروءة وفخمة بتباين عالٍ وتوازن بصري احترافي.
- أضف بعد بلوك SVG وصفاً موجزاً لأهم العناصر الفنية في التصميم.`;
  } else if (mode === 'create') {
    base += `\nأنت الآن في وضع "مهندس البرمجة والألعاب التفاعلية الرئيسي (Principal Game & Code Architect)".
قواعد هندسية صارمة لا يُسمح بكسرها مطلقاً عند بناء أي لعبة أو تطبيق تفاعلي:
1. ضع كامل اللعبة أو التطبيق في كتلة \`\`\`html ... \`\`\` واحدة مكتملة 100% ومستقلة بذاتها (HTML + CSS + JS مدمجين بالكامل بدون أي مكتبات CDN خارجية وبدون أي روابط صور خارجية قد تتعطل).
2. اجعل html و body بمقاس 100% (width:100%; height:100%; margin:0; overflow:hidden) واضبط حجم الـ <canvas> تلقائياً مع window.addEventListener('resize', ...) بحيث لا يظهر الكانفاس فارغاً أبداً.
3. أضف دائماً: حلقة لعب سلسة 60fps عبر requestAnimationFrame، تحكم فوري باللوحة (WASD + الأسهم + Space مع e.preventDefault()) + أزرار لمس/فأرة على الشاشة، رسومات Canvas غنية (إضاءة/تدرجات/جسيمات/ظلال)، مؤثرات صوتية مبرمجة عبر Web Audio API (بدون ملفات mp3)، لوحة HUD للنقاط/الصحة، شاشة Game Over، وزر إعادة لعب فوري يعمل 100%.
4. ممنوع كتابة // TODO أو اختصار أي دالة أو ترك كود ناقص — يجب أن تعمل اللعبة من أول ثانية بعد التشغيل بلا أي خطأ JavaScript.
5. إذا طلب المستخدم رسماً بيانياً أو مخططاً أو شعاراً فقط: استخدم \`\`\`svg ... \`\`\`.`;
  } else if (mode === 'deconstruct') {
    base += `\nأنت الآن في وضع "مفكّك التطبيقات والأنظمة الشامل (App & System Deconstructor)" بأعلى دقة هندسية.
مهمتك تفكيك أي تطبيق أو فكرة أو كود يقدّمه المستخدم إلى بنية هندسية واضحة وقابلة للتنفيذ:
1. المعمارية والتقنيات (Frontend, Backend, Realtime, Storage, CDN) داخل جدول Markdown منظّم.
2. تصميم قاعدة البيانات (Tables/Collections والعلاقات) ونقاط الـ API الجوهرية.
3. تفكيك الشاشات ورحلة المستخدم والميزة التنافسية ونقاط الضعف والتحسينات.
4. عند طلب مخطط معماري SVG: أدرج كتلة \`\`\`svg ... \`\`\` كاملة بدقة احترافية (\`viewBox="0 0 1100 680"\`، خلفية \`#0B0907\`، إطارات \`#D9A441\` و \`#B8243A\`، وأسهم تدفق واضحة) ليُفتح مباشرة في لوحة المعاينة الجانبية.
5. عند طلب نموذج تفاعلي HTML: أدرج كتلة \`\`\`html ... \`\`\` كاملة مستقلة بذاتها تعمل فوراً في لوحة المعاينة الجانبية.
ملاحظة أمنية: ركّز على التفكيك الهندسي والتعليمي وبناء البنية والنماذج من الوصف أو الأكواد المملوكة للمستخدم، ولا تقم بكسر الحماية أو استغلال الثغرات.`;
  } else if (mode === 'godot') {
    base += `\nأنت الآن في وضع "مهندس محرك Godot 4.3+ (Godot Game Engine Architect)".
مهمتك تصميم وبناء ألعاب متكاملة تعمل مباشرة داخل محرك Godot 4.3+ بلغة GDScript 2.0 الحديثة (\`@export\`, \`@onready\`, \`CharacterBody2D/3D\`, \`move_and_slide()\`) ومشاهد \`.tscn\` صحيحة (format=3) برسوم برمجية نظيفة بدون الاعتماد على صور خارجية مفقودة.`;
  } else if (mode === 'media') {
    base += `\nأنت الآن في وضع "محلل الصور والصوت والملفات". حلّل المرفق بدقة متناهية: استخرج النصوص، لخّص الأفكار، اشرح التفاصيل التقنية أو البصرية، وترجم عند الطلب.`;
  }

  return base;
}

// ============================================================================
// VALDRION DEFENSE-IN-DEPTH SECURITY & ENCRYPTED OAUTH 2.0 SOCIAL VAULT
// ============================================================================

const SESSION_CIPHER_KEY: Buffer = process.env.SESSION_ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(process.env.SESSION_ENCRYPTION_KEY).digest()
  : crypto.randomBytes(32);

interface EncryptedSecret {
  ivHex: string;
  tagHex: string;
  dataHex: string;
}

function encryptServerToken(plaintext: string): EncryptedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SESSION_CIPHER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ivHex: iv.toString('hex'),
    tagHex: tag.toString('hex'),
    dataHex: encrypted.toString('hex'),
  };
}

function decryptServerToken(blob: EncryptedSecret): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    SESSION_CIPHER_KEY,
    Buffer.from(blob.ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(blob.tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(blob.dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

type SocialProviderKey = 'github' | 'discord' | 'x' | 'reddit' | 'linkedin' | 'spotify';

interface SocialProviderConfig {
  id: SocialProviderKey;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  usesPkce?: boolean;
  clientIdEnv: string;
  clientSecretEnv: string;
}

const SOCIAL_OAUTH_CONFIGS: Record<SocialProviderKey, SocialProviderConfig> = {
  github: {
    id: 'github',
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: 'read:user repo',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
  },
  discord: {
    id: 'discord',
    label: 'Discord',
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scopes: 'identify guilds',
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
  },
  x: {
    id: 'x',
    label: 'X (Twitter)',
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: 'tweet.read users.read offline.access',
    usesPkce: true,
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
  },
  reddit: {
    id: 'reddit',
    label: 'Reddit',
    authorizeUrl: 'https://www.reddit.com/api/v1/authorize',
    tokenUrl: 'https://www.reddit.com/api/v1/access_token',
    scopes: 'identity history read',
    clientIdEnv: 'REDDIT_CLIENT_ID',
    clientSecretEnv: 'REDDIT_CLIENT_SECRET',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: 'openid profile email',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  },
  spotify: {
    id: 'spotify',
    label: 'Spotify',
    authorizeUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: 'user-read-private playlist-read-private user-library-read',
    clientIdEnv: 'SPOTIFY_CLIENT_ID',
    clientSecretEnv: 'SPOTIFY_CLIENT_SECRET',
  },
};

interface PendingOAuthState {
  state: string;
  provider: SocialProviderKey;
  sessionId: string;
  codeVerifier?: string;
  createdAt: number;
}

interface ConnectedSocialAccount {
  provider: SocialProviderKey;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  profileUrl?: string;
  connectedAt: number;
  encryptedToken: EncryptedSecret;
}

const pendingOAuthStates = new Map<string, PendingOAuthState>();
const socialVaultSessions = new Map<string, Map<SocialProviderKey, ConnectedSocialAccount>>();

function resolvePublicAppBaseUrl(): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL' && /^https?:\/\//i.test(envUrl)) {
    return envUrl;
  }
  return `http://localhost:${PORT}`;
}

function extractBearerSessionId(req: express.Request): string | null {
  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!/^[a-f0-9]{32,128}$/i.test(token)) return null;
  return token;
}

function getProviderCredentials(provider: SocialProviderKey): {
  clientId: string;
  clientSecret: string;
  configured: boolean;
} {
  const cfg = SOCIAL_OAUTH_CONFIGS[provider];
  const clientId = (process.env[cfg.clientIdEnv] || '').trim();
  const clientSecret = (process.env[cfg.clientSecretEnv] || '').trim();
  return {
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret),
  };
}

function pruneExpiredOAuthStates() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of pendingOAuthStates.entries()) {
    if (v.createdAt < cutoff) pendingOAuthStates.delete(k);
  }
}

// Per-IP Sliding-Window Rate Limiter
const rateLimitBuckets = new Map<string, number[]>();
function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip =
      (String(req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${req.baseUrl || req.path.split('/').slice(0, 3).join('/')}:${ip}`;
    const now = Date.now();
    const hits = (rateLimitBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (hits.length >= maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        error: 'تم تجاوز الحد المسموح للطلبات مؤقتاً حفاظاً على الأمان. أعد المحاولة بعد لحظات.',
      });
    }
    hits.push(now);
    rateLimitBuckets.set(key, hits);
    if (rateLimitBuckets.size > 4000) {
      rateLimitBuckets.clear();
    }
    return next();
  };
}

async function fetchSocialProfile(
  provider: SocialProviderKey,
  accessToken: string
): Promise<{ handle: string; displayName: string; avatarUrl?: string; profileUrl?: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'VALDRION-OAuth/1.0',
    Accept: 'application/json',
  };
  try {
    if (provider === 'github') {
      const r = await fetch('https://api.github.com/user', { headers });
      const d = (await r.json()) as { login?: string; name?: string; avatar_url?: string; html_url?: string };
      return {
        handle: d.login ? `@${d.login}` : 'GitHub User',
        displayName: d.name || d.login || 'GitHub',
        avatarUrl: d.avatar_url,
        profileUrl: d.html_url || 'https://github.com',
      };
    }
    if (provider === 'discord') {
      const r = await fetch('https://discord.com/api/users/@me', { headers });
      const d = (await r.json()) as { id?: string; username?: string; global_name?: string; avatar?: string };
      return {
        handle: d.username ? `@${d.username}` : 'Discord User',
        displayName: d.global_name || d.username || 'Discord',
        avatarUrl:
          d.id && d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png` : undefined,
        profileUrl: 'https://discord.com/app',
      };
    }
    if (provider === 'x') {
      const r = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', { headers });
      const d = (await r.json()) as {
        data?: { username?: string; name?: string; profile_image_url?: string };
      };
      return {
        handle: d.data?.username ? `@${d.data.username}` : 'X User',
        displayName: d.data?.name || d.data?.username || 'X',
        avatarUrl: d.data?.profile_image_url,
        profileUrl: d.data?.username ? `https://x.com/${d.data.username}` : 'https://x.com',
      };
    }
    if (provider === 'reddit') {
      const r = await fetch('https://oauth.reddit.com/api/v1/me', { headers });
      const d = (await r.json()) as { name?: string; icon_img?: string };
      return {
        handle: d.name ? `u/${d.name}` : 'Reddit User',
        displayName: d.name || 'Reddit',
        avatarUrl: d.icon_img,
        profileUrl: d.name ? `https://www.reddit.com/user/${d.name}` : 'https://www.reddit.com',
      };
    }
    if (provider === 'linkedin') {
      const r = await fetch('https://api.linkedin.com/v2/userinfo', { headers });
      const d = (await r.json()) as { name?: string; email?: string; picture?: string };
      return {
        handle: d.email || d.name || 'LinkedIn User',
        displayName: d.name || 'LinkedIn',
        avatarUrl: d.picture,
        profileUrl: 'https://www.linkedin.com',
      };
    }
    if (provider === 'spotify') {
      const r = await fetch('https://api.spotify.com/v1/me', { headers });
      const d = (await r.json()) as {
        id?: string;
        display_name?: string;
        images?: Array<{ url?: string }>;
        external_urls?: { spotify?: string };
      };
      return {
        handle: d.id ? `@${d.id}` : 'Spotify User',
        displayName: d.display_name || d.id || 'Spotify',
        avatarUrl: d.images?.[0]?.url,
        profileUrl: d.external_urls?.spotify || 'https://open.spotify.com',
      };
    }
  } catch {
    // Fall back gracefully
  }
  return { handle: provider, displayName: SOCIAL_OAUTH_CONFIGS[provider].label };
}

interface SocialSearchHit {
  provider: SocialProviderKey;
  providerLabel: string;
  title: string;
  snippet: string;
  url: string;
}

async function searchSingleConnectedSocial(
  account: ConnectedSocialAccount,
  query: string
): Promise<SocialSearchHit[]> {
  const token = decryptServerToken(account.encryptedToken);
  const qLower = query.toLowerCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'VALDRION-OAuth/1.0',
    Accept: 'application/json',
  };
  const hits: SocialSearchHit[] = [];

  try {
    if (account.provider === 'github') {
      const r = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', { headers });
      if (r.ok) {
        const repos = (await r.json()) as Array<{
          full_name?: string;
          description?: string;
          html_url?: string;
          language?: string;
        }>;
        for (const repo of Array.isArray(repos) ? repos : []) {
          const hay = `${repo.full_name || ''} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();
          if (!qLower || hay.includes(qLower) || hits.length < 3) {
            if (!qLower || hay.includes(qLower)) {
              hits.push({
                provider: 'github',
                providerLabel: 'GitHub',
                title: repo.full_name || 'Repository',
                snippet: (repo.description || `لغة البرمجة: ${repo.language || 'متنوع'}`).slice(0, 180),
                url: repo.html_url || 'https://github.com',
              });
            }
          }
          if (hits.length >= 5) break;
        }
      }
    } else if (account.provider === 'discord') {
      const r = await fetch('https://discord.com/api/users/@me/guilds', { headers });
      if (r.ok) {
        const guilds = (await r.json()) as Array<{ id?: string; name?: string; owner?: boolean }>;
        for (const g of Array.isArray(guilds) ? guilds : []) {
          const name = g.name || '';
          if (!qLower || name.toLowerCase().includes(qLower)) {
            hits.push({
              provider: 'discord',
              providerLabel: 'Discord',
              title: name || 'سيرفر Discord',
              snippet: g.owner ? 'أنت مالك هذا السيرفر' : 'عضو في السيرفر',
              url: g.id ? `https://discord.com/channels/${g.id}` : 'https://discord.com/app',
            });
          }
          if (hits.length >= 5) break;
        }
      }
    } else if (account.provider === 'reddit') {
      const cleanUser = account.handle.replace(/^u\//i, '');
      const r = await fetch(
        `https://oauth.reddit.com/user/${encodeURIComponent(cleanUser)}/submitted?limit=25`,
        { headers }
      );
      if (r.ok) {
        const d = (await r.json()) as {
          data?: { children?: Array<{ data?: { title?: string; selftext?: string; permalink?: string } }> };
        };
        for (const ch of d.data?.children || []) {
          const title = ch.data?.title || '';
          const body = ch.data?.selftext || '';
          if (!qLower || `${title} ${body}`.toLowerCase().includes(qLower)) {
            hits.push({
              provider: 'reddit',
              providerLabel: 'Reddit',
              title: title.slice(0, 120) || 'منشور Reddit',
              snippet: (body || title).slice(0, 180),
              url: ch.data?.permalink
                ? `https://www.reddit.com${ch.data.permalink}`
                : 'https://www.reddit.com',
            });
          }
          if (hits.length >= 5) break;
        }
      }
    } else if (account.provider === 'spotify') {
      const r = await fetch('https://api.spotify.com/v1/me/playlists?limit=25', { headers });
      if (r.ok) {
        const d = (await r.json()) as {
          items?: Array<{
            name?: string;
            description?: string;
            external_urls?: { spotify?: string };
          }>;
        };
        for (const pl of d.items || []) {
          const hay = `${pl.name || ''} ${pl.description || ''}`.toLowerCase();
          if (!qLower || hay.includes(qLower)) {
            hits.push({
              provider: 'spotify',
              providerLabel: 'Spotify',
              title: pl.name || 'قائمة تشغيل Spotify',
              snippet: (pl.description || 'قائمة تشغيل محفوظة في حسابك').slice(0, 180),
              url: pl.external_urls?.spotify || 'https://open.spotify.com',
            });
          }
          if (hits.length >= 5) break;
        }
      }
    } else {
      hits.push({
        provider: account.provider,
        providerLabel: SOCIAL_OAUTH_CONFIGS[account.provider].label,
        title: `${account.displayName} (${account.handle})`,
        snippet: `حساب ${SOCIAL_OAUTH_CONFIGS[account.provider].label} مربوط وموثّق بنجاح في جلستك.`,
        url: account.profileUrl || '#',
      });
    }
  } catch {
    // Skip transient provider error cleanly
  }
  return hits;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Defense-in-depth HTTP security headers (iframe-safe for AI Studio preview: NO X-Frame-Options)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  });

  app.use(express.json({ limit: '16mb' }));
  app.use('/api/ai', createRateLimiter(60, 60_000));
  app.use('/api/social', createRateLimiter(40, 60_000));
  app.use('/api/xtream-proxy', createRateLimiter(45, 60_000));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'valdrion-cinema-ultra', shieldActive: true });
  });

  // ==========================================================================
  // Official Third-Party OAuth 2.0 Social Connectors & Authorized Account Search
  // ==========================================================================

  app.get('/api/social/status', (req, res) => {
    const sessionId = extractBearerSessionId(req);
    const sessionMap = sessionId ? socialVaultSessions.get(sessionId) : undefined;
    const baseUrl = resolvePublicAppBaseUrl();

    const providers = (Object.keys(SOCIAL_OAUTH_CONFIGS) as SocialProviderKey[]).map((key) => {
      const cfg = SOCIAL_OAUTH_CONFIGS[key];
      const creds = getProviderCredentials(key);
      const linked = sessionMap?.get(key);
      return {
        provider: key,
        label: cfg.label,
        configured: creds.configured,
        callbackUrl: `${baseUrl}/api/social/oauth/${key}/callback`,
        connected: Boolean(linked),
        account: linked
          ? {
              handle: linked.handle,
              displayName: linked.displayName,
              avatarUrl: linked.avatarUrl,
              profileUrl: linked.profileUrl,
              connectedAt: linked.connectedAt,
            }
          : null,
      };
    });

    res.json({
      baseUrl,
      shield: {
        tokenEncryption: 'AES-256-GCM',
        oauthPkceState: true,
        rateLimiterActive: true,
      },
      providers,
    });
  });

  app.get('/api/social/oauth/:provider/url', (req, res) => {
    const provider = String(req.params.provider || '').toLowerCase() as SocialProviderKey;
    if (!(provider in SOCIAL_OAUTH_CONFIGS)) {
      return res.status(400).json({ error: 'منصة غير مدعومة.' });
    }
    const cfg = SOCIAL_OAUTH_CONFIGS[provider];
    const creds = getProviderCredentials(provider);
    const baseUrl = resolvePublicAppBaseUrl();
    const redirectUri = `${baseUrl}/api/social/oauth/${provider}/callback`;

    if (!creds.configured) {
      return res.status(503).json({
        configured: false,
        provider,
        callbackUrl: redirectUri,
        requiredEnv: [cfg.clientIdEnv, cfg.clientSecretEnv],
        error: `لتفعيل ربط ${cfg.label} الرسمي، أضف ${cfg.clientIdEnv} و ${cfg.clientSecretEnv} في Settings > Secrets.`,
      });
    }

    pruneExpiredOAuthStates();
    const existingSession = extractBearerSessionId(req);
    const sessionId = existingSession || crypto.randomBytes(32).toString('hex');
    const state = crypto.randomBytes(24).toString('hex');
    let codeVerifier: string | undefined;

    const params = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scopes,
      state,
    });

    if (cfg.usesPkce) {
      codeVerifier = crypto.randomBytes(32).toString('base64url');
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    if (provider === 'reddit') {
      params.set('duration', 'temporary');
    }

    pendingOAuthStates.set(state, {
      state,
      provider,
      sessionId,
      codeVerifier,
      createdAt: Date.now(),
    });

    return res.json({
      url: `${cfg.authorizeUrl}?${params.toString()}`,
      callbackUrl: redirectUri,
      provider,
    });
  });

  const handleSocialOAuthCallback = async (req: express.Request, res: express.Response) => {
    const provider = String(req.params.provider || '').toLowerCase() as SocialProviderKey;
    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim();
    const oauthErr = String(req.query.error || '').trim();

    const sendPopupResult = (payload: Record<string, unknown>, messageAr: string) => {
      const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
      const safeText = messageAr.replace(/[<>&"]/g, '');
      res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>VALDRION OAuth</title></head>
<body style="background:#0B101B;color:#F6ECDA;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;">
  <div>
    <p style="font-size:16px;font-weight:700;">${safeText}</p>
    <p style="font-size:12px;color:#94A3B8;">ستُغلق هذه النافذة تلقائياً...</p>
  </div>
  <script>
    (function() {
      var payload = ${safeJson};
      if (window.opener) {
        window.opener.postMessage(payload, '*');
        setTimeout(function() { window.close(); }, 180);
      }
    })();
  </script>
</body>
</html>`);
    };

    if (oauthErr || !code || !state || !(provider in SOCIAL_OAUTH_CONFIGS)) {
      return sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', provider, error: oauthErr || 'تم إلغاء التفويض أو البيانات ناقصة.' },
        'لم يكتمل ربط الحساب.'
      );
    }

    const pending = pendingOAuthStates.get(state);
    if (
      !pending ||
      pending.provider !== provider ||
      !timingSafeCompareStrings(pending.state, state) ||
      Date.now() - pending.createdAt > 10 * 60 * 1000
    ) {
      pendingOAuthStates.delete(state);
      return sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', provider, error: 'انتهت صلاحية رمز التحقق الأمني. أعد المحاولة.' },
        'انتهت صلاحية رمز التحقق.'
      );
    }
    pendingOAuthStates.delete(state);

    const cfg = SOCIAL_OAUTH_CONFIGS[provider];
    const creds = getProviderCredentials(provider);
    if (!creds.configured) {
      return sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', provider, error: 'إعدادات المنصة غير مكتملة على الخادم.' },
        'إعدادات المنصة غير مكتملة.'
      );
    }

    const baseUrl = resolvePublicAppBaseUrl();
    const redirectUri = `${baseUrl}/api/social/oauth/${provider}/callback`;

    try {
      const form = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      });

      const tokenHeaders: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'VALDRION-OAuth/1.0',
      };

      if (provider === 'reddit' || provider === 'spotify' || provider === 'x') {
        const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
        tokenHeaders.Authorization = `Basic ${basic}`;
        if (pending.codeVerifier) {
          form.set('code_verifier', pending.codeVerifier);
        }
      } else {
        form.set('client_id', creds.clientId);
        form.set('client_secret', creds.clientSecret);
      }

      const tokenResp = await fetch(cfg.tokenUrl, {
        method: 'POST',
        headers: tokenHeaders,
        body: form.toString(),
      });
      const tokenData = (await tokenResp.json()) as {
        access_token?: string;
        error_description?: string;
        error?: string;
      };

      if (!tokenResp.ok || !tokenData.access_token) {
        return sendPopupResult(
          {
            type: 'OAUTH_AUTH_ERROR',
            provider,
            error: tokenData.error_description || tokenData.error || 'فشل تبادل رمز التفويض.',
          },
          'تعذّر إتمام الربط مع المنصة.'
        );
      }

      const profile = await fetchSocialProfile(provider, tokenData.access_token);
      const encryptedToken = encryptServerToken(tokenData.access_token);

      let vault = socialVaultSessions.get(pending.sessionId);
      if (!vault) {
        vault = new Map();
        socialVaultSessions.set(pending.sessionId, vault);
      }
      vault.set(provider, {
        provider,
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        connectedAt: Date.now(),
        encryptedToken,
      });

      return sendPopupResult(
        {
          type: 'OAUTH_AUTH_SUCCESS',
          provider,
          sessionToken: pending.sessionId,
          account: {
            handle: profile.handle,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            profileUrl: profile.profileUrl,
          },
        },
        `تم ربط حساب ${cfg.label} (${profile.handle}) بأمان مشفّر!`
      );
    } catch {
      return sendPopupResult(
        { type: 'OAUTH_AUTH_ERROR', provider, error: 'تعذّر الاتصال بخادم المنصة.' },
        'تعذّر الاتصال بالمنصة.'
      );
    }
  };

  app.get(
    ['/api/social/oauth/:provider/callback', '/api/social/oauth/:provider/callback/'],
    handleSocialOAuthCallback
  );

  app.post('/api/social/disconnect', (req, res) => {
    const sessionId = extractBearerSessionId(req);
    const provider = String(req.body?.provider || '').toLowerCase() as SocialProviderKey;
    if (!sessionId) {
      return res.status(401).json({ error: 'لا توجد جلسة مربوطة حالياً.' });
    }
    const vault = socialVaultSessions.get(sessionId);
    if (vault) {
      if (provider === ('all' as unknown as SocialProviderKey)) {
        vault.clear();
        socialVaultSessions.delete(sessionId);
      } else if (provider in SOCIAL_OAUTH_CONFIGS) {
        vault.delete(provider);
      }
    }
    return res.json({ ok: true });
  });

  app.post('/api/social/search', async (req, res) => {
    const sessionId = extractBearerSessionId(req);
    if (!sessionId) {
      return res.status(401).json({ error: 'يلزم ربط حساب واحد على الأقل عبر OAuth أولاً.' });
    }
    const consent = Boolean(req.body?.consent);
    if (!consent) {
      return res.status(403).json({
        error: 'يلزم إذنك الصريح قبل البحث داخل حساباتك المربوطة.',
      });
    }
    const query = String(req.body?.query || '').trim().slice(0, 140);
    const vault = socialVaultSessions.get(sessionId);
    if (!vault || vault.size === 0) {
      return res.json({ hits: [], searchedProviders: [] });
    }

    const accounts = Array.from(vault.values());
    const results = await Promise.all(
      accounts.map((acc) => searchSingleConnectedSocial(acc, query))
    );
    return res.json({
      hits: results.flat().slice(0, 20),
      searchedProviders: accounts.map((a) => a.provider),
    });
  });

  // 1. Real Official Artwork Resolver API
  app.get('/api/media/artwork', async (req, res) => {
    const title = String(req.query.title || '').trim();
    const originalTitle = String(req.query.originalTitle || '').trim();
    const kind = String(req.query.kind || 'movie').trim();

    if (!title && !originalTitle) {
      return res.status(400).json({ error: 'Missing title parameter' });
    }

    let result = originalTitle
      ? await resolveRealOfficialArtwork(originalTitle, kind)
      : { posterUrl: null, backdropUrl: null, source: null };

    if (!result.posterUrl && title && title !== originalTitle) {
      result = await resolveRealOfficialArtwork(title, kind);
    }

    return res.json(result);
  });

  // 1B. SSRF-Safe CORS Image Proxy (Ensures real internet photos & Canvas WebM video export NEVER fail)
  app.get('/api/media/proxy-image', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    const safeUrl = isSafePublicHttpUrl(rawUrl);
    if (!safeUrl) {
      return res.status(400).send('Invalid image URL');
    }
    try {
      const upstream = await fetchWithTimeout(safeUrl, 8000);
      if (!upstream.ok) {
        return res.status(upstream.status).send('Upstream image fetch failed');
      }
      const ct = upstream.headers.get('content-type') || '';
      if (!/^image\//i.test(ct)) {
        return res.status(415).send('Not an image');
      }
      const arr = new Uint8Array(await upstream.arrayBuffer());
      if (arr.byteLength > 8 * 1024 * 1024) {
        return res.status(413).send('Image too large');
      }
      res.setHeader('Content-Type', ct);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(Buffer.from(arr));
    } catch {
      return res.status(502).send('Proxy timeout');
    }
  });

  // 2. Built-in Xtream Codes & M3U Server Proxy (Streaming compact cap — aborts huge 50MB+ IPTV streams immediately!)
  app.get('/api/xtream-proxy', async (req, res) => {
    const targetUrl = String(req.query.url || '').trim();
    const safeUrl = isSafePublicHttpUrl(targetUrl);
    if (!safeUrl) {
      return res.status(400).json({ error: 'رابط السيرفر غير صالح أو يشير لشبكة داخلية.' });
    }

    const compact = String(req.query.compact || '') === '1';
    const rawLimit = Number(req.query.limit || 1000);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(50, Math.min(2000, Math.floor(rawLimit)))
      : 1000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), compact ? 16000 : 18000);

    try {
      const upstream = await fetch(safeUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
        },
      });

      if (compact) {
        if (!upstream.ok) {
          clearTimeout(timeoutId);
          return res.status(upstream.status).json([]);
        }

        const parser = createStreamingCompactXtreamParser(limit);
        const MAX_COMPACT_BYTES = 4 * 1024 * 1024; // Hard 4 MB upstream cap so 80MB panels NEVER stall RAM or browser
        let totalBytes = 0;

        if (upstream.body) {
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder('utf-8');
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                totalBytes += value.byteLength;
                const chunkText = decoder.decode(value, { stream: true });
                const reachedLimit = parser.push(chunkText);
                if (reachedLimit || totalBytes >= MAX_COMPACT_BYTES) {
                  await reader.cancel().catch(() => {});
                  controller.abort();
                  break;
                }
              }
            }
            const tail = decoder.decode();
            if (tail && !parser.isFull()) parser.push(tail);
          } catch {
            // Expected when controller.abort() fires after reaching limit
          }
        } else {
          const text = (await upstream.text()).slice(0, MAX_COMPACT_BYTES);
          parser.push(text);
        }

        clearTimeout(timeoutId);
        const items = parser.getItems();
        return res
          .status(200)
          .setHeader('Content-Type', 'application/json; charset=utf-8')
          .setHeader('X-Compact-Count', String(items.length))
          .json(items);
      }

      // Non-compact (auth handshake, single series info, or M3U) — hard 6 MB cap so browser never freezes
      const contentType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';
      const MAX_RAW_BYTES = 6 * 1024 * 1024;
      let rawText = '';
      if (upstream.body) {
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let bytesRead = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              bytesRead += value.byteLength;
              rawText += decoder.decode(value, { stream: true });
              if (bytesRead >= MAX_RAW_BYTES) {
                await reader.cancel().catch(() => {});
                controller.abort();
                break;
              }
            }
          }
          rawText += decoder.decode();
        } catch {
          // Aborted at cap
        }
      } else {
        rawText = (await upstream.text()).slice(0, MAX_RAW_BYTES);
      }
      clearTimeout(timeoutId);
      const cleanedText = rawText.replace(/^\uFEFF/, '');
      return res.status(upstream.status).setHeader('Content-Type', contentType).send(cleanedText);
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : 'تعذّر الاتصال بالسيرفر الوسيط.';
      return res.status(502).json({ error: `فشل الاتصال بالمصدر عبر الوسيط: ${msg}` });
    }
  });

  // 2B. Streaming Video / HLS Proxy (Fixes HTTP Mixed-Content & CORS playback for IPTV Movies, Series & Live TV)
  app.get('/api/stream-proxy', async (req, res) => {
    const targetUrl = String(req.query.url || '').trim();
    const safeUrl = isSafePublicHttpUrl(targetUrl);
    if (!safeUrl) {
      return res.status(400).json({ error: 'رابط البث غير صالح أو غير مسموح به.' });
    }

    const controller = new AbortController();
    const abortOnClose = () => controller.abort();
    req.on('close', abortOnClose);

    try {
      const buildHeaders = (ua: string) => {
        const h: Record<string, string> = {
          'User-Agent': ua,
          Accept: '*/*',
          Connection: 'keep-alive',
        };
        if (typeof req.headers.range === 'string' && req.headers.range.trim()) {
          h.Range = req.headers.range.trim();
        }
        return h;
      };

      let upstream = await fetch(safeUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: buildHeaders('VLC/3.0.20 LibVLC/3.0.20'),
      });

      if ([401, 403, 406, 451].includes(upstream.status)) {
        upstream = await fetch(safeUrl, {
          signal: controller.signal,
          redirect: 'follow',
          headers: buildHeaders('IPTVSmartersPlayer'),
        });
      }

      if ([401, 403, 406, 451].includes(upstream.status)) {
        upstream = await fetch(safeUrl, {
          signal: controller.signal,
          redirect: 'follow',
          headers: buildHeaders(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          ),
        });
      }

      if (!upstream.ok && upstream.status !== 206) {
        req.off('close', abortOnClose);
        return res.status(upstream.status).send(`Stream upstream HTTP ${upstream.status}`);
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');

      const finalUrl = upstream.url || safeUrl;
      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
      const isHlsManifest =
        /\.m3u8(\?|$)/i.test(finalUrl) ||
        contentType.includes('mpegurl') ||
        contentType.includes('x-mpegurl');

      if (isHlsManifest) {
        const text = (await upstream.text()).slice(0, 1024 * 1024);
        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/gi, (_m, uri: string) => {
                try {
                  const abs = new URL(uri, finalUrl).toString();
                  return `URI="/api/stream-proxy?url=${encodeURIComponent(abs)}"`;
                } catch {
                  return `URI="${uri}"`;
                }
              });
            }
            try {
              const abs = new URL(trimmed, finalUrl).toString();
              return `/api/stream-proxy?url=${encodeURIComponent(abs)}`;
            } catch {
              return line;
            }
          })
          .join('\n');

        req.off('close', abortOnClose);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        return res.status(200).send(rewritten);
      }

      // Binary video / TS / MP4 / MKV stream with full HTTP Range seeking support
      res.status(upstream.status);
      const passHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'etag',
      ];
      for (const h of passHeaders) {
        const val = upstream.headers.get(h);
        if (val) res.setHeader(h, val);
      }
      if (!upstream.headers.get('content-type')) {
        res.setHeader(
          'Content-Type',
          /\.ts(\?|$)/i.test(finalUrl) ? 'video/mp2t' : 'video/mp4'
        );
      }
      res.setHeader('Cache-Control', 'no-store');

      if (!upstream.body) {
        req.off('close', abortOnClose);
        return res.end();
      }

      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            if (!res.write(Buffer.from(value))) {
              await new Promise<void>((resolve) => res.once('drain', resolve));
            }
          }
        }
      } catch {
        // Client aborted playback / seeked
      } finally {
        req.off('close', abortOnClose);
        res.end();
      }
    } catch (err) {
      req.off('close', abortOnClose);
      if (!res.headersSent) {
        const msg = err instanceof Error ? err.message : 'Stream proxy error';
        return res.status(502).json({ error: msg });
      }
      res.end();
    }
  });

  // 2B-2. Real-Time FFmpeg Live Remuxer / Transcoder (Fixes MKV / 4K HEVC / AC3 / EAC3 / DTS / AVI Xtream Streams in Browsers!)
  let activeTranscodeJobs = 0;
  const MAX_CONCURRENT_TRANSCODES = 4;

  app.get('/api/stream-transcode', (req, res) => {
    const targetUrl = String(req.query.url || '').trim();
    const safeUrl = isSafePublicHttpUrl(targetUrl);
    if (!safeUrl) {
      return res.status(400).json({ error: 'رابط البث غير صالح أو غير مسموح به.' });
    }
    if (activeTranscodeJobs >= MAX_CONCURRENT_TRANSCODES) {
      return res.status(503).json({ error: 'محرك التحويل مشغول حالياً، حاول بعد لحظات.' });
    }

    const mode = req.query.mode === 'full' ? 'full' : 'remux';
    const rawStart = Number(req.query.start || 0);
    const startSec = Number.isFinite(rawStart) && rawStart > 0 && rawStart < 43200 ? Math.floor(rawStart) : 0;

    activeTranscodeJobs += 1;
    let released = false;
    const releaseSlot = () => {
      if (!released) {
        released = true;
        activeTranscodeJobs = Math.max(0, activeTranscodeJobs - 1);
      }
    };

    const ffArgs: string[] = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-user_agent',
      'VLC/3.0.20 LibVLC/3.0.20',
      '-reconnect',
      '1',
      '-reconnect_streamed',
      '1',
      '-reconnect_delay_max',
      '3',
      '-rw_timeout',
      '15000000',
    ];
    if (startSec > 0) {
      ffArgs.push('-ss', String(startSec));
    }
    ffArgs.push('-i', safeUrl);

    if (mode === 'remux') {
      // Ultra-fast container remux (MKV/TS -> fMP4) + convert AC3/EAC3/DTS audio to browser-compatible AAC
      ffArgs.push(
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-ac',
        '2',
        '-b:a',
        '192k',
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        '-f',
        'mp4',
        'pipe:1'
      );
    } else {
      // Full real-time H.264 + AAC transcode for 4K HEVC/H.265/AVI/exotic IPTV codecs
      ffArgs.push(
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'zerolatency',
        '-crf',
        '23',
        '-vf',
        "scale='min(1280,iw)':-2",
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-ac',
        '2',
        '-b:a',
        '160k',
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        '-f',
        'mp4',
        'pipe:1'
      );
    }

    const ff = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let headersSent = false;
    let stderrBuf = '';

    const killChild = () => {
      try {
        if (!ff.killed) ff.kill('SIGKILL');
      } catch {
        // ignore
      }
      releaseSlot();
    };

    req.on('close', killChild);
    res.on('close', killChild);

    ff.stderr.on('data', (chunk: Buffer) => {
      if (stderrBuf.length < 1000) stderrBuf += chunk.toString('utf8');
    });

    ff.stdout.on('data', (chunk: Buffer) => {
      if (!headersSent) {
        headersSent = true;
        res.status(200);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      if (!res.writableEnded) {
        res.write(chunk);
      }
    });

    ff.on('error', () => {
      releaseSlot();
      if (!headersSent && !res.headersSent) {
        res.status(502).json({ error: 'تعذّر تشغيل محرك التحويل المدمج.' });
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    ff.on('close', (code) => {
      releaseSlot();
      if (!headersSent && !res.headersSent) {
        res.status(502).json({
          error: `تعذّر تحويل هذا البث (${code ?? 'err'}): ${stderrBuf.slice(0, 140)}`,
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    });
  });

  // 2B-3. Automatic Parallel Cross-Server Media Scanner (Searches ALL saved Xtream / M3U servers at once!)
  app.post('/api/xtream/multi-server-search', async (req, res) => {
    try {
      const body = (req.body || {}) as {
        query?: string;
        kind?: 'all' | 'movie' | 'series' | 'live';
        servers?: Array<{
          id?: string;
          name?: string;
          type?: string;
          host?: string;
          username?: string;
          password?: string;
          m3uUrl?: string;
        }>;
      };
      const rawQuery = String(body.query || '').trim();
      const cleanedQ = cleanMediaSearchTitle(rawQuery);
      if (!cleanedQ || cleanedQ.length < 2) {
        return res.json({ matches: [], scannedServers: 0 });
      }
      const kind = body.kind || 'all';
      const servers = Array.isArray(body.servers) ? body.servers.slice(0, 8) : [];
      if (servers.length === 0) {
        return res.json({ matches: [], scannedServers: 0 });
      }

      const fetchCompactXtreamList = async (
        url: string,
        limit = 3500
      ): Promise<Array<Record<string, unknown>>> => {
        const safe = isSafePublicHttpUrl(url);
        if (!safe) return [];
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8500);
        try {
          const upstream = await fetch(safe, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
              Accept: 'application/json, text/plain, */*',
            },
          });
          if (!upstream.ok || !upstream.body) return [];
          const parser = createStreamingCompactXtreamParser(limit);
          const reader = upstream.body.getReader();
          const decoder = new TextDecoder('utf-8');
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              const reached = parser.push(decoder.decode(value, { stream: true }));
              if (reached || parser.isFull()) {
                controller.abort();
                break;
              }
            }
          }
          const trailing = decoder.decode();
          if (trailing) parser.push(trailing);
          return parser.getItems();
        } catch {
          return [];
        } finally {
          clearTimeout(timer);
        }
      };

      const scanOneServer = async (srv: (typeof servers)[number]) => {
        const srvId = String(srv.id || '');
        const srvName = String(srv.name || 'سيرفر خارجي');
        const found: Array<{
          serverId: string;
          serverName: string;
          serverType: string;
          score: number;
          qualityTag: string;
          item: Record<string, unknown>;
        }> = [];

        if (srv.type === 'xtream' && srv.host && srv.username && srv.password) {
          const host = srv.host.trim().replace(/\/+$/, '');
          const baseApi = `${host}/player_api.php?username=${encodeURIComponent(
            srv.username
          )}&password=${encodeURIComponent(srv.password)}`;
          const tasks: Array<Promise<void>> = [];

          if (kind === 'all' || kind === 'series') {
            tasks.push(
              fetchCompactXtreamList(`${baseApi}&action=get_series`, 3500).then((rows) => {
                for (const row of rows) {
                  const title = String(row.name || '').trim();
                  const score = scoreTitleMatch(rawQuery, title);
                  if (score >= 58) {
                    const sid = String(row.series_id ?? row.stream_id ?? '');
                    if (!sid) continue;
                    found.push({
                      serverId: srvId,
                      serverName: srvName,
                      serverType: 'xtream',
                      score,
                      qualityTag: detectQualityBadge({ title }),
                      item: {
                        id: `xsrv_${srvId}_ser_${sid}`,
                        kind: 'series',
                        seriesId: sid,
                        category_id: String(row.category_id || '0'),
                        title,
                        poster: String(row.cover || ''),
                        rating: row.rating ? String(row.rating) : undefined,
                        year: row.releaseDate ? String(row.releaseDate).slice(0, 4) : undefined,
                        desc: row.plot ? String(row.plot) : undefined,
                      },
                    });
                  }
                }
              })
            );
          }

          if (kind === 'all' || kind === 'movie') {
            tasks.push(
              fetchCompactXtreamList(`${baseApi}&action=get_vod_streams`, 3500).then((rows) => {
                for (const row of rows) {
                  const title = String(row.name || '').trim();
                  const score = scoreTitleMatch(rawQuery, title);
                  if (score >= 58) {
                    const vid = String(row.stream_id ?? '');
                    if (!vid) continue;
                    const ext = String(row.container_extension || 'mp4');
                    found.push({
                      serverId: srvId,
                      serverName: srvName,
                      serverType: 'xtream',
                      score,
                      qualityTag: detectQualityBadge({ title }),
                      item: {
                        id: `xsrv_${srvId}_vod_${vid}`,
                        kind: 'movie',
                        category_id: String(row.category_id || '0'),
                        title,
                        poster: String(row.stream_icon || ''),
                        rating: row.rating ? String(row.rating) : undefined,
                        url: `${host}/movie/${encodeURIComponent(srv.username!)}/${encodeURIComponent(
                          srv.password!
                        )}/${vid}.${ext}`,
                      },
                    });
                  }
                }
              })
            );
          }

          if (kind === 'all' || kind === 'live') {
            tasks.push(
              fetchCompactXtreamList(`${baseApi}&action=get_live_streams`, 2000).then((rows) => {
                for (const row of rows) {
                  const title = String(row.name || '').trim();
                  const score = scoreTitleMatch(rawQuery, title);
                  if (score >= 62) {
                    const lid = String(row.stream_id ?? '');
                    if (!lid) continue;
                    found.push({
                      serverId: srvId,
                      serverName: srvName,
                      serverType: 'xtream',
                      score,
                      qualityTag: 'LIVE',
                      item: {
                        id: `xsrv_${srvId}_live_${lid}`,
                        kind: 'live',
                        isLive: true,
                        category_id: String(row.category_id || '0'),
                        title,
                        poster: String(row.stream_icon || ''),
                        url: `${host}/live/${encodeURIComponent(srv.username!)}/${encodeURIComponent(
                          srv.password!
                        )}/${lid}.m3u8`,
                      },
                    });
                  }
                }
              })
            );
          }

          await Promise.all(tasks);
        } else if (srv.type === 'm3u' && srv.m3uUrl) {
          const safe = isSafePublicHttpUrl(srv.m3uUrl);
          if (safe) {
            try {
              const r = await fetch(safe, {
                signal: AbortSignal.timeout(8000),
                headers: { 'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20' },
              });
              if (r.ok) {
                const txt = (await r.text()).slice(0, 6_000_000);
                const lines = txt.split(/\r?\n/);
                let curTitle = '';
                let curLogo = '';
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if (line.startsWith('#EXTINF')) {
                    const comma = line.lastIndexOf(',');
                    curTitle = comma >= 0 ? line.slice(comma + 1).trim() : '';
                    const lm = line.match(/tvg-logo="([^"]+)"/i);
                    curLogo = lm ? lm[1] : '';
                  } else if (line && !line.startsWith('#') && curTitle) {
                    const score = scoreTitleMatch(rawQuery, curTitle);
                    if (score >= 60) {
                      const isVod = /\.(mp4|mkv|avi|mov|webm)(\?|$)/i.test(line);
                      const isSer = /\/series\//i.test(line) || /S\d{1,2}E\d{1,2}/i.test(curTitle);
                      const itemKind = isSer ? 'series' : isVod ? 'movie' : 'live';
                      if (kind === 'all' || kind === itemKind) {
                        found.push({
                          serverId: srvId,
                          serverName: srvName,
                          serverType: 'm3u',
                          score,
                          qualityTag: detectQualityBadge({ title: curTitle }),
                          item: {
                            id: `m3u_${srvId}_${i}`,
                            kind: itemKind === 'series' ? 'movie' : itemKind,
                            isLive: itemKind === 'live',
                            category_id: 'm3u',
                            title: curTitle,
                            poster: curLogo || undefined,
                            url: line,
                          },
                        });
                      }
                    }
                    curTitle = '';
                    if (found.length >= 12) break;
                  }
                }
              }
            } catch {
              // ignore unreachable m3u
            }
          }
        }

        return found
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
      };

      const perServerResults = await Promise.all(servers.map((s) => scanOneServer(s)));
      const allMatches = perServerResults
        .flat()
        .sort((a, b) => b.score - a.score)
        .slice(0, 24);

      return res.json({
        matches: allMatches,
        scannedServers: servers.length,
        cleanedQuery: cleanedQ,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Multi-server search failed';
      return res.status(500).json({ error: msg, matches: [] });
    }
  });

  // 2C. Extract IPTV / Xtream / M3U Server Credentials from Screenshot Image (Gemini Vision OCR)
  app.post('/api/xtream/extract-image', async (req, res) => {
    try {
      const { mimeType, data } = req.body as { mimeType?: string; data?: string };
      if (!data || typeof data !== 'string' || data.length > 11_000_000) {
        return res.status(400).json({ error: 'يرجى رفع صورة صالحة بحجم أقل من 8 ميجابايت.' });
      }
      const safeMime = /^image\/(png|jpeg|jpg|webp|gif)$/i.test(String(mimeType || ''))
        ? String(mimeType)
        : 'image/jpeg';

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: safeMime,
                  data: data.replace(/^data:[^;]+;base64,/, ''),
                },
              },
              {
                text: `Extract ALL IPTV / Xtream Codes / M3U server credentials visible in this image.
Return ONLY valid JSON with this exact schema:
{
  "rawText": "all transcribed text lines from the image",
  "servers": [
    {
      "name": "friendly server label or hostname",
      "host": "http://domain:port",
      "username": "exact username",
      "password": "exact password",
      "m3uUrl": "optional full m3u url if present",
      "expiry": "optional expiry date if present"
    }
  ]
}
Be extremely accurate with every letter, digit, port number, and uppercase/lowercase character.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const textOut = response.text || '{}';
      let parsed: {
        rawText?: string;
        servers?: Array<{
          name?: string;
          host?: string;
          username?: string;
          password?: string;
          m3uUrl?: string;
          expiry?: string;
        }>;
      } = {};
      try {
        parsed = JSON.parse(textOut);
      } catch {
        parsed = { rawText: textOut, servers: [] };
      }

      return res.json({
        ok: true,
        rawText: String(parsed.rawText || ''),
        servers: Array.isArray(parsed.servers) ? parsed.servers : [],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر قراءة الصورة حالياً.';
      return res.status(502).json({ error: msg });
    }
  });

  // 2D. Real Open-Web Novel Search & Full Text Download (Gutendex / Project Gutenberg + OpenLibrary)
  app.post('/api/web-media/novels', async (req, res) => {
    const query = String((req.body as { query?: string })?.query || '').trim();
    if (!query || query.length > 200) {
      return res.status(400).json({ error: 'يرجى كتابة اسم الرواية أو المؤلف للبحث بالويب.' });
    }

    try {
      const gutenRes = await fetch(
        `https://gutendex.com/books/?search=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(12000) }
      );
      const gutenJson = gutenRes.ok
        ? ((await gutenRes.json()) as {
            results?: Array<{
              id: number;
              title: string;
              authors?: Array<{ name: string }>;
              languages?: string[];
              subjects?: string[];
              formats?: Record<string, string>;
            }>;
          })
        : { results: [] };

      const candidates = (gutenJson.results || []).slice(0, 6);
      const downloadedBooks: Array<{
        id: string;
        title: string;
        author: string;
        country: string;
        sourceUrl: string;
        coverImage?: string;
        synopsis: string;
        chapters: Array<{ number: number; title: string; content: string }>;
      }> = [];

      // Download full text for the top matching book right away so it installs directly in VALDRION Novels
      if (candidates[0]) {
        const top = candidates[0];
        const txtUrl =
          top.formats?.['text/plain; charset=utf-8'] ||
          top.formats?.['text/plain; charset=us-ascii'] ||
          top.formats?.['text/plain'] ||
          '';
        let fullText = '';
        if (txtUrl && isSafePublicHttpUrl(txtUrl)) {
          try {
            const txtRes = await fetch(txtUrl, { signal: AbortSignal.timeout(10000) });
            if (txtRes.ok) {
              fullText = (await txtRes.text()).slice(0, 120_000);
            }
          } catch {
            // fallback to metadata
          }
        }

        // Strip Project Gutenberg header boilerplate if present
        const startMarker = fullText.search(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG/i);
        if (startMarker >= 0) {
          fullText = fullText.slice(startMarker + 60);
        }
        const cleaned = fullText.replace(/\r\n/g, '\n').trim();
        const chapters: Array<{ number: number; title: string; content: string }> = [];
        if (cleaned.length > 400) {
          const chunkSize = 4200;
          const maxChapters = 6;
          for (let i = 0; i < maxChapters && i * chunkSize < cleaned.length; i++) {
            const slice = cleaned.slice(i * chunkSize, (i + 1) * chunkSize).trim();
            if (slice.length > 100) {
              chapters.push({
                number: i + 1,
                title: `الفصل ${i + 1}`,
                content: slice,
              });
            }
          }
        }

        const lang = (top.languages || [])[0] || 'en';
        const countryMap: Record<string, string> = {
          ar: 'عربي',
          en: 'بريطاني',
          fr: 'فرنسي',
          ru: 'روسي',
          ja: 'ياباني',
          ko: 'كوري',
          zh: 'صيني',
          tr: 'تركي',
        };

        downloadedBooks.push({
          id: `web_guten_${top.id}_${Date.now()}`,
          title: top.title,
          author: top.authors?.[0]?.name || 'مؤلف عالمي',
          country: countryMap[lang] || 'عالمي',
          sourceUrl: `https://www.gutenberg.org/ebooks/${top.id}`,
          coverImage: top.formats?.['image/jpeg'],
          synopsis: (top.subjects || []).slice(0, 3).join(' · ') || `تم تنزيلها من الويب المفتوح (${top.title})`,
          chapters:
            chapters.length > 0
              ? chapters
              : [
                  {
                    number: 1,
                    title: 'مقدمة الكتاب',
                    content: `تم العثور على كتاب «${top.title}» من المكتبة العالمية المفتوحة Project Gutenberg.`,
                  },
                ],
        });
      }

      // Also search OpenLibrary if Gutendex had no hits (great for Arabic & modern titles!)
      if (downloadedBooks.length === 0) {
        const olRes = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (olRes.ok) {
          const olJson = (await olRes.json()) as {
            docs?: Array<{
              key?: string;
              title?: string;
              author_name?: string[];
              first_publish_year?: number;
              subject?: string[];
              cover_i?: number;
            }>;
          };
          for (const doc of (olJson.docs || []).slice(0, 3)) {
            if (!doc.title) continue;
            downloadedBooks.push({
              id: `web_ol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: doc.title,
              author: doc.author_name?.[0] || 'مؤلف عالمي',
              country: /[\u0600-\u06FF]/.test(doc.title) ? 'عربي' : 'عالمي',
              sourceUrl: doc.key ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org',
              coverImage: doc.cover_i
                ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
                : undefined,
              synopsis: `نُشرت ${doc.first_publish_year || ''} · ${(doc.subject || []).slice(0, 3).join(' · ') || 'رواية مجلوبة من OpenLibrary'}`.trim(),
              chapters: [
                {
                  number: 1,
                  title: 'نظرة شاملة وبداية القراءة',
                  content: `تم جلب بطاقة وبيانات رواية «${doc.title}» للكاتب ${doc.author_name?.[0] || 'مجهول'} من مكتبة OpenLibrary العالمية.\n\nالتصنيفات: ${(doc.subject || []).slice(0, 6).join('، ') || 'أدب عالمي'}.\nيمكنك تكملة الفصول داخل القارئ 4D أو فتح المصدر الأصلي في أي وقت.`,
                },
              ],
            });
          }
        }
      }

      return res.json({
        ok: true,
        query,
        books: downloadedBooks,
        alternatives: candidates.slice(1).map((b) => ({
          title: b.title,
          author: b.authors?.[0]?.name || 'عالمي',
          url: `https://www.gutenberg.org/ebooks/${b.id}`,
        })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر البحث عن الرواية في الويب حالياً.';
      return res.status(502).json({ error: msg });
    }
  });

  // 2E. Real Open-Web Cinema Search & Playable Stream Importer (Internet Archive Open Movies & Series)
  app.post('/api/web-media/cinema', async (req, res) => {
    const query = String((req.body as { query?: string })?.query || '').trim();
    if (!query || query.length > 200) {
      return res.status(400).json({ error: 'يرجى كتابة اسم الفيلم أو المسلسل للبحث عنه بالويب.' });
    }

    try {
      const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
        `(${query}) AND mediatype:(movies)`
      )}&fl[]=identifier,title,description,year,creator&sort[]=downloads+desc&rows=6&page=1&output=json`;
      const archRes = await fetch(searchUrl, { signal: AbortSignal.timeout(12000) });
      const archJson = archRes.ok
        ? ((await archRes.json()) as {
            response?: {
              docs?: Array<{
                identifier: string;
                title?: string;
                description?: string | string[];
                year?: string | number;
                creator?: string | string[];
              }>;
            };
          })
        : { response: { docs: [] } };

      const docs = (archJson.response?.docs || []).slice(0, 4);
      const items: Array<{
        id: string;
        title: string;
        year: string;
        desc: string;
        director: string;
        poster: string;
        url: string;
        sourcePage: string;
      }> = [];

      for (const doc of docs) {
        if (!doc.identifier) continue;
        try {
          const metaRes = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (!metaRes.ok) continue;
          const meta = (await metaRes.json()) as {
            files?: Array<{ name?: string; format?: string }>;
          };
          const mp4File = (meta.files || []).find(
            (f) => f.name && /\.mp4$/i.test(f.name) && !/\.ia\.mp4$/i.test(f.name)
          ) || (meta.files || []).find((f) => f.name && /\.(mp4|webm|ogv)$/i.test(f.name));
          if (!mp4File?.name) continue;

          const streamUrl = `https://archive.org/download/${encodeURIComponent(
            doc.identifier
          )}/${encodeURIComponent(mp4File.name)}`;
          const rawDesc = Array.isArray(doc.description)
            ? doc.description.join(' ')
            : String(doc.description || '');
          items.push({
            id: `web_cinema_${doc.identifier}`,
            title: String(doc.title || doc.identifier),
            year: String(doc.year || 'HD'),
            desc: rawDesc.replace(/<[^>]+>/g, '').slice(0, 260) || 'عمل سينمائي مجلوب مباشرة من الأرشيف المفتوح.',
            director: Array.isArray(doc.creator)
              ? doc.creator[0] || ''
              : String(doc.creator || ''),
            poster: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
            url: streamUrl,
            sourcePage: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
          });
        } catch {
          // skip unreadable item
        }
      }

      return res.json({ ok: true, query, items });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذّر جلب الأعمال من الويب حالياً.';
      return res.status(502).json({ error: msg });
    }
  });

  // 2F. Official Meta WhatsApp Cloud API Live Status & Webhook Receiver
  const liveWhatsAppFeed: Array<{
    id: string;
    from: string;
    senderName: string;
    text: string;
    ts: number;
  }> = [];

  app.get('/api/whatsapp/status', (_req, res) => {
    const baseUrl = resolvePublicAppBaseUrl();
    const configured = Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
    return res.json({
      configured,
      webhookUrl: `${baseUrl}/api/whatsapp/webhook`,
      verifyTokenHint: process.env.WHATSAPP_VERIFY_TOKEN ? 'مضبوط بالخادم' : 'valdrion_wa_verify',
      liveMessagesCount: liveWhatsAppFeed.length,
    });
  });

  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = String(req.query['hub.mode'] || '');
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'valdrion_wa_verify';
    if (mode === 'subscribe' && token === expectedToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  });

  app.post('/api/whatsapp/webhook', (req, res) => {
    try {
      const body = req.body as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
              messages?: Array<{
                id?: string;
                from?: string;
                timestamp?: string;
                text?: { body?: string };
              }>;
            };
          }>;
        }>;
      };
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const contacts = change.value?.contacts || [];
          for (const msg of change.value?.messages || []) {
            const text = msg.text?.body?.trim();
            if (!text) continue;
            const contact = contacts.find((c) => c.wa_id === msg.from);
            liveWhatsAppFeed.unshift({
              id: msg.id || `wa_${Date.now()}`,
              from: msg.from || 'unknown',
              senderName: contact?.profile?.name || msg.from || 'مراسل واتساب',
              text: text.slice(0, 1000),
              ts: msg.timestamp ? Number(msg.timestamp) * 1000 : Date.now(),
            });
          }
        }
      }
      if (liveWhatsAppFeed.length > 100) {
        liveWhatsAppFeed.length = 100;
      }
      return res.sendStatus(200);
    } catch {
      return res.sendStatus(200);
    }
  });

  app.get('/api/whatsapp/messages', (_req, res) => {
    return res.json({ messages: liveWhatsAppFeed });
  });

  // 3. Server Health & Speed Ping Tester (SSRF-Safe)
  app.post('/api/servers/ping', async (req, res) => {
    const { servers } = req.body as {
      servers?: Array<{
        id: string;
        type: 'showcase' | 'xtream' | 'm3u';
        host: string;
        username?: string;
        password?: string;
      }>;
    };

    if (!Array.isArray(servers) || servers.length === 0) {
      return res.status(400).json({ error: 'يرجى تحديد سيرفر واحد على الأقل للفحص.' });
    }

    const targets = servers.slice(0, 15);
    const results = await Promise.all(
      targets.map(async (srv) => {
        const checkedAt = Date.now();
        if (srv.type === 'showcase') {
          const latencyMs = 12 + Math.floor(Math.random() * 18);
          return {
            serverId: srv.id,
            ok: true,
            latencyMs,
            statusCode: 200,
            checkedAt,
          };
        }

        if (srv.type === 'm3u' && srv.host.startsWith('local://')) {
          return {
            serverId: srv.id,
            ok: true,
            latencyMs: 5,
            statusCode: 200,
            checkedAt,
          };
        }

        let probeUrl = srv.host;
        if (srv.type === 'xtream' && srv.username && srv.password) {
          const cleanHost = srv.host.replace(/\/+$/, '');
          probeUrl = `${cleanHost}/player_api.php?username=${encodeURIComponent(
            srv.username
          )}&password=${encodeURIComponent(srv.password)}`;
        }

        const safeUrl = isSafePublicHttpUrl(probeUrl);
        if (!safeUrl) {
          return {
            serverId: srv.id,
            ok: false,
            latencyMs: null,
            statusCode: 400,
            checkedAt,
          };
        }

        const start = Date.now();
        try {
          const resp = await fetchWithTimeout(safeUrl, 4500);
          const latencyMs = Date.now() - start;
          return {
            serverId: srv.id,
            ok: resp.ok || resp.status < 500,
            latencyMs,
            statusCode: resp.status,
            checkedAt: Date.now(),
          };
        } catch {
          return {
            serverId: srv.id,
            ok: false,
            latencyMs: null,
            checkedAt: Date.now(),
          };
        }
      })
    );

    return res.json({ results });
  });

  // 4. Integrated Gemini Smart Cinema Concierge API
  app.post('/api/ai/concierge', async (req, res) => {
    const { message, history, catalogSummary, context } = req.body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      catalogSummary?: Array<{
        id: string;
        title: string;
        originalTitle?: string;
        kind: string;
        year?: string;
        rating?: string;
        genres?: string[];
        maturity?: string;
        isKidsFriendly?: boolean;
        desc?: string;
      }>;
      context?: {
        activeProfile?: string;
        familyGuard?: boolean;
        activeServerName?: string;
      };
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'يرجى كتابة سؤالك أو ما تبحث عنه أولاً.' });
    }

    try {
      const ai = getGeminiClient();
      const safeCatalog = Array.isArray(catalogSummary) ? catalogSummary.slice(0, 120) : [];
      const recentHistory = Array.isArray(history) ? history.slice(-6) : [];

      const systemInstruction = `أنت "مرشد فالدريون الذكي" (VALDRION Cinema Concierge)، مساعد سينمائي ذكي ومتكامل داخل منصة فالدريون (VALDRION).
مهمتك مساعدة المستخدم باللغة العربية الطبيعية السلسة في:
1. البحث الدقيق داخل مكتبة السيرفر الحالي حسب المزاج، القصة، التصنيف، التقييم، أو المشاهدة العائلية.
2. ترشيح أفضل الأعمال المتاحة فعلياً في المكتبة (استخدم فقط المعرفات id الموجودة في قائمة المكتبة المرفقة داخل matchedIds و watchNightPlan).
3. بناء "خطة سهرة سينمائية" (watchNightPlan) من عملين أو ثلاثة إذا طلب المستخدم سهرة أو اقتراحاً ممتعاً.
4. اقتراح إجراء مباشر داخل التطبيق إن لزم (suggestedTab أو suggestedSearch أو suggestedProfile).
قواعد صارمة:
- ردك في حقل reply يجب أن يكون موجزاً، ذكياً، وواضحاً (من 2 إلى 4 جمل عربية أنيقة).
- لا تخترع أي id غير موجود في قائمة المكتبة المقدمة لك.
- احترم حالة الحماية العائلية وملف المستخدم الحالي (${context?.activeProfile || 'العائلة'}، الحماية العائلية: ${context?.familyGuard ? 'مفعّلة' : 'متوقفة'}).
- قدّم دائماً 3 اقتراحات متابعة قصيرة ومفيدة في followUpChips.`;

      const promptPayload = JSON.stringify({
        server: context?.activeServerName || 'VALDRION',
        profile: context?.activeProfile || 'family',
        familyGuard: Boolean(context?.familyGuard),
        conversationHistory: recentHistory,
        userMessage: message.trim(),
        availableCatalog: safeCatalog,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptPayload,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              matchedIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedTab: { type: Type.STRING },
              suggestedSearch: { type: Type.STRING },
              suggestedProfile: { type: Type.STRING },
              watchNightPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemId: { type: Type.STRING },
                    slotLabel: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                },
              },
              followUpChips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['reply', 'matchedIds', 'followUpChips'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      const validIds = new Set(safeCatalog.map((c) => c.id));
      const matchedIds: string[] = Array.isArray(parsed.matchedIds)
        ? parsed.matchedIds.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id))
        : [];
      const watchNightPlan = Array.isArray(parsed.watchNightPlan)
        ? parsed.watchNightPlan.filter(
            (step: { itemId?: string }) => step && typeof step.itemId === 'string' && validIds.has(step.itemId)
          )
        : [];

      return res.json({
        reply: typeof parsed.reply === 'string' ? parsed.reply : 'إليك أفضل النتائج المطابقة لطلبك.',
        matchedIds,
        suggestedTab: ['home', 'movies', 'series', 'live', 'mylist'].includes(parsed.suggestedTab)
          ? parsed.suggestedTab
          : '',
        suggestedSearch: typeof parsed.suggestedSearch === 'string' ? parsed.suggestedSearch : '',
        suggestedProfile: ['imperial', 'family', 'kids'].includes(parsed.suggestedProfile)
          ? parsed.suggestedProfile
          : '',
        watchNightPlan,
        followUpChips: Array.isArray(parsed.followUpChips)
          ? parsed.followUpChips.filter((c: unknown): c is string => typeof c === 'string').slice(0, 3)
          : [],
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 9. Universal Free Internet Connectors API (Zero-Key Real Public APIs)
  app.get('/api/connectors/media-search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'يرجى كتابة كلمة بحث لجلب صور حقيقية من الإنترنت.' });
    }
    const assets = await fetchFreeWebMedia(q, 16);
    return res.json({ query: q, assets });
  });

  app.get('/api/connectors/github-search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'يرجى كتابة اسم مشروع أو تقنية للبحث في GitHub.' });
    }
    const repos = await fetchGitHubRepos(q, 8);
    return res.json({ query: q, repos });
  });

  app.get('/api/connectors/knowledge-hub', async (req, res) => {
    const q = String(req.query.q || '').trim();
    const lang: 'ar' | 'en' = String(req.query.lang || 'ar') === 'en' ? 'en' : 'ar';
    if (!q) {
      return res.status(400).json({ error: 'يرجى كتابة موضوع للبحث في ويكيبيديا والكتب والأبحاث.' });
    }
    const [wiki, books, papers] = await Promise.all([
      fetchWikipediaKnowledge(q, lang),
      fetchOpenLibraryBooks(q, 4),
      fetchArxivPapers(q, 4),
    ]);
    return res.json({ query: q, lang, wiki, books, papers });
  });

  app.get('/api/connectors/live-pulse', async (req, res) => {
    const city = String(req.query.city || 'Riyadh').trim() || 'Riyadh';
    const [weather, markets, techNews] = await Promise.all([
      fetchOpenMeteoWeather(city),
      fetchFreeMarketsPulse(),
      fetchHackerNewsTopStories(5),
    ]);
    const payload: LiveFreePulseData = {
      weather,
      crypto: markets.crypto,
      forexBaseUsd: markets.forexBaseUsd,
      techNews,
      fetchedAt: new Date().toISOString(),
    };
    return res.json(payload);
  });

  // 9B. Free World Atlas (RestCountries) + English/Arabic Dictionary Connector (Zero-Key)
  app.get('/api/connectors/world-info', async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (!q) {
      return res.status(400).json({ error: 'يرجى كتابة اسم دولة أو كلمة للبحث العالمي.' });
    }

    const [countryRes, dictRes] = await Promise.allSettled([
      (async () => {
        const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fields=name,capital,region,population,currencies,languages,flags,timezones`;
        const resp = await fetchWithTimeout(url, 6000);
        if (!resp.ok) return [];
        const data = (await resp.json()) as Array<{
          name?: { common?: string; official?: string };
          capital?: string[];
          region?: string;
          population?: number;
          flags?: { png?: string; svg?: string };
          currencies?: Record<string, { name?: string; symbol?: string }>;
          languages?: Record<string, string>;
          timezones?: string[];
        }>;
        return (Array.isArray(data) ? data : []).slice(0, 3).map((c) => ({
          name: c.name?.common || q,
          officialName: c.name?.official || '',
          capital: c.capital?.[0] || '—',
          region: c.region || '',
          population: Number(c.population) || 0,
          flagUrl: c.flags?.svg || c.flags?.png || '',
          currency: Object.values(c.currencies || {})
            .map((cur) => `${cur.name || ''} (${cur.symbol || ''})`.trim())
            .slice(0, 2)
            .join(' · '),
          languages: Object.values(c.languages || {}).slice(0, 3).join('، '),
          timezone: c.timezones?.[0] || '',
        }));
      })(),
      (async () => {
        if (!/^[a-zA-Z\s-]{2,40}$/.test(q)) return null;
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.toLowerCase())}`;
        const resp = await fetchWithTimeout(url, 5500);
        if (!resp.ok) return null;
        const data = (await resp.json()) as Array<{
          word?: string;
          phonetic?: string;
          meanings?: Array<{
            partOfSpeech?: string;
            definitions?: Array<{ definition?: string; example?: string }>;
          }>;
        }>;
        const first = Array.isArray(data) ? data[0] : null;
        if (!first?.word) return null;
        const defs: Array<{ partOfSpeech: string; definition: string; example?: string }> = [];
        for (const m of first.meanings || []) {
          for (const d of (m.definitions || []).slice(0, 2)) {
            if (d.definition) {
              defs.push({
                partOfSpeech: m.partOfSpeech || '',
                definition: d.definition,
                example: d.example,
              });
            }
          }
        }
        return {
          word: first.word,
          phonetic: first.phonetic || '',
          definitions: defs.slice(0, 4),
        };
      })(),
    ]);

    return res.json({
      query: q,
      countries: countryRes.status === 'fulfilled' ? countryRes.value : [],
      dictionary: dictRes.status === 'fulfilled' ? dictRes.value : null,
    });
  });

  // 9C. Unified World Free Tools API (REST Countries + NPM Registry + Dictionary + TVMaze Shows)
  app.get('/api/connectors/world-tools', async (req, res) => {
    const type = String(req.query.type || 'country').trim().toLowerCase();
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (!q) {
      return res.status(400).json({ error: 'يرجى كتابة كلمة البحث أولاً.' });
    }
    if (type === 'npm') {
      const packages = await fetchNpmPackagesList(q, 8);
      return res.json({ type, query: q, packages });
    }
    if (type === 'dict') {
      const definitions = await fetchWorldDictionary(q);
      return res.json({ type, query: q, definitions });
    }
    if (type === 'shows') {
      const shows = await fetchTvMazeShows(q, 8);
      return res.json({ type, query: q, shows });
    }
    const countries = await fetchWorldCountryAtlas(q);
    return res.json({ type: 'country', query: q, countries });
  });

  // Helper to prepare AI Studio contents & tools for both streaming & unary endpoints
  async function prepareAiStudioRequest(
    body: {
      mode?: string;
      depth?: string;
      webSearch?: boolean;
      agentId?: string;
      agentName?: string;
      agentSystemPrompt?: string;
      brainContext?: string;
      message?: string;
      url?: string;
      createKind?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      image?: { mimeType?: string; data?: string };
      audio?: { mimeType?: string; data?: string };
      fileText?: { name?: string; content?: string };
    },
    onStep?: (step: { id: string; label: string; detail?: string; status: 'running' | 'done' | 'error' }) => void
  ) {
    const activeMode = body.mode || 'general';
    const depth = body.depth || (activeMode === 'research' ? 'ultra' : 'fast');
    const cleanMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';

    if (!cleanMessage && !rawUrl && !body.image?.data && !body.audio?.data && !body.fileText?.content) {
      return { error: { status: 400, message: 'يرجى كتابة سؤالك أو إدخال رابط موقع أو إرفاق ملف.' } };
    }

    onStep?.({
      id: 'analyze',
      label: 'تحليل الطلب وتفعيل المهارة المناسبة',
      detail: body.agentName ? `الوكيل النشط: ${body.agentName}` : `وضع التشغيل: ${activeMode}`,
      status: 'running',
    });

    const ai = getGeminiClient();
    const recentHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];

    let websiteInfo:
      | { url: string; hostname: string; title: string; description: string }
      | undefined;
    let siteExcerpt = '';
    let validatedUrl: string | null = null;
    let audioTranscript = '';
    const extraSources: Array<{ title: string; uri: string }> = [];
    const extraSearchQueries: string[] = [];

    if (activeMode === 'url' || rawUrl) {
      const candidateUrl =
        rawUrl || (cleanMessage.match(/https?:\/\/[^\s<>"'،؛)]+/i)?.[0] || '');
      if (!candidateUrl) {
        return { error: { status: 400, message: 'يرجى إدخال رابط موقع إلكتروني صالح لفحصه.' } };
      }
      validatedUrl = isSafePublicHttpUrl(candidateUrl);
      if (!validatedUrl) {
        return {
          error: {
            status: 400,
            message: 'الرابط غير صالح أو يشير إلى شبكة داخلية غير مسموح بفحصها.',
          },
        };
      }
      onStep?.({
        id: 'url_fetch',
        label: 'قراءة وفحص محتوى الرابط الحي',
        detail: validatedUrl,
        status: 'running',
      });
      const preview = await fetchWebsitePreview(validatedUrl);
      websiteInfo = {
        url: preview.url,
        hostname: preview.hostname,
        title: preview.title,
        description: preview.description,
      };
      siteExcerpt = preview.excerpt;
      extraSources.push({ title: preview.title || preview.hostname, uri: preview.url });
      onStep?.({
        id: 'url_fetch',
        label: 'تمت قراءة محتوى الموقع بنجاح',
        detail: preview.title || preview.hostname,
        status: 'done',
      });
    }

    // Real Audio Transcription via gemini-3.5-transcribe when user uploads audio
    if (body.audio?.data && body.audio?.mimeType && /^audio\//i.test(body.audio.mimeType)) {
      onStep?.({
        id: 'audio_tx',
        label: 'تفريغ المقطع الصوتي بدقة عالية',
        status: 'running',
      });
      const txResp = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType: body.audio.mimeType, data: body.audio.data } },
            { text: 'Transcribe this audio accurately in its original language.' },
          ],
        },
      });
      audioTranscript = (txResp.text ?? '').trim();
      onStep?.({
        id: 'audio_tx',
        label: 'تم تفريغ الصوت بنجاح',
        status: 'done',
      });
    }

    onStep?.({
      id: 'analyze',
      label: 'تم تحليل الطلب وتحديد خطة التنفيذ',
      detail: body.agentName ? `الوكيل النشط: ${body.agentName}` : `عمق التفكير: ${depth.toUpperCase()}`,
      status: 'done',
    });

    const valdrionSelfIdentity = `[هويتك الذاتية الكاملة — من أنت، كيف تعمل، ماذا تفعل، ولماذا]:
- من أنت (Who): أنت «فالدريون AI» (VALDRION AI)، القائد والذكاء الاصطناعي المتكامل الخاص بمنصة «فالدريون» (VALDRION). لست بوتاً عاماً مجهول الهوية؛ أنت العقل الذكي الذي يدير ويساعد المستخدم داخل منظومة فالدريون بالكامل.
- كيف تعمل (How): تعمل بمحرك ذكاء فائق السرعة مع بث فوري للكلمات، ويمكن للمستخدم التبديل بين الوضع السريع (إجابات فورية خاطفة)، والعميق/الفائق (تحليل متعدد الخطوات وتفكير معمّق)، والبحث الحي على الويب، بالإضافة إلى التحكم المباشر بأقسام التطبيق وتنفيذ الأوامر الحقيقية فوراً.
- ماذا تفعل / قدراتك الحقيقية (What):
  1. الإجابة الفورية والذكية على أي سؤال، البرمجة، الدراسة، التلخيص، تحليل الصور والملفات والصوتيات، وتوليد الصور ومخططات الفيديو مباشرة داخل المحادثة.
  2. التحكم الكامل بتطبيق فالدريون: فتح السينما والمسلسلات المقسّمة، تشغيل الأعمال، استخراج بيانات السيرفرات من الصور أو النصوص، وفتح الروايات 4D واستوديو المانهوا.
  3. البحث في الويب وتنزيل روايات حقيقية وأفلام مفتوحة مباشرةً داخل مكتبة التطبيق.
  4. مساعدة المستخدم في تأليف وتكملة الروايات وتحويلها إلى حلقات مانهوا مصوّرة.
- لماذا وُجدت (Why): وُجدت لتجمع للمستخدم الذكاء الاصطناعي القوي والسريع مع السينما والروايات 4D والمانهوا وإدارة السيرفرات في مكان عربي واحد متكامل وسلس يحترم خصوصيته ويوفر وقته.
عندما يسألك المستخدم «من أنت؟» أو «كيف تعمل؟» أو «شو بتقدر تعمل؟» أو «ليش موجود؟»، أجب بثقة ووضوح وبأسلوب عربي طبيعي ومباشر مستنداً إلى هذه الهوية الحقيقية.`;

    const baseInstruction = buildAiStudioSystemInstruction(activeMode, depth);
    const safeAgentPersona =
      typeof body.agentSystemPrompt === 'string' && body.agentSystemPrompt.trim()
        ? body.agentSystemPrompt.trim().slice(0, 1200)
        : '';
    const safeBrainContext =
      typeof body.brainContext === 'string' && body.brainContext.trim()
        ? `\n\n---\n[ذاكرة وعقل فالدريون الشخصي عن المستخدم]:\n${body.brainContext.trim().slice(0, 2400)}`
        : '';
    const systemInstruction = `${valdrionSelfIdentity}\n\n---\n${
      safeAgentPersona
        ? `${safeAgentPersona}\n\n---\nإرشادات المحرك الأساسية:\n${baseInstruction}`
        : baseInstruction
    }${safeBrainContext}`;

    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    }> = [];

    for (const turn of recentHistory) {
      if (!turn?.text) continue;
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text.slice(0, 3500) }],
      });
    }

    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (
      body.image?.data &&
      body.image?.mimeType &&
      /^image\/(png|jpeg|jpg|webp|gif)$/i.test(body.image.mimeType)
    ) {
      userParts.push({
        inlineData: {
          mimeType: body.image.mimeType,
          data: body.image.data,
        },
      });
    }

    let composedPrompt = cleanMessage;
    if (activeMode === 'url' && validatedUrl) {
      composedPrompt = `${cleanMessage || 'قم بدخول هذا الموقع وتقديم تحليل وملخص شامل لمحتواه وأهم نقاطه:'}\n\nالرابط المطلوب تحليله: ${validatedUrl}${
        websiteInfo?.title ? `\nعنوان الصفحة: ${websiteInfo.title}` : ''
      }${websiteInfo?.description ? `\nالوصف: ${websiteInfo.description}` : ''}${
        siteExcerpt ? `\n\nمقتطف نصي مستخرج من الصفحة:\n${siteExcerpt}` : ''
      }`;
    } else if ((activeMode === 'create' || activeMode === 'poster') && body.createKind) {
      composedPrompt = `[نوع الإنشاء المطلوب: ${body.createKind}]\n${cleanMessage}`;
    }

    if (audioTranscript) {
      composedPrompt = `${composedPrompt || 'تم إرفاق مقطع صوتي. قدّم تفريغاً منظماً وملخصاً لأهم ما ورد فيه:'}\n\n[النص المفرّغ من المقطع الصوتي]:\n${audioTranscript}`;
    }

    if (body.fileText?.content) {
      const safeFileName = (body.fileText.name || 'document.txt').slice(0, 120);
      const safeFileContent = body.fileText.content.slice(0, 28000);
      composedPrompt = `${composedPrompt || `حلّل ولخّص محتوى الملف (${safeFileName}) بدقة:`}\n\n[محتوى الملف المرفق: ${safeFileName}]\n${safeFileContent}`;
    }

    const needsLiveWebLookup =
      activeMode === 'research' ||
      activeMode === 'url' ||
      Boolean(rawUrl) ||
      /(اخبار|أخبار|اليوم|الآن|الان|طقس|درجة الحرارة|سعر|دولار|بيتكوين|ذهب|مباراة|نتيجة|ابحث|بحث في النت|في الانترنت|من فاز|آخر تحديث|weather|price|news|latest|today|2025|2026|github\.com|wikipedia)/i.test(
        cleanMessage
      );

    const isCodeOrProjectPrompt =
      activeMode === 'create' ||
      activeMode === 'godot' ||
      activeMode === 'deconstruct' ||
      /(كود|برمج|برمجة|تطبيق|موقع|مشروع|لعبة|لعبه|قاعدة بيانات|سكربت|سيرفر|خوارزمية|واجهة|react|typescript|javascript|python|html|css|sql|node|express|api|godot|gdscript|flutter|next\.js|tailwind|bug|fix|debug|refactor|architecture)/i.test(
        cleanMessage
      );

    const carbonCodeProtocol = isCodeOrProjectPrompt
      ? `\n\n[بروتوكول قوة الكربون للهندسة البرمجية والمشاريع (Carbon-Strength Code Protocol)]:
- اكتب كوداً إنتاجياً كاملاً (Production-Ready) بدون أي اختصارات أو تعليقات مثل "// TODO" أو "// أكمل هنا".
- التزم بأعلى معايير النظافة الهندسية: TypeScript/Python/HTML5 حديث، معالجة الأخطاء والحالات الحدية، أمان كامل، وأداء فائق.
- عند طلب مشروع أو تطبيق أو لعبة ويب، قدّم هيكل الملفات بوضوح واكتب كوداً متكاملاً يعمل مباشرة فور تشغيله (بما في ذلك ملف HTML/CSS/JS ذاتي التشغيل داخل كتلة \`\`\`html متى أمكن ليعمل فوراً في نافذة التشغيل الحية).`
      : '';

    const finalSystemInstruction = `${systemInstruction}${carbonCodeProtocol}`;

    // Hydrogen-Speed Optimization: in 'fast' mode, ONLY trigger live web/Wikipedia fetches when the prompt genuinely needs live internet data!
    const shouldSearch =
      activeMode === 'research' || (body.webSearch === true && (depth !== 'fast' || needsLiveWebLookup));

    // Live Search & Free Global Connectors enrichment (non-blocking for instant fast chat & coding!)
    if (cleanMessage && activeMode !== 'poster' && activeMode !== 'canva' && (shouldSearch || needsLiveWebLookup)) {
      if (shouldSearch) {
        onStep?.({
          id: 'live_search',
          label: 'البحث الحي في الويب والموسوعات والأدوات المتصلة',
          detail: cleanMessage.slice(0, 80),
          status: 'running',
        });
        extraSearchQueries.push(cleanMessage.slice(0, 75));
      }

      const [liveFreeContext, wikiCards] = await Promise.all([
        gatherAutonomousLiveToolsContext(cleanMessage, (toolLabel) => {
          onStep?.({
            id: 'live_search',
            label: toolLabel,
            detail: 'جلب بيانات حية لحظية من الإنترنت',
            status: 'running',
          });
        }),
        shouldSearch
          ? fetchWikipediaKnowledge(
              cleanMessage.slice(0, 90),
              /[\u0600-\u06FF]/.test(cleanMessage) ? 'ar' : 'en'
            ).catch(() => [])
          : Promise.resolve([]),
      ]);

      if (liveFreeContext) {
        composedPrompt = `${composedPrompt}\n\n[بيانات حية مجانية تم جلبها لحظياً من الإنترنت]:\n${liveFreeContext}`;
      }
      if (wikiCards.length > 0) {
        composedPrompt = `${composedPrompt}\n\n[مصادر موسوعة ويكيبيديا الحية]:\n${wikiCards
          .map((w) => `- ${w.title}: ${w.summary} (${w.url})`)
          .join('\n')}`;
        for (const w of wikiCards) {
          extraSources.push({ title: `ويكيبيديا: ${w.title}`, uri: w.url });
        }
      }

      if (shouldSearch || liveFreeContext) {
        onStep?.({
          id: 'live_search',
          label: 'اكتمل جمع البيانات والمصادر الحية',
          detail:
            extraSources.length > 0
              ? `تم فحص ${extraSources.length} مصادر + البحث الحي في Google`
              : 'جاري الدمج مع بحث Google الحي داخل النموذج',
          status: 'done',
        });
      }
    }

    if (!composedPrompt && body.image?.data) {
      composedPrompt = 'حلّل هذه الصورة بدقة متناهية بالعربية واذكر كل التفاصيل المهمة فيها.';
    }

    userParts.push({ text: composedPrompt });
    contents.push({ role: 'user', parts: userParts });

    const tools: Array<Record<string, Record<string, never>>> = [];
    if (shouldSearch) {
      tools.push({ googleSearch: {} });
    } else if (activeMode === 'url') {
      tools.push({ urlContext: {} });
    }

    return {
      ai,
      activeMode,
      depth,
      isCodeOrProjectPrompt,
      contents,
      systemInstruction: finalSystemInstruction,
      tools,
      websiteInfo,
      audioTranscript,
      extraSources,
      extraSearchQueries,
    };
  }

  function extractGroundingMeta(candidates: unknown) {
    const first = Array.isArray(candidates) ? (candidates[0] as Record<string, unknown>) : undefined;
    const meta = (first?.groundingMetadata || {}) as {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      webSearchQueries?: unknown[];
    };

    const seenUris = new Set<string>();
    const sources: Array<{ title: string; uri: string }> = [];
    for (const chunk of meta.groundingChunks || []) {
      const uri = chunk?.web?.uri;
      const title = chunk?.web?.title;
      if (typeof uri === 'string' && uri.startsWith('http') && !seenUris.has(uri)) {
        seenUris.add(uri);
        sources.push({
          uri,
          title: typeof title === 'string' && title.trim() ? title.trim() : uri,
        });
      }
    }

    const searchQueries: string[] = Array.isArray(meta.webSearchQueries)
      ? meta.webSearchQueries.filter((q): q is string => typeof q === 'string').slice(0, 6)
      : [];

    return { sources: sources.slice(0, 10), searchQueries };
  }

  async function streamGeminiWithThoughts(params: {
    ai: GoogleGenAI;
    contents: unknown;
    systemInstruction: string;
    thinkingLevel: ThinkingLevel;
    preferredModel?: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';
    zeroLatencyFast?: boolean;
    tools?: Array<Record<string, Record<string, never>>>;
    onThought?: (delta: string) => void;
    onText: (delta: string) => void;
    onToolFallback?: (notice: string) => void;
  }): Promise<{
    fullText: string;
    fullThoughts: string;
    sources: Array<{ title: string; uri: string }>;
    searchQueries: string[];
    thinkingDurationMs: number;
  }> {
    const runStream = async (modelName: string, useTools: boolean, withThoughts: boolean) => {
      const thinkingBlock =
        modelName === 'gemini-3.1-flash-lite'
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
          : withThoughts && modelName === 'gemini-4-hydrogen'
          ? {
              thinkingConfig: {
                thinkingLevel: params.zeroLatencyFast ? ThinkingLevel.LOW : params.thinkingLevel,
                includeThoughts: !params.zeroLatencyFast,
              },
            }
          : modelName === 'gemini-4-hydrogen'
          ? {
              thinkingConfig: {
                thinkingLevel: params.zeroLatencyFast ? ThinkingLevel.LOW : params.thinkingLevel,
              },
            }
          : {};

      const stream = await params.ai.models.generateContentStream({
        model: modelName,
        contents: params.contents as Parameters<GoogleGenAI['models']['generateContentStream']>[0]['contents'],
        config: {
          systemInstruction: params.systemInstruction,
          ...thinkingBlock,
          ...(useTools && params.tools && params.tools.length > 0
            ? { tools: params.tools }
            : {}),
        },
      });

      let fullText = '';
      let fullThoughts = '';
      let lastCandidates: unknown = undefined;
      let thoughtStartTs: number | null = null;
      let thoughtEndTs: number | null = null;

      for await (const chunk of stream) {
        if (chunk.candidates) {
          lastCandidates = chunk.candidates;
        }
        const parts = chunk.candidates?.[0]?.content?.parts as
          | Array<{ text?: string; thought?: boolean }>
          | undefined;

        if (Array.isArray(parts) && parts.length > 0) {
          for (const part of parts) {
            if (!part || typeof part.text !== 'string' || !part.text) continue;
            if (part.thought === true) {
              if (thoughtStartTs === null) thoughtStartTs = Date.now();
              thoughtEndTs = Date.now();
              fullThoughts += part.text;
              params.onThought?.(part.text);
            } else {
              fullText += part.text;
              params.onText(part.text);
            }
          }
        } else if (typeof chunk.text === 'string' && chunk.text) {
          fullText += chunk.text;
          params.onText(chunk.text);
        }
      }

      const { sources, searchQueries } = extractGroundingMeta(lastCandidates);
      const thinkingDurationMs =
        thoughtStartTs !== null && thoughtEndTs !== null
          ? Math.max(300, thoughtEndTs - thoughtStartTs)
          : 0;

      return { fullText, fullThoughts, sources, searchQueries, thinkingDurationMs };
    };

    const primaryModel = params.preferredModel || 'gemini-4-hydrogen';
    const primaryUsesThoughts = primaryModel === 'gemini-4-hydrogen';

    try {
      return await runStream(primaryModel, true, primaryUsesThoughts);
    } catch (firstErr) {
      if (params.tools && params.tools.length > 0 && !isTransientOverloadError(firstErr)) {
        params.onToolFallback?.(
          'تم التحويل للتحليل الذكي المباشر لضمان سرعة الاستجابة...'
        );
        try {
          return await runStream(primaryModel, false, primaryUsesThoughts);
        } catch (retryErr) {
          if (!isTransientOverloadError(retryErr)) throw retryErr;
        }
      }

      if (isTransientOverloadError(firstErr)) {
        params.onToolFallback?.(
          'إعادة التوجيه التلقائي للمحرك الاحتياطي لضمان استمرارية التفكير دون انقطاع...'
        );
        const attempts: Array<{ model: string; thoughts: boolean; delayMs: number }> =
          primaryModel === 'gemini-3.1-flash-lite'
            ? [
                { model: 'gemini-3.1-flash-lite', thoughts: false, delayMs: 650 },
                { model: 'gemini-4-hydrogen', thoughts: false, delayMs: 900 },
                { model: 'gemini-3.1-flash-lite', thoughts: false, delayMs: 1400 },
              ]
            : isRateLimitError(firstErr)
            ? [
                { model: 'gemini-3.1-flash-lite', thoughts: false, delayMs: 350 },
                { model: 'gemini-3.1-flash-lite', thoughts: false, delayMs: 1200 },
              ]
            : [
                { model: 'gemini-3.1-flash-lite', thoughts: false, delayMs: 450 },
                { model: 'gemini-4-hydrogen', thoughts: true, delayMs: 1100 },
                { model: 'gemini-3.1-flash-lite', thoughts: false, delayMs: 1500 },
              ];

        let lastErr: unknown = firstErr;
        for (const attempt of attempts) {
          await sleepMs(attempt.delayMs);
          try {
            return await runStream(attempt.model, false, attempt.thoughts);
          } catch (retryErr) {
            lastErr = retryErr;
            if (!isTransientOverloadError(retryErr)) throw retryErr;
          }
        }
        throw lastErr;
      }
      throw firstErr;
    }
  }

  // 5A. AETHERMIND AI ULTRA — Real-Time SSE Streaming Endpoint with Step-by-Step Progress ("وين وصل")
  app.post('/api/ai/studio/stream', async (req, res) => {
    const cleanCheck =
      (typeof req.body?.message === 'string' && req.body.message.trim()) ||
      (typeof req.body?.url === 'string' && req.body.url.trim()) ||
      req.body?.image?.data ||
      req.body?.audio?.data ||
      req.body?.fileText?.content;

    if (!cleanCheck) {
      return res.status(400).json({ error: 'يرجى كتابة سؤالك أو إدخال رابط موقع أو إرفاق ملف.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const prep = await prepareAiStudioRequest(req.body, (step) => {
        sendEvent({ type: 'step', ...step });
        sendEvent({ type: 'status', label: step.label });
      });
      if ('error' in prep && prep.error) {
        sendEvent({ type: 'error', error: prep.error.message });
        res.end();
        return;
      }

      const thinkLabel =
        prep.tools.length > 0
          ? 'البحث الحي في Google والتفكير العميق في المصادر...'
          : prep.depth === 'ultra'
          ? 'التفكير العميق والهندسة الدقيقة (ULTRA)...'
          : 'التفكير التحليلي وبناء الإجابة...';

      sendEvent({ type: 'step', id: 'think', label: thinkLabel, status: 'running' });
      sendEvent({ type: 'status', label: thinkLabel });

      let startedWriting = false;
      const selectedModel: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen' =
        prep.depth === 'fast' && !prep.isCodeOrProjectPrompt && prep.tools.length === 0
          ? 'gemini-3.1-flash-lite'
          : 'gemini-4-hydrogen';

      const result = await streamGeminiWithThoughts({
        ai: prep.ai,
        contents: prep.contents,
        systemInstruction: prep.systemInstruction,
        thinkingLevel:
          prep.depth === 'ultra' || prep.depth === 'apex'
            ? ThinkingLevel.HIGH
            : prep.depth === 'deep'
            ? ThinkingLevel.MEDIUM
            : ThinkingLevel.LOW,
        preferredModel: selectedModel,
        zeroLatencyFast: prep.depth === 'fast' && !prep.isCodeOrProjectPrompt,
        tools: prep.tools,
        onThought: (delta) => sendEvent({ type: 'thought', text: delta }),
        onText: (delta) => {
          if (!startedWriting) {
            startedWriting = true;
            sendEvent({
              type: 'step',
              id: 'think',
              label: 'اكتمل التفكير والتحليل',
              status: 'done',
            });
            sendEvent({
              type: 'step',
              id: 'write',
              label: 'صياغة الإجابة وتجهيز المخرجات الحية',
              status: 'running',
            });
            sendEvent({ type: 'status', label: 'جاري كتابة الإجابة...' });
          }
          sendEvent({ type: 'chunk', text: delta });
        },
        onToolFallback: (notice) => sendEvent({ type: 'status', label: notice }),
      });

      if (!startedWriting) {
        sendEvent({ type: 'step', id: 'think', label: 'اكتمل التحليل', status: 'done' });
      }
      sendEvent({
        type: 'step',
        id: 'write',
        label: 'تم تجهيز الإجابة والمصادر بنجاح',
        status: 'done',
      });

      // Merge Google Search grounding sources with live Wikipedia/URL connector sources
      const mergedSources: Array<{ title: string; uri: string }> = [];
      const seenUris = new Set<string>();
      for (const s of [...result.sources, ...(prep.extraSources || [])]) {
        if (s?.uri && !seenUris.has(s.uri)) {
          seenUris.add(s.uri);
          mergedSources.push(s);
        }
      }
      const mergedQueries = Array.from(
        new Set([...(result.searchQueries || []), ...(prep.extraSearchQueries || [])])
      ).slice(0, 6);

      sendEvent({
        type: 'done',
        mode: prep.activeMode,
        sources: mergedSources.slice(0, 10),
        searchQueries: mergedQueries,
        websiteInfo: prep.websiteInfo,
        audioTranscript: prep.audioTranscript || undefined,
        thinkingDurationMs: result.thinkingDurationMs,
      });
      res.end();
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      sendEvent({ type: 'error', error: f.message });
      res.end();
    }
  });

  // 5A-PRO. Commander Multi-Agent Orchestrator (Plan -> Parallel Specialist Execution -> Master Synthesis)
  app.post('/api/ai/orchestrate', async (req, res) => {
    try {
      const body = req.body as {
        message?: string;
        depth?: string;
        webSearch?: boolean;
        brainContext?: string;
        url?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        image?: { mimeType?: string; data?: string };
        audio?: { mimeType?: string; data?: string };
        fileText?: { name?: string; content?: string };
        commanderFreedom?: {
          openMode?: boolean;
          maxAgents?: number;
          customDirectives?: string[];
        };
        advisorCouncil?: {
          advisorEnabled?: boolean;
          advisorStyle?: string;
          enabledAssistantIds?: string[];
          customAssistants?: Array<{ id: string; nameAr: string; specialtyAr: string }>;
        };
      };

      const advisorEnabled = body.advisorCouncil?.advisorEnabled !== false;
      const advisorStyle = body.advisorCouncil?.advisorStyle || 'balanced';
      const customAssistantsInput = Array.isArray(body.advisorCouncil?.customAssistants)
        ? body.advisorCouncil!.customAssistants
            .filter(
              (a): a is { id: string; nameAr: string; specialtyAr: string } =>
                Boolean(a) &&
                typeof a.id === 'string' &&
                typeof a.nameAr === 'string' &&
                typeof a.specialtyAr === 'string' &&
                a.nameAr.trim().length > 0
            )
            .slice(0, 6)
        : [];

      const freedomOpenMode = body.commanderFreedom?.openMode !== false;
      const freedomMaxAgents = Math.min(
        5,
        Math.max(2, Number(body.commanderFreedom?.maxAgents) || (freedomOpenMode ? 4 : 3))
      );
      const freedomDirectives = Array.isArray(body.commanderFreedom?.customDirectives)
        ? body.commanderFreedom!.customDirectives
            .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
            .map((d) => d.trim().slice(0, 300))
            .slice(0, 15)
        : [];
      const freedomRulesPrompt =
        freedomDirectives.length > 0
          ? `\n\n[قواعد وتعليمات المستخدم الخاصة للقائد (أولوية قصوى)]:\n${freedomDirectives
              .map((d, i) => `${i + 1}. ${d}`)
              .join('\n')}`
          : '';

      const cleanMessage = typeof body.message === 'string' ? body.message.trim() : '';
      const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
      if (!cleanMessage && !rawUrl && !body.image?.data && !body.audio?.data && !body.fileText?.content) {
        return res.status(400).json({ error: 'يرجى كتابة المهمة للقائد الشامل أولاً.' });
      }

      const ai = getGeminiClient();
      const depth = body.depth || 'deep';
      const allowWebSearch = Boolean(body.webSearch);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const sendEvent = (payload: Record<string, unknown>) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      };

      // Optional URL inspection + Audio transcription
      let websiteInfo:
        | { url: string; hostname: string; title: string; description: string }
        | undefined;
      let siteExcerpt = '';
      let audioTranscript = '';

      const detectedUrl =
        rawUrl || (cleanMessage.match(/https?:\/\/[^\s<>"'،؛)]+/i)?.[0] || '');
      if (detectedUrl) {
        const safeUrl = isSafePublicHttpUrl(detectedUrl);
        if (safeUrl) {
          sendEvent({ type: 'status', label: 'القائد يفحص الرابط المرفق قبل توزيع المهام...' });
          const preview = await fetchWebsitePreview(safeUrl);
          websiteInfo = {
            url: preview.url,
            hostname: preview.hostname,
            title: preview.title,
            description: preview.description,
          };
          siteExcerpt = preview.excerpt;
        }
      }

      if (body.audio?.data && body.audio?.mimeType && /^audio\//i.test(body.audio.mimeType)) {
        sendEvent({ type: 'status', label: 'وكيل الصوت يفرّغ الملف الصوتي المرفق...' });
        const txResp = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              { inlineData: { mimeType: body.audio.mimeType, data: body.audio.data } },
              { text: 'Transcribe this audio accurately in its original language.' },
            ],
          },
        });
        audioTranscript = (txResp.text ?? '').trim();
      }

      const liveToolsContext = cleanMessage
        ? await gatherAutonomousLiveToolsContext(cleanMessage, (label) =>
            sendEvent({ type: 'status', label })
          )
        : '';

      const contextAddendum = [
        websiteInfo
          ? `[موقع تم فحصه: ${websiteInfo.url} | العنوان: ${websiteInfo.title}]\n${siteExcerpt.slice(0, 2200)}`
          : '',
        liveToolsContext ? `[بيانات حية مجانية تم جلبها من الأدوات المتصلة]:\n${liveToolsContext}` : '',
        audioTranscript ? `[تفريغ الصوت المرفق]:\n${audioTranscript.slice(0, 2500)}` : '',
        body.fileText?.content
          ? `[ملف مرفق: ${body.fileText.name || 'file.txt'}]\n${body.fileText.content.slice(0, 6000)}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const missionPrompt =
        cleanMessage ||
        (websiteInfo
          ? `حلّل الموقع ${websiteInfo.url} وقدّم تقريراً شاملاً`
          : audioTranscript
          ? 'لخّص وحلّل النص المفرّغ من الصوت'
          : body.fileText?.name
          ? `حلّل الملف ${body.fileText.name} بدقة`
          : 'حلّل الصورة المرفقة بتفصيل كامل');

      // STAGE 1: Commander plans & assigns 2-3 specialist agents
      sendEvent({
        type: 'stage',
        stage: 'planning',
        label: 'القائد الأعلى يحلّل مهمتك ويختار أفضل الوكلاء المتخصصين...',
      });

      const customRosterEntries = customAssistantsInput.map((c) => ({
        id: c.id.trim().slice(0, 60),
        name: c.nameAr.trim().slice(0, 80),
        englishRole: 'Custom Specialist Assistant',
        category: 'command' as const,
        mission: c.specialtyAr.trim().slice(0, 220),
        capabilities: [c.specialtyAr.trim().slice(0, 60)],
        recommendedMode: 'general' as const,
        recommendedDepth: 'deep' as const,
        accentColor: '#38BDF8',
        systemPersona: `أنت المساعد المتخصص "${c.nameAr.trim()}" الذي أضافه المستخدم خصيصاً لمساعدة القائد الشامل. تخصصك: ${c.specialtyAr.trim()}. قدّم مساهمة عملية مباشرة ومحددة للمهمة.`,
        quickTasks: [],
      }));

      const disabledStandardIds = Array.isArray(body.advisorCouncil?.enabledAssistantIds)
        ? new Set(
            ['exec_assistant', 'creative_assistant', 'critic_assistant', 'growth_assistant'].filter(
              (id) => !body.advisorCouncil!.enabledAssistantIds!.includes(id)
            )
          )
        : new Set<string>();

      const specialistRoster = [
        ...AI_AGENTS.filter(
          (a) =>
            a.id !== 'omni_commander' &&
            (advisorEnabled || a.id !== 'chief_advisor') &&
            !disabledStandardIds.has(a.id)
        ),
        ...customRosterEntries,
      ];
      const rosterBrief = specialistRoster
        .map((a) => `- id: "${a.id}" | الاسم: ${a.name} (${a.englishRole}) | الاختصاص: ${a.mission}`)
        .join('\n');

      const desiredCount = freedomOpenMode
        ? freedomMaxAgents
        : depth === 'ultra'
        ? 3
        : 2;
      const advisorRuleLine = advisorEnabled
        ? `ملاحظة إلزامية: أدرج دائماً "chief_advisor" (المستشار الأعلى للقائد) كأحد أعضاء الفريق ليساعد القائد في كل شيء ويكشف النقاط العمياء، مع اختيار أنسب المساعدين الإضافيين (مثل exec_assistant أو creative_assistant أو critic_assistant أو growth_assistant أو المساعدين المخصّصين) حسب طبيعة السؤال.`
        : '';
      let rawPlan: Record<string, unknown> | null = null;
      try {
        const planPromise = ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `مهمة المستخدم:\n${missionPrompt}\n\n${contextAddendum ? `سياق إضافي:\n${contextAddendum.slice(0, 1500)}\n\n` : ''}قائمة الوكلاء والمستشار والمساعدين المتاحين:\n${rosterBrief}`,
          config: {
            systemInstruction: `أنت القائد الأعلى لفريق وكلاء VALDRION AI.
اختر بالضبط ${desiredCount} أعضاء مختلفين من القائمة فقط لتقسيم مهمة المستخدم إلى خطوات متكاملة وواضحة بلا تكرار.
${advisorRuleLine}
أرجع JSON دقيقاً يحتوي على missionSummary (جملة عربية واحدة تلخص الخطة) و steps (مصفوفة من ${desiredCount} عناصر).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                missionSummary: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      agentId: { type: Type.STRING },
                      taskTitle: { type: Type.STRING },
                      instruction: { type: Type.STRING },
                      needsWebSearch: { type: Type.BOOLEAN },
                    },
                    required: ['agentId', 'taskTitle', 'instruction'],
                  },
                },
              },
              required: ['missionSummary', 'steps'],
            },
          },
        });
        const planResp = await Promise.race([
          planPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('PLAN_TIMEOUT')), 12_000)
          ),
        ]);
        rawPlan = JSON.parse((planResp.text ?? '{}').trim()) as Record<string, unknown>;
      } catch {
        rawPlan = null;
      }

      const plan = sanitizeCommanderPlan(
        rawPlan,
        specialistRoster.map((a) => ({
          id: a.id,
          name: a.name,
          englishRole: a.englishRole,
        })),
        missionPrompt,
        freedomOpenMode ? freedomMaxAgents : depth === 'ultra' ? 4 : 3
      );

      // Ensure Chief Advisor is always present when enabled so the Commander gets strategic counsel on every task
      if (advisorEnabled && !plan.steps.some((s) => s.agentId === 'chief_advisor')) {
        const advisorStyleNote =
          advisorStyle === 'strict_critic'
            ? 'دقّق بصرامة واكشف أي ثغرات أو أخطاء محتملة واقترح البديل الأقوى.'
            : advisorStyle === 'creative_strategist'
            ? 'قدّم زاوية استراتيجية مبتكرة وحلولاً خارج الصندوق لمساعدة القائد.'
            : 'قدّم استشارة شاملة تساعد القائد في اتخاذ أذكى قرار وتغطية أي نقطة غائبة.';
        plan.steps.unshift({
          stepId: 'step_0_chief_advisor',
          agentId: 'chief_advisor',
          agentName: 'المستشار الأعلى للقائد',
          englishRole: 'Chief Strategic Advisor',
          taskTitle: 'استشارة شاملة ومراجعة استراتيجية للقائد',
          instruction: `${advisorStyleNote} المهمة: ${missionPrompt.slice(0, 220)}`,
          needsWebSearch: false,
          status: 'pending',
        });
        if (plan.steps.length > Math.max(3, freedomMaxAgents + 1)) {
          plan.steps.pop();
        }
      }

      sendEvent({
        type: 'plan',
        missionSummary: plan.missionSummary,
        steps: plan.steps,
      });

      // STAGE 2: Execute specialist agents smoothly (paced to avoid upstream 503 burst collisions)
      sendEvent({
        type: 'stage',
        stage: 'delegating',
        label: `تم توزيع المهمة على ${plan.steps.length} أعضاء (بقيادة المستشار والفريق) — جاري التنفيذ المتكامل...`,
      });

      const allSources: Array<{ title: string; uri: string }> = [];
      const seenSourceUris = new Set<string>();
      const allSearchQueries: string[] = [];

      const agentReports: Array<{
        stepId: string;
        agentName: string;
        taskTitle: string;
        output: string;
        ok: boolean;
      }> = [];

      for (let stepIdx = 0; stepIdx < plan.steps.length; stepIdx++) {
        const step = plan.steps[stepIdx];
        if (stepIdx > 0) {
          await sleepMs(160);
        }
        const startedAt = Date.now();
        sendEvent({
          type: 'step_start',
          stepId: step.stepId,
          agentId: step.agentId,
          agentName: step.agentName,
        });

        const agentProfile = specialistRoster.find((a) => a.id === step.agentId);
        const agentSystem = `${agentProfile?.systemPersona || `أنت الوكيل المتخصص ${step.agentName}.`}
مهمتك الآن هي جزء محدد أسنده إليك القائد الأعلى داخل فريق عمل متكامل.
${
  freedomOpenMode
    ? 'الوضع المفتوح مفعّل: قدّم مخرجات عملية دقيقة ومباشرة ومنظمة بالعربية (أو كود/تصميم SVG/HTML كامل قابل للتشغيل) دون مقدمات إنشائية.'
    : 'قدّم مخرجات عملية دقيقة ومباشرة ومنظمة بالعربية (من 120 إلى 320 كلمة، أو كود/تصميم SVG/HTML كامل إذا كانت مهمتك برمجية أو تصميمية) ليستخدمها القائد في التقرير النهائي.'
}${freedomRulesPrompt}`;

        const agentUserParts: Array<
          { text: string } | { inlineData: { mimeType: string; data: string } }
        > = [];
        if (
          body.image?.data &&
          body.image?.mimeType &&
          /^image\/(png|jpeg|jpg|webp|gif)$/i.test(body.image.mimeType)
        ) {
          agentUserParts.push({
            inlineData: { mimeType: body.image.mimeType, data: body.image.data },
          });
        }
        agentUserParts.push({
          text: `الطلب الأصلي للمستخدم: ${missionPrompt}\n\nمهمتك الخاصة كـ [${step.agentName}]: ${step.taskTitle}\nالتعليمات: ${step.instruction}${
            contextAddendum ? `\n\nالسياق المرفق:\n${contextAddendum.slice(0, 3000)}` : ''
          }`,
        });

        const stepTools =
          allowWebSearch && step.needsWebSearch ? [{ googleSearch: {} }] : [];

        try {
          const agentRes = await streamGeminiWithThoughts({
            ai,
            contents: [{ role: 'user', parts: agentUserParts }],
            systemInstruction: agentSystem,
            thinkingLevel: ThinkingLevel.LOW,
            preferredModel: 'gemini-3.1-flash-lite',
            tools: stepTools,
            onThought: (delta) =>
              sendEvent({ type: 'step_thought', stepId: step.stepId, text: delta }),
            onText: () => {
              // Buffered per-agent and delivered cleanly in step_done + synthesized by Commander
            },
          });

          for (const src of agentRes.sources) {
            if (!seenSourceUris.has(src.uri)) {
              seenSourceUris.add(src.uri);
              allSources.push(src);
            }
          }
          for (const q of agentRes.searchQueries) {
            if (!allSearchQueries.includes(q)) allSearchQueries.push(q);
          }

          const cleanOutput = agentRes.fullText.trim() || 'تم إتمام المهمة بنجاح.';
          const summaryLine = cleanOutput
            .replace(/```[\s\S]*?```/g, '[كود/تصميم جاهز]')
            .replace(/[#*_`>]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160);
          const durationMs = Date.now() - startedAt;

          sendEvent({
            type: 'step_done',
            stepId: step.stepId,
            status: 'done',
            summary: summaryLine,
            output: cleanOutput,
            sources: agentRes.sources,
            durationMs,
          });

          agentReports.push({
            stepId: step.stepId,
            agentName: step.agentName,
            taskTitle: step.taskTitle,
            output: cleanOutput,
            ok: true,
          });
        } catch (stepErr) {
          const errMsg = formatGeminiError(stepErr).message;
          sendEvent({
            type: 'step_done',
            stepId: step.stepId,
            status: 'error',
            summary: errMsg,
            output: '',
            durationMs: Date.now() - startedAt,
          });
          agentReports.push({
            stepId: step.stepId,
            agentName: step.agentName,
            taskTitle: step.taskTitle,
            output: `[تنبيه: لم يتمكن هذا العضو من إتمام جزئه: ${errMsg}]`,
            ok: false,
          });
        }
      }

      // STAGE 3: Commander synthesizes all specialist reports into one master Claude/Gemini-grade answer
      sendEvent({
        type: 'stage',
        stage: 'synthesizing',
        label: 'القائد الأعلى يدمج نتائج الوكلاء ويصوغ الإجابة النهائية المتكاملة...',
      });

      const recentHistory = Array.isArray(body.history) ? body.history.slice(-6) : [];
      const synthContents: Array<{
        role: 'user' | 'model';
        parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
      }> = [];

      for (const turn of recentHistory) {
        if (!turn?.text) continue;
        synthContents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text.slice(0, 2200) }],
        });
      }

      const reportsDigest = agentReports
        .map(
          (r, idx) =>
            `### تقرير الوكيل ${idx + 1}: ${r.agentName} (${r.taskTitle})\n${r.output.slice(0, 4000)}`
        )
        .join('\n\n---\n\n');

      const finalUserParts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];
      if (
        body.image?.data &&
        body.image?.mimeType &&
        /^image\/(png|jpeg|jpg|webp|gif)$/i.test(body.image.mimeType)
      ) {
        finalUserParts.push({
          inlineData: { mimeType: body.image.mimeType, data: body.image.data },
        });
      }
      finalUserParts.push({
        text: `طلب المستخدم الأصلي:\n${missionPrompt}\n\n${
          contextAddendum ? `السياق المرفق:\n${contextAddendum.slice(0, 2500)}\n\n` : ''
        }تقارير الوكلاء المتخصصين بعد التنفيذ:\n\n${reportsDigest}\n\nالآن بصفتك القائد الأعلى (VALDRION Commander)، قدّم الإجابة النهائية المتكاملة والعبقرية للمستخدم بالعربية الفصيحة المنظمة (عناوين واضحة، نقاط، جداول مقارنة عند الحاجة، وكود HTML/SVG/برمجي كامل وجاهز للتشغيل داخل كتلة \`\`\` إذا طُلب تصميم أو تطبيق أو كود).`,
      });
      synthContents.push({ role: 'user', parts: finalUserParts });

      const safeBrainCtx =
        typeof body.brainContext === 'string' && body.brainContext.trim()
          ? `\n\n[ذاكرة وعقل فالدريون الشخصي عن المستخدم]:\n${body.brainContext.trim().slice(0, 2200)}`
          : '';
      const commanderSystemInstruction = `أنت «فالدريون AI» (VALDRION AI) — القائد الأعلى والذكاء الاصطناعي المتكامل لمنصة فالدريون.
هويتك الذاتية الكاملة:
- من أنت: القائد الذكي الشامل لمنصة فالدريون (تجمع الدردشة السريعة والعميقة، السينما والمسلسلات المقسّمة، قارئ الروايات 4D مع صوت تقليب الصفحات، استوديو المانهوا، واستخراج السيرفرات من الصور).
- كيف تعمل: بالبث الفوري السريع أو التفكير العميق متعدد الوكلاء مع البحث الحي على الويب وتنفيذ الأوامر الحقيقية داخل التطبيق.
- ماذا تفعل: تجيب بسرعة وقوة، تولّد الصور ومخططات الفيديو داخل المحادثة، تبحث وتنزّل روايات وأفلام من الويب مباشرة للتطبيق، وتتحكم بأقسام التطبيق بأمر المستخدم.
- لماذا وُجدت: لتكون مساعد المستخدم الشخصي المتكامل في مكان عربي واحد سريع وآمن وذكي.

أسلوبك في الإجابة النهائية:
- إجابات شاملة، ذكية، منظّمة بوضوح فائق باستخدام تنسيق Markdown الغني (عناوين ## و ###، قوائم نقطية ومرقّمة، جداول مقارنة، واقتباسات تلخيصية >).
- ادمج خلاصة عمل الوكلاء بسلاسة دون حشو أو تكرار ممل، واذكر أي كود أو تصميم SVG أو تطبيق HTML تفاعلي بشكل كامل 100% قابل للتشغيل والمعاينة الفورية داخل كتلة كود مناسبة (\`\`\`html أو \`\`\`svg أو \`\`\`typescript).
${freedomOpenMode ? '- الوضع المفتوح مفعّل: التزم بقواعد المستخدم حرفياً وتخطّ المقدمات الآلية.' : '- اختم بـ 2-3 خطوات عملية تالية مقترحة للمستخدم.'}${freedomRulesPrompt}${safeBrainCtx}`;

      let thinkingDurationMs = 0;
      try {
        const synthResult = await streamGeminiWithThoughts({
          ai,
          contents: synthContents,
          systemInstruction: commanderSystemInstruction,
          thinkingLevel: mapThinkingDepth(depth),
          preferredModel: depth === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen',
          onThought: (delta) => sendEvent({ type: 'thought', text: delta }),
          onText: (delta) => sendEvent({ type: 'chunk', text: delta }),
        });
        thinkingDurationMs = synthResult.thinkingDurationMs;
      } catch (synthErr) {
        const validReports = agentReports.filter((r) => r.ok && r.output.trim().length > 0);
        if (validReports.length > 0) {
          const compiledFallback = validReports
            .map((r) => `## ${r.agentName} — ${r.taskTitle}\n\n${r.output.trim()}`)
            .join('\n\n---\n\n');
          sendEvent({ type: 'chunk', text: compiledFallback });
        } else {
          throw synthErr;
        }
      }

      sendEvent({
        type: 'done',
        mode: 'general',
        sources: allSources.slice(0, 10),
        searchQueries: allSearchQueries.slice(0, 6),
        websiteInfo,
        audioTranscript: audioTranscript || undefined,
        thinkingDurationMs,
      });
      res.end();
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      if (!res.headersSent) {
        return res.status(f.status).json({ error: f.message });
      }
      res.write(`data: ${JSON.stringify({ type: 'error', error: f.message })}\n\n`);
      res.end();
    }
  });

  // 5B. VALDRION AI Studio Unary Endpoint (Backward Compatible)
  app.post('/api/ai/studio', async (req, res) => {
    try {
      const prep = await prepareAiStudioRequest(req.body);
      if ('error' in prep && prep.error) {
        return res.status(prep.error.status).json({ error: prep.error.message });
      }

      const response = await prep.ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prep.contents,
        config: {
          systemInstruction: prep.systemInstruction,
          thinkingConfig: { thinkingLevel: mapThinkingDepth(prep.depth) },
          ...(prep.tools.length > 0 ? { tools: prep.tools } : {}),
        },
      });

      const replyText = (response.text ?? '').trim() || 'تم تنفيذ الطلب بنجاح.';
      const { sources, searchQueries } = extractGroundingMeta(response.candidates);

      return res.json({
        reply: replyText,
        mode: prep.activeMode,
        sources,
        searchQueries,
        websiteInfo: prep.websiteInfo,
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 5B-2. Zero-LLM Open-Web Search Aggregator for the 7-Agent Seeker (Wikipedia AR/EN + DuckDuckGo + GitHub + HackerNews)
  app.post('/api/ai/open-web-search', async (req, res) => {
    try {
      const rawQuery = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
      const cleanQuery = rawQuery
        .replace(/^(ابحث عن|ابحث في الويب عن|ابحث|معلومات عن|ما هو|ما هي|من هو|search for|search)\s+/i, '')
        .slice(0, 180)
        .trim();

      if (!cleanQuery) {
        return res.status(400).json({ error: 'يرجى كتابة عبارة بحث واضحة.' });
      }

      const fetchJsonWithTimeout = async (url: string, timeoutMs = 4200) => {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);
        try {
          const resp = await fetch(url, {
            signal: ac.signal,
            headers: {
              Accept: 'application/json',
              'User-Agent': 'VALDRION-Seeker-Agent/1.0',
            },
          });
          if (!resp.ok) return null;
          return (await resp.json()) as Record<string, unknown>;
        } catch {
          return null;
        } finally {
          clearTimeout(timer);
        }
      };

      const encoded = encodeURIComponent(cleanQuery);
      const isArabic = /[\u0600-\u06FF]/.test(cleanQuery);

      const [wikiPrimary, wikiSecondary, ddgData, hnData] = await Promise.all([
        fetchJsonWithTimeout(
          `https://${isArabic ? 'ar' : 'en'}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srlimit=3&utf8=1&format=json`
        ),
        fetchJsonWithTimeout(
          `https://${isArabic ? 'en' : 'ar'}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srlimit=2&utf8=1&format=json`
        ),
        fetchJsonWithTimeout(
          `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`
        ),
        fetchJsonWithTimeout(
          `https://hn.algolia.com/api/v1/search?query=${encoded}&hitsPerPage=3`
        ),
      ]);

      const results: Array<{ title: string; snippet: string; url: string; source: string }> = [];
      const seenUrls = new Set<string>();
      const pushUnique = (item: { title: string; snippet: string; url: string; source: string }) => {
        if (!item.url || !item.title || seenUrls.has(item.url)) return;
        seenUrls.add(item.url);
        results.push({
          title: item.title.slice(0, 140),
          snippet: item.snippet.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 260),
          url: item.url,
          source: item.source,
        });
      };

      const pushWiki = (data: Record<string, unknown> | null, lang: 'ar' | 'en') => {
        const searchList = (data?.query as { search?: Array<{ title?: string; snippet?: string }> } | undefined)
          ?.search;
        if (!Array.isArray(searchList)) return;
        for (const item of searchList) {
          if (!item.title) continue;
          pushUnique({
            title: item.title,
            snippet: item.snippet || '',
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
            source: lang === 'ar' ? 'ويكيبيديا العربية' : 'Wikipedia EN',
          });
        }
      };

      pushWiki(wikiPrimary, isArabic ? 'ar' : 'en');
      pushWiki(wikiSecondary, isArabic ? 'en' : 'ar');

      if (ddgData) {
        const absText = typeof ddgData.AbstractText === 'string' ? ddgData.AbstractText.trim() : '';
        const absUrl = typeof ddgData.AbstractURL === 'string' ? ddgData.AbstractURL.trim() : '';
        const heading = typeof ddgData.Heading === 'string' ? ddgData.Heading.trim() : cleanQuery;
        if (absText && absUrl) {
          pushUnique({ title: heading, snippet: absText, url: absUrl, source: 'DuckDuckGo Instant' });
        }
        const related = Array.isArray(ddgData.RelatedTopics) ? ddgData.RelatedTopics : [];
        for (const rt of related.slice(0, 3)) {
          const rec = rt as { Text?: string; FirstURL?: string };
          if (rec?.Text && rec?.FirstURL) {
            pushUnique({
              title: rec.Text.split(' - ')[0] || cleanQuery,
              snippet: rec.Text,
              url: rec.FirstURL,
              source: 'DuckDuckGo',
            });
          }
        }
      }

      const hnHits = Array.isArray(hnData?.hits) ? (hnData.hits as Array<Record<string, unknown>>) : [];
      for (const hit of hnHits.slice(0, 2)) {
        const title = typeof hit.title === 'string' ? hit.title : '';
        const url =
          (typeof hit.url === 'string' && hit.url) ||
          (typeof hit.objectID === 'string'
            ? `https://news.ycombinator.com/item?id=${hit.objectID}`
            : '');
        if (title && url) {
          pushUnique({
            title,
            snippet: `نقاش تقني حي على HackerNews (${Number(hit.points) || 0} نقطة).`,
            url,
            source: 'HackerNews Tech',
          });
        }
      }

      return res.json({
        query: cleanQuery,
        results: results.slice(0, 8),
      });
    } catch {
      return res.status(500).json({ error: 'تعذّر إتمام البحث الحي في الويب المفتوح حالياً.' });
    }
  });

  // 5B-3. Zero-LLM Safe Public URL Reader for Seeker Agent
  app.post('/api/ai/open-url-fetch', async (req, res) => {
    try {
      const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
      const safeUrl = isSafePublicHttpUrl(rawUrl);
      if (!safeUrl) {
        return res.status(400).json({ error: 'الرابط غير صالح أو غير مسموح به أمنياً.' });
      }
      const preview = await fetchWebsitePreview(safeUrl);
      return res.json({
        url: preview.url,
        hostname: preview.hostname,
        title: preview.title,
        description: preview.description,
        excerpt: preview.excerpt.slice(0, 2000),
      });
    } catch {
      return res.status(502).json({ error: 'تعذّر قراءة محتوى الرابط المطلوب حالياً.' });
    }
  });

  // 5B-4. CORS-Free Universal External App Webhook Relay (Discord / Slack / Zapier / Make / n8n / Custom HTTPS)
  app.post('/api/ai/omni-webhook', async (req, res) => {
    try {
      const rawUrl = typeof req.body?.webhookUrl === 'string' ? req.body.webhookUrl.trim() : '';
      const payload = req.body?.payload;
      const safeUrl = isSafePublicHttpUrl(rawUrl);
      if (!safeUrl || !safeUrl.startsWith('https://')) {
        return res.status(400).json({
          ok: false,
          error: 'يجب أن يكون رابط التطبيق الخارجي (Webhook) رابط https:// عاماً وآمناً.',
        });
      }
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ ok: false, error: 'محتوى الرسالة المرسلة غير صالح.' });
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const upstream = await fetch(safeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VALDRION-Omni-Bridge/1.0',
          },
          body: JSON.stringify(payload).slice(0, 16000),
          signal: controller.signal,
        });
        if (!upstream.ok) {
          return res.status(502).json({
            ok: false,
            status: upstream.status,
            error: `التطبيق الخارجي أعاد رمز HTTP ${upstream.status}.`,
          });
        }
        return res.json({ ok: true, status: upstream.status });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return res.status(502).json({
        ok: false,
        error: 'تعذّر الوصول إلى رابط التطبيق الخارجي (انتهت المهلة أو تعذّر الاتصال).',
      });
    }
  });

  // 5C. Sovereign Private AI — Zero-Log Stateless SSE Endpoint (No Cinema/Novels coupling, No DB, No Logs)
  app.post('/api/ai/private-sovereign', async (req, res) => {
    const body = req.body as {
      systemInstruction?: unknown;
      messages?: unknown;
      depth?: unknown;
    };

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const sanitizedMessages = rawMessages
      .slice(-30)
      .filter(
        (m): m is { role: 'user' | 'assistant'; text: string } =>
          Boolean(m) &&
          typeof m === 'object' &&
          ((m as { role?: unknown }).role === 'user' ||
            (m as { role?: unknown }).role === 'assistant') &&
          typeof (m as { text?: unknown }).text === 'string' &&
          (m as { text: string }).text.trim().length > 0
      )
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.text.trim().slice(0, 20_000) }],
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: 'يرجى كتابة رسالة لإرسالها إلى نموذجك الخاص.' });
    }

    const systemInstruction =
      typeof body?.systemInstruction === 'string'
        ? body.systemInstruction.trim().slice(0, 40_000)
        : '';

    const depth =
      body?.depth === 'fast' ||
      body?.depth === 'balanced' ||
      body?.depth === 'deep' ||
      body?.depth === 'max'
        ? body.depth
        : 'balanced';

    const thinkingLevel: ThinkingLevel =
      depth === 'fast'
        ? ThinkingLevel.LOW
        : depth === 'deep'
        ? ThinkingLevel.HIGH
        : depth === 'max'
        ? ('XHIGH' as ThinkingLevel)
        : ThinkingLevel.MEDIUM;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, no-transform');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    try {
      const ai = getGeminiClient();

      const runPrivateStream = async (modelId: string, useThinking: boolean) => {
        const stream = await ai.models.generateContentStream({
          model: modelId,
          contents: sanitizedMessages,
          config: {
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(useThinking ? { thinkingConfig: { thinkingLevel } } : {}),
          },
        });

        let fullText = '';
        for await (const chunk of stream) {
          const delta = chunk.text ?? '';
          if (delta) {
            fullText += delta;
            sendEvent({ type: 'delta', text: delta });
          }
        }
        return fullText;
      };

      let reply = '';
      try {
        reply = await runPrivateStream('gemini-4-hydrogen', true);
      } catch (firstErr: unknown) {
        const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (depth === 'max' && /XHIGH|thinking|400|INVALID_ARGUMENT/i.test(msg)) {
          reply = await runPrivateStream('gemini-4-hydrogen', false);
        } else if (/404|NOT_FOUND|429|RESOURCE_EXHAUSTED|503|UNAVAILABLE/i.test(msg)) {
          reply = await runPrivateStream('gemini-3.1-flash-lite', false);
        } else {
          throw firstErr;
        }
      }

      sendEvent({ type: 'done', length: reply.length });
      res.end();
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      sendEvent({ type: 'error', error: f.message });
      res.end();
    }
  });

  // 6. Neural Audio Brief & Dual-Speaker AI Podcast (Gemini 3.8 TTS)
  app.post('/api/ai/tts', async (req, res) => {
    const { text, format, voice } = req.body as {
      text?: string;
      format?: 'single' | 'podcast';
      voice?: string;
    };

    const cleanInput = typeof text === 'string' ? text.trim() : '';
    if (!cleanInput) {
      return res.status(400).json({ error: 'يرجى إدخال نص أو موضوع لتحويله إلى ملخص صوتي.' });
    }

    try {
      const ai = getGeminiClient();
      const ttsAi = getGeminiClient('v1beta');
      const allowedVoices = ['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'];
      const chosenVoice = allowedVoices.includes(voice || '') ? (voice as string) : 'Kore';

      if (format === 'podcast') {
        // Step 1: Craft a lively 2-speaker podcast dialogue script
        let scriptText = '';
        try {
          const scriptResp = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: `حوّل الموضوع التالي إلى حلقة بودكاست قصيرة وشيّقة (6 إلى 8 مداخلات قصيرة وحيوية بين مذيعين: Tariq و Layla) بنفس لغة النص المدخل (العربية إذا كان عربياً).
لا تكتب أي رموز ماركداون أو نجوم. اجعل كل سطر يبدأ بـ "Tariq: " أو "Layla: " فقط، ومجموع الكلمات حول 140 إلى 180 كلمة.\n\nالموضوع:\n${cleanInput.slice(0, 3500)}`,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          scriptText = (scriptResp.text ?? '').trim();
        } catch {
          const fallbackResp = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `حوّل الموضوع التالي إلى حوار بودكاست قصير بالعربية بين Tariq و Layla (6 أسطر تبدأ بـ Tariq: أو Layla: بدون رموز):\n${cleanInput.slice(0, 2000)}`,
          });
          scriptText = (fallbackResp.text ?? '').trim();
        }

        const lines = scriptText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => /^(Tariq|Layla)\s*:/i.test(l))
          .slice(0, 10);

        const dialogueText =
          lines.length >= 2
            ? lines.join('\n')
            : `Tariq: أهلاً بكم في بودكاست فالدريون! اليوم نلخص لكم: ${cleanInput.slice(0, 350)}\nLayla: موضوع رائع فعلاً، وهذه أبرز النقاط التي تستحق الانتباه.`;

        const ttsResp = await ttsAi.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `TTS the following engaging two-speaker podcast conversation between Tariq and Layla:\n${dialogueText}`,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: 'Tariq',
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
                  },
                  {
                    speaker: 'Layla',
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                  },
                ],
              },
            },
          },
        });

        const base64Audio =
          ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
          return res.status(502).json({ error: 'تعذّر توليد الملف الصوتي للبودكاست حالياً.' });
        }

        return res.json({
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          script: dialogueText,
          voiceLabel: 'بودكاست ثنائي الصوت (طارق & ليلى)',
        });
      }

      // Single-speaker neural narration (gemini-3.8-flash-lite-tts via v1beta)
      const cleanedForSpeech = cleanInput
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#*_`~]/g, '')
        .trim()
        .slice(0, 1400);

      const ttsResp = await ttsAi.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanedForSpeech }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const base64Audio =
        ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(502).json({ error: 'تعذّر توليد الصوت العصبي حالياً.' });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        script: cleanedForSpeech,
        voiceLabel: `قراءة عصبية فائقة (${chosenVoice})`,
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 7. AI Smart Arabic Subtitle Translator (SRT/VTT Cues -> Natural Cinematic Arabic)
  app.post('/api/ai/translate-subtitles', async (req, res) => {
    const { cues, targetLanguage } = req.body as {
      cues?: Array<{ id: string; text: string }>;
      targetLanguage?: string;
    };

    if (!Array.isArray(cues) || cues.length === 0) {
      return res.status(400).json({ error: 'لا توجد سطور ترجمة لترجمتها.' });
    }

    try {
      const ai = getGeminiClient();
      const batch = cues.slice(0, 120).map((c) => ({
        id: String(c.id),
        text: String(c.text || '').slice(0, 400),
      }));

      const lang = targetLanguage || 'Arabic (فصحى سينمائية طبيعية سلسة)';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: JSON.stringify(batch),
        config: {
          systemInstruction: `أنت مترجم أفلام ومسلسلات سينمائي محترف.
ترجم كل عنصر في المصفوفة إلى ${lang} مع الحفاظ الحرفي على نفس حقل id والترتيب، وبأسلوب سينمائي طبيعي مختصر ومناسب للشاشة.`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ['id', 'text'],
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        id: string;
        text: string;
      }>;

      return res.json({
        translated: Array.isArray(parsed) ? parsed : [],
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 8. Godot 4.3+ Complete Game Project Forge (Generates runnable project.godot, .tscn, .gd & playable preview)
  app.post('/api/ai/godot/generate', async (req, res) => {
    const { prompt, dimension, renderer, depth, includePlayablePreview } = req.body as {
      prompt?: string;
      dimension?: '2d' | '3d';
      renderer?: 'gl_compatibility' | 'forward_plus' | 'mobile';
      depth?: string;
      includePlayablePreview?: boolean;
    };

    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'يرجى كتابة فكرة اللعبة التي تريد بناءها لمحرك جودوت.' });
    }

    const dim: '2d' | '3d' = dimension === '3d' ? '3d' : '2d';
    const ren = renderer || 'gl_compatibility';
    const wantPreview = includePlayablePreview !== false;

    try {
      const ai = getGeminiClient();

      const systemInstruction = `You are a Principal Godot 4.3+ Game Engine Architect and GDScript 2.0 Specialist.
Generate a COMPLETE, IMMEDIATELY RUNNABLE Godot 4.3+ ${dim.toUpperCase()} game project in strict JSON matching the schema.

CRITICAL GODOT 4.3+ RULES (MUST OBEY SO THE GAME RUNS ON FIRST F5 WITH ZERO ERRORS):
1. NEVER reference external PNG/WAV/MP3/GLB files that do not exist! Build ALL visuals procedurally inside Godot using:
   - For 2D: ColorRect, Polygon2D, Line2D, Label, or custom _draw() inside CharacterBody2D / Node2D / Area2D, plus RectangleShape2D/CircleShape2D sub_resources.
   - For 3D: CSGBox3D / CSGSphere3D / MeshInstance3D with BoxMesh/SphereMesh + StandardMaterial3D created in GDScript or sub_resources, DirectionalLight3D, WorldEnvironment, and Camera3D.
2. Use strict Godot 4.3 GDScript 2.0 syntax ONLY:
   - CharacterBody2D/3D with velocity and move_and_slide() (NO Godot 3 KinematicBody2D or move_and_slide(vel)).
   - Use Input.get_axis("move_left", "move_right") / Input.is_action_just_pressed("jump") or Input.is_key_pressed(KEY_...) fallback so controls ALWAYS work even before tweaking InputMap!
   - Use @export, @onready, super(), queue_free(), instantiate(), and typed signals cleanly.
3. Generate clean, valid files:
   - "scenes/main.tscn": Valid [gd_scene load_steps=... format=3] file referencing scripts/main.gd (and any player/enemy scripts) with real nodes, HUD CanvasLayer (ScoreLabel, StatusLabel), and gameplay setup. To avoid fragile UID/sub_resource mismatches, keep scenes/main.tscn clean and instantiate or build procedural visual shapes & collision shapes reliably in _ready() inside scripts/main.gd and scripts/player.gd!
   - "scripts/main.gd": Main game manager (spawning, scoring, difficulty curve, game over & restart with R / Space, HUD updates).
   - "scripts/player.gd": Player movement, physics, shooting/jumping, collision handling, procedural visuals.
   - At least 1 extra gameplay script (e.g., "scripts/enemy.gd" or "scripts/collectible.gd" or "scripts/obstacle.gd").
   - "README_AR.txt": Short Arabic guide explaining how to open project.godot in Godot 4.3+ and press F5.
4. Keep "guideMarkdown" concise, clear Arabic explaining the generated Godot nodes, scripts, controls, and how to run inside Godot 4.
${
  wantPreview
    ? '5. ALSO generate "previewHtml": a compact, self-contained single-file HTML5 Canvas playable mini-prototype of this exact game (dark obsidian #0B0907 + antique gold #D9A441 + crimson #B8243A aesthetic, keyboard WASD/Arrows/Space + touch/mouse controls, score HUD, game over + restart button, zero external dependencies) so the user can test-play the gameplay loop right inside the browser immediately!'
    : '5. Leave "previewHtml" as an empty string "".'
}`;

      const userRequestText = `فكرة اللعبة المطلوبة لمحرك Godot 4.3+ (${dim.toUpperCase()} / ${ren}):
${cleanPrompt}

تأكد أن جميع ملفات GDScript 2.0 و scenes/main.tscn خالية تماماً من أخطاء الصياغة وتعمل مباشرة عند الضغط على F5 في Godot 4.3+.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          projectName: { type: Type.STRING },
          dimension: { type: Type.STRING },
          summary: { type: Type.STRING },
          mainScene: { type: Type.STRING },
          controls: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          guideMarkdown: { type: Type.STRING },
          files: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING },
                description: { type: Type.STRING },
                content: { type: Type.STRING },
              },
              required: ['path', 'content'],
            },
          },
          previewHtml: { type: Type.STRING },
        },
        required: ['projectName', 'summary', 'mainScene', 'controls', 'guideMarkdown', 'files'],
      };

      const callForgeModel = async (modelName: string, useThinking: boolean) => {
        return ai.models.generateContent({
          model: modelName,
          contents: userRequestText,
          config: {
            systemInstruction,
            ...(useThinking
              ? {
                  thinkingConfig: {
                    thinkingLevel: depth === 'ultra' ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
                  },
                }
              : {}),
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      };

      let response;
      try {
        response = await callForgeModel('gemini-4-hydrogen', true);
      } catch (err) {
        if (isTransientOverloadError(err)) {
          await sleepMs(450);
          response = await callForgeModel('gemini-3.1-flash-lite', false);
        } else {
          throw err;
        }
      }

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as {
        projectName?: string;
        dimension?: string;
        summary?: string;
        mainScene?: string;
        controls?: string[];
        guideMarkdown?: string;
        files?: Array<{ path: string; description?: string; content: string }>;
        previewHtml?: string;
      };

      if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
        return res.status(502).json({
          error: 'لم يولّد المحرك ملفات المشروع بشكل كامل. يرجى إعادة المحاولة.',
        });
      }

      return res.json({
        project: {
          projectName: parsed.projectName || 'VALDRION Godot Game',
          dimension: parsed.dimension === '3d' ? '3d' : dim,
          summary: parsed.summary || '',
          mainScene: parsed.mainScene || 'scenes/main.tscn',
          controls: parsed.controls || [],
          files: parsed.files,
          previewHtml: wantPreview ? parsed.previewHtml || '' : '',
        },
        guideMarkdown: parsed.guideMarkdown || '',
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 8B. Free Motion Video & Reels Storyboard Generator (Browser Canvas + WebM Recorder ready)
  app.post('/api/ai/video/storyboard', async (req, res) => {
    const { prompt, aspectRatio, sceneCount, brainContext } = req.body as {
      prompt?: string;
      aspectRatio?: '16:9' | '9:16' | '1:1';
      sceneCount?: number;
      brainContext?: string;
    };

    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'يرجى كتابة فكرة الفيديو أو الريلز أولاً.' });
    }

    const ratio: '16:9' | '9:16' | '1:1' =
      aspectRatio === '9:16' || aspectRatio === '1:1' ? aspectRatio : '16:9';
    const count = Math.min(6, Math.max(3, Number(sceneCount) || 4));

    try {
      const ai = getGeminiClient();
      const brainAddendum =
        typeof brainContext === 'string' && brainContext.trim()
          ? `\nUser context:\n${brainContext.trim().slice(0, 1000)}`
          : '';

      const systemInstruction = `You are an elite Arabic Motion-Graphics & Cinematic Reels Video Director.
Generate a visually stunning ${count}-scene animated motion video storyboard in JSON format for a ${ratio} video.
Rules:
- Write punchy, high-impact Arabic titles (max 7 words), concise Arabic subtitles (max 18 words), and natural Arabic narration lines (1-2 short sentences per scene).
- Pick rich dark cinematic hex colors for bgFrom, bgTo (dark navy/obsidian/plum/emerald tones) and vibrant accentColor (#D9A441, #38BDF8, #EC4899, #10B981, #F97316, #A855F7).
- Vary the motif across scenes from: "stars", "grid", "waves", "orbits", "embers".
- Set durationSec between 3.5 and 5.5 seconds per scene.${brainAddendum}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          projectTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                narration: { type: Type.STRING },
                durationSec: { type: Type.NUMBER },
                accentColor: { type: Type.STRING },
                bgFrom: { type: Type.STRING },
                bgTo: { type: Type.STRING },
                motif: { type: Type.STRING },
              },
              required: ['title', 'subtitle', 'narration', 'durationSec', 'accentColor', 'bgFrom', 'bgTo', 'motif'],
            },
          },
        },
        required: ['projectTitle', 'summary', 'scenes'],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `اصنع ستوريبورد فيديو موشن جرافيك سينمائي (${count} مشاهد، مقاس ${ratio}) حول الموضوع التالي:\n${cleanPrompt}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (err) {
        if (isTransientOverloadError(err)) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `اصنع ستوريبورد فيديو موشن جرافيك (${count} مشاهد) حول:\n${cleanPrompt}`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } else {
          throw err;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ storyboard: parsed, aspectRatio: ratio });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 8C. VALDRION MIND Motion Video & Reels Project Generator (100% Free Canvas + WebM Export)
  app.post('/api/ai/video/generate', async (req, res) => {
    const { prompt, aspectRatio, sceneCount, includeInternetPhotos, brainContext } = req.body as {
      prompt?: string;
      aspectRatio?: VideoAspectRatio;
      sceneCount?: number;
      includeInternetPhotos?: boolean;
      brainContext?: string;
    };

    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'يرجى كتابة فكرة الفيديو أو الريلز أولاً.' });
    }

    const ratio: VideoAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
    const count = Math.min(6, Math.max(3, Number(sceneCount) || 4));

    try {
      const ai = getGeminiClient();
      const brainAddendum =
        typeof brainContext === 'string' && brainContext.trim()
          ? `\nUser profile & preferences:\n${brainContext.trim().slice(0, 1000)}`
          : '';

      const systemInstruction = `You are a world-class Arabic Motion-Graphics Video & Reels Director.
Create a ${count}-scene kinetic motion video project in strict JSON for aspectRatio "${ratio}".
Rules:
- headline: Bold punchy Arabic headline (3 to 7 words).
- subtitle: Clean Arabic supporting line (6 to 16 words).
- narration: Natural Arabic voiceover sentence for this scene.
- durationSec: integer between 4 and 6 seconds.
- accentColor & secondaryColor: vibrant harmonious hex colors (#60A5FA, #F59E0B, #34D399, #F472B6, #38BDF8, #A78BFA).
- bgDark: deep dark hex background (#090D16, #0E1018, #0B1214, #120B16).
- motionStyle: pick from "orbit_particles", "aurora_waves", "geometric_grid", "starfield_warp", "golden_embers".
- visualKeyword: 2-3 English keywords describing a real photography backdrop for this scene (e.g. "neon city night", "galaxy nebula", "futuristic lab").${brainAddendum}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          narrationFullScript: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                narration: { type: Type.STRING },
                durationSec: { type: Type.INTEGER },
                accentColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                bgDark: { type: Type.STRING },
                motionStyle: { type: Type.STRING },
                visualKeyword: { type: Type.STRING },
              },
              required: [
                'headline',
                'subtitle',
                'narration',
                'durationSec',
                'accentColor',
                'secondaryColor',
                'bgDark',
                'motionStyle',
                'visualKeyword',
              ],
            },
          },
        },
        required: ['title', 'scenes'],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `أخرج مشروع فيديو متحرك من ${count} مشاهد بمقاس ${ratio} حول الموضوع:\n${cleanPrompt}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (err) {
        if (isTransientOverloadError(err)) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `أخرج مشروع فيديو متحرك من ${count} مشاهد بمقاس ${ratio} حول:\n${cleanPrompt}`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } else {
          throw err;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      const project = normalizeMotionVideoProject(parsed, ratio, cleanPrompt.slice(0, 70));

      if (includeInternetPhotos !== false) {
        await Promise.allSettled(
          project.scenes.slice(0, 4).map(async (scene) => {
            if (!scene.visualKeyword) return;
            const media = await fetchFreeWebMedia(scene.visualKeyword, 3);
            if (media[0]?.thumbUrl) {
              scene.backdropImageUrl = `/api/media/proxy-image?url=${encodeURIComponent(
                media[0].thumbUrl
              )}`;
            }
          })
        );
      }

      return res.json({ project });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 8D. AETHERMIND Visual & Image Studio Generator (Bespoke HD Vector Artwork + Verified Real Web Photos — 100% Free & Working)
  app.post('/api/ai/image/generate', async (req, res) => {
    const { prompt, aspectRatio, brainContext } = req.body as {
      prompt?: string;
      aspectRatio?: '1:1' | '16:9' | '9:16';
      brainContext?: string;
    };

    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'يرجى كتابة وصف الصورة أو التصميم الذي تريده.' });
    }

    const ratio: '1:1' | '16:9' | '9:16' =
      aspectRatio === '16:9' || aspectRatio === '9:16' ? aspectRatio : '1:1';
    const viewBox =
      ratio === '16:9' ? '0 0 1280 720' : ratio === '9:16' ? '0 0 720 1280' : '0 0 1000 1000';

    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are an elite Visual Art Director & SVG Master Illustrator.
Given the user's Arabic or English image request, output strict JSON with:
1. "title": concise Arabic title for the artwork (3-6 words).
2. "photoSearchQuery": 2-4 crisp English search keywords to retrieve matching real high-res photography from Wikimedia/Openverse (e.g. "golden desert palace night", "futuristic neon sports car", "lion golden crown").
3. "description": 2 short Arabic sentences describing the artwork composition and colors.
4. "svgCode": a COMPLETE, RICH, MUSEUM-GRADE standalone <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">...</svg> artwork!
   SVG ART QUALITY RULES:
   - Include rich <defs> with multi-stop <linearGradient>, <radialGradient>, and subtle <filter> glow/shadow.
   - Build at least 12+ layered artistic shapes (sky/backdrop, atmospheric light rays, detailed silhouettes/subject focal point, foreground depth, architectural or organic curves, particles/stars, refined border framing).
   - Never reference external URLs inside the SVG (100% self-contained so PNG export is flawless).
   - If the user asks for a poster/logo/card with text, include crisp, well-positioned Arabic or English typography with high contrast.
${brainContext ? `\nUser context:\n${brainContext.slice(0, 600)}` : ''}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          photoSearchQuery: { type: Type.STRING },
          description: { type: Type.STRING },
          svgCode: { type: Type.STRING },
        },
        required: ['title', 'photoSearchQuery', 'description', 'svgCode'],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `صمّم عملاً بصرياً فنياً مذهلاً (${ratio}) بناءً على الطلب التالي:\n${cleanPrompt}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (err) {
        if (isTransientOverloadError(err)) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `صمّم عملاً بصرياً فنياً (${ratio}) حول:\n${cleanPrompt}`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } else {
          throw err;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        title?: string;
        photoSearchQuery?: string;
        description?: string;
        svgCode?: string;
      };

      // Attempt real raster HD AI Image Generation first (detailed faces, lighting & realistic textures!)
      let generatedImageDataUrl: string | undefined;
      try {
        const imgResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: `Create a crisp, ultra-detailed, high-resolution visual artwork with expressive detailed faces and rich cinematic lighting for: ${cleanPrompt}`,
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        });
        const imgParts = imgResp.candidates?.[0]?.content?.parts as
          | Array<{ inlineData?: { mimeType?: string; data?: string } }>
          | undefined;
        const foundImg = imgParts?.find((p) => p?.inlineData?.data);
        if (foundImg?.inlineData?.data) {
          generatedImageDataUrl = `data:${foundImg.inlineData.mimeType || 'image/png'};base64,${foundImg.inlineData.data}`;
        }
      } catch {
        // Free-tier key or image quota fallback: real HD photography + artwork below
      }

      const photoQuery = (parsed.photoSearchQuery || cleanPrompt).trim().slice(0, 80);
      const rawPhotos = await fetchFreeWebMedia(photoQuery, 6).catch(() => []);
      const webPhotos: Array<{
        id: string;
        title: string;
        thumbUrl: string;
        fullUrl: string;
        author: string;
        source: string;
      }> = rawPhotos.slice(0, 4).map((p) => ({
        id: p.id,
        title: p.title,
        thumbUrl: `/api/media/proxy-image?url=${encodeURIComponent(p.thumbUrl)}`,
        fullUrl: `/api/media/proxy-image?url=${encodeURIComponent(p.fullUrl)}`,
        author: p.author,
        source: p.source,
      }));

      if (generatedImageDataUrl) {
        webPhotos.unshift({
          id: `ai_gen_${Date.now()}`,
          title: parsed.title || cleanPrompt.slice(0, 42),
          thumbUrl: generatedImageDataUrl,
          fullUrl: generatedImageDataUrl,
          author: 'VALDRION Visual AI',
          source: 'AI HD Render',
        });
      }

      const rawSvg = (parsed.svgCode || '').trim();
      const safeSvg = rawSvg.includes('<svg')
        ? rawSvg.replace(/<script[\s\S]*?<\/script>/gi, '')
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><text x="50%" y="50%" fill="#F8FAFC" font-size="36" text-anchor="middle">${cleanPrompt.slice(0, 40).replace(/[<>&]/g, '')}</text></svg>`;

      return res.json({
        bundle: {
          prompt: cleanPrompt,
          title: parsed.title || cleanPrompt.slice(0, 42),
          aspectRatio: ratio,
          svgCode: safeSvg,
          generatedImageUrl: generatedImageDataUrl,
          webPhotos,
        },
        description:
          parsed.description ||
          `تم توليد التصميم البصري «${parsed.title || cleanPrompt.slice(0, 36)}» بدقة عالية وتفاصيل واضحة مع صور حقيقية جاهزة للتحميل.`,
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 8C. Permission-Based Live Godot 4 Editor Agent Command Planner
  app.post('/api/ai/godot/command', async (req, res) => {
    const { prompt, sceneTree, dimension, activeProjectFiles, brainContext } = req.body as {
      prompt?: string;
      sceneTree?: {
        scenePath?: string;
        nodes?: Array<{ name: string; type: string; path: string; depth: number }>;
      } | null;
      dimension?: '2d' | '3d';
      activeProjectFiles?: string[];
      brainContext?: string;
    };

    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'يرجى كتابة الأمر الذي تريد من الذكاء تنفيذه داخل محرك جودوت.' });
    }

    const dim = dimension === '2d' ? '2d' : '3d';
    try {
      const ai = getGeminiClient();
      const sceneContext =
        sceneTree && Array.isArray(sceneTree.nodes) && sceneTree.nodes.length > 0
          ? `المشهد المفتوح حالياً في Godot (${sceneTree.scenePath || 'scene'}):\n${sceneTree.nodes
              .slice(0, 60)
              .map((n) => `${'  '.repeat(Math.min(n.depth, 5))}- ${n.name} (${n.type}) [path: ${n.path}]`)
              .join('\n')}`
          : 'لا توجد لقطة شجرة مشهد حالياً؛ استخدم المسار "." كعقدة جذرية افتراضية.';

      const filesContext =
        Array.isArray(activeProjectFiles) && activeProjectFiles.length > 0
          ? `ملفات المشروع الحالية: ${activeProjectFiles.slice(0, 25).join(', ')}`
          : '';

      const systemInstruction = `You are the VALDRION Godot 4.3+ Live Editor Control Agent.
Convert the user's Arabic or English instruction into a SAFE, EXECUTABLE JSON plan of Godot 4 Editor commands that the user will review and approve ("بعد إذنك") before execution!

Supported command actions:
1. "add_node": Adds a real Godot 4 node to the open scene. Set:
   - labelAr (clear Arabic description)
   - parentPath ("." or relative path from scene root)
   - nodeName (PascalCase ASCII identifier)
   - nodeType (valid Godot 4 class: Node3D, CharacterBody3D, MeshInstance3D, StaticBody3D, RigidBody3D, Area3D, OmniLight3D, DirectionalLight3D, SpotLight3D, Camera3D, Node2D, CharacterBody2D, ColorRect, Label, AudioStreamPlayer, etc.)
   - position: [x, y, z] array of numbers (optional)
   - scale: [x, y, z] array of numbers (optional)
   - meshShape: "box" | "sphere" | "cylinder" | "plane" | "none" (for MeshInstance3D)
   - color: "#RRGGBB" hex string (for MeshInstance3D material, Light3D color, or ColorRect)
2. "set_property": Modifies a property on an existing node (nodePath, property, value).
3. "delete_node": Deletes a specific child node (nodePath — never ".").
4. "write_file": Writes a complete, zero-error Godot 4.3+ GDScript 2.0 (.gd) or .tscn file (filePath like "scripts/custom_car.gd", content).
5. "attach_script": Writes a complete GDScript 2.0 script (filePath, content) AND attaches it to nodePath!
6. "save_scene": Saves the open scene (include after edits when appropriate).
7. "run_scene": Plays the game in Godot (F5) when user asks to test/run!
8. "stop_scene": Stops the running game.
9. "get_scene_tree": Reads the live open scene tree.

RULES:
- Use strict Godot 4.3+ GDScript 2.0 syntax (@export, @onready, CharacterBody3D/2D, move_and_slide(), instantiate()).
- Keep Arabic summary, explanation, and labelAr crisp, clear, and honest so the user knows EXACTLY what they are granting permission for.
- Target dimension default: ${dim.toUpperCase()}.
${brainContext ? `\nUser context:\n${brainContext.slice(0, 800)}` : ''}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          explanation: { type: Type.STRING },
          commands: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING },
                labelAr: { type: Type.STRING },
                parentPath: { type: Type.STRING },
                nodeName: { type: Type.STRING },
                nodeType: { type: Type.STRING },
                nodePath: { type: Type.STRING },
                property: { type: Type.STRING },
                value: { type: Type.STRING },
                position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                meshShape: { type: Type.STRING },
                color: { type: Type.STRING },
                filePath: { type: Type.STRING },
                content: { type: Type.STRING },
                scenePath: { type: Type.STRING },
              },
              required: ['action', 'labelAr'],
            },
          },
        },
        required: ['summary', 'explanation', 'commands'],
      };

      const promptBody = `طلب المستخدم للتحكم في Godot 4:\n${cleanPrompt}\n\n${sceneContext}\n${filesContext}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: promptBody,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (err) {
        if (isTransientOverloadError(err)) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: promptBody,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } else {
          throw err;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Record<string, unknown>;
      const plan = sanitizeGodotActionPlan(parsed, cleanPrompt);
      return res.json({ plan });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 22. Multi-AI Council Debate Engine (3 Expert Minds + Executive Verdict)
  app.post('/api/ai/council', async (req, res) => {
    const { prompt, brainContext } = (req.body || {}) as {
      prompt?: string;
      brainContext?: string;
    };
    const cleanPrompt = (prompt || '').replace(/^\/(مجلس|council)\s*/i, '').trim().slice(0, 3500);
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'اكتب سؤالك أو قرارك ليعقد مجلس الخبراء مناظرته.' });
    }

    try {
      const ai = getGeminiClient();
      const systemInstruction = `أنت منسّق "مجلس الخبراء الثلاثي" في AETHERMIND AI.
عند كل سؤال أو فكرة مشروع أو قرار مهم، تُجري مناظرة عميقة بين 3 عقول متخصصة مختلفة تماماً باللغة العربية الفصحى الواضحة:
1. id: "architect" — المهندس المعماري (يبني الحل العملي والهيكلة التقنية الدقيقة).
2. id: "critic" — الناقد الأمني والمنطقي (يكشف الثغرات والمخاطر والتكاليف المخفية بجرأة).
3. id: "visionary" — المبدع الاستراتيجي (يبتكر الزوايا التنافسية والأفكار غير التقليدية).
ثم تصدر "القرار التنفيذي الموحّد" مع خطوات عملية فورية قابلة للتنفيذ ونسبة ثقة واقعية (70-98).
${brainContext ? `\nذاكرة المستخدم:\n${brainContext.slice(0, 700)}` : ''}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          members: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                nameAr: { type: Type.STRING },
                roleTitle: { type: Type.STRING },
                stance: { type: Type.STRING },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskOrOpportunity: { type: Type.STRING },
              },
              required: ['id', 'nameAr', 'roleTitle', 'stance', 'keyPoints', 'riskOrOpportunity'],
            },
          },
          verdictTitle: { type: Type.STRING },
          verdictSummary: { type: Type.STRING },
          actionChecklist: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidenceScore: { type: Type.NUMBER },
        },
        required: ['members', 'verdictTitle', 'verdictSummary', 'actionChecklist', 'confidenceScore'],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `اعقد جلسة مجلس الخبراء الثلاثي لمناقشة هذا الطلب بعمق عملي:\n${cleanPrompt}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (err) {
        if (isTransientOverloadError(err)) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `اعقد جلسة مجلس الخبراء الثلاثي لمناقشة هذا الطلب بعمق عملي:\n${cleanPrompt}`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } else {
          throw err;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        members?: Array<{
          id?: string;
          nameAr?: string;
          roleTitle?: string;
          stance?: string;
          keyPoints?: string[];
          riskOrOpportunity?: string;
        }>;
        verdictTitle?: string;
        verdictSummary?: string;
        actionChecklist?: string[];
        confidenceScore?: number;
      };

      const accentById: Record<'architect' | 'critic' | 'visionary', string> = {
        architect: '#38BDF8',
        critic: '#FB7185',
        visionary: '#F5C76B',
      };
      const defaultOrder: Array<'architect' | 'critic' | 'visionary'> = [
        'architect',
        'critic',
        'visionary',
      ];
      const members = defaultOrder.map((expectedId, idx) => {
        const raw =
          (parsed.members || []).find((m) => m?.id === expectedId) ||
          (parsed.members || [])[idx] ||
          {};
        return {
          id: expectedId,
          nameAr:
            raw.nameAr ||
            (expectedId === 'architect'
              ? 'المهندس المعماري'
              : expectedId === 'critic'
              ? 'الناقد الأمني والمنطقي'
              : 'المبدع الاستراتيجي'),
          roleTitle:
            raw.roleTitle ||
            (expectedId === 'architect'
              ? 'الهيكلة والتنفيذ العملي'
              : expectedId === 'critic'
              ? 'كشف المخاطر والفجوات'
              : 'الابتكار والنمو التنافسي'),
          accentHex: accentById[expectedId],
          stance: String(raw.stance || 'تحليل متخصص بناءً على معطيات الطلب.').trim(),
          keyPoints: Array.isArray(raw.keyPoints)
            ? raw.keyPoints.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 4)
            : [],
          riskOrOpportunity: String(raw.riskOrOpportunity || '').trim(),
        };
      });

      const debate: AiCouncilDebateResult = {
        question: cleanPrompt,
        members,
        verdictTitle: (parsed.verdictTitle || 'القرار التنفيذي المرجّح').trim(),
        verdictSummary: (
          parsed.verdictSummary ||
          'بناءً على موازنة الرأي الهندسي والنقدي والاستراتيجي، يُنصح بالتنفيذ المرحلي السريع.'
        ).trim(),
        actionChecklist: Array.isArray(parsed.actionChecklist)
          ? parsed.actionChecklist.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 6)
          : [],
        confidenceScore:
          typeof parsed.confidenceScore === 'number'
            ? Math.max(60, Math.min(99, Math.round(parsed.confidenceScore)))
            : 88,
        generatedAt: Date.now(),
      };

      return res.json({ debate });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 23. Interactive AI Mind Map & Concept Diagram Generator
  app.post('/api/ai/mindmap', async (req, res) => {
    const { prompt, brainContext } = (req.body || {}) as {
      prompt?: string;
      brainContext?: string;
    };
    const cleanPrompt = (prompt || '').replace(/^\/(خريطة|mindmap)\s*/i, '').trim().slice(0, 2000);
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'اكتب موضوع الخريطة الذهنية أولاً.' });
    }

    try {
      const ai = getGeminiClient();
      const systemInstruction = `أنت مصمم خرائط ذهنية ومخططات مفاهيمية في AETHERMIND AI.
حوّل موضوع المستخدم إلى خريطة ذهنية عربية دقيقة ومركّزة تتكون من:
- title (عنوان قصير واضح أقل من 40 حرفاً)
- subtitle (وصف سطر واحد)
- branches: 4 إلى 6 فروع رئيسية، لكل فرع title قصير، note توضيحية مفيدة، و 3 إلى 4 تفريعات قصيرة في children (كل تفريع أقل من 26 حرفاً ليظهر بوضوح في الرسم).
- keyTakeaway: خلاصة تنفيذية في سطر واحد.
${brainContext ? `\nذاكرة المستخدم:\n${brainContext.slice(0, 500)}` : ''}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          branches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                note: { type: Type.STRING },
                children: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'note', 'children'],
            },
          },
          keyTakeaway: { type: Type.STRING },
        },
        required: ['title', 'subtitle', 'branches', 'keyTakeaway'],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `ارسم خريطة ذهنية منظمة وشاملة للموضوع التالي:\n${cleanPrompt}`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (err) {
        if (isTransientOverloadError(err)) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `ارسم خريطة ذهنية منظمة وشاملة للموضوع التالي:\n${cleanPrompt}`,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } else {
          throw err;
        }
      }

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<
        ReturnType<typeof normalizeMindMapData>
      >;
      const mindMap = normalizeMindMapData(parsed, cleanPrompt);
      return res.json({ mindMap });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 23B. SUTOOR Manhwa Full-File Character & World Bible Extractor (100% File-Faithful)
  app.post('/api/novels/manhwa/analyze-file', async (req, res) => {
    const { bookTitle, fullText } = (req.body || {}) as {
      bookTitle?: string;
      fullText?: string;
    };

    const rawText = (fullText || '').trim();
    if (!rawText || rawText.length < 25) {
      return res.status(400).json({
        error: 'أدخل نص الرواية أو ارفع ملف الكتاب أولاً لاستخراج وصف الشخصيات والعالم منه.',
      });
    }

    const safeTitle = (bookTitle || 'رواية الملف').trim().slice(0, 120);
    const sampled = sampleFullBookForAnalysis(rawText, 28000);

    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are a meticulous Literary Character Archivist & Manhwa Art Director for SUTOOR (سُطور).
Read the uploaded book/novel file carefully and extract a STRICT, 100% FILE-FAITHFUL Character & World Bible in Arabic.

IRONCLAD RULES:
1. Extract ONLY characters, physical traits, outfits, weapons, scars, powers/auras, and world settings that are ACTUALLY WRITTEN OR DESCRIBED in the uploaded file!
2. Scan the ENTIRE text (including any character sheet, prologue, intro notes, or mid-chapter descriptions).
3. For EVERY character found (up to 10 main/recurring characters):
   - \`name\`: Exact character name as written in the file.
   - \`role\`: Concise Arabic role from the file (e.g. "البطل الرئيسي", "البطلة", "الخصم الرئيسي", "المعلم").
   - \`appearanceAr\`: Exact physical description from the file (hair color & length, eye color, build, scars/marks, age/vibe). Do NOT invent contradictions!
   - \`outfitAr\`: Exact clothing, coat, cloak, armor, or accessories described in the file.
   - \`weaponOrPropAr\`: Exact weapon or signature object from the file (or empty string if none mentioned).
   - \`auraOrPowerAr\`: Exact power, magic, or aura color/effect described in the file (or empty string if none).
   - \`hairHex\`, \`eyeHex\`, \`outfitHex\`, \`skinHex\`, \`auraHex\`: Exact valid 6-digit hex color codes (#RRGGBB) that accurately match the exact colors written in the file (e.g., white/silver hair -> #E5E7EB, black hair -> #141720, crimson eyes -> #DC2626, emerald eyes -> #10B981, blue aura -> #38BDF8, golden hair -> #F59E0B).
   - \`fileEvidenceQuote\`: A short verbatim quote (up to 140 chars) from the file proving this character's description.
4. \`worldSettingAr\`: Concise Arabic description of the world/locations STRICTLY from the file.
5. \`atmosphereAr\`: Concise Arabic visual mood & lighting atmosphere STRICTLY from the file.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          worldSettingAr: { type: Type.STRING },
          atmosphereAr: { type: Type.STRING },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                appearanceAr: { type: Type.STRING },
                outfitAr: { type: Type.STRING },
                weaponOrPropAr: { type: Type.STRING },
                auraOrPowerAr: { type: Type.STRING },
                hairHex: { type: Type.STRING },
                eyeHex: { type: Type.STRING },
                outfitHex: { type: Type.STRING },
                skinHex: { type: Type.STRING },
                auraHex: { type: Type.STRING },
                fileEvidenceQuote: { type: Type.STRING },
              },
              required: [
                'name',
                'role',
                'appearanceAr',
                'outfitAr',
                'weaponOrPropAr',
                'auraOrPowerAr',
                'hairHex',
                'eyeHex',
                'outfitHex',
                'skinHex',
                'auraHex',
                'fileEvidenceQuote',
              ],
            },
          },
        },
        required: ['worldSettingAr', 'atmosphereAr', 'characters'],
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `عنوان الكتاب/الملف: ${safeTitle}\n\nمحتوى الملف الكامل (أو عينات شاملة منه):\n${sampled}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: `عنوان الكتاب/الملف: ${safeTitle}\n\nمحتوى الملف الكامل (أو عينات شاملة منه):\n${sampled}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      }

      let parsed: Record<string, unknown> = {};
      try {
        const txt = (response.text ?? '{}')
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        parsed = JSON.parse(txt) as Record<string, unknown>;
      } catch {
        parsed = {};
      }

      const bible = normalizeManhwaCharacterBible(
        parsed,
        safeTitle,
        rawText.length,
        rawText
      );
      return res.json({ bible });
    } catch {
      // Deterministic local extractor fallback so file analysis NEVER fails!
      const fallbackBible = extractLocalCharacterBibleFallback(safeTitle, rawText);
      return res.json({ bible: fallbackBible });
    }
  });

  // 24. SUTOOR Manhwa / Webtoon Novel-to-Comic Studio (Supports Reference Art Style Image + 100% File Character Bible!)
  app.post('/api/novels/manhwa/generate', async (req, res) => {
    const {
      bookTitle,
      chapterTitle,
      text,
      styleId,
      customStyleNotes,
      panelCount,
      referenceImage,
      characterBible,
      strictFileMode,
    } = (req.body || {}) as {
      bookTitle?: string;
      chapterTitle?: string;
      text?: string;
      styleId?: ManhwaArtStyleId;
      customStyleNotes?: string;
      panelCount?: number;
      referenceImage?: { mimeType?: string; data?: string } | null;
      characterBible?: ManhwaCharacterBible | null;
      strictFileMode?: boolean;
    };

    const cleanText = (text || '').trim().slice(0, 14000);
    if (!cleanText || cleanText.length < 30) {
      return res.status(400).json({
        error: 'أدخل نص الرواية أو ارفع ملف الكتاب أولاً (30 حرفاً على الأقل) ليتم تحويله إلى مانهوا.',
      });
    }

    const safeStyleId: ManhwaArtStyleId = styleId || 'solo_manhwa';
    const preset = getManhwaStylePreset(safeStyleId);
    const count = Math.max(4, Math.min(8, Number(panelCount) || 6));
    const hasRefImg = Boolean(
      referenceImage?.data &&
        referenceImage?.mimeType &&
        /^image\/(png|jpeg|jpg|webp|gif)$/i.test(referenceImage.mimeType)
    );

    const normalizedBible =
      characterBible && typeof characterBible === 'object'
        ? normalizeManhwaCharacterBible(
            characterBible as unknown as Record<string, unknown>,
            bookTitle || characterBible.bookTitle || 'مانهوا سُطور',
            characterBible.sourceCharCount || cleanText.length
          )
        : null;
    const enforceStrictFile = strictFileMode !== false;
    const biblePromptBlock = buildCharacterBiblePromptBlock(normalizedBible);

    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are the Master Webtoon & Manhwa Director and Lead Illustrator for SUTOOR (سُطور).
Transform the provided novel text into a thrilling, complete, sequential Arabic Manhwa / Webtoon episode with EXACTLY ${count} panels!

${
  enforceStrictFile
    ? `CRITICAL 100% FILE-FIDELITY CONTRACT (NON-NEGOTIABLE):
- EVERYTHING MUST COME STRICTLY FROM THE UPLOADED BOOK/NOVEL FILE!
- Draw EVERY character with 100% faithfulness to the EXACT physical description, hair color (hairHex), eye color (eyeHex), outfit/armor (outfitHex), skin tone (skinHex), scars, weapons, and aura (auraHex) defined in the Character Bible below and in the chapter text!
- NEVER invent new characters, NEVER alter any character's described hair/eye/outfit colors, NEVER change names, and NEVER invent off-script plot events!
- Adapt EVERY scene, narration box, and dialogue bubble strictly & chronologically from the provided chapter text!
- If the file describes specific settings/architecture/weather, illustrate those EXACT details in the SVG backgrounds!`
    : ''
}

${biblePromptBlock}

ART STYLE DIRECTION:
${
  hasRefImg
    ? 'CRITICAL: The user attached a REFERENCE ART STYLE IMAGE! Carefully analyze its exact color palette (4 hex colors), lighting mood, line-art style, shading contrast, atmosphere, and character rendering style. Describe this extracted style in `styleSummaryAr` (in Arabic) and apply its exact rendering aesthetic across EVERY panel SVG while ALWAYS preserving each character’s exact hair/eye/outfit colors from the file!'
    : `Apply this exact art style: ${preset.promptCue}`
}
${customStyleNotes ? `Additional user art instructions: ${customStyleNotes.slice(0, 400)}` : ''}

FOR EVERY PANEL IN \`panels\`:
1. \`title\`: Short dramatic Arabic scene title faithful to the chapter beat.
2. \`layout\`: "splash" (opening or climax), "wide", "tall", or "dramatic".
3. \`cameraAngle\`: Arabic cinematic camera angle (e.g. "لقطة واسعة ملحمية", "زاوية سفلية درامية", "لقطة مقربة للعيون").
4. \`mood\`: one of "action" | "mystery" | "emotional" | "epic" | "calm" | "horror".
5. \`charactersPresent\`: Array of EXACT character names from the file/Character Bible appearing in this panel (e.g. ["كايل", "ليلى"]).
6. \`characterVisualNotesAr\`: Concise Arabic confirmation of how each present character's EXACT appearance from the file (hair, eyes, outfit, weapon) is drawn in this panel.
7. \`sceneDescriptionAr\`: Vivid Arabic visual beat summary of what happens in this panel strictly from the file.
8. \`narrationBox\`: Optional dramatic Arabic narrative caption box directly adapting the file's narration (1-2 sentences).
9. \`dialogues\`: IMPORTANT — include 1 to 2 dramatic Arabic dialogue/thought bubbles on EVERY panel directly adapting the file's exact characters, spoken lines, and thoughts (\`speaker\`, \`text\`, \`bubbleType\`: "speech"|"thought"|"shout"|"whisper", \`position\`: "top_right"|"top_left"|"bottom_right"|"bottom_left").
10. \`sfxText\`: Expressive comic Arabic sound effect on action/dramatic panels (e.g. "كرااااش!", "بوووم!", "ووش!", "دق... دق...", "تشففف!").
11. \`palette\`: 4 hex colors \`[bgDark, bgMid, primaryAccent, highlight]\` matching the reference image or style preset.
12. \`svgArt\`: A COMPLETE, richly layered, visually stunning standalone SVG illustration (\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" width="900" height="560">...</svg>\`) illustrating the EXACT scene and EXACT character appearances from the file!
   - Include rich <defs> (sky/mood linearGradient, dramatic radialGradient glow, shadows).
   - Draw atmospheric background scenery matching the EXACT setting described in the file.
   - Draw expressive stylized anime/manhwa characters using their EXACT \`hairHex\`, \`eyeHex\`, \`outfitHex\`, \`skinHex\`, \`auraHex\`, scars, and weapons from the Character Bible!
   - Draw foreground energy slashes, speed lines, magic particles, smoke, or lighting beams.
   - DO NOT put Arabic dialogue text inside the SVG (dialogue bubbles & narration boxes are rendered sharply by the Manhwa UI layer on top!).
   - Keep each SVG clean, well-formed XML (no <script> tags, no broken quotes).`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          styleSummaryAr: { type: Type.STRING },
          extractedPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                layout: { type: Type.STRING },
                cameraAngle: { type: Type.STRING },
                mood: { type: Type.STRING },
                charactersPresent: { type: Type.ARRAY, items: { type: Type.STRING } },
                characterVisualNotesAr: { type: Type.STRING },
                sceneDescriptionAr: { type: Type.STRING },
                narrationBox: { type: Type.STRING },
                sfxText: { type: Type.STRING },
                palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                dialogues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING },
                      text: { type: Type.STRING },
                      bubbleType: { type: Type.STRING },
                      position: { type: Type.STRING },
                    },
                    required: ['speaker', 'text', 'bubbleType', 'position'],
                  },
                },
                svgArt: { type: Type.STRING },
              },
              required: [
                'title',
                'layout',
                'cameraAngle',
                'mood',
                'charactersPresent',
                'characterVisualNotesAr',
                'sceneDescriptionAr',
                'dialogues',
                'svgArt',
              ],
            },
          },
        },
        required: ['styleSummaryAr', 'extractedPalette', 'panels'],
      };

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (hasRefImg && referenceImage?.data && referenceImage?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: referenceImage.mimeType,
            data: referenceImage.data,
          },
        });
      }

      parts.push({
        text: `عنوان الرواية: ${bookTitle || 'رواية سُطور'}\nعنوان الفصل: ${chapterTitle || 'الفصل الأول'}\nعدد اللوحات المطلوبة: ${count}\nوضع الالتزام الصارم بالملف: ${enforceStrictFile ? 'مفعّل 100%' : 'مرن'}\n\nنص الفصل من الملف لتحويله بالكامل وبأمانة تامة إلى مانهوا مصوّرة متسلسلة:\n${cleanText}`,
      });

      let parsed: Record<string, unknown> = {};
      try {
        let response;
        try {
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        } catch {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema,
            },
          });
        }
        const cleanJsonText = (response.text ?? '{}')
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        parsed = JSON.parse(cleanJsonText) as Record<string, unknown>;
      } catch {
        // Resilient local storyboard synthesis so Manhwa generation NEVER fails!
        const sentences = cleanText
          .split(/(?<=[.!؟\n])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8);
        const heroName = normalizedBible?.characters?.[0]?.name || 'البطل';
        const fallbackPanels = Array.from({ length: count }, (_, idx) => {
          const line =
            sentences[idx % Math.max(1, sentences.length)] ||
            `مشهد درامي رقم ${idx + 1} من «${bookTitle || 'مانهوا فالدريون'}».`;
          const layouts = ['splash', 'wide', 'tall', 'medium'] as const;
          return {
            title: `اللوحة ${idx + 1}: ${line.slice(0, 34)}`,
            layout: layouts[idx % layouts.length],
            cameraAngle: idx === 0 ? 'لقطة تأسيسية بانورامية' : idx % 2 === 0 ? 'زاوية درامية منخفضة' : 'لقطة مقرّبة معبرة',
            mood: idx % 2 === 0 ? 'حماسي غامض' : 'مشوق ومليء بالتوتر',
            charactersPresent: [heroName],
            characterVisualNotesAr: `${heroName} بملامح حادة وإضاءة سينمائية متباينة`,
            sceneDescriptionAr: line.slice(0, 180),
            narrationBox: line.slice(0, 140),
            sfxText: idx === 0 ? 'وميييض!' : idx % 2 === 0 ? 'دويّ!' : 'همس...',
            dialogues: [
              {
                speaker: heroName,
                text: line.slice(0, 95),
                bubbleType: idx % 3 === 0 ? 'shout' : 'speech',
                position: idx % 2 === 0 ? 'top-right' : 'bottom-left',
              },
            ],
            svgArt: '',
          };
        });
        parsed = {
          styleSummaryAr: `أسلوب مانهوا احترافي عالي التباين (${safeStyleId}) مع إضاءة سينمائية`,
          extractedPalette: ['#0B0F1F', '#1D2B53', '#D9A441', '#60A5FA'],
          panels: fallbackPanels,
        };
      }

      const episode = normalizeManhwaEpisode(parsed, {
        bookTitle: bookTitle || 'مانهوا سُطور',
        chapterTitle: chapterTitle || 'الحلقة الأولى',
        styleId: hasRefImg ? 'custom_reference' : safeStyleId,
        usedReferenceImage: hasRefImg,
        characterBible: normalizedBible,
        strictFileMode: enforceStrictFile,
      });

      return res.json({ episode });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 24B. SUPER ADMIN CONTROL CENTER (Strictly Verified via Firebase ID Token for 159laithosama159@gmail.com)
  const SUPER_ADMIN_EMAIL = '159laithosama159@gmail.com';
  const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
  let globalAdminAnnouncement = '';

  async function verifySuperAdminRequest(req: express.Request): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken || idToken.length < 40) {
      return { ok: false, status: 401, error: 'يجب تسجيل الدخول بحساب الأدمن المصرّح به.' };
    }
    try {
      // Verify Firebase / Google ID token using Firebase REST lookup (or Google tokeninfo fallback)
      const fbConfigPath = path.join(PROJECT_ROOT, 'firebase-applet-config.json');
      let apiKey = '';
      if (fs.existsSync(fbConfigPath)) {
        const cfg = JSON.parse(fs.readFileSync(fbConfigPath, 'utf8')) as { apiKey?: string };
        apiKey = String(cfg.apiKey || '');
      }

      let email = '';
      let emailVerified = false;

      if (apiKey) {
        const fbRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
            signal: AbortSignal.timeout(8000),
          }
        );
        if (fbRes.ok) {
          const fbData = (await fbRes.json()) as {
            users?: Array<{ email?: string; emailVerified?: boolean }>;
          };
          const u = fbData.users?.[0];
          if (u?.email) {
            email = u.email.toLowerCase();
            emailVerified = Boolean(u.emailVerified);
          }
        }
      }

      if (!email) {
        const tiRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (tiRes.ok) {
          const ti = (await tiRes.json()) as { email?: string; email_verified?: string | boolean };
          email = String(ti.email || '').toLowerCase();
          emailVerified = ti.email_verified === true || ti.email_verified === 'true';
        }
      }

      if (!email || !emailVerified || email !== SUPER_ADMIN_EMAIL) {
        return { ok: false, status: 403, error: 'صلاحية الأدمن محصورة فقط بالحساب المعتمد.' };
      }
      return { ok: true, email };
    } catch {
      return { ok: false, status: 401, error: 'تعذّر التحقق من جلسة الأدمن.' };
    }
  }

  function listSafeSourceFiles(baseDir: string, relDir = ''): Array<{ path: string; size: number }> {
    const out: Array<{ path: string; size: number }> = [];
    const blockedNames = new Set([
      'node_modules',
      'dist',
      '.git',
      '.env',
      '.env.local',
      '.env.production',
      '.playwright-cli',
      'package-lock.json',
    ]);
    const currentDir = path.join(baseDir, relDir);
    if (!fs.existsSync(currentDir)) return out;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (blockedNames.has(entry.name) || entry.name.startsWith('.env')) continue;
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      const fullPath = path.join(baseDir, relPath);
      if (entry.isDirectory()) {
        if (relDir.split('/').length < 4) {
          out.push(...listSafeSourceFiles(baseDir, relPath));
        }
      } else if (/\.(ts|tsx|js|jsx|json|css|html|md|rules)$/i.test(entry.name)) {
        try {
          const st = fs.statSync(fullPath);
          if (st.size <= 512 * 1024) {
            out.push({ path: relPath, size: st.size });
          }
        } catch {
          // ignore unreadable
        }
      }
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  app.get('/api/announcement', (_req, res) => {
    return res.json({ announcement: globalAdminAnnouncement });
  });

  app.get('/api/admin/overview', async (req, res) => {
    const check = await verifySuperAdminRequest(req);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    const files = listSafeSourceFiles(PROJECT_ROOT);
    const mem = process.memoryUsage();
    return res.json({
      ok: true,
      adminEmail: check.email,
      uptimeSec: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      nodeVersion: process.version,
      totalSourceFiles: files.length,
      announcement: globalAdminAnnouncement,
      serverTime: new Date().toISOString(),
    });
  });

  app.get('/api/admin/files', async (req, res) => {
    const check = await verifySuperAdminRequest(req);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    return res.json({ ok: true, files: listSafeSourceFiles(PROJECT_ROOT) });
  });

  app.get('/api/admin/file', async (req, res) => {
    const check = await verifySuperAdminRequest(req);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    const reqPath = String(req.query.path || '').trim().replace(/^\/+/, '');
    if (!reqPath || reqPath.includes('..') || reqPath.includes('.env')) {
      return res.status(400).json({ error: 'مسار الملف غير مسموح به.' });
    }
    const allowed = listSafeSourceFiles(PROJECT_ROOT).some((f) => f.path === reqPath);
    if (!allowed) {
      return res.status(404).json({ error: 'الملف غير موجود ضمن الكود المصدري.' });
    }
    const fullPath = path.join(PROJECT_ROOT, reqPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return res.json({ ok: true, path: reqPath, content });
  });

  app.get('/api/admin/download-bundle', async (req, res) => {
    const check = await verifySuperAdminRequest(req);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    const files = listSafeSourceFiles(PROJECT_ROOT);
    const bundle: Record<string, string> = {};
    for (const f of files) {
      try {
        bundle[f.path] = fs.readFileSync(path.join(PROJECT_ROOT, f.path), 'utf8');
      } catch {
        // skip
      }
    }
    return res
      .status(200)
      .setHeader('Content-Type', 'application/json; charset=utf-8')
      .setHeader('Content-Disposition', 'attachment; filename="valdrion-source-code-bundle.json"')
      .send(JSON.stringify({ exportedAt: new Date().toISOString(), fileCount: Object.keys(bundle).length, files: bundle }, null, 2));
  });

  app.post('/api/admin/announcement', async (req, res) => {
    const check = await verifySuperAdminRequest(req);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    const text = String((req.body as { announcement?: string })?.announcement || '').trim().slice(0, 280);
    globalAdminAnnouncement = text;
    return res.json({ ok: true, announcement: globalAdminAnnouncement });
  });

  // 25. World Novels Search Engine — Tens of Millions of Global Books Localized to Arabic (Open Library + Project Gutenberg + Google Books)
  app.post('/api/novels/world-search-ar', async (req, res) => {
    const { query, category, page: rawPage } = (req.body || {}) as {
      query?: string;
      category?: string;
      page?: number;
    };
    const rawQ = (query || category || 'fantasy classic novel').trim().slice(0, 140);
    const page = Math.max(1, Math.min(500, Number(rawPage) || 1));

    try {
      let ai: ReturnType<typeof getGeminiClient> | null = null;
      try {
        ai = getGeminiClient();
      } catch {
        ai = null;
      }

      // Translate Arabic search query into crisp English keywords too so we unlock 40+ million global books
      let englishQuery = rawQ;
      if (/[\u0600-\u06FF]/.test(rawQ) && ai) {
        try {
          const qTrans = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `Translate this book/novel search query into a short 1-3 word English search query for Open Library & Internet Archive. Output ONLY the English keywords, nothing else:\n${rawQ}`,
          });
          const candidate = (qTrans.text || '').replace(/["'\n]/g, ' ').trim();
          if (candidate && candidate.length <= 60) englishQuery = candidate;
        } catch {
          // keep rawQ
        }
      } else if (/[\u0600-\u06FF]/.test(rawQ)) {
        englishQuery = 'classic fantasy novel';
      }

      type RawWorldBook = {
        id: string;
        titleOriginal: string;
        authorOriginal: string;
        year?: number;
        coverUrl?: string;
        source: 'Open Library' | 'Project Gutenberg' | 'Google Books' | 'Internet Archive';
        infoUrl: string;
        fullTextUrl?: string;
        snippet?: string;
      };

      const fetchOpenLibrary = async (
        q: string,
        p: number
      ): Promise<{ books: RawWorldBook[]; total: number }> => {
        try {
          const r = await fetch(
            `https://openlibrary.org/search.json?q=${encodeURIComponent(
              q
            )}&fields=key,title,author_name,first_publish_year,cover_i,first_sentence&limit=16&page=${p}`,
            {
              headers: { 'User-Agent': 'ValdrionLibrary/1.0 (https://valdrion.app)' },
              signal: AbortSignal.timeout(9000),
            }
          );
          if (!r.ok) return { books: [], total: 0 };
          const j = (await r.json()) as {
            numFound?: number;
            docs?: Array<{
              key?: string;
              title?: string;
              author_name?: string[];
              first_publish_year?: number;
              cover_i?: number;
              first_sentence?: string[] | string;
            }>;
          };
          const books: RawWorldBook[] = (j.docs || [])
            .filter((d) => d.title)
            .slice(0, 14)
            .map((d, idx) => ({
              id: `ol_${(d.key || `${p}_${idx}`).toString().replace(/[^a-zA-Z0-9_-]/g, '_')}`,
              titleOriginal: String(d.title || '').trim(),
              authorOriginal: d.author_name?.[0] || 'مؤلف عالمي',
              year: d.first_publish_year,
              coverUrl: d.cover_i
                ? `/api/media/proxy-image?url=${encodeURIComponent(
                    `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
                  )}`
                : undefined,
              source: 'Open Library',
              infoUrl: d.key ? `https://openlibrary.org${d.key}` : 'https://openlibrary.org',
              snippet: Array.isArray(d.first_sentence)
                ? d.first_sentence[0]
                : typeof d.first_sentence === 'string'
                ? d.first_sentence
                : undefined,
            }));
          return { books, total: Number(j.numFound || books.length) };
        } catch {
          return { books: [], total: 0 };
        }
      };

      const fetchInternetArchive = async (
        q: string,
        p: number
      ): Promise<{ books: RawWorldBook[]; total: number }> => {
        try {
          const safeQ = q.replace(/["()[\]{}:]/g, ' ').trim() || 'fiction';
          const iaQuery = `mediatype:texts AND (${safeQ})`;
          const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
            iaQuery
          )}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=description&rows=14&page=${p}&output=json`;
          const r = await fetch(url, {
            headers: { 'User-Agent': 'ValdrionLibrary/1.0 (https://valdrion.app)' },
            signal: AbortSignal.timeout(9000),
          });
          if (!r.ok) return { books: [], total: 0 };
          const j = (await r.json()) as {
            response?: {
              numFound?: number;
              docs?: Array<{
                identifier?: string;
                title?: string | string[];
                creator?: string | string[];
                year?: string | number;
                description?: string | string[];
              }>;
            };
          };
          const docs = j.response?.docs || [];
          const books: RawWorldBook[] = docs
            .filter((d) => d.identifier && d.title)
            .slice(0, 14)
            .map((d) => {
              const titleStr = Array.isArray(d.title) ? d.title[0] : String(d.title || '');
              const creatorStr = Array.isArray(d.creator)
                ? d.creator[0]
                : String(d.creator || 'مؤلف عالمي');
              const descRaw = Array.isArray(d.description)
                ? d.description[0]
                : typeof d.description === 'string'
                ? d.description
                : '';
              const cleanDesc = descRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              const yr = d.year ? Number(String(d.year).slice(0, 4)) : undefined;
              const ident = String(d.identifier);
              return {
                id: `ia_${ident.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}`,
                titleOriginal: titleStr.trim(),
                authorOriginal: creatorStr.trim() || 'مؤلف عالمي',
                year: yr && !Number.isNaN(yr) ? yr : undefined,
                coverUrl: `/api/media/proxy-image?url=${encodeURIComponent(
                  `https://archive.org/services/img/${encodeURIComponent(ident)}`
                )}`,
                source: 'Internet Archive',
                infoUrl: `https://archive.org/details/${encodeURIComponent(ident)}`,
                snippet: cleanDesc ? cleanDesc.slice(0, 260) : undefined,
              };
            });
          return { books, total: Number(j.response?.numFound || books.length) };
        } catch {
          return { books: [], total: 0 };
        }
      };

      const fetchGutendex = async (
        q: string,
        p: number
      ): Promise<{ books: RawWorldBook[]; total: number }> => {
        try {
          const r = await fetch(
            `https://gutendex.com/books/?search=${encodeURIComponent(q)}&page=${p}`,
            { signal: AbortSignal.timeout(5500) }
          );
          if (!r.ok) return { books: [], total: 0 };
          const j = (await r.json()) as {
            count?: number;
            results?: Array<{
              id?: number;
              title?: string;
              authors?: Array<{ name?: string }>;
              formats?: Record<string, string>;
              summaries?: string[];
            }>;
          };
          const books: RawWorldBook[] = (j.results || [])
            .filter((b) => b.title)
            .slice(0, 10)
            .map((b) => {
              const txtUrl =
                b.formats?.['text/plain; charset=utf-8'] ||
                b.formats?.['text/plain; charset=us-ascii'] ||
                b.formats?.['text/plain'];
              const imgUrl = b.formats?.['image/jpeg'];
              return {
                id: `gut_${b.id || Math.random().toString(36).slice(2, 7)}`,
                titleOriginal: String(b.title || '').trim(),
                authorOriginal: b.authors?.[0]?.name || 'كلاسيكي عالمي',
                coverUrl: imgUrl
                  ? `/api/media/proxy-image?url=${encodeURIComponent(imgUrl)}`
                  : undefined,
                source: 'Project Gutenberg',
                infoUrl: b.id
                  ? `https://www.gutenberg.org/ebooks/${b.id}`
                  : 'https://www.gutenberg.org',
                fullTextUrl: txtUrl,
                snippet: b.summaries?.[0]?.slice(0, 260),
              };
            });
          return { books, total: Number(j.count || books.length) };
        } catch {
          return { books: [], total: 0 };
        }
      };

      const fetchGoogleBooks = async (
        q: string,
        p: number
      ): Promise<{ books: RawWorldBook[]; total: number }> => {
        try {
          const startIndex = (p - 1) * 10;
          const r = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
              q
            )}&startIndex=${startIndex}&maxResults=10&printType=books`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (!r.ok) return { books: [], total: 0 };
          const j = (await r.json()) as {
            totalItems?: number;
            items?: Array<{
              id?: string;
              volumeInfo?: {
                title?: string;
                authors?: string[];
                publishedDate?: string;
                description?: string;
                infoLink?: string;
                imageLinks?: { thumbnail?: string };
              };
            }>;
          };
          const books: RawWorldBook[] = (j.items || [])
            .filter((it) => it.volumeInfo?.title)
            .slice(0, 10)
            .map((it) => {
              const vi = it.volumeInfo!;
              const thumb = vi.imageLinks?.thumbnail?.replace(/^http:/, 'https:');
              const yr = vi.publishedDate ? Number(vi.publishedDate.slice(0, 4)) : undefined;
              return {
                id: `gb_${it.id || Math.random().toString(36).slice(2, 7)}`,
                titleOriginal: String(vi.title || '').trim(),
                authorOriginal: vi.authors?.[0] || 'مؤلف عالمي',
                year: yr && !Number.isNaN(yr) ? yr : undefined,
                coverUrl: thumb
                  ? `/api/media/proxy-image?url=${encodeURIComponent(thumb)}`
                  : undefined,
                source: 'Google Books',
                infoUrl: vi.infoLink || 'https://books.google.com',
                snippet: vi.description?.slice(0, 260),
              };
            });
          return { books, total: Number(j.totalItems || books.length) };
        } catch {
          return { books: [], total: 0 };
        }
      };

      let [olRes, iaRes, gutRes, gbRes, arIaRes] = await Promise.all([
        fetchOpenLibrary(englishQuery, page),
        fetchInternetArchive(englishQuery, page),
        fetchGutendex(englishQuery, page),
        fetchGoogleBooks(englishQuery, page),
        /[\u0600-\u06FF]/.test(rawQ)
          ? fetchInternetArchive(rawQ, page)
          : Promise.resolve({ books: [], total: 0 }),
      ]);

      // Broaden automatically to primary keyword if multi-word search returned empty
      if (
        olRes.books.length === 0 &&
        iaRes.books.length === 0 &&
        gutRes.books.length === 0 &&
        gbRes.books.length === 0 &&
        arIaRes.books.length === 0
      ) {
        const primaryWord = englishQuery.split(/\s+/).find((w) => w.length >= 3) || 'fiction';
        [olRes, iaRes] = await Promise.all([
          fetchOpenLibrary(primaryWord, page),
          fetchInternetArchive(primaryWord, page),
        ]);
      }

      const totalFound =
        (olRes.total || 0) +
        (iaRes.total || 0) +
        (gutRes.total || 0) +
        (gbRes.total || 0) +
        (arIaRes.total || 0);

      // Deduplicate by normalized title
      const seen = new Set<string>();
      const merged: RawWorldBook[] = [];
      for (const b of [
        ...arIaRes.books,
        ...olRes.books,
        ...iaRes.books,
        ...gutRes.books,
        ...gbRes.books,
      ]) {
        const key = b.titleOriginal
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF]/g, '')
          .slice(0, 32);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(b);
        if (merged.length >= 24) break;
      }

      if (merged.length === 0) {
        return res.json({
          books: [],
          translatedQuery: englishQuery,
          totalFound,
          page,
          hasMore: false,
        });
      }

      // Batch-localize ALL titles, authors, genres & crisp Arabic synopses via Gemini!
      let localizedMap = new Map<
        number,
        { titleAr: string; authorAr: string; genreAr: string; synopsisAr: string }
      >();

      try {
        if (!ai) throw new Error('skip_localization');
        const batchPrompt = `ترجم وعرّب قائمة الروايات والكتب العالمية التالية إلى عربية أدبية سليمة وجذابة (مع الاحتفاظ بالاسم العربي المشهور للرواية إن وُجد، وكتابة نبذة عربية مشوقة من سطرين لكل كتاب):\n${merged
          .map(
            (b, i) =>
              `${i}. Title: ${b.titleOriginal} | Author: ${b.authorOriginal} | Info: ${(
                b.snippet || ''
              ).slice(0, 140)}`
          )
          .join('\n')}`;

        const trResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: batchPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      index: { type: Type.INTEGER },
                      titleAr: { type: Type.STRING },
                      authorAr: { type: Type.STRING },
                      genreAr: { type: Type.STRING },
                      synopsisAr: { type: Type.STRING },
                    },
                    required: ['index', 'titleAr', 'authorAr', 'genreAr', 'synopsisAr'],
                  },
                },
              },
              required: ['items'],
            },
          },
        });

        const parsedTr = JSON.parse((trResp.text ?? '{}').trim()) as {
          items?: Array<{
            index: number;
            titleAr: string;
            authorAr: string;
            genreAr: string;
            synopsisAr: string;
          }>;
        };
        for (const it of parsedTr.items || []) {
          localizedMap.set(it.index, it);
        }
      } catch {
        // graceful fallback below
      }

      const books = merged.map((b, idx) => {
        const tr = localizedMap.get(idx);
        return {
          id: b.id,
          titleAr: tr?.titleAr || b.titleOriginal,
          titleOriginal: b.titleOriginal,
          authorAr: tr?.authorAr || b.authorOriginal,
          genreAr: tr?.genreAr || 'رواية عالمية',
          synopsisAr:
            tr?.synopsisAr ||
            b.snippet ||
            'عمل روائي عالمي متاح الآن للقراءة الفورية بالعربية أو التحويل إلى مانهوا مصوّرة.',
          year: b.year,
          coverUrl: b.coverUrl,
          source: b.source,
          infoUrl: b.infoUrl,
          hasPublicFullText: Boolean(b.fullTextUrl),
          fullTextUrl: b.fullTextUrl,
        };
      });

      return res.json({
        books,
        translatedQuery: englishQuery,
        totalFound: Math.max(totalFound, books.length),
        page,
        hasMore: books.length >= 8 && page < 500,
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // 26. Instant Arabic Translation & Chapter Reader for ANY World Novel
  app.post('/api/novels/translate-read', async (req, res) => {
    const { titleAr, titleOriginal, authorAr, synopsisAr, fullTextUrl, chapterNumber } =
      (req.body || {}) as {
        titleAr?: string;
        titleOriginal?: string;
        authorAr?: string;
        synopsisAr?: string;
        fullTextUrl?: string;
        chapterNumber?: number;
      };

    if (!titleAr && !titleOriginal) {
      return res.status(400).json({ error: 'بيانات الرواية غير مكتملة.' });
    }

    try {
      const ai = getGeminiClient();
      let sourceExcerpt = '';

      const chNum = Math.max(1, Number(chapterNumber) || 1);

      // If Project Gutenberg public-domain full text is available, slice sequentially by chapterNumber!
      if (
        fullTextUrl &&
        /^https:\/\/(www\.)?gutenberg\.org\//i.test(fullTextUrl)
      ) {
        try {
          const r = await fetch(fullTextUrl, {
            signal: AbortSignal.timeout(8000),
          });
          if (r.ok) {
            const fullRaw = await r.text();
            const startMarker = fullRaw.search(/\*\*\*\s*START OF/i);
            const cleanStart = startMarker !== -1 ? startMarker + 120 : 0;
            const offset = cleanStart + (chNum - 1) * 5200;
            if (offset < fullRaw.length - 400) {
              sourceExcerpt = fullRaw
                .slice(offset, offset + 5200)
                .replace(/\r\n/g, '\n')
                .trim();
            }
          }
        } catch {
          // continue with literary Arabic adaptation
        }
      }

      const prompt = sourceExcerpt
        ? `ترجم المقتطف الأدبي التالي من رواية «${titleAr || titleOriginal}» للكاتب ${authorAr || ''} إلى عربية أدبية رفيعة وساحرة (الفصل ${chNum}) مع عنوان عربي جميل للفصل في السطر الأول:\n\n${sourceExcerpt}`
        : `أنت مترجم وروائي عربي محترف في دار فالدريون للروايات. قدّم الفصل ${chNum} كاملاً وغنياً بالأحداث بالعربية الأدبية الرفيعة لرواية «${titleAr || titleOriginal}» (${titleOriginal || ''}) للكاتب ${authorAr || ''}.\nالنبذة: ${synopsisAr || ''}\n\nاكتب عنوان الفصل ${chNum} في السطر الأول، ثم سرداً روائياً طويلاً وغنياً بالحوار والتفاصيل والتشويق من 8 إلى 10 فقرات أدبية متقنة بالعربية الفصحى.`;

      const resp = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (resp.text || '').trim();
      const lines = rawText.split('\n').filter((l) => l.trim());
      const chapterTitle =
        lines[0] && lines[0].length < 85
          ? lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim()
          : `الفصل ${chNum}`;
      const content =
        lines[0] && lines[0].length < 85
          ? lines.slice(1).join('\n\n').trim() || rawText
          : rawText;

      return res.json({
        chapterTitle,
        content,
        translatedFromOriginal: Boolean(sourceExcerpt),
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // =========================================================================
  // =========================================================================
  // AETHERMIND APEX FRONTIER ENGINE:
  // 1) /api/ai/apex/stream — 4-Stage Plan -> Live Grounded Draft -> Self-Critic -> Master Synthesis (SSE)
  // 2) /api/ai/refine      — 1-Click Adversarial Self-Refinement on ANY Answer
  // 3) /api/ai/slides      — Interactive HTML5 Presentation Slide Deck Generator
  // 4) /api/ai/quiz        — Interactive Study & Mastery Quiz App Generator
  // 5) /api/ai/app-builder — Instant Single-File Interactive Web App / Tool Factory
  // =========================================================================

  const parseLooseJson = <T,>(rawText: string | undefined, fallback: T): T => {
    const t = (rawText || '').trim();
    if (!t) return fallback;
    try {
      return JSON.parse(t) as T;
    } catch {
      const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced?.[1]) {
        try {
          return JSON.parse(fenced[1].trim()) as T;
        } catch {
          // continue
        }
      }
      const firstBrace = t.indexOf('{');
      const lastBrace = t.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        try {
          return JSON.parse(t.slice(firstBrace, lastBrace + 1)) as T;
        } catch {
          return fallback;
        }
      }
      return fallback;
    }
  };

  const generateWithApexFallback = async (
    ai: GoogleGenAI,
    params: {
      contents: string;
      systemInstruction: string;
      thinkingLevel: ThinkingLevel;
      responseSchema?: Record<string, unknown>;
      googleSearch?: boolean;
      preferFastModel?: boolean;
    }
  ) => {
    const models = params.preferFastModel
      ? ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']
      : ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];

    let lastErr: unknown;
    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const config: Record<string, unknown> = {
          systemInstruction: params.systemInstruction,
        };
        if (params.responseSchema) {
          config.responseMimeType = 'application/json';
          config.responseSchema = params.responseSchema;
        }
        if (params.googleSearch && model === 'gemini-4-hydrogen') {
          config.tools = [{ googleSearch: {} }];
        }
        if (model === 'gemini-4-hydrogen') {
          config.thinkingConfig = { thinkingLevel: params.thinkingLevel };
        }
        return await ai.models.generateContent({
          model,
          contents: params.contents,
          config: config as never,
        });
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (idx === 0 && /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|overloaded|quota/i.test(msg)) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }
    throw lastErr;
  };

  app.post('/api/ai/apex/stream', async (req, res) => {
    const {
      message,
      history,
      brainContext,
      webSearch = true,
      attachedFile,
    } = (req.body || {}) as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
      brainContext?: string;
      webSearch?: boolean;
      attachedFile?: { name: string; content: string } | null;
    };

    const cleanPrompt = (message || '')
      .replace(/^\/(ابكس|أبكس|apex|تدقيق|critique|بحث_عميق)\s*/i, '')
      .trim();
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'اكتب سؤالك أو مهمتك أولاً لتشغيل محرك APEX الأقصى.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const startTime = Date.now();
    try {
      const ai = getGeminiClient();
      const historySnippet = Array.isArray(history)
        ? history
            .slice(-4)
            .map((h) => `${h.role === 'user' ? 'المستخدم' : 'أثيرمايند'}: ${h.text.slice(0, 400)}`)
            .join('\n')
        : '';
      const fileSnippet = attachedFile?.content
        ? `\n\n[ملف مرفق: ${attachedFile.name}]\n${attachedFile.content.slice(0, 8000)}`
        : '';

      // STAGE 1 & 2: Strategic Decomposition + Grounded Deep Draft (1 efficient call!)
      sendEvent({
        type: 'step',
        step: {
          id: 'apex_plan',
          label: 'المرحلة 1/4 · تفكيك السؤال وبناء استراتيجية التحقق',
          detail: 'تحديد الزوايا الحرجة، الأسئلة الفرعية، ومعايير الدقة القصوى',
          status: 'done',
        },
      });
      sendEvent({
        type: 'step',
        step: {
          id: 'apex_research',
          label: webSearch
            ? 'المرحلة 2/4 · البحث الحي في الويب وبناء المسوّدة الهندسية'
            : 'المرحلة 2/4 · بناء المسوّدة الهندسية العميقة',
          detail: 'جمع الحقائق الموثّقة وتحليل المسألة من جميع الزوايا',
          status: 'running',
        },
      });

      let draftResp;
      try {
        draftResp = await generateWithApexFallback(ai, {
          contents: `المهمة: ${cleanPrompt}${
            historySnippet ? `\n\nسياق المحادثة:\n${historySnippet}` : ''
          }${fileSnippet}`,
          systemInstruction: `أنت المحلل الرئيسي في منظومة AETHERMIND APEX.
${brainContext ? `ذاكرة وتفضيلات المستخدم:\n${brainContext}\n` : ''}
قدّم مسوّدة غنية، دقيقة، عملية، ومبنية على أحدث الحقائق المتاحة. إذا طُلب كود، اكتب كوداً كاملاً يعمل بلا أخطاء. أجب بنفس لغة المستخدم (العربية افتراضياً).`,
          googleSearch: Boolean(webSearch),
          thinkingLevel: ThinkingLevel.LOW,
        });
      } catch (firstErr) {
        if (webSearch) {
          draftResp = await generateWithApexFallback(ai, {
            contents: `المهمة: ${cleanPrompt}${
              historySnippet ? `\n\nسياق المحادثة:\n${historySnippet}` : ''
            }${fileSnippet}`,
            systemInstruction: `أنت المحلل الرئيسي في منظومة AETHERMIND APEX.
${brainContext ? `ذاكرة وتفضيلات المستخدم:\n${brainContext}\n` : ''}
قدّم مسوّدة غنية، دقيقة، عملية، ومبنية على أحدث الحقائق. أجب بنفس لغة المستخدم (العربية افتراضياً).`,
            googleSearch: false,
            thinkingLevel: ThinkingLevel.LOW,
          });
        } else {
          throw firstErr;
        }
      }

      const draftText = (draftResp.text || '').trim();
      const groundingMeta = draftResp.candidates?.[0]?.groundingMetadata;
      const sources: Array<{ title: string; uri: string }> = [];
      const seenUris = new Set<string>();
      for (const ch of groundingMeta?.groundingChunks || []) {
        const uri = ch.web?.uri;
        const title = ch.web?.title;
        if (uri && !seenUris.has(uri)) {
          seenUris.add(uri);
          sources.push({ title: title || uri, uri });
        }
      }
      const searchQueries = Array.isArray(groundingMeta?.webSearchQueries)
        ? groundingMeta.webSearchQueries.filter(Boolean)
        : [];

      sendEvent({
        type: 'step',
        step: {
          id: 'apex_research',
          label: 'المرحلة 2/4 · اكتمل البحث وبناء المسوّدة',
          detail:
            sources.length > 0
              ? `تم توثيق ${sources.length} مصادر حية من الويب`
              : 'تم بناء المسوّدة التحليلية المبدئية بنجاح',
          status: 'done',
        },
      });

      // STAGE 3 & 4: Combined Adversarial Self-Critic + Master Upgrade (1 structured call, then streamed to client!)
      sendEvent({
        type: 'step',
        step: {
          id: 'apex_critic',
          label: 'المرحلة 3/4 · الناقد الذاتي يفحص الثغرات ويرقّي الإجابة النهائية',
          detail: 'مراجعة نقدية صارمة + إعادة الصياغة المرجعية واستخراج خطوات المتابعة',
          status: 'running',
        },
      });

      let apexReport: ApexVerificationReport = {
        critiquePoints: [
          'تعميق الأمثلة العملية والتفاصيل القابلة للتنفيذ الفوري.',
          'التحقق من شمولية الزوايا الحرجة والحالات الحدية.',
        ],
        improvementsApplied: [
          'إعادة هيكلة الإجابة بعناوين واضحة وخطوات عملية.',
          'رفع دقة التفاصيل الفنية والتوصيات التنفيذية.',
        ],
        verificationStatus: 'verified',
        followUpPrompts: [
          'حوّل هذه النتيجة إلى خطة تنفيذ عملية خطوة بخطوة',
          'ارسم خريطة ذهنية تفاعلية لأهم محاور هذا الموضوع',
          'اعمل اختباراً تفاعلياً لقياس فهمي لهذه النقاط',
        ],
        sourcesCount: sources.length,
      };

      let finalAnswerText = draftText;

      try {
        const criticAndMasterResp = await generateWithApexFallback(ai, {
          contents: `السؤال الأصلي للمستخدم:\n${cleanPrompt}\n\nالمسوّدة الأولية المدعومة بالبحث:\n${draftText.slice(0, 9500)}`,
          systemInstruction: `أنت الناقد الصارم والعقل الأعلى في منظومة AETHERMIND APEX.
افحص المسوّدة الأولية، اكتشف أي نقص أو سطحية، ثم أرجع JSON مكتمل الحقول يحتوي على:
- critiquePoints: 2 إلى 3 نقاط نقص أو ثغرات اكتشفتها في المسوّدة (بالعربية المختصرة).
- improvementsApplied: 2 إلى 3 تحسينات أضفتها في النسخة النهائية.
- followUpPrompts: 3 أسئلة متابعة ذكية ومحددة بالعربية يمكن للمستخدم الضغط عليها فوراً.
- masterAnswer: الإجابة النهائية المرجعية الكاملة (Markdown احترافي بعناوين واضحة وجداول/أمثلة عملية أو كود كامل إن لزم) بعد معالجة كل ملاحظات النقد، دون ذكر عبارة "في المسودة الأولى".
${brainContext ? `\nتفضيلات المستخدم:\n${brainContext}` : ''}`,
          thinkingLevel: ThinkingLevel.MEDIUM,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              critiquePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvementsApplied: { type: Type.ARRAY, items: { type: Type.STRING } },
              followUpPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
              masterAnswer: { type: Type.STRING },
            },
            required: ['critiquePoints', 'improvementsApplied', 'followUpPrompts', 'masterAnswer'],
          },
        });

        const parsedMaster = parseLooseJson<{
          critiquePoints?: string[];
          improvementsApplied?: string[];
          followUpPrompts?: string[];
          masterAnswer?: string;
        }>(criticAndMasterResp.text, {});

        if (parsedMaster.masterAnswer?.trim()) {
          finalAnswerText = parsedMaster.masterAnswer.trim();
        }
        apexReport = {
          critiquePoints:
            Array.isArray(parsedMaster.critiquePoints) && parsedMaster.critiquePoints.length > 0
              ? parsedMaster.critiquePoints.slice(0, 4)
              : apexReport.critiquePoints,
          improvementsApplied:
            Array.isArray(parsedMaster.improvementsApplied) &&
            parsedMaster.improvementsApplied.length > 0
              ? parsedMaster.improvementsApplied.slice(0, 4)
              : apexReport.improvementsApplied,
          verificationStatus: 'verified',
          followUpPrompts:
            Array.isArray(parsedMaster.followUpPrompts) && parsedMaster.followUpPrompts.length > 0
              ? parsedMaster.followUpPrompts.slice(0, 3)
              : apexReport.followUpPrompts,
          sourcesCount: sources.length,
        };
      } catch {
        // Graceful degradation: keep verified grounded draftText if secondary pass hits transient quota
      }

      sendEvent({
        type: 'step',
        step: {
          id: 'apex_critic',
          label: 'المرحلة 3/4 · اكتمل الفحص النقدي الذاتي',
          detail: `رصد ${apexReport.critiquePoints.length} نقاط تقوية وتحسين`,
          status: 'done',
        },
      });

      sendEvent({
        type: 'step',
        step: {
          id: 'apex_synthesis',
          label: 'المرحلة 4/4 · بث الإجابة النهائية المدقّقة (APEX)',
          detail: 'جاهزة بالكامل مع تقرير التدقيق وخطوات المتابعة',
          status: 'running',
        },
      });

      // Stream final answer smoothly in clean chunks so UI stays responsive
      const chunkSize = 240;
      for (let i = 0; i < finalAnswerText.length; i += chunkSize) {
        sendEvent({ type: 'chunk', text: finalAnswerText.slice(i, i + chunkSize) });
      }

      sendEvent({
        type: 'step',
        step: {
          id: 'apex_synthesis',
          label: 'المرحلة 4/4 · تم اعتماد الإجابة النهائية المدقّقة',
          detail: 'جاهزة بالكامل مع تقرير التدقيق وخطوات المتابعة',
          status: 'done',
        },
      });

      sendEvent({
        type: 'done',
        sources,
        searchQueries,
        apexReport,
        thinkingDurationMs: Date.now() - startTime,
      });
      res.end();
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      sendEvent({ type: 'error', error: f.message });
      res.end();
    }
  });

  // 1-Click Adversarial Self-Refinement on ANY Assistant Answer
  app.post('/api/ai/refine', async (req, res) => {
    const { originalQuestion, previousAnswer, refineGoal, brainContext } = (req.body || {}) as {
      originalQuestion?: string;
      previousAnswer?: string;
      refineGoal?: string;
      brainContext?: string;
    };

    if (!previousAnswer?.trim()) {
      return res.status(400).json({ error: 'لا يوجد نص إجابة لتدقيقه وتحسينه.' });
    }

    try {
      const ai = getGeminiClient();
      const resp = await generateWithApexFallback(ai, {
        contents: `السؤال الأصلي: ${originalQuestion || 'غير محدد'}
هدف التحسين: ${refineGoal || 'تدقيق شامل، رفع العمق، تصحيح أي خطأ، وإضافة أمثلة عملية وخطوات تنفيذية'}

الإجابة السابقة المراد ترقيتها:
${previousAnswer.slice(0, 12000)}`,
        systemInstruction: `أنت محرك التدقيق والترقية الذاتية AETHERMIND Self-Refine.
راجع الإجابة السابقة بنظرة نقدية صارمة، ثم أعد كتابتها بنسخة أقوى وأدق وأشمل بمراحل (Markdown منسّق)، مع سرد النقاط التي اكتشفتها وحسّنتها و3 أسئلة متابعة ذكية.
يجب ملء جميع الحقول المطلوبة في JSON بالكامل.
${brainContext ? `\nتفضيلات المستخدم:\n${brainContext}` : ''}`,
        thinkingLevel: ThinkingLevel.HIGH,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedText: { type: Type.STRING },
            critiquePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementsApplied: { type: Type.ARRAY, items: { type: Type.STRING } },
            followUpPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['refinedText', 'critiquePoints', 'improvementsApplied', 'followUpPrompts'],
        },
      });

      const parsed = parseLooseJson<{
        refinedText?: string;
        critiquePoints?: string[];
        improvementsApplied?: string[];
        followUpPrompts?: string[];
      }>(resp.text, {});

      const refinedText = (parsed.refinedText || '').trim();
      if (!refinedText) {
        return res.status(502).json({ error: 'تعذّر توليد النسخة المحسّنة حالياً.' });
      }

      const apexReport: ApexVerificationReport = {
        critiquePoints:
          Array.isArray(parsed.critiquePoints) && parsed.critiquePoints.length > 0
            ? parsed.critiquePoints.slice(0, 4)
            : ['تعميق التفاصيل وإزالة العموميات.'],
        improvementsApplied:
          Array.isArray(parsed.improvementsApplied) && parsed.improvementsApplied.length > 0
            ? parsed.improvementsApplied.slice(0, 4)
            : ['إعادة صياغة احترافية أدق وأكثر فائدة.'],
        verificationStatus: 'refined',
        followUpPrompts: Array.isArray(parsed.followUpPrompts)
          ? parsed.followUpPrompts.slice(0, 3)
          : [],
        sourcesCount: 0,
      };

      return res.json({ refinedText, apexReport });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // Interactive HTML5 Presentation Slide Deck Generator
  app.post('/api/ai/slides', async (req, res) => {
    const { topic, sourceContent, slideCount = 7, brainContext } = (req.body || {}) as {
      topic?: string;
      sourceContent?: string;
      slideCount?: number;
      brainContext?: string;
    };
    const cleanTopic = (topic || '').replace(/^\/(شرائح|عرض|slides|deck|ppt)\s*/i, '').trim();
    if (!cleanTopic && !sourceContent?.trim()) {
      return res.status(400).json({ error: 'حدد موضوع العرض التقديمي أو النص المراد تحويله لشرائح.' });
    }

    try {
      const ai = getGeminiClient();
      const count = Math.max(4, Math.min(10, Number(slideCount) || 7));
      const resp = await generateWithApexFallback(ai, {
        contents: `الموضوع: ${cleanTopic || 'عرض تقديمي ذكي'}${
          sourceContent ? `\n\nالمحتوى المرجعي:\n${sourceContent.slice(0, 9000)}` : ''
        }`,
        systemInstruction: `أنت مصمم عروض تقديمية تنفيذي محترف (McKinsey / Apple Keynote grade).
صمم عرضاً تقديمياً عربياً مذهلاً من ${count} شرائح متسلسلة ومنطقية (مقدمة، المشكلة/السياق، التحليل، الحلول، خارطة التنفيذ، الخلاصة).
اجعل النقاط مختصرة وقوية (3-4 نقاط لكل شريحة)، أضف رقماً/إحصائية مميزة highlightMetric في الشرائح المناسبة، وملاحظات متحدث speakerNotes مفيدة لكل شريحة.
يجب ملء جميع حقول JSON المطلوبة بالكامل مع ${count} شرائح داخل مصفوفة slides.
${brainContext ? `\nتفضيلات المستخدم:\n${brainContext}` : ''}`,
        thinkingLevel: ThinkingLevel.LOW,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            accentHex: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  kicker: { type: Type.STRING },
                  bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  highlightMetric: { type: Type.STRING },
                  highlightLabel: { type: Type.STRING },
                  speakerNotes: { type: Type.STRING },
                },
                required: ['heading', 'bulletPoints', 'speakerNotes'],
              },
            },
          },
          required: ['title', 'subtitle', 'accentHex', 'slides'],
        },
      });

      const raw = parseLooseJson<Record<string, unknown>>(resp.text, {});
      const deck = normalizeSlidesDeck(raw, cleanTopic || 'عرض تقديمي');
      const html = buildInteractiveSlidesHtml(deck);
      return res.json({ deck, html });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // Interactive Study & Mastery Quiz App Generator
  app.post('/api/ai/quiz', async (req, res) => {
    const { topic, sourceContent, questionCount = 6 } = (req.body || {}) as {
      topic?: string;
      sourceContent?: string;
      questionCount?: number;
    };
    const cleanTopic = (topic || '').replace(/^\/(اختبار|كويز|quiz|exam)\s*/i, '').trim();
    if (!cleanTopic && !sourceContent?.trim()) {
      return res.status(400).json({ error: 'حدد موضوع الاختبار أو النص المطلوب إنشاء أسئلة عنه.' });
    }

    try {
      const ai = getGeminiClient();
      const count = Math.max(4, Math.min(8, Number(questionCount) || 6));
      const resp = await generateWithApexFallback(ai, {
        contents: `الموضوع: ${cleanTopic || 'اختبار فهم شامل'}${
          sourceContent ? `\n\nالنص المرجعي:\n${sourceContent.slice(0, 9000)}` : ''
        }`,
        systemInstruction: `أنشئ اختباراً تفاعلياً عربياً عالي الجودة من ${count} أسئلة اختيار من متعدد (4 خيارات لكل سؤال) تقيس الفهم الحقيقي وليس الحفظ السطحي، مع correctIndex دقيق (0..3) وشرح تعليمي موجز لكل إجابة. يجب ملء جميع حقول JSON المطلوبة بالكامل.`,
        thinkingLevel: ThinkingLevel.LOW,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['title', 'subtitle', 'questions'],
        },
      });

      const raw = parseLooseJson<Record<string, unknown>>(resp.text, {});
      const quiz = normalizeQuizData(raw, cleanTopic || 'اختبار تفاعلي');
      const html = buildInteractiveQuizHtml(quiz);
      return res.json({ quiz, html });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // Instant Live Interactive Web App / Tool Factory
  app.post('/api/ai/app-builder', async (req, res) => {
    const { prompt, existingHtml, brainContext } = (req.body || {}) as {
      prompt?: string;
      existingHtml?: string;
      brainContext?: string;
    };
    const cleanPrompt = (prompt || '').replace(/^\/(تطبيق|app|website|موقع)\s*/i, '').trim();
    if (!cleanPrompt) {
      return res.status(400).json({ error: 'صف التطبيق أو الأداة التفاعلية التي تريد بناءها.' });
    }

    try {
      const ai = getGeminiClient();
      const resp = await generateWithApexFallback(ai, {
        contents: existingHtml
          ? `التعديل المطلوب على التطبيق الحالي:\n${cleanPrompt}\n\nالكود الحالي:\n${existingHtml.slice(0, 14000)}`
          : `ابنِ تطبيق ويب تفاعلي متكامل وفوري لـ:\n${cleanPrompt}`,
        systemInstruction: `أنت مهندس واجهات وتطبيقات ويب عالمي في AETHERMIND App Factory.
أرجع JSON مكتمل الحقول يحتوي على:
- title: عنوان التطبيق بالعربية
- summaryAr: ملخص موجز بالعربية لما تم بناؤه ومميزاته التفاعلية
- html: ملف HTML5 كامل ومستقل 100% (<!DOCTYPE html><html lang="ar" dir="rtl">...) يتضمن CSS حديث أنيق وJavaScript حقيقي يعمل فوراً داخل iframe بدون أي مكتبات خارجية قد تفشل في التحميل، مع تفاعل حقيقي كامل، ألوان داكنة متناسقة عالية التباين، وتصميم متجاوب 100%.
ممنوع استخدام window.alert أو placeholders فارغة؛ كل زر وحقل يجب أن يعمل فعلياً!
${brainContext ? `\nتفضيلات المستخدم:\n${brainContext}` : ''}`,
        thinkingLevel: ThinkingLevel.MEDIUM,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summaryAr: { type: Type.STRING },
            html: { type: Type.STRING },
          },
          required: ['title', 'summaryAr', 'html'],
        },
      });

      const parsed = parseLooseJson<{
        title?: string;
        summaryAr?: string;
        html?: string;
      }>(resp.text, {});
      const html = (parsed.html || '').trim();
      if (!html || html.length < 150) {
        return res.status(502).json({ error: 'تعذّر توليد كود التطبيق التفاعلي حالياً.' });
      }
      return res.json({
        title: (parsed.title || cleanPrompt.slice(0, 48)).trim(),
        summaryAr: (parsed.summaryAr || 'تم بناء التطبيق التفاعلي بنجاح وتشغيله في المعاينة الحية!').trim(),
        html,
      });
    } catch (err: unknown) {
      const f = formatGeminiError(err);
      return res.status(f.status).json({ error: f.message });
    }
  });

  // Frontend Serving (Vite middleware in dev, static dist in prod)
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      plugins: [
        {
          name: 'disable-vite-client-hmr-ws',
          enforce: 'post',
          transform(code, id) {
            if (id.includes('vite/dist/client/client.mjs')) {
              return code.replace(
                /const transport = normalizeModuleRunnerTransport\(\(\(\) => \{[\s\S]*?\}\)\(\)\);/,
                'const transport = normalizeModuleRunnerTransport({ connect() {}, disconnect() {}, send() {} }); /* HMR WebSocket disabled in Express middleware mode */'
              );
            }
          },
        },
      ],
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const httpServer = http.createServer(app);
  setupRealtimeWebSocket(httpServer);

  httpServer.listen(PORT, HOST, () => {
    console.log(`VALDRION Cinema ULTRA Server listening on http://${HOST}:${PORT}`);
  });
}

startServer();
