import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Copy,
  Download,
  Eye,
  EyeOff,
  FastForward,
  Grid2x2,
  Languages,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  Moon,
  Pause,
  PictureInPicture2,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  Shield,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Subtitles,
  Trash2,
  Upload,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  MediaFilterConfig,
  MediaItem,
  PictureCalibration,
  PlayerMediaRequest,
  SceneCueAction,
  ShieldLens,
  SubtitleCue,
  SubtitleStyle,
  WatchPartyChatMessage,
  WatchProgressEntry,
} from '../types/cinema';
import {
  buildVideoFilterCss,
  createDefaultFilterConfig,
  evaluateSceneFilterState,
  formatTimecode,
  parseFilterConfigJson,
} from '../utils/cinemaLogic';
import {
  SAMPLE_DEMO_SRT,
  generateRoomCode,
  getActiveSubtitleCue,
  isValidRoomCode,
  normalizeRoomCode,
  parseSubtitleFile,
  serializeToSrt,
} from '../utils/cinemaProUtils';
import {
  buildProxiedStreamUrl,
  buildTranscodedStreamUrl,
  searchAcrossAllServers,
  translateSubtitlesWithAI,
} from '../services/xtreamApi';
import {
  cleanMediaSearchTitle,
  formatCrossServerAnnouncement,
  type CrossServerMatch,
} from '../utils/crossServerSearch';
import type { ServerProfile } from '../types/cinema';
import { realtimeClient } from '../services/realtimeClient';

export interface ActiveWatchPartyRequest {
  roomCode: string;
  userName: string;
  mode: 'create' | 'join';
}

export interface RemotePlayerActionEvent {
  nonce: number;
  action: 'play_pause' | 'seek_forward' | 'seek_back' | 'mute' | 'panic' | 'close';
}

interface ProVideoPlayerProps {
  media: PlayerMediaRequest | null;
  liveChannels?: MediaItem[];
  allServers?: ServerProfile[];
  activeServerId?: string;
  initialFilter: MediaFilterConfig | undefined;
  savedProgress?: WatchProgressEntry;
  defaultUserName?: string;
  initialWatchParty?: ActiveWatchPartyRequest | null;
  remotePlayerAction?: RemotePlayerActionEvent | null;
  onWatchPartyCodeChange?: (roomCode: string | null) => void;
  onSaveProgress: (mediaId: string, parentId: string | undefined, t: number, d: number) => void;
  onSaveFilter: (mediaId: string, config: MediaFilterConfig) => void;
  onSwitchMedia: (next: PlayerMediaRequest) => void;
  onOpenAlternateMatch?: (match: CrossServerMatch) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

const CUE_ACTION_LABELS: Record<SceneCueAction, string> = {
  skip: 'تخطي تلقائي للمشهد',
  blur_mute: 'تغبيش كامل + كتم الصوت',
  black_mute: 'تسويد كامل + كتم الصوت',
  lenses_only: 'تفعيل العدسات الجزئية فقط',
};

const DEFAULT_CALIBRATION: PictureCalibration = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
};

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSizePx: 22,
  color: '#FFFFFF',
  bgOpacity: 0.72,
  offsetSec: 0,
};

const REACTION_EMOJIS = ['🔥', '❤️', '😂', '👏', '😱'];

type AspectMode = 'contain' | 'cover' | 'fill';
type ActiveDrawer = 'none' | 'filter' | 'playlist' | 'calibration' | 'subtitles' | 'party';
type MultiViewCount = 1 | 2 | 4;

/** Reusable Live Pane for Multi-View Screens B, C, D */
function SecondaryLivePane({
  label,
  channel,
  allChannels,
  isAudioFocused,
  muted,
  volume,
  videoFilterCss,
  onSelectChannel,
  onFocusAudio,
}: {
  label: string;
  channel: MediaItem;
  allChannels: MediaItem[];
  isAudioFocused: boolean;
  muted: boolean;
  volume: number;
  videoFilterCss: string;
  onSelectChannel: (channelId: string) => void;
  onFocusAudio: () => void;
}) {
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const vid = vidRef.current;
    if (!vid || !channel.url) return undefined;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = buildProxiedStreamUrl(channel.url);
    if (/\.m3u8/i.test(channel.url) && Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        vid.play().catch(() => {});
      });
    } else {
      vid.src = url;
      vid.play().catch(() => {});
    }

    return () => {
      vid.pause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.id, channel.url]);

  useEffect(() => {
    if (vidRef.current) {
      vidRef.current.muted = muted;
      vidRef.current.volume = volume;
    }
  }, [muted, volume]);

  return (
    <div
      data-testid={`multiview-pane-${label}`}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-black ${
        isAudioFocused ? 'border-2 border-[#D4AF37]' : 'border border-white/10'
      }`}
    >
      <div className="absolute inset-x-2.5 top-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5">
        <select
          value={channel.id}
          onChange={(e) => onSelectChannel(e.target.value)}
          aria-label={`اختيار قناة الشاشة ${label}`}
          className="max-w-[180px] rounded-md border border-white/15 bg-black/85 px-2 py-1 text-[11px] font-bold text-[#F4F3EF] backdrop-blur-md focus:border-[#D4AF37]"
        >
          {allChannels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              الشاشة {label} · {ch.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onFocusAudio}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-extrabold transition-colors ${
            isAudioFocused
              ? 'bg-[#D4AF37] text-[#060608]'
              : 'border border-white/15 bg-black/75 text-[#D6D5CE] hover:border-[#D4AF37]'
          }`}
        >
          <Volume2 className="h-3 w-3" aria-hidden="true" />
          <span>{isAudioFocused ? 'الصوت نشط' : 'صوت'}</span>
        </button>
      </div>

      <video
        ref={vidRef}
        poster={channel.poster}
        playsInline
        muted={muted}
        style={{ filter: videoFilterCss }}
        className="h-full w-full bg-black object-contain"
      />
    </div>
  );
}

export function ProVideoPlayer({
  media,
  liveChannels = [],
  allServers = [],
  activeServerId,
  initialFilter,
  savedProgress,
  defaultUserName = 'مشاهد فالدريون',
  initialWatchParty,
  remotePlayerAction,
  onWatchPartyCodeChange,
  onSaveProgress,
  onSaveFilter,
  onSwitchMedia,
  onOpenAlternateMatch,
  onClose,
  onToast,
}: ProVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const lensLayerRef = useRef<HTMLDivElement | null>(null);
  const subFileInputRef = useRef<HTMLInputElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<mpegts.Player | null>(null);
  const lastSkippedRef = useRef<string | null>(null);
  const isRemoteSyncRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [userMuted, setUserMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [aspectMode, setAspectMode] = useState<AspectMode>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [playerEngineMode, setPlayerEngineMode] = useState<
    'auto' | 'ffmpeg_remux' | 'ffmpeg_full' | 'hls_proxy' | 'mpegts_proxy' | 'native_proxy' | 'direct'
  >('auto');
  const [activeEngineLabel, setActiveEngineLabel] = useState<string>('تلقائي ذكي');
  const [streamRetryNonce, setStreamRetryNonce] = useState(0);
  const [altServerMatches, setAltServerMatches] = useState<CrossServerMatch[]>([]);
  const [scanningAltServers, setScanningAltServers] = useState(false);

  // Drawers & Pro Features State
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>('none');
  const [panicActive, setPanicActive] = useState(false);
  const [pendingStartSec, setPendingStartSec] = useState<number | null>(null);
  const [selectedCueAction, setSelectedCueAction] = useState<SceneCueAction>('skip');
  const [importTextOpen, setImportTextOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Skip Intro & Auto-Next Episode Countdown
  const [introSkipped, setIntroSkipped] = useState(false);
  const [autoNextCancelled, setAutoNextCancelled] = useState(false);

  // Cinema Picture Calibration & Sleep Timer
  const [calibration, setCalibration] = useState<PictureCalibration>(DEFAULT_CALIBRATION);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number | null>(null);

  // Quad Multi-View (1, 2, or 4 Live Screens)
  const [multiViewCount, setMultiViewCount] = useState<MultiViewCount>(1);
  const [extraChannelIds, setExtraChannelIds] = useState<[string, string, string]>(['', '', '']);
  const [audioFocusIdx, setAudioFocusIdx] = useState<0 | 1 | 2 | 3>(0);

  // Smart Subtitles Studio
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleFileName, setSubtitleFileName] = useState<string | null>(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [translatingSubs, setTranslatingSubs] = useState(false);

  // Watch Party Realtime Room State
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [partyIsHost, setPartyIsHost] = useState(false);
  const [partyHostName, setPartyHostName] = useState('');
  const [partyParticipants, setPartyParticipants] = useState<string[]>([]);
  const [partyMessages, setPartyMessages] = useState<WatchPartyChatMessage[]>([]);
  const [partyChatInput, setPartyChatInput] = useState('');
  const [partyJoinInput, setPartyJoinInput] = useState('');
  const [partyUserName, setPartyUserName] = useState(defaultUserName);
  const [floatingReactions, setFloatingReactions] = useState<
    Array<{ id: string; emoji: string; sender: string; leftPct: number }>
  >([]);

  const [filterConfig, setFilterConfig] = useState<MediaFilterConfig>(
    () => initialFilter ?? createDefaultFilterConfig()
  );
  const filterConfigRef = useRef<MediaFilterConfig>(filterConfig);
  filterConfigRef.current = filterConfig;

  const mediaRef = useRef<PlayerMediaRequest | null>(media);
  mediaRef.current = media;

  const playableLiveChannels = useMemo(
    () => liveChannels.filter((ch) => Boolean(ch.url)),
    [liveChannels]
  );

  const extraChannels = useMemo(() => {
    if (!playableLiveChannels.length) return [null, null, null] as Array<MediaItem | null>;
    const used = new Set<string>(media?.id ? [media.id] : []);
    return extraChannelIds.map((explicitId, idx) => {
      const explicit = explicitId
        ? playableLiveChannels.find((c) => c.id === explicitId)
        : undefined;
      if (explicit) {
        used.add(explicit.id);
        return explicit;
      }
      const next =
        playableLiveChannels.find((c) => !used.has(c.id)) ||
        playableLiveChannels[idx % playableLiveChannels.length] ||
        null;
      if (next) used.add(next.id);
      return next;
    });
  }, [playableLiveChannels, extraChannelIds, media?.id]);

  // Reset per-media state when switching media
  useEffect(() => {
    if (!media) return;
    const nextConfig = initialFilter
      ? JSON.parse(JSON.stringify(initialFilter))
      : createDefaultFilterConfig();
    filterConfigRef.current = nextConfig;
    setFilterConfig(nextConfig);
    setPanicActive(false);
    setPendingStartSec(null);
    setIntroSkipped(false);
    setAutoNextCancelled(false);
    lastSkippedRef.current = null;
    if (!media.isLive) {
      setMultiViewCount(1);
      setAudioFocusIdx(0);
    }
  }, [media?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep parent notified of active Watch Party room code
  useEffect(() => {
    onWatchPartyCodeChange?.(partyCode);
  }, [partyCode, onWatchPartyCodeChange]);

  // Subscribe to WebSocket Watch Party messages when player is open
  useEffect(() => {
    if (!media) return undefined;

    const unsub = realtimeClient.subscribe((msg) => {
      const type = String(msg.type || '');
      if (type === 'party:state') {
        const code = String(msg.roomCode || '');
        setPartyCode(code);
        setPartyIsHost(Boolean(msg.isHost));
        setPartyHostName(String(msg.hostName || 'المضيف'));
        setPartyParticipants(
          Array.isArray(msg.participants) ? (msg.participants as string[]) : []
        );
        setPartyMessages(
          Array.isArray(msg.messages) ? (msg.messages as WatchPartyChatMessage[]) : []
        );

        const remoteMedia = msg.media as PlayerMediaRequest | null;
        if (
          !msg.isHost &&
          remoteMedia &&
          remoteMedia.url &&
          remoteMedia.id !== mediaRef.current?.id
        ) {
          onSwitchMedia(remoteMedia);
        }

        const vid = videoRef.current;
        if (vid && !msg.isHost) {
          isRemoteSyncRef.current = true;
          const targetT = Number(msg.currentTime) || 0;
          if (Math.abs((vid.currentTime || 0) - targetT) > 1.5) {
            vid.currentTime = targetT;
          }
          if (msg.playing) vid.play().catch(() => {});
          else vid.pause();
          window.setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 400);
        }
      } else if (type === 'party:presence') {
        setPartyParticipants(
          Array.isArray(msg.participants) ? (msg.participants as string[]) : []
        );
        if (typeof msg.hostName === 'string') setPartyHostName(msg.hostName);
      } else if (type === 'party:sync') {
        const vid = videoRef.current;
        if (!vid) return;
        isRemoteSyncRef.current = true;
        const targetT = Number(msg.currentTime);
        if (Number.isFinite(targetT) && Math.abs((vid.currentTime || 0) - targetT) > 1.5) {
          vid.currentTime = targetT;
        }
        if (typeof msg.playing === 'boolean') {
          if (msg.playing && vid.paused) vid.play().catch(() => {});
          if (!msg.playing && !vid.paused) vid.pause();
        }
        window.setTimeout(() => {
          isRemoteSyncRef.current = false;
        }, 450);
      } else if (type === 'party:chat') {
        const entry = msg.message as WatchPartyChatMessage | undefined;
        if (entry?.id) {
          setPartyMessages((prev) => [...prev.slice(-59), entry]);
        }
      } else if (type === 'party:react') {
        const rxId = String(msg.id || `rx_${Date.now()}`);
        const emoji = String(msg.emoji || '🔥');
        const sender = String(msg.sender || 'مشاهد');
        const leftPct = 15 + Math.floor(Math.random() * 70);
        setFloatingReactions((prev) => [...prev.slice(-10), { id: rxId, emoji, sender, leftPct }]);
        window.setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== rxId));
        }, 2600);
      } else if (type === 'party:error') {
        onToast(String(msg.error || 'تعذّر الانضمام إلى غرفة المشاهدة.'));
      }
    });

    return () => {
      unsub();
    };
  }, [media?.id, onSwitchMedia, onToast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-create or join Watch Party if opened via WatchPartyModal or ?party=CODE
  useEffect(() => {
    if (!media || !initialWatchParty) return;
    const cleanCode = normalizeRoomCode(initialWatchParty.roomCode);
    if (!isValidRoomCode(cleanCode)) return;
    setPartyUserName(initialWatchParty.userName || defaultUserName);
    setActiveDrawer('party');

    if (initialWatchParty.mode === 'create') {
      realtimeClient.send({
        type: 'party:create',
        roomCode: cleanCode,
        userName: initialWatchParty.userName || defaultUserName,
        playing: false,
        currentTime: 0,
        media: {
          id: media.id,
          title: media.title,
          meta: media.meta,
          url: media.url,
          isLive: media.isLive,
          poster: media.poster,
        },
      });
    } else {
      realtimeClient.send({
        type: 'party:join',
        roomCode: cleanCode,
        userName: initialWatchParty.userName || defaultUserName,
      });
    }
  }, [initialWatchParty?.roomCode, initialWatchParty?.mode, Boolean(media)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle remote player actions from Phone-to-TV QR Remote
  useEffect(() => {
    if (!media || !remotePlayerAction) return;
    const vid = videoRef.current;
    switch (remotePlayerAction.action) {
      case 'play_pause':
        if (vid) {
          if (vid.paused) vid.play().catch(() => {});
          else vid.pause();
        }
        break;
      case 'seek_forward':
        if (vid) {
          const maxD = Number.isFinite(vid.duration) ? vid.duration : currentTime + 15;
          vid.currentTime = Math.min(maxD, (vid.currentTime || 0) + 15);
        }
        break;
      case 'seek_back':
        if (vid) {
          vid.currentTime = Math.max(0, (vid.currentTime || 0) - 15);
        }
        break;
      case 'mute':
        setUserMuted((m) => !m);
        break;
      case 'panic':
        setPanicActive((p) => !p);
        break;
      case 'close':
        onClose();
        break;
    }
  }, [remotePlayerAction?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateFilter = useCallback(
    (updater: (prev: MediaFilterConfig) => MediaFilterConfig) => {
      const next = updater(filterConfigRef.current);
      filterConfigRef.current = next;
      setFilterConfig(next);
      if (media) onSaveFilter(media.id, next);
    },
    [media, onSaveFilter]
  );

  // Sleep Timer Countdown
  useEffect(() => {
    if (sleepRemainingSec === null) return undefined;
    if (sleepRemainingSec <= 0) {
      videoRef.current?.pause();
      setSleepRemainingSec(null);
      onToast('انتهى مؤقت النوم — تم إيقاف العرض مؤقتاً');
      return undefined;
    }
    const timer = window.setInterval(() => {
      setSleepRemainingSec((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sleepRemainingSec, onToast]);

  // Initialize Integrated 3-Engine Cinema Player (HLS.js + MPEG-TS.js + Native HTML5 + Auto-Proxy Cascade)
  useEffect(() => {
    if (!media || !videoRef.current) return;
    const video = videoRef.current;
    let disposed = false;

    const cleanupEngines = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          // ignore
        }
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        try {
          mpegtsRef.current.pause();
          mpegtsRef.current.unload();
          mpegtsRef.current.detachMediaElement();
          mpegtsRef.current.destroy();
        } catch {
          // ignore
        }
        mpegtsRef.current = null;
      }
      video.onloadedmetadata = null;
      video.oncanplay = null;
      video.onerror = null;
    };

    cleanupEngines();
    setStreamStatus('جاري تشغيل المشغّل المدمج وتحميل البث...');
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    video.pause();
    video.removeAttribute('src');

    const onReady = () => {
      if (disposed) return;
      setStreamStatus(null);
      if (
        !media.isLive &&
        savedProgress &&
        savedProgress.t > 5 &&
        Number.isFinite(video.duration) &&
        savedProgress.t < video.duration - 5
      ) {
        video.currentTime = savedProgress.t;
        onToast(`تم استئناف المشاهدة من ${formatTimecode(savedProgress.t)}`);
      }
      video.play().catch(() => {});
    };

    const rawUrl = (media.url || '').trim();
    const isHlsUrl = /\.m3u8(\?|$)/i.test(rawUrl);
    const isMkvOrExotic = /\.(mkv|avi|flv|wmv|mpg|mpeg)(\?|$)/i.test(rawUrl);
    const isTsUrl =
      /\.ts(\?|$)/i.test(rawUrl) ||
      (Boolean(media.isLive) && !/\.(mp4|mkv|webm|m3u8)(\?|$)/i.test(rawUrl));
    const altM3u8Url =
      /\.ts(\?|$)/i.test(rawUrl)
        ? rawUrl.replace(/\.ts(\?|$)/i, '.m3u8$1')
        : Boolean(media.isLive) && !/\.(m3u8|mp4|mkv|webm)(\?|$)/i.test(rawUrl)
        ? `${rawUrl}.m3u8`
        : null;

    type AttemptStep = {
      engine: 'hls' | 'mpegts' | 'native';
      url: string;
      label: string;
    };

    const steps: AttemptStep[] = [];
    if (playerEngineMode === 'ffmpeg_remux') {
      steps.push({
        engine: 'native',
        url: buildTranscodedStreamUrl(rawUrl, 'remux'),
        label: 'محوّل فوري MKV/AC3 → MP4',
      });
    } else if (playerEngineMode === 'ffmpeg_full') {
      steps.push({
        engine: 'native',
        url: buildTranscodedStreamUrl(rawUrl, 'full'),
        label: 'محوّل 4K/HEVC → H.264 فائق التوافق',
      });
    } else if (playerEngineMode === 'hls_proxy') {
      steps.push({
        engine: 'hls',
        url: buildProxiedStreamUrl(altM3u8Url || rawUrl, true),
        label: 'مشغّل HLS المدمج (عبر الوسيط)',
      });
    } else if (playerEngineMode === 'mpegts_proxy') {
      steps.push({
        engine: 'mpegts',
        url: buildProxiedStreamUrl(rawUrl, true),
        label: 'مشغّل MPEG-TS IPTV المدمج',
      });
    } else if (playerEngineMode === 'native_proxy') {
      steps.push({
        engine: 'native',
        url: buildProxiedStreamUrl(rawUrl, true),
        label: 'مشغّل الفيديو المدمج (عبر الوسيط)',
      });
    } else if (playerEngineMode === 'direct') {
      steps.push({
        engine: isHlsUrl ? 'hls' : isTsUrl ? 'mpegts' : 'native',
        url: rawUrl,
        label: 'تشغيل مباشر بدون وسيط',
      });
    } else {
      // Smart Auto Cascade: native -> proxy -> FFmpeg live remux (fixes MKV/AC3) -> FFmpeg H.264 transcode (fixes 4K HEVC/x265)!
      const defaultUrl = buildProxiedStreamUrl(rawUrl);
      const proxiedUrl = buildProxiedStreamUrl(rawUrl, true);
      const remuxUrl = buildTranscodedStreamUrl(rawUrl, 'remux');
      const fullTranscodeUrl = buildTranscodedStreamUrl(rawUrl, 'full');

      if (isHlsUrl) {
        steps.push({ engine: 'hls', url: defaultUrl, label: 'مشغّل HLS المدمج' });
        if (defaultUrl !== proxiedUrl) {
          steps.push({ engine: 'hls', url: proxiedUrl, label: 'مشغّل HLS عبر الوسيط' });
        }
        steps.push({ engine: 'native', url: proxiedUrl, label: 'مشغّل المتصفح المدمج' });
        steps.push({ engine: 'native', url: remuxUrl, label: 'محوّل فوري FFmpeg' });
      } else if (isMkvOrExotic) {
        // MKV / AVI / FLV / 4K Xtream series episodes: go straight to live FFmpeg Remux & H.264 Transcoder!
        steps.push({ engine: 'native', url: remuxUrl, label: 'محوّل MKV/4K الفوري (Remux)' });
        steps.push({ engine: 'native', url: fullTranscodeUrl, label: 'محوّل 4K/HEVC → H.264 الكامل' });
        steps.push({ engine: 'native', url: proxiedUrl, label: 'المشغّل المدمج عبر الوسيط' });
      } else if (isTsUrl) {
        steps.push({ engine: 'mpegts', url: proxiedUrl, label: 'مشغّل MPEG-TS IPTV المدمج' });
        if (altM3u8Url) {
          steps.push({
            engine: 'hls',
            url: buildProxiedStreamUrl(altM3u8Url, true),
            label: 'تحويل تلقائي إلى HLS',
          });
        }
        steps.push({ engine: 'native', url: remuxUrl, label: 'محوّل فوري FFmpeg' });
        steps.push({ engine: 'native', url: fullTranscodeUrl, label: 'محوّل H.264 الاحتياطي' });
      } else if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(rawUrl)) {
        steps.push({ engine: 'native', url: defaultUrl, label: 'مشغّل الفيديو المدمج HD' });
        if (defaultUrl !== proxiedUrl) {
          steps.push({ engine: 'native', url: proxiedUrl, label: 'المشغّل المدمج عبر الوسيط' });
        }
        steps.push({ engine: 'native', url: remuxUrl, label: 'محوّل الصوت والملف الفوري' });
        steps.push({ engine: 'native', url: fullTranscodeUrl, label: 'محوّل 4K/HEVC → H.264 الكامل' });
      } else {
        steps.push({ engine: 'native', url: defaultUrl, label: 'مشغّل الفيديو المدمج' });
        if (defaultUrl !== proxiedUrl) {
          steps.push({ engine: 'native', url: proxiedUrl, label: 'المشغّل المدمج عبر الوسيط' });
        }
        steps.push({ engine: 'native', url: remuxUrl, label: 'محوّل MKV/4K الفوري' });
        steps.push({ engine: 'native', url: fullTranscodeUrl, label: 'محوّل 4K/HEVC → H.264 الكامل' });
        steps.push({ engine: 'hls', url: proxiedUrl, label: 'محرك HLS الاحتياطي' });
      }
    }

    let stepIdx = 0;

    const runAttempt = () => {
      if (disposed) return;
      if (stepIdx >= steps.length) {
        setStreamStatus(
          'تعذّر تشغيل هذا الرابط حالياً — جرّب تبديل محرك المشغّل بالأسفل أو اختر سيرفر/قناة أخرى.'
        );
        return;
      }

      const step = steps[stepIdx++];
      cleanupEngines();
      setActiveEngineLabel(step.label);
      if (stepIdx > 1) {
        setStreamStatus(`جاري التبديل تلقائياً إلى: ${step.label}...`);
      }

      if (step.engine === 'hls' && Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: Boolean(media.isLive),
          enableWorker: true,
          manifestLoadingTimeOut: 12000,
          levelLoadingTimeOut: 12000,
        });
        hlsRef.current = hls;
        hls.loadSource(step.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, onReady);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data?.fatal && !disposed) {
            runAttempt();
          }
        });
      } else if (step.engine === 'mpegts' && mpegts.isSupported()) {
        try {
          const tsPlayer = mpegts.createPlayer(
            {
              type: 'mpegts',
              isLive: Boolean(media.isLive),
              url: step.url,
              cors: true,
            },
            {
              enableWorker: false,
              enableStashBuffer: false,
              liveBufferLatencyChasing: Boolean(media.isLive),
            }
          );
          mpegtsRef.current = tsPlayer;
          tsPlayer.attachMediaElement(video);
          tsPlayer.on(mpegts.Events.ERROR, () => {
            if (!disposed) runAttempt();
          });
          video.onloadedmetadata = onReady;
          video.oncanplay = onReady;
          tsPlayer.load();
          const playPromise = tsPlayer.play();
          if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
            (playPromise as Promise<void>).catch(() => {});
          }
        } catch {
          runAttempt();
        }
      } else {
        video.src = step.url;
        video.onloadedmetadata = onReady;
        video.oncanplay = onReady;
        video.onerror = () => {
          if (!disposed) runAttempt();
        };
        video.play().catch(() => {});
      }
    };

    runAttempt();

    return () => {
      disposed = true;
      if (
        !media.isLive &&
        Number.isFinite(video.duration) &&
        video.duration > 0 &&
        video.currentTime > 3
      ) {
        onSaveProgress(media.id, media.parentId, video.currentTime, video.duration);
      }
      video.pause();
      cleanupEngines();
    };
  }, [media?.id, media?.url, playerEngineMode, streamRetryNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scan all other saved servers in background for alternate copies of the playing title!
  useEffect(() => {
    if (!media || allServers.length <= 1) {
      setAltServerMatches([]);
      setScanningAltServers(false);
      return undefined;
    }
    const cleaned = cleanMediaSearchTitle(media.title);
    if (!cleaned || cleaned.length < 2) return undefined;

    const controller = new AbortController();
    setScanningAltServers(true);
    setAltServerMatches([]);

    searchAcrossAllServers(cleaned, allServers, {
      kind: media.isLive ? 'live' : 'all',
      excludeServerId: activeServerId,
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setAltServerMatches(res.matches);
        setScanningAltServers(false);
        if (res.matches.length > 0) {
          const msg = formatCrossServerAnnouncement(cleaned, res.matches);
          if (msg) onToast(msg);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setScanningAltServers(false);
      });

    return () => controller.abort();
  }, [media?.id, media?.title, activeServerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evaluate Scene Filter continuously
  const sceneEval = evaluateSceneFilterState(
    currentTime,
    filterConfig,
    panicActive,
    userMuted,
    lastSkippedRef.current
  );

  // Synchronize primary mute state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (sceneEval.skipToTime !== null && sceneEval.skippedCueId) {
        lastSkippedRef.current = sceneEval.skippedCueId;
        video.currentTime = sceneEval.skipToTime;
        onToast('تم تخطي المشهد تلقائياً وفق قاعدة الفلتر');
        const timer = window.setTimeout(() => {
          lastSkippedRef.current = null;
        }, 1200);
        return () => window.clearTimeout(timer);
      }
      video.muted =
        sceneEval.shouldMute || (multiViewCount > 1 && audioFocusIdx !== 0);
    }
    return undefined;
  }, [
    sceneEval.skipToTime,
    sceneEval.skippedCueId,
    sceneEval.shouldMute,
    multiViewCount,
    audioFocusIdx,
    onToast,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!media) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      const video = videoRef.current;
      if (e.key === 'b' || e.key === 'B' || e.key === 'لا') {
        e.preventDefault();
        setPanicActive((v) => !v);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (video) {
          if (video.paused) video.play().catch(() => {});
          else video.pause();
        }
      } else if (e.key === 'ArrowRight' && video) {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
      } else if (e.key === 'ArrowLeft' && video) {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if ((e.key === 'm' || e.key === 'M') && video) {
        e.preventDefault();
        setUserMuted((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (activeDrawer !== 'none') setActiveDrawer('none');
        else onClose();
      }
    };

    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [media, activeDrawer]);

  const activeSubtitleCue = useMemo(
    () =>
      subtitlesEnabled && subtitleCues.length > 0
        ? getActiveSubtitleCue(subtitleCues, currentTime, subtitleStyle.offsetSec)
        : null,
    [subtitlesEnabled, subtitleCues, currentTime, subtitleStyle.offsetSec]
  );

  const hasPlaylist = Array.isArray(media?.playlist) && media.playlist.length > 1;
  const hasNext =
    Array.isArray(media?.playlist) &&
    typeof media?.playlistIndex === 'number' &&
    media.playlistIndex < media.playlist.length - 1;

  const remainingSeconds =
    duration > 0 && Number.isFinite(duration) ? Math.max(0, Math.ceil(duration - currentTime)) : 0;
  const showAutoNextOverlay =
    Boolean(media && !media.isLive && hasNext && duration > 60 && remainingSeconds <= 12 && remainingSeconds > 0 && !autoNextCancelled);

  // Auto-advance at end of episode if not cancelled
  useEffect(() => {
    if (!media || media.isLive || !hasNext || autoNextCancelled) return;
    if (duration > 60 && duration - currentTime <= 0.6) {
      if (media.playlist && typeof media.playlistIndex === 'number') {
        const nextIdx = media.playlistIndex + 1;
        const nextItem = media.playlist[nextIdx];
        if (nextItem) {
          onSwitchMedia({
            ...nextItem,
            playlist: media.playlist,
            playlistIndex: nextIdx,
          });
        }
      }
    }
  }, [currentTime, duration, media, hasNext, autoNextCancelled, onSwitchMedia]);

  if (!media) return null;

  const canMultiView = Boolean(media.isLive) && playableLiveChannels.length > 1;
  const videoFilterCss = buildVideoFilterCss(calibration);

  const broadcastPartySync = (playingState: boolean, timeSec: number) => {
    if (!partyCode || isRemoteSyncRef.current) return;
    realtimeClient.send({
      type: 'party:sync',
      playing: playingState,
      currentTime: timeSec,
    });
  };

  const toggleDrawer = (drawer: ActiveDrawer) => {
    setActiveDrawer((prev) => (prev === drawer ? 'none' : drawer));
  };

  const handleClose = () => {
    if (partyCode) {
      realtimeClient.send({ type: 'party:leave' });
      setPartyCode(null);
    }
    const video = videoRef.current;
    if (
      video &&
      !media.isLive &&
      Number.isFinite(video.duration) &&
      video.duration > 0 &&
      video.currentTime > 3
    ) {
      onSaveProgress(media.id, media.parentId, video.currentTime, video.duration);
    }
    onClose();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      broadcastPartySync(true, video.currentTime || 0);
    } else {
      video.pause();
      broadcastPartySync(false, video.currentTime || 0);
    }
  };

  const seekBy = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const maxD = Number.isFinite(video.duration) ? video.duration : currentTime + 10;
    const nextT = Math.max(0, Math.min(maxD, (video.currentTime || 0) + delta));
    video.currentTime = nextT;
    broadcastPartySync(!video.paused, nextT);
  };

  const handleSeekSlider = (val: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const nextT = (val / 100) * video.duration;
    video.currentTime = nextT;
    broadcastPartySync(!video.paused, nextT);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setUserMuted(val === 0);
  };

  const handleCycleMultiView = () => {
    setMultiViewCount((prev) => {
      const next: MultiViewCount =
        prev === 1
          ? 2
          : prev === 2 && playableLiveChannels.length >= 3
          ? 4
          : 1;
      if (next === 1) setAudioFocusIdx(0);
      onToast(
        next === 1
          ? 'تم العودة للشاشة الواحدة'
          : next === 2
          ? 'تم تفعيل وضع الشاشتين (2x Live)'
          : 'تم تفعيل وضع 4 شاشات رياضية (Quad 2×2)'
      );
      return next;
    });
  };

  const handleTogglePiP = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (video.requestPictureInPicture) {
      video
        .requestPictureInPicture()
        .catch(() => onToast('وضع النافذة المصغرة غير متاح حالياً في هذا المتصفح.'));
    }
  };

  const handleToggleFullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!document.fullscreenElement) {
      stage.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      onToast('انتظر لحظة حتى تظهر صورة الفيديو ثم اضغط لالتقاط اللقطة.');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `valdrion-snapshot-${Date.now()}.png`;
      a.click();
      onToast('تم التقاط صورة المشهد الآن وحفظها على جهازك!');
    } catch {
      onToast('تعذّر حفظ اللقطة لهذا البث الخارجي — جرّب التقاط الشاشة من الشريط العائم.');
    }
  };

  const handleNextPlaylistItem = () => {
    if (!hasNext || !media.playlist || typeof media.playlistIndex !== 'number') return;
    const nextIdx = media.playlistIndex + 1;
    const nextItem = media.playlist[nextIdx];
    onSwitchMedia({
      ...nextItem,
      playlist: media.playlist,
      playlistIndex: nextIdx,
    });
  };

  // --- Subtitles Studio Handlers ---
  const handleSubtitleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseSubtitleFile(raw);
      if (parsed.length === 0) {
        onToast('لم يتم العثور على سطور ترجمة صالحة في الملف.');
        return;
      }
      setSubtitleCues(parsed);
      setSubtitleFileName(file.name);
      setSubtitlesEnabled(true);
      onToast(`تم تحميل ملف الترجمة (${parsed.length} سطر)`);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleSubtitles = () => {
    const parsed = parseSubtitleFile(SAMPLE_DEMO_SRT);
    setSubtitleCues(parsed);
    setSubtitleFileName('sample-english-track.srt');
    setSubtitlesEnabled(true);
    onToast(`تم تحميل مسار ترجمة تجريبي (${parsed.length} سطور) — يمكنك ترجمته للعربية بضغطة واحدة`);
  };

  const handleTranslateSubtitlesAI = async () => {
    if (translatingSubs || subtitleCues.length === 0) return;
    setTranslatingSubs(true);
    try {
      const translated = await translateSubtitlesWithAI(subtitleCues);
      setSubtitleCues(translated);
      onToast('تمت ترجمة ملف الترجمة إلى العربية السينمائية بالذكاء الاصطناعي!');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشلت ترجمة الملف حالياً');
    } finally {
      setTranslatingSubs(false);
    }
  };

  const handleDownloadSrt = () => {
    if (subtitleCues.length === 0) return;
    const content = serializeToSrt(subtitleCues);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valdrion-subtitles-${media.id}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('تم تحميل ملف الترجمة بصيغة .srt');
  };

  // --- Watch Party Handlers ---
  const handleCreatePartyNow = () => {
    const code = generateRoomCode(6);
    realtimeClient.send({
      type: 'party:create',
      roomCode: code,
      userName: partyUserName.trim() || defaultUserName,
      playing: isPlaying,
      currentTime,
      media: {
        id: media.id,
        title: media.title,
        meta: media.meta,
        url: media.url,
        isLive: media.isLive,
        poster: media.poster,
      },
    });
    onToast(`تم إنشاء غرفة المشاهدة (${code})`);
  };

  const handleJoinPartyNow = () => {
    const code = normalizeRoomCode(partyJoinInput);
    if (!isValidRoomCode(code)) {
      onToast('أدخل رمز غرفة صالح (4 إلى 8 أحرف/أرقام).');
      return;
    }
    realtimeClient.send({
      type: 'party:join',
      roomCode: code,
      userName: partyUserName.trim() || defaultUserName,
    });
  };

  const handleSendPartyChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = partyChatInput.trim();
    if (!text || !partyCode) return;
    realtimeClient.send({ type: 'party:chat', text });
    setPartyChatInput('');
  };

  const handleSendReaction = (emoji: string) => {
    if (!partyCode) return;
    realtimeClient.send({ type: 'party:react', emoji });
  };

  const handleCopyPartyInvite = async () => {
    if (!partyCode) return;
    const url = `${window.location.origin}${window.location.pathname}?party=${partyCode}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast(`تم نسخ رابط الدعوة للغرفة (${partyCode})`);
    } catch {
      onToast(`رمز الغرفة: ${partyCode}`);
    }
  };

  // Scene Cue Helpers
  const addSceneCue = (start: number, end: number) => {
    if (end <= start) {
      onToast('يجب أن تكون نهاية المشهد بعد وقت البداية.');
      return;
    }
    updateFilter((prev) => ({
      ...prev,
      cues: [
        ...prev.cues,
        {
          id: `cue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          start,
          end,
          action: selectedCueAction,
        },
      ].sort((a, b) => a.start - b.start),
    }));
    onToast(`تم حفظ قاعدة المشهد (${formatTimecode(start)} → ${formatTimecode(end)})`);
  };

  const handleExportFilter = () => {
    const payload = JSON.stringify(filterConfig, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(payload)
        .then(() => onToast('تم نسخ قواعد الفلتر بصيغة JSON إلى الحافظة'))
        .catch(() => {
          setImportJsonText(payload);
          setImportTextOpen(true);
        });
    } else {
      setImportJsonText(payload);
      setImportTextOpen(true);
    }
  };

  const handleImportFilter = () => {
    const parsed = parseFilterConfigJson(importJsonText);
    if (!parsed) {
      onToast('صيغة JSON غير صالحة — يرجى التحقق من النص.');
      return;
    }
    updateFilter(() => parsed);
    setImportTextOpen(false);
    setImportJsonText('');
    onToast('تم استيراد قواعد فلتر المشاهد بنجاح');
  };

  // Partial Lens drag/resize handler
  const startLensPointer = (
    e: React.PointerEvent<HTMLDivElement>,
    lens: ShieldLens,
    dragMode: 'move' | 'resize'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const layer = lensLayerRef.current;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...lens };

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;

      setFilterConfig((prev) => ({
        ...prev,
        lenses: prev.lenses.map((l) => {
          if (l.id !== lens.id) return l;
          if (dragMode === 'move') {
            return {
              ...l,
              x: Math.max(0, Math.min(100 - orig.w, orig.x + dxPct)),
              y: Math.max(0, Math.min(100 - orig.h, orig.y + dyPct)),
            };
          }
          return {
            ...l,
            w: Math.max(10, Math.min(100 - orig.x, orig.w + dxPct)),
            h: Math.max(10, Math.min(100 - orig.y, orig.h + dyPct)),
          };
        }),
      }));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      onSaveFilter(media.id, filterConfigRef.current);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const seekPercent =
    Number.isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : media.isLive ? 100 : 0;

  const showSkipIntro =
    !media.isLive && !introSkipped && currentTime >= 5 && currentTime <= 180;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#040406]"
      role="dialog"
      aria-modal="true"
      aria-label={`مشغل الفيديو — ${media.title}`}
    >
      {/* Top Player Header */}
      <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/[0.08] bg-[#0B0B0F] px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#DC143C] px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-[#EF234B]"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span>رجوع</span>
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold text-[#F4F3EF] sm:text-base">
              {media.title}
            </h2>
            <p className="truncate text-xs text-[#D4AF37]">{media.meta}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleCaptureFrame}
            title="التقاط صورة فورية للمشهد الحالي"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-sky-400/45 bg-sky-500/15 px-2.5 py-2 text-xs font-extrabold text-sky-200 transition-colors hover:bg-sky-500 hover:text-white"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span>التقاط صورة الآن</span>
          </button>

          <button
            type="button"
            onClick={() => setPanicActive((v) => !v)}
            aria-pressed={panicActive}
            title="اختصار لوحة المفاتيح: B"
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-extrabold transition-all ${
              panicActive
                ? 'border-[#DC143C] bg-[#DC143C] text-white shadow-[0_0_20px_rgba(220,20,60,0.65)]'
                : 'border-[#DC143C]/50 bg-[#DC143C]/15 text-rose-200 hover:bg-[#DC143C]/25'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>حجب (B)</span>
          </button>

          {canMultiView && (
            <button
              type="button"
              onClick={handleCycleMultiView}
              aria-pressed={multiViewCount > 1}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
                multiViewCount > 1
                  ? 'border-[#D4AF37] bg-[#D4AF37] text-[#060608]'
                  : 'border-white/12 bg-[#15151C] text-[#D6D5CE] hover:border-[#D4AF37]/50'
              }`}
            >
              <Grid2x2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {multiViewCount === 1
                  ? 'شاشات متعددة'
                  : multiViewCount === 2
                  ? 'شاشتان (2×)'
                  : '4 شاشات (2×2)'}
              </span>
            </button>
          )}

          {/* Watch Party Toggle */}
          <button
            type="button"
            onClick={() => toggleDrawer('party')}
            aria-expanded={activeDrawer === 'party'}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
              activeDrawer === 'party' || partyCode
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                : 'border-white/10 bg-[#15151C] text-[#D6D5CE] hover:border-[#D4AF37]/40'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {partyCode ? `غرفة ${partyCode} (${partyParticipants.length})` : 'مشاهدة جماعية'}
            </span>
          </button>

          {/* Subtitles Studio Toggle */}
          <button
            type="button"
            onClick={() => toggleDrawer('subtitles')}
            aria-expanded={activeDrawer === 'subtitles'}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
              activeDrawer === 'subtitles' || (subtitlesEnabled && subtitleCues.length > 0)
                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                : 'border-white/10 bg-[#15151C] text-[#D6D5CE] hover:border-white/25'
            }`}
          >
            <Subtitles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>الترجمة AI</span>
          </button>

          <button
            type="button"
            onClick={() => toggleDrawer('calibration')}
            aria-expanded={activeDrawer === 'calibration'}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
              activeDrawer === 'calibration' || sleepRemainingSec !== null
                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                : 'border-white/10 bg-[#15151C] text-[#D6D5CE] hover:border-white/25'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">ضبط الصورة</span>
            {sleepRemainingSec !== null && (
              <span className="font-mono-tabular text-[11px] text-[#F4F3EF]">
                · {formatTimecode(sleepRemainingSec)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleDrawer('filter')}
            aria-expanded={activeDrawer === 'filter'}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
              activeDrawer === 'filter'
                ? 'border-[#D4AF37] bg-[#D4AF37] text-[#060608]'
                : 'border-[#D4AF37]/45 bg-[#D4AF37]/12 text-[#D4AF37] hover:bg-[#D4AF37]/20'
            }`}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">فلتر المشاهد</span>
            {filterConfig.cues.length + filterConfig.lenses.length > 0 && (
              <span className="font-mono-tabular">
                ({filterConfig.cues.length + filterConfig.lenses.length})
              </span>
            )}
          </button>

          {hasPlaylist && (
            <button
              type="button"
              onClick={() => toggleDrawer('playlist')}
              aria-expanded={activeDrawer === 'playlist'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors ${
                activeDrawer === 'playlist'
                  ? 'border-white/30 bg-white/15 text-white'
                  : 'border-white/10 bg-[#15151C] text-[#D6D5CE] hover:border-white/25'
              }`}
            >
              <ListVideo className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{media.isLive ? 'القنوات' : 'القائمة'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleTogglePiP}
            aria-label="نافذة مصغرة"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-[#15151C] px-2.5 py-2 text-xs font-semibold text-[#D6D5CE] hover:border-white/25 xl:inline-flex"
          >
            <PictureInPicture2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-[#15151C] px-2.5 py-2 text-xs font-semibold text-[#D6D5CE] hover:border-white/25"
          >
            {isFullscreen ? (
              <Minimize className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Maximize className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Main Player Workspace */}
      <div className="relative flex min-h-0 flex-1">
        {/* Video Stage (1, 2, or 4 Multi-View Live Grid) */}
        <div
          ref={stageRef}
          className={`relative flex-1 overflow-hidden bg-black ${
            multiViewCount === 4
              ? 'grid grid-cols-1 gap-1.5 bg-[#08080D] p-1.5 sm:grid-cols-2 sm:grid-rows-2'
              : multiViewCount === 2
              ? 'grid grid-cols-1 gap-1.5 bg-[#08080D] p-1.5 md:grid-cols-2'
              : 'flex items-center justify-center'
          }`}
        >
          {/* Primary Video Pane (Screen A) */}
          <div
            className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-black ${
              multiViewCount > 1
                ? audioFocusIdx === 0
                  ? 'rounded-xl border-2 border-[#D4AF37]'
                  : 'rounded-xl border border-white/10'
                : ''
            }`}
          >
            {multiViewCount > 1 && (
              <div className="absolute inset-x-2.5 top-2.5 z-20 flex items-center justify-between gap-2">
                <span className="rounded-md bg-black/80 px-2.5 py-1 text-[11px] font-bold text-[#F4F3EF] backdrop-blur-md">
                  الشاشة A · {media.title}
                </span>
                <button
                  type="button"
                  onClick={() => setAudioFocusIdx(0)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-extrabold transition-colors ${
                    audioFocusIdx === 0
                      ? 'bg-[#D4AF37] text-[#060608]'
                      : 'border border-white/15 bg-black/75 text-[#D6D5CE] hover:border-[#D4AF37]'
                  }`}
                >
                  <Volume2 className="h-3 w-3" aria-hidden="true" />
                  <span>{audioFocusIdx === 0 ? 'الصوت نشط' : 'صوت'}</span>
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              poster={media.poster}
              playsInline
              preload="metadata"
              style={{ filter: videoFilterCss }}
              onPlay={() => {
                setIsPlaying(true);
                broadcastPartySync(true, videoRef.current?.currentTime || 0);
              }}
              onPause={() => {
                setIsPlaying(false);
                const v = videoRef.current;
                broadcastPartySync(false, v?.currentTime || 0);
                if (
                  v &&
                  !media.isLive &&
                  Number.isFinite(v.duration) &&
                  v.duration > 0 &&
                  v.currentTime > 3
                ) {
                  onSaveProgress(media.id, media.parentId, v.currentTime, v.duration);
                }
              }}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v) return;
                setCurrentTime(v.currentTime || 0);
                if (Number.isFinite(v.duration) && v.duration > 0) {
                  setDuration(v.duration);
                }
              }}
              onClick={togglePlay}
              className={`h-full w-full cursor-pointer bg-black ${
                aspectMode === 'cover'
                  ? 'object-cover'
                  : aspectMode === 'fill'
                  ? 'object-fill'
                  : 'object-contain'
              }`}
            />

            {/* Stream Status & Built-in Multi-Engine Switcher + Auto Cross-Server Failover */}
            {streamStatus && (
              <div
                data-testid="player-stream-status"
                className="absolute left-4 right-4 top-14 z-20 mx-auto max-w-2xl rounded-xl border border-[#D4AF37]/45 bg-[#0A0A0E]/94 p-3.5 text-xs text-[#F5E6C4] shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#F5C76B]">{streamStatus}</span>
                  <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                    {activeEngineLabel}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'auto', label: 'تلقائي ذكي' },
                      { id: 'ffmpeg_remux', label: 'محوّل MKV/4K' },
                      { id: 'ffmpeg_full', label: 'تحويل كامل H.264' },
                      { id: 'hls_proxy', label: 'محرك HLS' },
                      { id: 'mpegts_proxy', label: 'محرك IPTV (TS)' },
                      { id: 'native_proxy', label: 'عبر الوسيط' },
                      { id: 'direct', label: 'مباشر' },
                    ] as const
                  ).map((eng) => (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => {
                        setPlayerEngineMode(eng.id);
                        setStreamRetryNonce((n) => n + 1);
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        playerEngineMode === eng.id
                          ? 'border-[#F5C76B] bg-[#F5C76B] text-[#0B0907]'
                          : 'border-white/15 bg-white/5 text-slate-200 hover:border-[#F5C76B]/60'
                      }`}
                    >
                      {eng.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStreamRetryNonce((n) => n + 1)}
                    className="rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/25"
                  >
                    إعادة المحاولة
                  </button>
                </div>

                {/* Auto Cross-Server Failover Sources */}
                {(scanningAltServers || altServerMatches.length > 0) && (
                  <div className="mt-3 border-t border-white/10 pt-2.5">
                    {scanningAltServers ? (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>جاري البحث التلقائي في باقي السيرفرات عن نسخة بديلة شغّالة...</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-extrabold text-emerald-300">
                          تم العثور تلقائياً على بدائل شغّالة في سيرفراتك الأخرى:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {altServerMatches.slice(0, 4).map((m) => (
                            <button
                              key={`${m.serverId}_${m.item.id}`}
                              type="button"
                              onClick={() => onOpenAlternateMatch?.(m)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-100 hover:bg-emerald-500 hover:text-[#06120B]"
                            >
                              <span>{m.serverName}</span>
                              <span className="rounded bg-black/35 px-1 text-[10px] text-[#F5C76B]">
                                {m.qualityTag}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Floating Watch Party Emoji Reactions */}
            {floatingReactions.length > 0 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
              >
                {floatingReactions.map((rx) => (
                  <div
                    key={rx.id}
                    style={{ left: `${rx.leftPct}%` }}
                    className="absolute bottom-14 flex animate-bounce flex-col items-center gap-0.5 drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
                  >
                    <span className="text-3xl">{rx.emoji}</span>
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-[#F4F3EF]">
                      {rx.sender}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Smart Subtitles Overlay */}
            {activeSubtitleCue && !sceneEval.veilMode && (
              <div
                data-testid="active-subtitle-overlay"
                className="pointer-events-none absolute inset-x-4 bottom-8 z-20 flex justify-center text-center"
              >
                <div
                  style={{
                    fontSize: `${subtitleStyle.fontSizePx}px`,
                    color: subtitleStyle.color,
                    backgroundColor: `rgba(6, 6, 10, ${subtitleStyle.bgOpacity})`,
                  }}
                  className="max-w-3xl whitespace-pre-line rounded-xl px-4 py-2 font-bold leading-snug shadow-2xl backdrop-blur-sm"
                >
                  {activeSubtitleCue.text}
                </div>
              </div>
            )}

            {/* Skip Intro Floating Action */}
            {showSkipIntro && (
              <button
                type="button"
                onClick={() => {
                  seekBy(85);
                  setIntroSkipped(true);
                  onToast('تم تخطي المقدمة (+85 ثانية)');
                }}
                className="absolute bottom-8 left-6 z-20 inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/70 bg-[#0B0B12]/90 px-4 py-2.5 text-xs font-extrabold text-[#F4F3EF] shadow-2xl backdrop-blur-md transition-transform hover:scale-105 hover:bg-[#D4AF37] hover:text-[#060608]"
              >
                <FastForward className="h-4 w-4" aria-hidden="true" />
                <span>تخطي المقدمة (+85ث)</span>
              </button>
            )}

            {/* Auto-Next Episode Countdown Overlay */}
            {showAutoNextOverlay && (
              <div className="absolute bottom-8 right-6 z-20 flex flex-col gap-2.5 rounded-2xl border border-[#D4AF37]/60 bg-[#0B0B12]/95 p-4 text-right shadow-2xl backdrop-blur-md">
                <div className="text-xs font-extrabold text-[#D4AF37]">
                  الحلقة التالية تبدأ خلال {remainingSeconds} ثانية
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNextPlaylistItem}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC143C] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#EF234B]"
                  >
                    <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>تشغيل الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoNextCancelled(true)}
                    className="rounded-lg border border-white/15 bg-[#171722] px-3 py-2 text-xs font-bold text-[#D6D5CE] hover:text-white"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* Full-Screen Censor Veil (Panic or Timed Blur/Blackout) */}
            {sceneEval.veilMode && (
              <div
                data-testid="censor-veil"
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-all duration-150"
                style={
                  sceneEval.veilMode === 'black'
                    ? { backgroundColor: '#020204' }
                    : {
                        backgroundColor: 'rgba(6, 6, 8, 0.42)',
                        backdropFilter: `blur(${filterConfig.blurPx}px)`,
                        WebkitBackdropFilter: `blur(${filterConfig.blurPx}px)`,
                      }
                }
              >
                <div className="rounded-xl border border-[#D4AF37]/60 bg-[#0A0A0E]/90 px-5 py-3 text-sm font-extrabold text-[#D4AF37] shadow-2xl">
                  {sceneEval.veilLabel}
                </div>
              </div>
            )}

            {/* Draggable & Resizable Partial Lenses Layer */}
            <div
              ref={lensLayerRef}
              className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-200"
              style={{ opacity: sceneEval.lensOpacity }}
            >
              {filterConfig.lenses.map((lens) => (
                <div
                  key={lens.id}
                  onPointerDown={(e) => startLensPointer(e, lens, 'move')}
                  style={{
                    left: `${lens.x}%`,
                    top: `${lens.y}%`,
                    width: `${lens.w}%`,
                    height: `${lens.h}%`,
                    backdropFilter:
                      lens.mode === 'blur' ? `blur(${filterConfig.blurPx}px)` : undefined,
                    WebkitBackdropFilter:
                      lens.mode === 'blur' ? `blur(${filterConfig.blurPx}px)` : undefined,
                  }}
                  className={`pointer-events-auto absolute flex cursor-grab flex-col justify-between rounded-xl p-1.5 touch-none ${
                    lens.mode === 'black' ? 'bg-[#030305]' : 'bg-[#060608]/25'
                  } ${
                    filterConfig.hideBorders
                      ? 'border border-transparent'
                      : lens.mode === 'black'
                      ? 'border border-[#DC143C]'
                      : 'border border-dashed border-[#D4AF37]'
                  }`}
                >
                  {!filterConfig.hideBorders && (
                    <div className="flex items-center justify-between gap-1">
                      <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                        {lens.mode === 'black' ? 'تسويد جزئي' : 'تغبيش جزئي'}
                      </span>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFilter((prev) => ({
                            ...prev,
                            lenses: prev.lenses.filter((l) => l.id !== lens.id),
                          }));
                        }}
                        aria-label="حذف العدسة"
                        className="rounded bg-[#DC143C] px-1.5 py-0.5 text-[10px] font-bold text-white"
                      >
                        حذف
                      </button>
                    </div>
                  )}

                  {!filterConfig.hideBorders && (
                    <div
                      onPointerDown={(e) => startLensPointer(e, lens, 'resize')}
                      title="اسحب لتغيير حجم العدسة"
                      className="cursor-nwse-resize self-end rounded bg-[#D4AF37] px-1.5 py-0.5 text-[10px] font-black text-[#060608]"
                    >
                      ↘
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Multi-View Extra Screens (B, and C + D when Quad 4x) */}
          {multiViewCount >= 2 && extraChannels[0] && (
            <SecondaryLivePane
              label="B"
              channel={extraChannels[0]}
              allChannels={playableLiveChannels}
              isAudioFocused={audioFocusIdx === 1}
              muted={userMuted || audioFocusIdx !== 1}
              volume={volume}
              videoFilterCss={videoFilterCss}
              onSelectChannel={(id) =>
                setExtraChannelIds(([, c, d]) => [id, c, d])
              }
              onFocusAudio={() => setAudioFocusIdx(1)}
            />
          )}

          {multiViewCount === 4 && extraChannels[1] && (
            <SecondaryLivePane
              label="C"
              channel={extraChannels[1]}
              allChannels={playableLiveChannels}
              isAudioFocused={audioFocusIdx === 2}
              muted={userMuted || audioFocusIdx !== 2}
              volume={volume}
              videoFilterCss={videoFilterCss}
              onSelectChannel={(id) =>
                setExtraChannelIds(([b, , d]) => [b, id, d])
              }
              onFocusAudio={() => setAudioFocusIdx(2)}
            />
          )}

          {multiViewCount === 4 && extraChannels[2] && (
            <SecondaryLivePane
              label="D"
              channel={extraChannels[2]}
              allChannels={playableLiveChannels}
              isAudioFocused={audioFocusIdx === 3}
              muted={userMuted || audioFocusIdx !== 3}
              volume={volume}
              videoFilterCss={videoFilterCss}
              onSelectChannel={(id) =>
                setExtraChannelIds(([b, c]) => [b, c, id])
              }
              onFocusAudio={() => setAudioFocusIdx(3)}
            />
          )}
        </div>

        {/* Collapsible Watch Party Drawer */}
        {activeDrawer === 'party' && (
          <aside
            aria-label="غرفة المشاهدة الجماعية"
            className="absolute inset-y-0 left-0 z-30 flex w-[340px] max-w-[92vw] flex-col gap-3.5 overflow-hidden border-r border-emerald-500/35 bg-[#0E0E14] p-4 shadow-2xl lg:static"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h3 className="text-sm font-black text-[#F4F3EF]">
                  غرفة المشاهدة الجماعية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                aria-label="إغلاق غرفة المشاهدة"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#17171F] text-[#D6D5CE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!partyCode ? (
              <div className="space-y-4 overflow-y-auto">
                <p className="text-xs leading-relaxed text-[#A8A7B1]">
                  شاهد هذا العمل بالتزامن الكامل مع أصدقائك — أي إيقاف أو تقديم يتزامن فوراً مع دردشة وتفاعلات حيّة.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#D6D5CE]">
                    اسمك في الغرفة
                  </label>
                  <input
                    type="text"
                    value={partyUserName}
                    onChange={(e) => setPartyUserName(e.target.value)}
                    className="w-full rounded-lg border border-white/12 bg-[#08080D] px-3 py-2 text-xs text-[#F4F3EF] focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreatePartyNow}
                  className="w-full rounded-xl bg-[#DC143C] py-2.5 text-xs font-extrabold text-white hover:bg-[#EF234B]"
                >
                  إنشاء غرفة مشاهدة جديدة لهذا العرض
                </button>

                <div className="space-y-2 border-t border-white/[0.07] pt-3">
                  <label className="block text-xs font-bold text-[#D6D5CE]">
                    أو انضم برمز غرفة صديق
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={partyJoinInput}
                      onChange={(e) => setPartyJoinInput(normalizeRoomCode(e.target.value))}
                      placeholder="ABC123"
                      maxLength={8}
                      className="flex-1 rounded-lg border border-white/12 bg-[#08080D] px-3 py-2 text-center font-mono text-xs font-bold tracking-widest text-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleJoinPartyNow}
                      className="rounded-lg bg-[#D4AF37] px-3.5 py-2 text-xs font-extrabold text-[#060608] hover:bg-[#E5C158]"
                    >
                      انضمام
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-300">
                        {partyIsHost ? 'أنت مضيف الغرفة' : `المضيف: ${partyHostName}`}
                      </div>
                      <div dir="ltr" className="font-mono text-lg font-black tracking-[0.2em] text-[#F4F3EF]">
                        {partyCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopyPartyInvite()}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37] px-2.5 py-1.5 text-[11px] font-extrabold text-[#060608]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>دعوة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          realtimeClient.send({ type: 'party:leave' });
                          setPartyCode(null);
                          setPartyMessages([]);
                          setPartyParticipants([]);
                          onToast('غادرت غرفة المشاهدة');
                        }}
                        className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1.5 text-[11px] font-bold text-rose-200"
                      >
                        مغادرة
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-200">
                    المتصلون ({partyParticipants.length}):{' '}
                    {partyParticipants.join(' · ') || partyUserName}
                  </div>
                </div>

                {/* Live Emoji Reactions Bar */}
                <div className="flex items-center justify-between gap-1 rounded-xl border border-white/[0.08] bg-[#13131C] p-2">
                  {REACTION_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleSendReaction(em)}
                      className="flex h-9 w-11 items-center justify-center rounded-lg bg-[#1A1A26] text-lg transition-transform hover:scale-110 active:scale-95"
                    >
                      {em}
                    </button>
                  ))}
                </div>

                {/* Chat Feed */}
                <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/[0.07] bg-[#09090F] p-3">
                  {partyMessages.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#8E8D96]">
                      شارك رابط الدعوة وابدأ الدردشة مع أصدقائك أثناء المشاهدة!
                    </p>
                  ) : (
                    partyMessages.map((m) => (
                      <div key={m.id} className="rounded-lg bg-[#14141F] px-2.5 py-2 text-xs">
                        <span className="font-extrabold text-[#D4AF37]">{m.sender}: </span>
                        <span className="text-[#E6E5DF]">{m.text}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendPartyChat} className="flex gap-2">
                  <input
                    type="text"
                    value={partyChatInput}
                    onChange={(e) => setPartyChatInput(e.target.value)}
                    placeholder="اكتب رسالة للغرفة..."
                    className="flex-1 rounded-lg border border-white/12 bg-[#08080D] px-3 py-2 text-xs text-[#F4F3EF] focus:border-[#D4AF37]"
                  />
                  <button
                    type="submit"
                    aria-label="إرسال رسالة"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DC143C] text-white hover:bg-[#EF234B]"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </>
            )}
          </aside>
        )}

        {/* Collapsible Smart Subtitles Studio Drawer */}
        {activeDrawer === 'subtitles' && (
          <aside
            aria-label="استوديو الترجمة الذكي بالذكاء الاصطناعي"
            className="absolute inset-y-0 left-0 z-30 flex w-[340px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-r border-[#D4AF37]/30 bg-[#0E0E14] p-4 shadow-2xl lg:static"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Subtitles className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                <h3 className="text-sm font-black text-[#F4F3EF]">
                  استوديو الترجمة الذكي (SRT/VTT)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                aria-label="إغلاق استوديو الترجمة"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#17171F] text-[#D6D5CE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              ref={subFileInputRef}
              type="file"
              accept=".srt,.vtt,.txt"
              onChange={handleSubtitleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => subFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] py-2.5 text-xs font-extrabold text-[#060608] hover:bg-[#E5C158]"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>رفع SRT / VTT</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSampleSubtitles}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#161620] py-2.5 text-xs font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                <span>مسار تجريبي</span>
              </button>
            </div>

            {subtitleCues.length > 0 && (
              <div className="space-y-3 rounded-xl border border-[#D4AF37]/30 bg-[#13131D] p-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-bold text-[#F4F3EF]">
                    {subtitleFileName || 'ملف الترجمة'} ({subtitleCues.length} سطر)
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubtitlesEnabled((v) => !v)}
                    className={`rounded-md px-2 py-1 text-[11px] font-extrabold ${
                      subtitlesEnabled
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/10 text-[#9B9AA2]'
                    }`}
                  >
                    {subtitlesEnabled ? 'مفعّلة' : 'مخفية'}
                  </button>
                </div>

                {/* 1-Click AI Arabic Translation */}
                <button
                  type="button"
                  disabled={translatingSubs}
                  onClick={() => void handleTranslateSubtitlesAI()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DC143C] to-[#B00E2E] py-2.5 text-xs font-extrabold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {translatingSubs ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Languages className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {translatingSubs
                      ? 'جاري الترجمة للعربية بالذكاء الاصطناعي...'
                      : 'ترجمة كاملة للعربية بالذكاء الاصطناعي'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSrt}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-[#1A1A26] py-2 text-xs font-bold text-[#D6D5CE] hover:border-[#D4AF37] hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>تحميل ملف الترجمة (.srt)</span>
                </button>
              </div>
            )}

            {/* Subtitle Styling Controls */}
            <div className="space-y-3.5 border-t border-white/[0.07] pt-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">حجم الخط</span>
                  <span className="font-mono-tabular text-[#D4AF37]">
                    {subtitleStyle.fontSizePx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={36}
                  value={subtitleStyle.fontSizePx}
                  onChange={(e) =>
                    setSubtitleStyle((s) => ({ ...s, fontSizePx: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">تزامن التوقيت (Offset)</span>
                  <span dir="ltr" className="font-mono-tabular text-[#D4AF37]">
                    {subtitleStyle.offsetSec >= 0 ? `+${subtitleStyle.offsetSec.toFixed(1)}s` : `${subtitleStyle.offsetSec.toFixed(1)}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.2}
                  value={subtitleStyle.offsetSec}
                  onChange={(e) =>
                    setSubtitleStyle((s) => ({ ...s, offsetSec: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">تعتيم الخلفية</span>
                  <span className="font-mono-tabular text-[#D4AF37]">
                    {Math.round(subtitleStyle.bgOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.95}
                  step={0.05}
                  value={subtitleStyle.bgOpacity}
                  onChange={(e) =>
                    setSubtitleStyle((s) => ({ ...s, bgOpacity: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs text-[#D6D5CE]">لون النص</span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { label: 'أبيض', hex: '#FFFFFF' },
                      { label: 'أصفر سينمائي', hex: '#FDE047' },
                      { label: 'ذهبي ملكي', hex: '#D4AF37' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSubtitleStyle((s) => ({ ...s, color: c.hex }))}
                      className={`rounded-lg border py-1.5 text-[11px] font-bold ${
                        subtitleStyle.color === c.hex
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                          : 'border-white/10 bg-[#16161F] text-[#D6D5CE]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Collapsible Cinema Calibration & Sleep Timer Drawer */}
        {activeDrawer === 'calibration' && (
          <aside
            aria-label="ضبط الصورة ومؤقت النوم"
            className="absolute inset-y-0 left-0 z-30 flex w-[320px] max-w-[92vw] flex-col gap-5 overflow-y-auto border-r border-[#D4AF37]/30 bg-[#0E0E14] p-4 shadow-2xl lg:static"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black text-[#F4F3EF]">
                ضبط الصورة ومؤقت النوم
              </h3>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                aria-label="إغلاق ضبط الصورة"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#17171F] text-[#D6D5CE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 border-b border-white/[0.07] pb-4">
              <span className="block text-xs font-bold text-[#D4AF37]">
                أوضاع العرض السينمائية
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalibration(DEFAULT_CALIBRATION)}
                  className="rounded-lg border border-white/10 bg-[#16161F] py-2 text-[11px] font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
                >
                  قياسي
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalibration({ brightness: 104, contrast: 112, saturation: 118 })
                  }
                  className="rounded-lg border border-white/10 bg-[#16161F] py-2 text-[11px] font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
                >
                  سينمائي
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalibration({ brightness: 84, contrast: 106, saturation: 92 })
                  }
                  className="rounded-lg border border-white/10 bg-[#16161F] py-2 text-[11px] font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
                >
                  ليلي مريح
                </button>
              </div>
            </div>

            <div className="space-y-4 border-b border-white/[0.07] pb-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">السطوع</span>
                  <span className="font-mono-tabular text-[#D4AF37]">
                    {calibration.brightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={calibration.brightness}
                  aria-label="السطوع"
                  onChange={(e) =>
                    setCalibration((c) => ({ ...c, brightness: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">التباين</span>
                  <span className="font-mono-tabular text-[#D4AF37]">
                    {calibration.contrast}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={calibration.contrast}
                  aria-label="التباين"
                  onChange={(e) =>
                    setCalibration((c) => ({ ...c, contrast: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">تشبع الألوان</span>
                  <span className="font-mono-tabular text-[#D4AF37]">
                    {calibration.saturation}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  value={calibration.saturation}
                  aria-label="تشبع الألوان"
                  onChange={(e) =>
                    setCalibration((c) => ({ ...c, saturation: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <button
                type="button"
                onClick={() => setCalibration(DEFAULT_CALIBRATION)}
                className="w-full rounded-lg border border-white/10 bg-[#16161F] py-2 text-xs font-bold text-[#9B9AA2] hover:text-white"
              >
                إعادة ضبط الصورة الافتراضية
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 text-[#D4AF37]">
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>مؤقت النوم التلقائي</span>
                </span>
                {sleepRemainingSec !== null && (
                  <span className="font-mono-tabular text-[#F4F3EF]">
                    {formatTimecode(sleepRemainingSec)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'إيقاف المؤقت', mins: 0 },
                  { label: '15 دقيقة', mins: 15 },
                  { label: '30 دقيقة', mins: 30 },
                  { label: '60 دقيقة', mins: 60 },
                ].map((opt) => (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() => {
                      if (opt.mins === 0) {
                        setSleepRemainingSec(null);
                        onToast('تم إلغاء مؤقت النوم');
                      } else {
                        setSleepRemainingSec(opt.mins * 60);
                        onToast(`تم ضبط مؤقت النوم على ${opt.label}`);
                      }
                    }}
                    className={`rounded-lg border py-2 text-xs font-bold transition-colors ${
                      opt.mins === 0 && sleepRemainingSec === null
                        ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                        : 'border-white/10 bg-[#16161F] text-[#D6D5CE] hover:border-[#D4AF37]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Collapsible Scene Filter Drawer */}
        {activeDrawer === 'filter' && (
          <aside
            aria-label="فلتر المشاهد العائلي"
            className="absolute inset-y-0 left-0 z-30 flex w-[340px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-r border-[#D4AF37]/30 bg-[#0E0E14] p-4 shadow-2xl lg:static"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black text-[#F4F3EF]">
                فلتر المشاهد العائلي المتقدم
              </h3>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                aria-label="إغلاق فلتر المشاهد"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#17171F] text-[#D6D5CE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 border-b border-white/[0.07] pb-4">
              <div className="text-xs font-bold text-[#D4AF37]">
                تحديد مشهد زمني للتخطي أو التغبيش
              </div>
              <select
                value={selectedCueAction}
                onChange={(e) => setSelectedCueAction(e.target.value as SceneCueAction)}
                aria-label="نوع الإجراء للمشهد"
                className="w-full rounded-lg border border-white/10 bg-[#16161F] px-3 py-2 text-xs text-[#F4F3EF]"
              >
                {Object.entries(CUE_ACTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingStartSec(currentTime);
                    onToast(`تم تحديد بداية المشهد عند ${formatTimecode(currentTime)}`);
                  }}
                  className="rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/12 py-2 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]"
                >
                  {pendingStartSec !== null
                    ? `البداية: ${formatTimecode(pendingStartSec)}`
                    : 'تحديد بداية الآن'}
                </button>
                <button
                  type="button"
                  disabled={pendingStartSec === null}
                  onClick={() => {
                    if (pendingStartSec === null) return;
                    addSceneCue(pendingStartSec, currentTime);
                    setPendingStartSec(null);
                  }}
                  className="rounded-lg bg-[#DC143C] py-2 text-xs font-extrabold text-white hover:bg-[#EF234B] disabled:opacity-40"
                >
                  تحديد نهاية وحفظ
                </button>
              </div>

              <button
                type="button"
                onClick={() => addSceneCue(currentTime, currentTime + 15)}
                className="w-full rounded-lg border border-white/10 bg-[#16161F] py-2 text-xs font-bold text-[#D6D5CE] hover:border-[#D4AF37]"
              >
                حفظ 15 ثانية قادمة بسرعة
              </button>

              {filterConfig.cues.length > 0 && (
                <div className="max-h-36 space-y-1.5 overflow-y-auto pt-1">
                  {filterConfig.cues.map((cue) => (
                    <div
                      key={cue.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-[#14141C] px-2.5 py-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <div className="font-mono-tabular font-bold text-[#F4F3EF]">
                          {formatTimecode(cue.start)} → {formatTimecode(cue.end)}
                        </div>
                        <div className="truncate text-[#9B9AA2]">
                          {CUE_ACTION_LABELS[cue.action]}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateFilter((prev) => ({
                            ...prev,
                            cues: prev.cues.filter((c) => c.id !== cue.id),
                          }))
                        }
                        aria-label="حذف قاعدة المشهد"
                        className="rounded p-1 text-rose-300 hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 border-b border-white/[0.07] pb-4">
              <div className="text-xs font-bold text-[#D4AF37]">
                عدسات التغبيش والتسويد الجزئية (سحب وإفلات)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateFilter((prev) => ({
                      ...prev,
                      lenses: [
                        ...prev.lenses,
                        {
                          id: `lens_${Date.now()}`,
                          x: 28,
                          y: 25,
                          w: 36,
                          h: 36,
                          mode: 'blur',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/12 py-2 text-xs font-bold text-[#D4AF37]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>عدسة تغبيش</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateFilter((prev) => ({
                      ...prev,
                      lenses: [
                        ...prev.lenses,
                        {
                          id: `lens_${Date.now()}`,
                          x: 32,
                          y: 30,
                          w: 34,
                          h: 34,
                          mode: 'black',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/12 bg-[#16161F] py-2 text-xs font-bold text-[#F4F3EF]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>عدسة تسويد</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#D6D5CE]">قوة التغبيش</span>
                  <span className="font-mono-tabular text-[#D4AF37]">
                    {filterConfig.blurPx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={60}
                  value={filterConfig.blurPx}
                  onChange={(e) =>
                    updateFilter((prev) => ({ ...prev, blurPx: Number(e.target.value) }))
                  }
                  className="w-full accent-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateFilter((prev) => ({
                      ...prev,
                      hideBorders: !prev.hideBorders,
                    }))
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#16161F] py-2 text-xs font-semibold text-[#D6D5CE]"
                >
                  {filterConfig.hideBorders ? (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{filterConfig.hideBorders ? 'إظهار الإطارات' : 'إخفاء الإطارات'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateFilter(() => createDefaultFilterConfig());
                    onToast('تم مسح جميع قواعد فلتر المشاهد لهذا العمل');
                  }}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  مسح كل القواعد
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-[#D4AF37]">
                مشاركة واستيراد قواعد الفلتر (JSON)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportFilter}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#16161F] py-2 text-xs font-semibold text-[#D6D5CE] hover:border-[#D4AF37]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>نسخ القواعد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTextOpen((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#16161F] py-2 text-xs font-semibold text-[#D6D5CE] hover:border-[#D4AF37]"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>استيراد قواعد</span>
                </button>
              </div>

              {importTextOpen && (
                <div className="space-y-2 pt-1">
                  <textarea
                    dir="ltr"
                    rows={3}
                    value={importJsonText}
                    onChange={(e) => setImportJsonText(e.target.value)}
                    placeholder='{"blurPx":28,"cues":[...]}'
                    className="w-full rounded-lg border border-white/10 bg-[#08080C] p-2 text-left font-mono text-[11px] text-[#F4F3EF]"
                  />
                  <button
                    type="button"
                    onClick={handleImportFilter}
                    className="w-full rounded-lg bg-[#D4AF37] py-1.5 text-xs font-extrabold text-[#060608]"
                  >
                    تطبيق القواعد المستوردة
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Collapsible Quick Episodes / Live Channels / Queue Switcher Drawer */}
        {activeDrawer === 'playlist' && media.playlist && (
          <aside
            aria-label={media.isLive ? 'تبديل القنوات السريع' : 'قائمة التشغيل'}
            className="absolute inset-y-0 left-0 z-30 flex w-[310px] max-w-[90vw] flex-col gap-3 overflow-y-auto border-r border-white/10 bg-[#0E0E14] p-4 shadow-2xl lg:static"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black text-[#F4F3EF]">
                {media.isLive ? 'تبديل القنوات السريع' : 'قائمة التشغيل'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDrawer('none')}
                aria-label="إغلاق القائمة"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#17171F] text-[#D6D5CE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {media.playlist.map((entry, idx) => {
                const active = idx === media.playlistIndex;
                return (
                  <button
                    key={`${entry.id}_${idx}`}
                    type="button"
                    onClick={() =>
                      onSwitchMedia({
                        ...entry,
                        playlist: media.playlist,
                        playlistIndex: idx,
                      })
                    }
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-right text-xs transition-colors ${
                      active
                        ? 'border-[#D4AF37] bg-[#D4AF37]/15 font-bold text-[#F4F3EF]'
                        : 'border-white/[0.06] bg-[#14141C] text-[#C6C5CE] hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{entry.title}</span>
                    {active && <span className="shrink-0 text-[10px] text-[#D4AF37]">يعمل الآن</span>}
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Transport Controls + Timeline Scene Markers */}
      <footer className="space-y-2.5 border-t border-white/[0.08] bg-[#0B0B0F] px-4 py-3">
        <div dir="ltr" className="flex items-center gap-3 text-xs text-[#9B9AA2]">
          <span className="font-mono-tabular w-14 text-right">
            {formatTimecode(currentTime)}
          </span>
          <div className="relative flex h-6 flex-1 items-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-white/10"
            >
              {Number.isFinite(duration) &&
                duration > 0 &&
                filterConfig.cues.map((cue) => {
                  const leftPct = Math.max(0, Math.min(100, (cue.start / duration) * 100));
                  const widthPct = Math.max(
                    1,
                    Math.min(100 - leftPct, ((cue.end - cue.start) / duration) * 100)
                  );
                  return (
                    <span
                      key={cue.id}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute inset-y-0 rounded-sm ${
                        cue.action === 'skip' ? 'bg-[#DC143C]' : 'bg-[#D4AF37]'
                      }`}
                    />
                  );
                })}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.05}
              value={seekPercent}
              onChange={(e) => handleSeekSlider(Number(e.target.value))}
              aria-label="شريط التقدم الزمني"
              className="relative z-10 w-full cursor-pointer accent-[#DC143C]"
            />
          </div>
          <span className="font-mono-tabular w-14">
            {media.isLive ? 'مباشر' : formatTimecode(duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC143C] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#EF234B]"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  <span>إيقاف</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>تشغيل</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => seekBy(-10)}
              aria-label="رجوع 10 ثوانٍ"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#15151C] px-3 py-2 text-xs font-bold text-[#F4F3EF] hover:border-white/25"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>10ث</span>
            </button>

            <button
              type="button"
              onClick={() => seekBy(10)}
              aria-label="تقديم 10 ثوانٍ"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#15151C] px-3 py-2 text-xs font-bold text-[#F4F3EF] hover:border-white/25"
            >
              <span>10ث</span>
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setUserMuted((m) => !m)}
              aria-label={userMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#15151C] text-[#F4F3EF] hover:border-white/25"
            >
              {userMuted || sceneEval.shouldMute ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="مستوى الصوت"
              className="w-20 accent-[#D4AF37]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={aspectMode}
              onChange={(e) => setAspectMode(e.target.value as AspectMode)}
              aria-label="نسبة عرض الصورة"
              className="rounded-lg border border-white/10 bg-[#15151C] px-2.5 py-2 text-xs font-semibold text-[#F4F3EF]"
            >
              <option value="contain">العرض: أصلي</option>
              <option value="cover">العرض: سينمائي كامل</option>
              <option value="fill">العرض: تمديد</option>
            </select>

            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = Number(e.target.value) || 1;
                setPlaybackRate(rate);
                if (videoRef.current) videoRef.current.playbackRate = rate;
              }}
              aria-label="سرعة التشغيل"
              className="font-mono-tabular rounded-lg border border-white/10 bg-[#15151C] px-2.5 py-2 text-xs font-semibold text-[#F4F3EF]"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2.0x</option>
            </select>

            {hasNext && (
              <button
                type="button"
                onClick={handleNextPlaylistItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-3.5 py-2 text-xs font-extrabold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]"
              >
                <span>{media.isLive ? 'القناة التالية' : 'التالي'}</span>
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
