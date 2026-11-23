import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Camera,
  Command,
  Film,
  ListVideo,
  Loader2,
  Megaphone,
  Monitor,
  Palette,
  Play,
  Plus,
  Radio,
  Search,
  Server,
  Smartphone,
  Sparkles,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import { HandDrawnDivider } from './components/HandDrawnOrnaments';
import type {
  AccountInfo,
  AppMode,
  CatalogData,
  EpgReminder,
  Episode,
  MediaFilterConfig,
  MediaItem,
  NavTab,
  PersistedAppState,
  PlayerMediaRequest,
  ProfileId,
  RemoteControlCommand,
  ServerProfile,
  SortOption,
  WatchProgressEntry,
} from './types/cinema';
import {
  BRAND_ASSETS,
  LEGAL_FTA_SERVER_PROFILE,
  SHOWCASE_SERVER_PROFILE,
  USER_PROFILES,
  buildShowcaseCatalog,
} from './data/showcaseCatalog';
import {
  filterAndSortItems,
  filterSafeCategories,
  pickRandomTonightItem,
} from './utils/cinemaLogic';
import {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from './utils/cinemaProUtils';
import {
  disconnectSocialProvider,
  fetchOfficialArtwork,
  searchAcrossAllServers,
  syncServerCatalog,
} from './services/xtreamApi';
import {
  formatCrossServerAnnouncement,
  type CrossServerMatch,
} from './utils/crossServerSearch';
import { realtimeClient } from './services/realtimeClient';
import { auth, googleProvider } from './firebase';
import {
  deleteUserServerFromCloud,
  ensureUserAccountDoc,
  saveUserServerToCloud,
  subscribeUserAccount,
  subscribeUserServers,
  updateUserAccountFields,
} from './services/cloudSync';
import { TopBar } from './components/TopBar';
import { HeroShowcase } from './components/HeroShowcase';
import { DiscoveryToolbar } from './components/DiscoveryToolbar';
import { MediaRow } from './components/MediaRow';
import { MediaCard } from './components/MediaCard';
import { DetailsModal } from './components/DetailsModal';
import { ServerManagerModal } from './components/ServerManagerModal';
import {
  ProVideoPlayer,
  type ActiveWatchPartyRequest,
  type RemotePlayerActionEvent,
} from './components/ProVideoPlayer';
import { AiConciergeDrawer } from './components/AiConciergeDrawer';
import { AiStudioHub } from './components/AiStudioHub';
import { PrivateSovereignAi } from './components/PrivateSovereignAi';
import { NovelsApp } from './components/NovelsApp';
import { TonightPickModal } from './components/TonightPickModal';
import { AuthModal } from './components/AuthModal';
import { EpgGuideModal } from './components/EpgGuideModal';
import { ProfilePinModal } from './components/ProfilePinModal';
import { WatchPartyModal } from './components/WatchPartyModal';
import { AppLockOverlay, SecurityShieldModal } from './components/SecurityShieldModal';
import { DeviceSelectorModal } from './components/DeviceSelectorModal';
import {
  ACCENT_THEMES,
  DraggableQuickDock,
  type AccentThemeId,
} from './components/DraggableQuickDock';
import { AdminCommandModal, isSuperAdminUser } from './components/AdminCommandModal';
import {
  DEVICE_CAPABILITIES,
  loadSavedDeviceMode,
  saveDeviceMode,
  suggestDeviceModeFromEnvironment,
  type DevicePlatformMode,
} from './utils/deviceModeUtils';
import {
  appendSecurityAuditEvent,
  loadSecurityShieldConfig,
  saveSecurityShieldConfig,
  type SecurityAuditCategory,
  type SecurityShieldConfig,
} from './utils/securityShield';
import { WHATSAPP_GROUPS_STORAGE_KEY } from './utils/whatsappGroupBridge';
import { MobileRemoteView } from './components/MobileRemoteView';
import {
  DevicePlatformModal,
  OfflineIndicator,
} from './components/DevicePlatformModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useTvRemoteNavigation } from './hooks/useTvRemoteNavigation';
import { isSmartTvUserAgent } from './utils/tvSpatialNav';
import type { NovelsDeepTab, ValdrionAppController } from './agents/appControlEngine';

const STORAGE_KEY = 'valdrion_cinema_v1';
const ACCENT_THEME_KEY = 'valdrion_accent_theme_v1';

const SERIES_ORGANIZED_GROUPS: Array<{
  id: string;
  label: string;
  subtitle: string;
  matcher: (item: MediaItem) => boolean;
}> = [
  {
    id: 'arabic',
    label: 'مسلسلات عربية وخليجية',
    subtitle: 'دراما عربية وتشويق وإنتاجات شرقية مميزة',
    matcher: (it) =>
      /(عرب|خليج|سوري|مصري|شام|تاريخي|رمضان|هيبة|الهيبة|ممالك|عاصفة|صحراء|arab|egypt|gulf)/i.test(
        `${it.title} ${(it.genres || []).join(' ')} ${it.desc || ''}`
      ),
  },
  {
    id: 'turkish',
    label: 'مسلسلات تركية',
    subtitle: 'أقوى الإنتاجات التركية التاريخية والدرامية',
    matcher: (it) =>
      /(ترك|عثمان|ارطغرل|حفرة|وادي|طائر|اسطنبول|turk|ottoman|ertugrul)/i.test(
        `${it.title} ${(it.genres || []).join(' ')} ${it.desc || ''}`
      ),
  },
  {
    id: 'anime',
    label: 'أنمي وكرتون',
    subtitle: 'أنمي ياباني وأعمال أنيميشن عالية التقييم',
    matcher: (it) =>
      /(أنمي|انمي|كرتون|أطفال|انيميشن|anime|animation|cartoon|one piece|naruto|attack|demon|jujutsu)/i.test(
        `${it.title} ${(it.genres || []).join(' ')} ${it.desc || ''}`
      ),
  },
  {
    id: 'global',
    label: 'مسلسلات أجنبية وعالمية',
    subtitle: 'أعمال عالمية وخيال علمي وإثارة عالية الدقة',
    matcher: (it) =>
      /(خيال علمي|sci-fi|أجنبي|عالمي|تنين|عروش|dragon|throne|stranger|breaking|dark|witcher|last of us|crown|space|cyber)/i.test(
        `${it.title} ${it.originalTitle || ''} ${(it.genres || []).join(' ')} ${it.desc || ''}`
      ),
  },
  {
    id: 'action_drama',
    label: 'دراما وأكشن وتشويق',
    subtitle: 'حلقات مشوقة وأكشن سينمائي وجريمة',
    matcher: (it) =>
      /(أكشن|اكشن|دراما|تشويق|غموض|جريمة|حرب|action|drama|thriller|crime|mystery)/i.test(
        `${it.title} ${(it.genres || []).join(' ')} ${it.desc || ''}`
      ),
  },
];

const CINEMA_MOOD_PICKS: Array<{
  id: string;
  label: string;
  regex: RegExp;
}> = [
  { id: 'action', label: 'حماس وأكشن', regex: /(أكشن|اكشن|معركة|حرب|قتال|action|war|battle|cyber)/i },
  { id: 'drama', label: 'دراما عميقة', regex: /(دراما|تاريخ|ملحمة|حياة|drama|history|epic)/i },
  { id: 'scifi', label: 'خيال وعوالم', regex: /(خيال|فضاء|فانتازيا|تنين|سحر|sci-fi|fantasy|space|dragon)/i },
  { id: 'mystery', label: 'تشويق وغموض', regex: /(تشويق|غموض|جريمة|رعب|تحقيق|thriller|mystery|crime|dark)/i },
  { id: 'family', label: 'عائلي وممتع', regex: /(عائلي|مغامرة|كوميدي|أنمي|انمي|family|adventure|animation)/i },
];
const BUILTIN_SERVERS: ServerProfile[] = [
  SHOWCASE_SERVER_PROFILE,
  LEGAL_FTA_SERVER_PROFILE,
];

function mergeWithBuiltInServers(customServers: ServerProfile[]): ServerProfile[] {
  const customOnly = customServers.filter(
    (s) =>
      s.id !== SHOWCASE_SERVER_PROFILE.id && s.id !== LEGAL_FTA_SERVER_PROFILE.id
  );
  return [...BUILTIN_SERVERS, ...customOnly];
}

function loadPersistedState(): PersistedAppState {
  const defaults: PersistedAppState = {
    familyGuard: true,
    activeProfileId: 'family',
    servers: BUILTIN_SERVERS,
    activeServerId: SHOWCASE_SERVER_PROFILE.id,
    favorites: [],
    watchQueue: [],
    progress: {},
    filters: {},
    pinHash: undefined,
    epgReminders: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    const mergedServers = mergeWithBuiltInServers(
      Array.isArray(parsed.servers) ? parsed.servers : []
    );

    return {
      familyGuard:
        typeof parsed.familyGuard === 'boolean' ? parsed.familyGuard : true,
      activeProfileId: parsed.activeProfileId || 'family',
      servers: mergedServers,
      activeServerId: parsed.activeServerId || SHOWCASE_SERVER_PROFILE.id,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      watchQueue: Array.isArray(parsed.watchQueue) ? parsed.watchQueue : [],
      progress: parsed.progress || {},
      filters: parsed.filters || {},
      pinHash: typeof parsed.pinHash === 'string' ? parsed.pinHash : undefined,
      epgReminders: Array.isArray(parsed.epgReminders) ? parsed.epgReminders : [],
    };
  } catch {
    return defaults;
  }
}

export default function App() {
  const [persisted, setPersisted] = useState<PersistedAppState>(() =>
    loadPersistedState()
  );
  const persistedRef = useRef<PersistedAppState>(persisted);
  persistedRef.current = persisted;

  // Firebase Auth State (Google Sign-In or Guest Mode)
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // Device Mode (TV Cinema-Only / Mobile / Desktop) — selectable on first launch & changeable anytime
  const [deviceMode, setDeviceMode] = useState<DevicePlatformMode>(() => {
    const saved = loadSavedDeviceMode();
    if (saved) return saved;
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return suggestDeviceModeFromEnvironment(navigator.userAgent, window.innerWidth);
    }
    return 'desktop';
  });
  const [devicePickerOpen, setDevicePickerOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('remote')) return false;
    }
    return loadSavedDeviceMode() === null;
  });
  const deviceCaps = DEVICE_CAPABILITIES[deviceMode];

  // Live 5-Color Accent Theme Switcher + Eye Comfort Night Filter + Ambient Rain Soundscape
  const [accentTheme, setAccentTheme] = useState<AccentThemeId>(() => {
    try {
      const saved = localStorage.getItem(ACCENT_THEME_KEY) as AccentThemeId | null;
      if (saved && saved in ACCENT_THEMES) return saved;
    } catch {
      // ignore
    }
    return 'gold';
  });
  const [eyeComfort, setEyeComfort] = useState(false);
  const [ambientRain, setAmbientRain] = useState(false);
  const rainAudioRef = useRef<{ ctx: AudioContext; gain: GainNode; src: AudioBufferSourceNode } | null>(null);

  // Super Admin Panel (strictly gated by 159laithosama159@gmail.com) & Global Announcement
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [globalAnnouncement, setGlobalAnnouncement] = useState('');
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const isSuperAdmin = useMemo(() => isSuperAdminUser(user), [user]);

  // Quick Command Palette (Ctrl+K) & Organized Series Group Filter
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [seriesSectionFilter, setSeriesSectionFilter] = useState<string>('all');

  const [tvMode, setTvMode] = useState<boolean>(() => {
    try {
      const savedDevice = loadSavedDeviceMode();
      if (savedDevice === 'tv') return true;
      const saved = localStorage.getItem('valdrion_tv_mode');
      if (saved === '1') return true;
      if (saved === '0') return false;
      return typeof navigator !== 'undefined' && isSmartTvUserAgent(navigator.userAgent);
    } catch {
      return false;
    }
  });
  const [studioInitialPrompt, setStudioInitialPrompt] = useState<string | undefined>(
    undefined
  );
  const [novelsInitialTab, setNovelsInitialTab] = useState<NovelsDeepTab | undefined>(
    undefined
  );

  // Standalone Applications: 'cinema', 'ai', 'novels', and decoupled encrypted 'private-ai'
  const [activeApp, setActiveApp] = useState<AppMode>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.toLowerCase();
        if (hash === '#private-ai' || hash === '#my-ai' || hash === '#vault') return 'private-ai';
        if (hash === '#novels' || hash === '#sutoor') return 'novels';
        if (hash === '#mind' || hash === '#ai' || hash === '#aethermind') return 'ai';
        if (hash === '#cinema') return 'cinema';
        const saved = localStorage.getItem('valdrion_active_app');
        if (saved === 'ai' || saved === 'cinema' || saved === 'novels' || saved === 'private-ai') {
          return saved;
        }
      }
    } catch {
      // ignore
    }
    return 'cinema';
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#private-ai' || hash === '#my-ai' || hash === '#vault') {
        setActiveApp('private-ai');
      } else if (hash === '#novels' || hash === '#sutoor') setActiveApp('novels');
      else if (hash === '#mind' || hash === '#ai' || hash === '#aethermind') setActiveApp('ai');
      else if (hash === '#cinema') setActiveApp('cinema');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (activeApp === 'private-ai') {
      document.title = 'VALDRION | فالدريون — الخزنة الخاصة';
    } else if (activeApp === 'ai') {
      document.title = 'VALDRION | فالدريون — الذكاء والقائد الشامل';
    } else if (activeApp === 'novels') {
      document.title = 'VALDRION | فالدريون — الروايات والمانهوا';
    } else {
      document.title = 'VALDRION | فالدريون — السينما والبث';
    }
  }, [activeApp]);

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);

  const switchApp = useCallback(
    (nextApp: AppMode) => {
      // Smart TV mode is strictly Cinema-Only for blazing speed & remote comfort
      if (deviceMode === 'tv' && nextApp !== 'cinema') {
        setActiveApp('cinema');
        return;
      }
      setActiveApp(nextApp);
      try {
        localStorage.setItem('valdrion_active_app', nextApp);
        if (typeof window !== 'undefined') {
          const targetHash =
            nextApp === 'private-ai'
              ? 'private-ai'
              : nextApp === 'ai'
              ? 'ai'
              : nextApp === 'novels'
              ? 'novels'
              : 'cinema';
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}#${targetHash}`
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch {
        // ignore
      }
    },
    [deviceMode]
  );

  // Apply Accent Theme CSS Custom Properties live across the whole platform
  useEffect(() => {
    const theme = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.gold;
    document.documentElement.style.setProperty('--accent-gold', theme.primary);
    document.documentElement.style.setProperty('--valdrion-accent', theme.primary);
    document.documentElement.style.setProperty('--accent-gold-soft', theme.glow);
    document.documentElement.dataset.accentTheme = accentTheme;
    try {
      localStorage.setItem(ACCENT_THEME_KEY, accentTheme);
    } catch {
      // ignore
    }
  }, [accentTheme]);

  // Enforce Smart TV Cinema-Only mode when deviceMode switches to 'tv'
  useEffect(() => {
    document.documentElement.dataset.deviceMode = deviceMode;
    if (deviceMode === 'tv') {
      setTvMode(true);
      if (activeApp !== 'cinema') {
        setActiveApp('cinema');
      }
    }
  }, [activeApp, deviceMode]);

  // Fetch Global Admin Announcement on mount
  useEffect(() => {
    fetch('/api/announcement')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { announcement?: string } | null) => {
        if (data?.announcement && data.announcement.trim()) {
          setGlobalAnnouncement(data.announcement.trim());
        }
      })
      .catch(() => {});
  }, []);

  // Procedural Ambient Rain Soundscape (zero external audio files!)
  useEffect(() => {
    if (!ambientRain) {
      if (rainAudioRef.current) {
        try {
          rainAudioRef.current.src.stop();
          void rainAudioRef.current.ctx.close();
        } catch {
          // ignore
        }
        rainAudioRef.current = null;
      }
      return undefined;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return undefined;
      const ctx = new AudioCtx();
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 2.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 680;

      const gain = ctx.createGain();
      gain.gain.value = 0.09;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      rainAudioRef.current = { ctx, gain, src };
    } catch {
      // ignore autoplay blocks
    }

    return () => {
      if (rainAudioRef.current) {
        try {
          rainAudioRef.current.src.stop();
          void rainAudioRef.current.ctx.close();
        } catch {
          // ignore
        }
        rainAudioRef.current = null;
      }
    };
  }, [ambientRain]);

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [search, setSearch] = useState('');
  const [crossServerSearchMatches, setCrossServerSearchMatches] = useState<CrossServerMatch[]>([]);
  const [crossServerSearching, setCrossServerSearching] = useState(false);
  const [sort, setSort] = useState<SortOption>('featured');
  const [selectedCat, setSelectedCat] = useState<Record<'movies' | 'series' | 'live', string>>({
    movies: 'all',
    series: 'all',
    live: 'all',
  });
  const [visibleLimit, setVisibleLimit] = useState<Record<'movies' | 'series' | 'live', number>>({
    movies: 18,
    series: 18,
    live: 16,
  });
  const lazySentinelRef = useRef<HTMLDivElement | null>(null);

  // Boot directly into the populated VALDRION Imperial Showcase catalog
  const [catalog, setCatalog] = useState<CatalogData>(() => buildShowcaseCatalog());
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>({
    status: 'نشط — باقة إمبراطورية',
    expiry: 'مفتوح دائماً',
    connections: '1 / غير محدود',
    serverLabel: SHOWCASE_SERVER_PROFILE.name,
  });

  const [seriesCache, setSeriesCache] = useState<
    Record<string, Record<string, Episode[]>>
  >({});
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  const [playerMedia, setPlayerMedia] = useState<PlayerMediaRequest | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);

  // Smart AI Concierge, Tonight's Pick, EPG, Watch Party, PIN Lock & Phone-to-TV Remote State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiPrefillQuery, setAiPrefillQuery] = useState<string | undefined>(undefined);
  const [tonightModalOpen, setTonightModalOpen] = useState(false);
  const [tonightPickId, setTonightPickId] = useState<string | null>(null);
  const [epgModalOpen, setEpgModalOpen] = useState(false);
  const [watchPartyModalOpen, setWatchPartyModalOpen] = useState(false);
  const [initialWatchParty, setInitialWatchParty] = useState<ActiveWatchPartyRequest | null>(null);
  const [activePartyCode, setActivePartyCode] = useState<string | null>(null);

  const [pinModalState, setPinModalState] = useState<{
    open: boolean;
    mode: 'setup' | 'verify';
    reason?: string;
    onVerifiedAction?: () => void;
  }>({ open: false, mode: 'setup' });

  const [mobileRemoteCode, setMobileRemoteCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const code = normalizeRoomCode(params.get('remote') || '');
    return isValidRoomCode(code) ? code : null;
  });
  const [remotePairCode, setRemotePairCode] = useState<string>(() => generateRoomCode(6));
  const [remotePhonesConnected, setRemotePhonesConnected] = useState(0);
  const [remotePlayerAction, setRemotePlayerAction] = useState<RemotePlayerActionEvent | null>(null);

  const [syncState, setSyncState] = useState({
    active: false,
    pct: 0,
    message: '',
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [securityShield, setSecurityShield] = useState<SecurityShieldConfig>(() =>
    loadSecurityShieldConfig()
  );
  const [securityShieldOpen, setSecurityShieldOpen] = useState(false);
  const [appLocked, setAppLocked] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  const updateSecurityShield = useCallback((next: SecurityShieldConfig) => {
    setSecurityShield(next);
    saveSecurityShieldConfig(next);
  }, []);

  const logSecurityEvent = useCallback(
    (
      category: SecurityAuditCategory,
      titleAr: string,
      detailAr: string,
      severity: 'info' | 'success' | 'warn' = 'info'
    ) => {
      setSecurityShield((prev) => {
        const next: SecurityShieldConfig = {
          ...prev,
          auditLog: appendSecurityAuditEvent(prev.auditLog, {
            category,
            titleAr,
            detailAr,
            severity,
          }),
        };
        saveSecurityShieldConfig(next);
        return next;
      });
    },
    []
  );

  const handleLockAppNow = useCallback(() => {
    if (!securityShield.credential) {
      setSecurityShieldOpen(true);
      showToast('أنشئ رمز قفل رئيسي أولاً داخل درع الأمان.');
      return;
    }
    setAppLocked(true);
    logSecurityEvent('lock', 'تم قفل التطبيق يدوياً', 'تم تفعيل شاشة القفل المشفّرة.', 'info');
  }, [logSecurityEvent, securityShield.credential, showToast]);

  const handleEmergencyWipe = useCallback(() => {
    void disconnectSocialProvider('all');
    try {
      localStorage.removeItem(WHATSAPP_GROUPS_STORAGE_KEY);
      localStorage.removeItem('valdrion_ai_sessions_v1');
      localStorage.removeItem('aethermind_ai_sessions_v3');
    } catch {
      // Ignore storage access errors
    }
    logSecurityEvent(
      'wipe',
      'تم تنفيذ مسح الطوارئ (Zero-Trace)',
      'تم فصل جميع جلسات التواصل الاجتماعي ومسح سجل المحادثات المحلية.',
      'warn'
    );
    showToast('تم تنفيذ مسح الطوارئ الفوري وفصل جميع الجلسات المربوطة بأمان!');
  }, [logSecurityEvent, showToast]);

  const handleSelectDeviceMode = useCallback(
    (nextMode: DevicePlatformMode) => {
      setDeviceMode(nextMode);
      saveDeviceMode(nextMode);
      setDevicePickerOpen(false);
      if (nextMode === 'tv') {
        setTvMode(true);
        setActiveApp('cinema');
        showToast('تم تفعيل وضع التلفزيون (سينما فقط · أسرع أداء وتحكم كامل بالريموت)');
      } else if (nextMode === 'mobile') {
        setTvMode(false);
        showToast('تم تفعيل وضع الهاتف الذكي — كامل قدرات فالدريون جاهزة باللمس');
      } else {
        setTvMode(false);
        showToast('تم تفعيل وضع الكمبيوتر الكامل — السينما والروايات 4D والذكاء الخارق');
      }
    },
    [showToast]
  );

  // Instant 1-Click Snapshot Capture ("التقاط صورة الآن") — grabs live video frame or renders clean VALDRION snapshot PNG
  const handleCaptureInstantSnapshot = useCallback(() => {
    try {
      const videoEl = document.querySelector('video');
      const canvas = document.createElement('canvas');
      if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `valdrion-video-frame-${Date.now()}.png`;
          a.click();
          showToast('تم التقاط صورة عالية الدقة من المشهد الحالي وحفظها فوراً!');
          return;
        }
      }

      // Render crisp branded VALDRION snapshot card for current screen
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const theme = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.gold;
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#0B0907');
      grad.addColorStop(1, '#1A1410');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, 1208, 648);

      ctx.fillStyle = theme.primary;
      ctx.font = 'bold 42px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('VALDRION | فالدريون', 1200, 120);

      ctx.fillStyle = '#F6ECDA';
      ctx.font = 'bold 34px Cairo, sans-serif';
      const currentServerLabel =
        persistedRef.current.servers.find((s) => s.id === persistedRef.current.activeServerId)
          ?.name || SHOWCASE_SERVER_PROFILE.name;
      const screenLabel =
        activeApp === 'ai'
          ? 'استوديو فالدريون AI — القائد الشامل'
          : activeApp === 'novels'
          ? 'مكتبة الروايات والمانهوا 4D'
          : activeApp === 'private-ai'
          ? 'خزنة فالدريون الخاصة المشفّرة'
          : `فالدريون سينما — ${currentServerLabel}`;
      ctx.fillText(screenLabel, 1200, 210);

      ctx.fillStyle = '#B5A78F';
      ctx.font = '24px Cairo, sans-serif';
      ctx.fillText(
        `اللقطة التُقطت بتاريخ: ${new Date().toLocaleString('ar-SA')}`,
        1200,
        280
      );
      ctx.fillText(
        `وضع الجهاز: ${DEVICE_CAPABILITIES[deviceMode].labelAr} · السمة: ${theme.label}`,
        1200,
        335
      );

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `valdrion-snapshot-${Date.now()}.png`;
      a.click();
      showToast('تم التقاط لقطة فورية وحفظها بصيغة PNG على جهازك!');
    } catch {
      showToast('تعذّر حفظ اللقطة على هذا المتصفح (بسبب قيود حماية مصدر الفيديو).');
    }
  }, [accentTheme, activeApp, deviceMode, showToast]);

  // Global panic lock shortcut (Ctrl+Shift+L) + Quick Command Palette (Ctrl+K)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLockAppNow();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && deviceMode !== 'tv') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deviceMode, handleLockAppNow]);

  useEffect(() => {
    if (!securityShield.credential || securityShield.idleLockMinutes <= 0 || appLocked) {
      return undefined;
    }
    let timer = window.setTimeout(() => {
      setAppLocked(true);
      logSecurityEvent(
        'lock',
        'قفل تلقائي عند الخمول',
        `تم قفل فالدريون تلقائياً بعد ${securityShield.idleLockMinutes} دقيقة من عدم النشاط.`,
        'info'
      );
    }, securityShield.idleLockMinutes * 60_000);

    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setAppLocked(true);
      }, securityShield.idleLockMinutes * 60_000);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [appLocked, logSecurityEvent, securityShield.credential, securityShield.idleLockMinutes]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Attach Firestore real-time cloud sync ONLY when authReady && user is signed in
  useEffect(() => {
    if (!authReady || !user) return undefined;

    let unsubAccount: (() => void) | null = null;
    let unsubServers: (() => void) | null = null;
    let cancelled = false;

    const snapshot = persistedRef.current;
    ensureUserAccountDoc(user, {
      familyGuard: snapshot.familyGuard,
      activeProfileId: snapshot.activeProfileId,
      activeServerId: snapshot.activeServerId,
      favorites: snapshot.favorites,
      watchQueue: snapshot.watchQueue,
    })
      .then(() => {
        if (cancelled) return;
        unsubAccount = subscribeUserAccount(user.uid, (cloudAcc) => {
          setPersisted((prev) => ({
            ...prev,
            familyGuard: cloudAcc.familyGuard,
            activeProfileId: cloudAcc.activeProfileId,
            activeServerId: cloudAcc.activeServerId,
            favorites: cloudAcc.favorites,
            watchQueue: cloudAcc.watchQueue,
          }));
        });

        unsubServers = subscribeUserServers(user.uid, (cloudServers) => {
          setPersisted((prev) => ({
            ...prev,
            servers: mergeWithBuiltInServers(cloudServers),
          }));
        });
      })
      .catch(() => {
        if (!cancelled) {
          showToast('تعذّرت المزامنة السحابية مؤقتاً — تم الإبقاء على الحفظ المحلي.');
        }
      });

    return () => {
      cancelled = true;
      unsubAccount?.();
      unsubServers?.();
    };
  }, [authReady, user, showToast]);

  const handleSignInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    showToast(`أهلاً بك ${cred.user.displayName || 'في فالدريون'} — تم تفعيل المزامنة السحابية`);
  }, [showToast]);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    showToast('تم تسجيل الخروج — أنت تتصفح الآن كضيف');
  }, [showToast]);

  // Persist user data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore quota errors
    }
  }, [persisted]);

  const activeServer = useMemo(
    () =>
      persisted.servers.find((s) => s.id === persisted.activeServerId) ||
      SHOWCASE_SERVER_PROFILE,
    [persisted.servers, persisted.activeServerId]
  );

  const activeProfile = useMemo(
    () =>
      USER_PROFILES.find((p) => p.id === persisted.activeProfileId) ||
      USER_PROFILES[1],
    [persisted.activeProfileId]
  );

  // Automatically enrich real official posters for any catalog item without one
  useEffect(() => {
    let cancelled = false;
    const missing = [
      ...catalog.vodStreams,
      ...catalog.seriesList,
      ...catalog.liveStreams,
    ]
      .filter((it) => !it.poster)
      .slice(0, 18);

    if (missing.length === 0) return undefined;

    Promise.all(
      missing.map(async (it) => {
        const art = await fetchOfficialArtwork(it.title, it.originalTitle, it.kind);
        return { id: it.id, art };
      })
    ).then((results) => {
      if (cancelled) return;
      const updates = new Map<string, { poster: string; backdrop: string }>();
      results.forEach(({ id, art }) => {
        if (art.posterUrl) {
          updates.set(id, {
            poster: art.posterUrl,
            backdrop: art.backdropUrl || art.posterUrl,
          });
        }
      });
      if (updates.size === 0) return;

      setCatalog((prev) => ({
        ...prev,
        vodStreams: prev.vodStreams.map((m) => {
          const u = updates.get(m.id);
          return u ? { ...m, poster: u.poster, backdrop: m.backdrop || u.backdrop } : m;
        }),
        seriesList: prev.seriesList.map((s) => {
          const u = updates.get(s.id);
          return u ? { ...s, poster: u.poster, backdrop: s.backdrop || u.backdrop } : s;
        }),
        liveStreams: prev.liveStreams.map((l) => {
          const u = updates.get(l.id);
          return u ? { ...l, poster: u.poster } : l;
        }),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [activeServer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync non-showcase active server if persisted from an earlier session
  useEffect(() => {
    if (activeServer.id === SHOWCASE_SERVER_PROFILE.id) return;
    let cancelled = false;
    syncServerCatalog(activeServer)
      .then((res) => {
        if (cancelled) return;
        setCatalog(res.catalog);
        setAccountInfo(res.accountInfo);
      })
      .catch(() => {
        if (cancelled) return;
        showToast('تعذّر إعادة الاتصال بالسيرفر السابق — تم تحميل المكتبة الإمبراطورية.');
      });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectServer = useCallback(
    async (server: ServerProfile) => {
      setSyncState({ active: true, pct: 8, message: 'جاري الاتصال بالسيرفر...' });
      try {
        const res = await syncServerCatalog(server, (pct, message) => {
          setSyncState({ active: true, pct, message });
        });
        setCatalog(res.catalog);
        setAccountInfo(res.accountInfo);
        setSeriesCache({});
        setSelectedCat({ movies: 'all', series: 'all', live: 'all' });
        setVisibleLimit({ movies: 18, series: 18, live: 16 });
        setPersisted((prev) => ({ ...prev, activeServerId: server.id }));
        if (user) {
          void updateUserAccountFields(user.uid, { activeServerId: server.id }).catch(
            () => {}
          );
        }
        window.setTimeout(() => {
          setSyncState({ active: false, pct: 0, message: '' });
          setServerModalOpen(false);
          showToast(`تم الاتصال بـ ${server.name} ومزامنة المكتبة`);
        }, 220);
      } catch (err) {
        setSyncState({ active: false, pct: 0, message: '' });
        const msg = err instanceof Error ? err.message : 'تحقق من الرابط أو فعّل الوسيط Proxy';
        showToast(`فشل الاتصال بالسيرفر: ${msg}`);
      }
    },
    [showToast, user]
  );

  const handleAddAndConnectServer = useCallback(
    async (server: ServerProfile) => {
      setPersisted((prev) => ({
        ...prev,
        servers: mergeWithBuiltInServers([server, ...prev.servers]),
      }));
      if (user) {
        void saveUserServerToCloud(user.uid, server).catch(() => {});
      }
      await handleConnectServer(server);
    },
    [handleConnectServer, user]
  );

  const handleAddMultipleServers = useCallback(
    async (newServers: ServerProfile[], connectFirst = true) => {
      if (newServers.length === 0) return;
      setPersisted((prev) => ({
        ...prev,
        servers: mergeWithBuiltInServers([...newServers, ...prev.servers]),
      }));
      if (user) {
        for (const srv of newServers) {
          void saveUserServerToCloud(user.uid, srv).catch(() => {});
        }
      }
      showToast(`تم حفظ ${newServers.length} سيرفر بنجاح في جهازك`);
      if (connectFirst && newServers[0]) {
        await handleConnectServer(newServers[0]);
      }
    },
    [handleConnectServer, showToast, user]
  );

  const handleDeleteServer = useCallback(
    (id: string) => {
      setPersisted((prev) => {
        const remaining = mergeWithBuiltInServers(
          prev.servers.filter((s) => s.id !== id)
        );
        const nextActiveId =
          prev.activeServerId === id
            ? SHOWCASE_SERVER_PROFILE.id
            : prev.activeServerId;
        return {
          ...prev,
          servers: remaining,
          activeServerId: nextActiveId,
        };
      });
      if (user) {
        void deleteUserServerFromCloud(user.uid, id).catch(() => {});
      }
      if (persisted.activeServerId === id) {
        setCatalog(buildShowcaseCatalog());
        setAccountInfo({
          status: 'نشط — باقة إمبراطورية',
          expiry: 'مفتوح دائماً',
          connections: '1 / غير محدود',
          serverLabel: SHOWCASE_SERVER_PROFILE.name,
        });
      }
      showToast('تم حذف السيرفر');
    },
    [persisted.activeServerId, showToast, user]
  );

  const handleRestoreShowcase = useCallback(async () => {
    await handleConnectServer(SHOWCASE_SERVER_PROFILE);
  }, [handleConnectServer]);

  // Automatic Cross-Server Search whenever the user searches in Cinema!
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2 || persisted.servers.length <= 1) {
      setCrossServerSearchMatches([]);
      setCrossServerSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCrossServerSearching(true);
      searchAcrossAllServers(q, persisted.servers, {
        kind:
          activeTab === 'movies'
            ? 'movie'
            : activeTab === 'series'
            ? 'series'
            : activeTab === 'live'
            ? 'live'
            : 'all',
        excludeServerId: persisted.activeServerId,
        signal: controller.signal,
      })
        .then((res) => {
          if (controller.signal.aborted) return;
          setCrossServerSearchMatches(res.matches);
          setCrossServerSearching(false);
          if (res.matches.length > 0) {
            const msg = formatCrossServerAnnouncement(q, res.matches);
            if (msg) showToast(msg);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setCrossServerSearching(false);
        });
    }, 520);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, activeTab, persisted.activeServerId, persisted.servers, showToast]);

  // Open or play a match found automatically on another saved server!
  const handleOpenCrossServerMatch = useCallback(
    (match: CrossServerMatch) => {
      const targetSrv = persisted.servers.find((s) => s.id === match.serverId);
      setPlayerMedia(null);
      if (targetSrv && targetSrv.id !== persisted.activeServerId) {
        setPersisted((prev) => ({ ...prev, activeServerId: targetSrv.id }));
      }
      if (match.item.kind === 'live' && match.item.url) {
        setDetailsItem(null);
        setPlayerMedia({
          id: match.item.id,
          title: match.item.title,
          meta: `${match.serverName} · بث مباشر`,
          url: match.item.url,
          isLive: true,
          poster: match.item.poster,
        });
        showToast(`جاري تشغيل «${match.item.title}» من سيرفر: ${match.serverName}`);
        return;
      }
      if (match.item.kind === 'movie' && match.item.url) {
        setDetailsItem(null);
        setPlayerMedia({
          id: match.item.id,
          title: match.item.title,
          meta: `${match.serverName} · ${match.qualityTag}`,
          url: match.item.url,
          isLive: false,
          poster: match.item.poster,
        });
        showToast(`جاري تشغيل «${match.item.title}» من سيرفر: ${match.serverName}`);
        return;
      }
      setDetailsItem(match.item);
      showToast(`تم فتح «${match.item.title}» من سيرفر: ${match.serverName}`);
    },
    [persisted.servers, persisted.activeServerId, showToast]
  );

  const applyProfileSelection = useCallback(
    (id: ProfileId) => {
      const target = USER_PROFILES.find((p) => p.id === id);
      if (!target) return;
      const nextFamilyGuard = target.enforceFamilyGuard
        ? true
        : persistedRef.current.familyGuard;
      setPersisted((prev) => ({
        ...prev,
        activeProfileId: id,
        familyGuard: nextFamilyGuard,
      }));
      if (user) {
        void updateUserAccountFields(user.uid, {
          activeProfileId: id,
          familyGuard: nextFamilyGuard,
        }).catch(() => {});
      }
      showToast(`تم التبديل إلى ملف: ${target.name}`);
    },
    [showToast, user]
  );

  const handleSelectProfile = useCallback(
    (id: ProfileId) => {
      const current = persistedRef.current;
      if (current.pinHash && current.activeProfileId === 'kids' && id !== 'kids') {
        setPinModalState({
          open: true,
          mode: 'verify',
          reason: 'أدخل رمز PIN العائلي للخروج من وضع الأطفال',
          onVerifiedAction: () => applyProfileSelection(id),
        });
        return;
      }
      applyProfileSelection(id);
    },
    [applyProfileSelection]
  );

  const applyFamilyGuardToggle = useCallback(() => {
    const next = !persistedRef.current.familyGuard;
    setPersisted((prev) => ({ ...prev, familyGuard: next }));
    if (user) {
      void updateUserAccountFields(user.uid, { familyGuard: next }).catch(() => {});
    }
    showToast(
      next
        ? 'تم تفعيل الحماية العائلية (إخفاء +18 تلقائياً)'
        : 'تم إيقاف الحماية العائلية'
    );
  }, [showToast, user]);

  const handleToggleFamilyGuard = useCallback(() => {
    const current = persistedRef.current;
    if (current.pinHash && current.familyGuard) {
      setPinModalState({
        open: true,
        mode: 'verify',
        reason: 'أدخل رمز PIN العائلي لإيقاف الحماية العائلية (+18)',
        onVerifiedAction: () => applyFamilyGuardToggle(),
      });
      return;
    }
    applyFamilyGuardToggle();
  }, [applyFamilyGuardToggle]);

  const handleToggleEpgReminder = useCallback(
    (channel: MediaItem) => {
      const current = persistedRef.current.epgReminders || [];
      const exists = current.some((r) => r.channelId === channel.id);
      const next: EpgReminder[] = exists
        ? current.filter((r) => r.channelId !== channel.id)
        : [
            {
              channelId: channel.id,
              channelTitle: channel.title,
              programTitle: channel.epg?.nextTitle || channel.epg?.title || channel.title,
              startTime: channel.epg?.endTime || 'قريباً',
              createdAt: Date.now(),
            },
            ...current,
          ];
      setPersisted((prev) => ({ ...prev, epgReminders: next }));
      showToast(
        exists
          ? `تم إلغاء التذكير لقناة ${channel.title}`
          : `تم تفعيل التذكير لقناة ${channel.title}`
      );
    },
    [showToast]
  );

  const isFavorite = useCallback(
    (id: string) => persisted.favorites.includes(id),
    [persisted.favorites]
  );

  const isInQueue = useCallback(
    (id: string) => persisted.watchQueue.includes(id),
    [persisted.watchQueue]
  );

  const handleToggleFavorite = useCallback(
    (id: string) => {
      const currentFavs = persistedRef.current.favorites;
      const exists = currentFavs.includes(id);
      const nextFavs = exists
        ? currentFavs.filter((x) => x !== id)
        : [id, ...currentFavs];
      setPersisted((prev) => ({ ...prev, favorites: nextFavs }));
      if (user) {
        void updateUserAccountFields(user.uid, { favorites: nextFavs }).catch(() => {});
      }
      showToast(exists ? 'تمت الإزالة من قائمتي' : 'تمت الإضافة إلى قائمتي');
    },
    [showToast, user]
  );

  const handleToggleQueue = useCallback(
    (id: string) => {
      const currentQueue = persistedRef.current.watchQueue;
      const exists = currentQueue.includes(id);
      const nextQueue = exists
        ? currentQueue.filter((x) => x !== id)
        : [...currentQueue, id];
      setPersisted((prev) => ({ ...prev, watchQueue: nextQueue }));
      if (user) {
        void updateUserAccountFields(user.uid, { watchQueue: nextQueue }).catch(
          () => {}
        );
      }
      showToast(
        exists ? 'تمت الإزالة من قائمة السهرة' : 'تمت الإضافة إلى قائمة السهرة'
      );
    },
    [showToast, user]
  );

  const handleSaveProgress = useCallback(
    (mediaId: string, parentId: string | undefined, t: number, d: number) => {
      const entry: WatchProgressEntry = { t, d, updated: Date.now() };
      setPersisted((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          [mediaId]: entry,
          ...(parentId ? { [parentId]: entry } : {}),
        },
      }));
    },
    []
  );

  const handleSaveFilter = useCallback(
    (mediaId: string, config: MediaFilterConfig) => {
      setPersisted((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          [mediaId]: config,
        },
      }));
    },
    []
  );

  const handleCacheSeries = useCallback(
    (itemId: string, seasons: Record<string, Episode[]>) => {
      setSeriesCache((prev) => ({ ...prev, [itemId]: seasons }));
    },
    []
  );

  // Filtered Catalog Slices
  const movies = useMemo(
    () =>
      filterAndSortItems(catalog.vodStreams, catalog.vodCategories, {
        familyGuard: persisted.familyGuard,
        kidsOnly: activeProfile.kidsOnly,
        search,
        sort: activeTab === 'movies' ? sort : 'featured',
        categoryId: activeTab === 'movies' ? selectedCat.movies : 'all',
      }),
    [
      catalog.vodStreams,
      catalog.vodCategories,
      persisted.familyGuard,
      activeProfile.kidsOnly,
      search,
      activeTab,
      sort,
      selectedCat.movies,
    ]
  );

  const series = useMemo(
    () =>
      filterAndSortItems(catalog.seriesList, catalog.seriesCategories, {
        familyGuard: persisted.familyGuard,
        kidsOnly: activeProfile.kidsOnly,
        search,
        sort: activeTab === 'series' ? sort : 'featured',
        categoryId: activeTab === 'series' ? selectedCat.series : 'all',
      }),
    [
      catalog.seriesList,
      catalog.seriesCategories,
      persisted.familyGuard,
      activeProfile.kidsOnly,
      search,
      activeTab,
      sort,
      selectedCat.series,
    ]
  );

  const liveStreams = useMemo(
    () =>
      filterAndSortItems(catalog.liveStreams, catalog.liveCategories, {
        familyGuard: persisted.familyGuard,
        kidsOnly: activeProfile.kidsOnly,
        search,
        sort: activeTab === 'live' ? sort : 'featured',
        categoryId: activeTab === 'live' ? selectedCat.live : 'all',
      }),
    [
      catalog.liveStreams,
      catalog.liveCategories,
      persisted.familyGuard,
      activeProfile.kidsOnly,
      search,
      activeTab,
      sort,
      selectedCat.live,
    ]
  );

  // Lightweight profile-safe pool capped for AI & Tonight's Pick so huge Xtream catalogs never freeze RAM
  const fullSafeCatalogForAI = useMemo(() => {
    return [
      ...movies.slice(0, 150),
      ...series.slice(0, 150),
      ...liveStreams.slice(0, 100),
    ];
  }, [movies, series, liveStreams]);

  const allSafeItems = useMemo(
    () => [
      ...movies.slice(0, 120),
      ...series.slice(0, 120),
      ...liveStreams.slice(0, 120),
    ],
    [movies, series, liveStreams]
  );

  const findItemById = useCallback(
    (id: string): MediaItem | undefined =>
      catalog.vodStreams.find((x) => x.id === id) ||
      catalog.seriesList.find((x) => x.id === id) ||
      catalog.liveStreams.find((x) => x.id === id),
    [catalog]
  );

  const featuredHeroItems = useMemo(() => {
    const pool = [...movies.slice(0, 40), ...series.slice(0, 40)].sort(
      (a, b) => (a.featuredRank ?? 99) - (b.featuredRank ?? 99)
    );
    return pool.slice(0, 4);
  }, [movies, series]);

  const topTenItems = useMemo(() => {
    return [...movies.slice(0, 60), ...series.slice(0, 60)]
      .sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'))
      .slice(0, 10);
  }, [movies, series]);

  const continueWatchingItems = useMemo(() => {
    return Object.entries(persisted.progress)
      .filter(([, v]) => v && v.t > 5 && v.d > 0 && v.t / v.d < 0.96)
      .sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0))
      .map(([id]) => findItemById(id))
      .filter((x): x is MediaItem => Boolean(x));
  }, [persisted.progress, findItemById]);

  const favoriteItems = useMemo(
    () =>
      persisted.favorites
        .map(findItemById)
        .filter((x): x is MediaItem => Boolean(x)),
    [persisted.favorites, findItemById]
  );

  const watchQueueItems = useMemo(
    () =>
      persisted.watchQueue
        .map(findItemById)
        .filter((x): x is MediaItem => Boolean(x)),
    [persisted.watchQueue, findItemById]
  );

  const buildPlayableEntry = useCallback(
    (item: MediaItem): PlayerMediaRequest | null => {
      if (item.kind === 'series') {
        const seasons = item.seasons || seriesCache[item.id];
        const firstSeasonKey = seasons ? Object.keys(seasons)[0] : null;
        const eps = firstSeasonKey && seasons ? seasons[firstSeasonKey] : null;
        if (eps && eps.length > 0) {
          const ep = eps[0];
          return {
            id: ep.id,
            parentId: item.id,
            title: `${item.title} — ${ep.title}`,
            meta: `الموسم ${firstSeasonKey} · الحلقة ${ep.epNum}`,
            url: ep.url,
            isLive: false,
            poster: item.poster,
          };
        }
        return null;
      }
      if (!item.url) return null;
      return {
        id: item.id,
        title: item.title,
        meta: item.isLive
          ? item.epg
            ? `مباشر · ${item.epg.title}`
            : 'بث مباشر · LIVE'
          : [item.quality || '4K', item.year].filter(Boolean).join(' · '),
        url: item.url,
        isLive: Boolean(item.isLive),
        poster: item.poster,
      };
    },
    [seriesCache]
  );

  const handleOpenItem = useCallback(
    (item: MediaItem) => {
      if (item.kind === 'live' && item.url) {
        const livePlaylist = liveStreams
          .filter((ch) => Boolean(ch.url))
          .map((ch) => ({
            id: ch.id,
            title: ch.title,
            meta: ch.epg ? `مباشر · ${ch.epg.title}` : 'بث مباشر · LIVE',
            url: ch.url || '',
            isLive: true,
            poster: ch.poster,
          }));
        const idx = livePlaylist.findIndex((p) => p.id === item.id);
        setPlayerMedia({
          id: item.id,
          title: item.title,
          meta: item.epg ? `مباشر · ${item.epg.title}` : 'بث مباشر · LIVE',
          url: item.url,
          isLive: true,
          poster: item.poster,
          playlist: livePlaylist.length > 1 ? livePlaylist : undefined,
          playlistIndex: idx >= 0 ? idx : 0,
        });
      } else {
        setDetailsItem(item);
      }
    },
    [liveStreams]
  );

  const handlePlayItemDirect = useCallback(
    (item: MediaItem) => {
      if (item.kind === 'live') {
        handleOpenItem(item);
        return;
      }
      if (item.kind === 'series') {
        const seasons = item.seasons || seriesCache[item.id];
        const firstSeasonKey = seasons ? Object.keys(seasons)[0] : null;
        const eps = firstSeasonKey && seasons ? seasons[firstSeasonKey] : null;
        if (eps && eps.length > 0) {
          const ep = eps[0];
          setPlayerMedia({
            id: ep.id,
            parentId: item.id,
            title: `${item.title} — ${ep.title}`,
            meta: `الموسم ${firstSeasonKey} · الحلقة ${ep.epNum}`,
            url: ep.url,
            isLive: false,
            poster: item.poster,
            playlist: eps.map((e) => ({
              id: e.id,
              parentId: item.id,
              title: `${item.title} — ${e.title}`,
              meta: `الموسم ${firstSeasonKey} · الحلقة ${e.epNum}`,
              url: e.url,
              isLive: false,
              poster: item.poster,
            })),
            playlistIndex: 0,
          });
          return;
        }
        setDetailsItem(item);
        return;
      }

      if (item.url) {
        setPlayerMedia({
          id: item.id,
          title: item.title,
          meta: [item.quality || '4K', item.year].filter(Boolean).join(' · '),
          url: item.url,
          isLive: false,
          poster: item.poster,
        });
      }
    },
    [handleOpenItem, seriesCache]
  );

  const handlePlaySequence = useCallback(
    (items: MediaItem[], label: string) => {
      const playlist = items
        .map(buildPlayableEntry)
        .filter((x): x is PlayerMediaRequest => Boolean(x));
      if (playlist.length === 0) {
        showToast('تعذّر تشغيل القائمة — اختر عملاً متاحاً للبث أولاً.');
        return;
      }
      setPlayerMedia({
        ...playlist[0],
        meta: `${label} · ${playlist[0].meta}`,
        playlist,
        playlistIndex: 0,
      });
      showToast(`تم تشغيل ${label} (${playlist.length} أعمال)`);
    },
    [buildPlayableEntry, showToast]
  );

  const handleOpenTonightPick = useCallback(() => {
    const pool = fullSafeCatalogForAI.filter((it) => it.kind !== 'live');
    const picked = pickRandomTonightItem(pool, tonightPickId || undefined);
    setTonightPickId(picked ? picked.id : null);
    setTonightModalOpen(true);
  }, [fullSafeCatalogForAI, tonightPickId]);

  const handleRerollTonightPick = useCallback(() => {
    const pool = fullSafeCatalogForAI.filter((it) => it.kind !== 'live');
    const picked = pickRandomTonightItem(pool, tonightPickId || undefined);
    setTonightPickId(picked ? picked.id : null);
  }, [fullSafeCatalogForAI, tonightPickId]);

  const tonightPickItem = useMemo(
    () => (tonightPickId ? findItemById(tonightPickId) || null : null),
    [tonightPickId, findItemById]
  );

  // Grid View Renderer for Movies / Series / Live
  const renderCatalogGrid = (tabKey: 'movies' | 'series' | 'live') => {
    const title =
      tabKey === 'movies'
        ? 'مكتبة الأفلام'
        : tabKey === 'series'
        ? 'المسلسلات والأنمي'
        : 'قنوات البث المباشر';
    const rawCats =
      tabKey === 'movies'
        ? catalog.vodCategories
        : tabKey === 'series'
        ? catalog.seriesCategories
        : catalog.liveCategories;
    const safeCats = filterSafeCategories(rawCats, persisted.familyGuard);
    const items = tabKey === 'movies' ? movies : tabKey === 'series' ? series : liveStreams;
    const activeCat = selectedCat[tabKey];
    const limit = visibleLimit[tabKey];
    const shown = items.slice(0, limit);

    // Organized Series Experience: clean categorized sections & shelves
    if (tabKey === 'series') {
      const groupedShelves = SERIES_ORGANIZED_GROUPS.map((grp) => ({
        ...grp,
        items: items.filter(grp.matcher),
      })).filter((g) => g.items.length > 0);

      const filteredSeries =
        seriesSectionFilter === 'all'
          ? items
          : groupedShelves.find((g) => g.id === seriesSectionFilter)?.items || items;

      const showShelvesView =
        seriesSectionFilter === 'all' &&
        activeCat === 'all' &&
        !search.trim() &&
        groupedShelves.length > 1;

      const shownSeries = filteredSeries.slice(0, limit);

      return (
        <div
          data-testid="organized-series-view"
          className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
            <div>
              <h1 className="text-2xl font-black text-[#F4F3EF] sm:text-3xl">
                {title} — مقسّمة ومرتّبة
              </h1>
              <p className="mt-1 text-xs tabular-nums text-[#9B9AA2]">
                {items.length} مسلسل وعمل درامي مقسّم حسب المنطقة والنوع ضمن {activeServer.name}
              </p>
            </div>
          </div>

          {/* Smart Organized Regional & Genre Section Tabs */}
          <div
            className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="أقسام المسلسلات المرتبة"
          >
            <button
              type="button"
              role="tab"
              aria-selected={seriesSectionFilter === 'all'}
              onClick={() => setSeriesSectionFilter('all')}
              className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                seriesSectionFilter === 'all'
                  ? 'bg-[var(--accent-gold)] text-[#060608]'
                  : 'border border-white/10 bg-[#111116] text-[#B5A78F] hover:text-white'
              }`}
            >
              الكل (مقسّم بأقسام) ({items.length})
            </button>
            {groupedShelves.map((grp) => (
              <button
                key={grp.id}
                type="button"
                role="tab"
                aria-selected={seriesSectionFilter === grp.id}
                onClick={() => setSeriesSectionFilter(grp.id)}
                className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                  seriesSectionFilter === grp.id
                    ? 'bg-[var(--accent-gold)] text-[#060608]'
                    : 'border border-white/10 bg-[#111116] text-[#B5A78F] hover:text-white'
                }`}
              >
                {grp.label} ({grp.items.length})
              </button>
            ))}
          </div>

          {/* Server Native Categories (if Xtream server has extra categories) */}
          {safeCats.length > 0 && (
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCat((prev) => ({ ...prev, series: 'all' }))}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                  activeCat === 'all'
                    ? 'border border-[var(--accent-gold)]/60 bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]'
                    : 'border border-white/10 bg-[#111116] text-[#9B9AA2] hover:text-white'
                }`}
              >
                كل تصنيفات السيرفر
              </button>
              {safeCats.map((cat) => {
                const active = String(activeCat) === String(cat.category_id);
                return (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() =>
                      setSelectedCat((prev) => ({
                        ...prev,
                        series: String(cat.category_id),
                      }))
                    }
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                      active
                        ? 'border border-[var(--accent-gold)]/60 bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]'
                        : 'border border-white/10 bg-[#111116] text-[#9B9AA2] hover:text-white'
                    }`}
                  >
                    {cat.category_name}
                  </button>
                );
              })}
            </div>
          )}

          {showShelvesView ? (
            <div className="space-y-10">
              {groupedShelves.map((grp) => (
                <MediaRow
                  key={grp.id}
                  title={grp.label}
                  subtitle={grp.subtitle}
                  items={grp.items}
                  isFavorite={isFavorite}
                  progressMap={persisted.progress}
                  onOpenItem={handleOpenItem}
                  onToggleFavorite={handleToggleFavorite}
                  onSeeAll={() => setSeriesSectionFilter(grp.id)}
                  seeAllLabel={`عرض القسم (${grp.items.length})`}
                />
              ))}
            </div>
          ) : shownSeries.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {shownSeries.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isFavorite={isFavorite(item.id)}
                    progress={persisted.progress[item.id]}
                    onOpen={handleOpenItem}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
              {filteredSeries.length > shownSeries.length && (
                <div ref={lazySentinelRef} className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleLimit((prev) => ({ ...prev, series: prev.series + 18 }))
                    }
                    className="rounded-lg border border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/12 px-6 py-2.5 text-sm font-bold text-[var(--accent-gold)] transition-colors hover:bg-[var(--accent-gold)] hover:text-[#060608]"
                  >
                    عرض المزيد ({filteredSeries.length - shownSeries.length} متبقي)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#101015] px-6 py-16 text-center text-sm text-[#9B9AA2]">
              لا توجد مسلسلات مطابقة للفلتر الحالي.
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#F4F3EF] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-xs tabular-nums text-[#9B9AA2]">
              {items.length} عمل متاح ضمن {activeServer.name}
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        {safeCats.length > 0 && (
          <div
            className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label={`تصنيفات ${title}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCat === 'all'}
              onClick={() =>
                setSelectedCat((prev) => ({ ...prev, [tabKey]: 'all' }))
              }
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                activeCat === 'all'
                  ? 'bg-[#D4AF37] text-[#060608]'
                  : 'border border-white/10 bg-[#111116] text-[#9B9AA2] hover:text-white'
              }`}
            >
              الكل
            </button>
            {safeCats.map((cat) => {
              const active = String(activeCat) === String(cat.category_id);
              return (
                <button
                  key={cat.category_id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() =>
                    setSelectedCat((prev) => ({
                      ...prev,
                      [tabKey]: String(cat.category_id),
                    }))
                  }
                  className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-[#D4AF37] text-[#060608]'
                      : 'border border-white/10 bg-[#111116] text-[#9B9AA2] hover:text-white'
                  }`}
                >
                  {cat.category_name}
                </button>
              );
            })}
          </div>
        )}

        {shown.length > 0 ? (
          <>
            <div
              className={`grid gap-4 sm:gap-5 ${
                tabKey === 'live'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
              }`}
            >
              {shown.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  isFavorite={isFavorite(item.id)}
                  progress={persisted.progress[item.id]}
                  onOpen={handleOpenItem}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {items.length > shown.length && (
              <div ref={lazySentinelRef} className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleLimit((prev) => ({
                      ...prev,
                      [tabKey]: prev[tabKey] + 18,
                    }))
                  }
                  className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/12 px-6 py-2.5 text-sm font-bold text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#060608]"
                >
                  عرض المزيد ({items.length - shown.length} متبقي)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#101015] px-6 py-16 text-center">
            {tabKey === 'live' ? (
              <Radio className="h-9 w-9 text-[#D4AF37]/70" aria-hidden="true" />
            ) : (
              <Film className="h-9 w-9 text-[#D4AF37]/70" aria-hidden="true" />
            )}
            <p className="text-sm font-bold text-[#F4F3EF]">
              لا توجد نتائج مطابقة للبحث أو الفلتر الحالي
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCat((prev) => ({ ...prev, [tabKey]: 'all' }));
                }}
                className="rounded-lg border border-white/15 bg-[#181822] px-4 py-2 text-xs font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
              >
                إعادة ضبط الفلتر
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiPrefillQuery(search.trim() || undefined);
                  setAiDrawerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-extrabold text-[#060608]"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>اسأل المساعد الذكي</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const relatedForDetails = useMemo(() => {
    if (!detailsItem) return [];
    const pool = detailsItem.kind === 'series' ? series : movies;
    return pool.filter((x) => x.id !== detailsItem.id).slice(0, 4);
  }, [detailsItem, movies, series]);

  // True Lazy Loading via IntersectionObserver so Smart TVs & laptops only render 2–3 rows at a time
  useEffect(() => {
    if (activeApp !== 'cinema') return;
    if (activeTab !== 'movies' && activeTab !== 'series' && activeTab !== 'live') return;
    const node = lazySentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleLimit((prev) => ({
            ...prev,
            [activeTab]: prev[activeTab] + 18,
          }));
        }
      },
      { rootMargin: '220px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeApp, activeTab, visibleLimit, catalog]);

  // Full App Control Bridge for VALDRION AI Commander
  const valdrionAppController = useMemo<ValdrionAppController>(
    () => ({
      switchApp,
      openCinemaTab: (tab) => {
        switchApp('cinema');
        setActiveTab(tab);
      },
      searchCinema: (q) => {
        switchApp('cinema');
        setSearch(q);
      },
      playCinemaByQuery: (query) => {
        const needle = query.trim().toLowerCase();
        if (!needle) return false;
        const pool = [...catalog.vodStreams, ...catalog.seriesList, ...catalog.liveStreams];
        const match =
          pool.find((it) => it.title.toLowerCase().includes(needle)) ||
          pool.find((it) => (it.originalTitle || '').toLowerCase().includes(needle));
        if (!match) {
          switchApp('cinema');
          setSearch(query);
          return false;
        }
        switchApp('cinema');
        handlePlayItemDirect(match);
        return true;
      },
      playRandomCinema: () => {
        const picked = pickRandomTonightItem([...movies.slice(0, 60), ...series.slice(0, 60)], tonightPickId);
        if (!picked) return false;
        setTonightPickId(picked.id);
        switchApp('cinema');
        handlePlayItemDirect(picked);
        return true;
      },
      openServersModal: () => {
        switchApp('cinema');
        setServerModalOpen(true);
      },
      importServersLocally: async (newServers, connectFirst = true) => {
        switchApp('cinema');
        await handleAddMultipleServers(newServers, connectFirst);
      },
      exportServersBackup: () => {
        const list = persistedRef.current.servers.filter((s) => s.type !== 'showcase');
        const payload = JSON.stringify(
          {
            exportedBy: 'VALDRION Omni-Commander',
            exportedAt: new Date().toISOString(),
            count: list.length,
            servers: list.map((s) => ({
              name: s.name,
              type: s.type,
              host: s.host,
              username: s.username || '',
              password: s.password || '',
            })),
          },
          null,
          2
        );
        const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `valdrion-servers-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(
          list.length > 0
            ? `تم تنزيل نسخة احتياطية تحتوي على ${list.length} سيرفر إلى جهازك.`
            : 'تم تنزيل ملف السيرفرات (لا توجد سيرفرات خارجية مضافة بعد).'
        );
        return list.length;
      },
      openEpgModal: () => {
        switchApp('cinema');
        setEpgModalOpen(true);
      },
      openWatchPartyModal: () => {
        switchApp('cinema');
        setWatchPartyModalOpen(true);
      },
      openDevicesModal: () => {
        switchApp('cinema');
        setDeviceModalOpen(true);
      },
      openAuthModal: () => {
        switchApp('cinema');
        setAuthModalOpen(true);
      },
      setTvMode: (enabled) => {
        setTvMode(enabled);
        showToast(enabled ? 'تم تفعيل وضع التلفاز الخفيف (TV Lite Mode)' : 'تم إيقاف وضع التلفاز الخفيف');
      },
      setFamilyGuard: (enabled) => {
        setPersisted((prev) => ({ ...prev, familyGuard: enabled }));
        if (user) {
          void updateUserAccountFields(user.uid, { familyGuard: enabled }).catch(() => {});
        }
        showToast(enabled ? 'تم تفعيل الحماية العائلية' : 'تم إيقاف الحماية العائلية');
      },
      switchProfile: (profileId) => {
        switchApp('cinema');
        handleSelectProfile(profileId);
      },
      openNovelsTab: (tab) => {
        setNovelsInitialTab(tab);
        switchApp('novels');
      },
      openSecurityShield: () => {
        setSecurityShieldOpen(true);
      },
      lockAppNow: () => {
        handleLockAppNow();
      },
      addWebCinemaItems: (items) => {
        if (!Array.isArray(items) || items.length === 0) return 0;
        const mapped: MediaItem[] = items.map((it) => ({
          id: it.id,
          kind: it.kind || 'movie',
          category_id: 'web_archive',
          title: it.title,
          originalTitle: it.title,
          poster: it.poster || BRAND_ASSETS.emblem,
          backdrop: it.poster || BRAND_ASSETS.emblem,
          desc: it.desc || 'فيلم من الأرشيف السينمائي المفتوح.',
          year: it.year || 'كلاسيك',
          rating: '8.4',
          genres: ['أرشيف مفتوح', 'إنترنت'],
          quality: it.quality || 'HD',
          url: it.url,
        }));
        setCatalog((prev) => ({
          ...prev,
          vodStreams: [
            ...mapped,
            ...prev.vodStreams.filter((x) => !mapped.some((m) => m.id === x.id)),
          ],
        }));
        switchApp('cinema');
        setActiveTab('movies');
        return mapped.length;
      },
    }),
    [
      catalog,
      handleAddMultipleServers,
      handleLockAppNow,
      handlePlayItemDirect,
      handleSelectProfile,
      movies,
      series,
      showToast,
      switchApp,
      tonightPickId,
      user,
    ]
  );

  // Sync Smart TV 10-foot mode attribute & activate D-Pad spatial remote navigation
  useEffect(() => {
    document.documentElement.dataset.tvMode = tvMode ? 'true' : 'false';
    try {
      localStorage.setItem('valdrion_tv_mode', tvMode ? '1' : '0');
    } catch {
      // ignore
    }
  }, [tvMode]);

  useTvRemoteNavigation({
    enabled: !mobileRemoteCode,
    suspended: Boolean(playerMedia) || Boolean(mobileRemoteCode),
  });

  // Phone-to-TV QR Remote WebSocket Host Listener
  useEffect(() => {
    if (mobileRemoteCode) return undefined;

    const registerHost = () => {
      realtimeClient.send({ type: 'remote:host', pairCode: remotePairCode });
    };

    const unsub = realtimeClient.subscribe((msg) => {
      const type = String(msg.type || '');
      if (type === 'remote:status' && typeof msg.phonesConnected === 'number') {
        setRemotePhonesConnected(msg.phonesConnected);
      } else if (type === 'remote:cmd' && msg.command && typeof msg.command === 'object') {
        const cmd = msg.command as RemoteControlCommand;
        if (cmd.type === 'dpad' && cmd.key) {
          const keyMap: Record<string, string> = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            ok: 'Enter',
            back: 'Escape',
          };
          const mapped = keyMap[cmd.key];
          if (mapped) {
            if (cmd.key === 'ok' && document.activeElement instanceof HTMLElement) {
              document.activeElement.click();
            } else {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: mapped, bubbles: true })
              );
            }
          }
        } else if (cmd.type === 'tab' && cmd.tab) {
          if (cmd.tab === 'ai') {
            switchApp('ai');
          } else {
            switchApp('cinema');
            setActiveTab(cmd.tab);
          }
        } else if (cmd.type === 'search' && typeof cmd.query === 'string') {
          setSearch(cmd.query);
          switchApp('cinema');
          setActiveTab('home');
        } else if (cmd.type === 'tv_mode') {
          setTvMode((prev) => !prev);
        } else if (cmd.type === 'ai_prompt' && cmd.prompt) {
          setStudioInitialPrompt(cmd.prompt);
          switchApp('ai');
          showToast('تم إرسال الأمر من الهاتف إلى VALDRION MIND');
        } else if (cmd.type === 'player' && cmd.playerAction) {
          const actionMap: Record<
            NonNullable<RemoteControlCommand['playerAction']>,
            RemotePlayerActionEvent['action']
          > = {
            toggle: 'play_pause',
            seek_fwd: 'seek_forward',
            seek_back: 'seek_back',
            mute: 'mute',
            panic: 'panic',
            close: 'close',
          };
          const mappedAction = actionMap[cmd.playerAction];
          if (mappedAction) {
            setRemotePlayerAction({ nonce: Date.now(), action: mappedAction });
          }
        }
      }
    }, registerHost);

    registerHost();
    return () => unsub();
  }, [remotePairCode, mobileRemoteCode, showToast, switchApp]);

  // Auto-join Watch Party if opened via ?party=CODE invite link
  useEffect(() => {
    if (typeof window === 'undefined' || mobileRemoteCode) return;
    const params = new URLSearchParams(window.location.search);
    const partyParam = normalizeRoomCode(params.get('party') || '');
    if (!isValidRoomCode(partyParam)) return;

    const fallbackItem = featuredHeroItems[0] || movies[0] || liveStreams[0];
    if (fallbackItem) {
      const entry = buildPlayableEntry(fallbackItem);
      if (entry) {
        setInitialWatchParty({
          roomCode: partyParam,
          userName: user?.displayName || 'ضيف فالدريون',
          mode: 'join',
        });
        setPlayerMedia(entry);
        showToast(`جاري الانضمام إلى غرفة المشاهدة (${partyParam})...`);
      }
    }
    params.delete('party');
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateWatchParty = useCallback(
    (roomCode: string, userName: string, item: MediaItem) => {
      const entry = buildPlayableEntry(item);
      if (!entry) {
        showToast('تعذّر تشغيل هذا العمل في غرفة المشاهدة.');
        return;
      }
      setWatchPartyModalOpen(false);
      setInitialWatchParty({ roomCode, userName, mode: 'create' });
      setPlayerMedia(entry);
    },
    [buildPlayableEntry, showToast]
  );

  const handleJoinWatchParty = useCallback(
    (roomCode: string, userName: string) => {
      const fallbackItem = featuredHeroItems[0] || movies[0] || liveStreams[0];
      const entry = fallbackItem ? buildPlayableEntry(fallbackItem) : null;
      if (!entry) {
        showToast('تعذّر فتح المشغل للانضمام.');
        return;
      }
      setWatchPartyModalOpen(false);
      setInitialWatchParty({ roomCode, userName, mode: 'join' });
      setPlayerMedia(entry);
    },
    [featuredHeroItems, movies, liveStreams, buildPlayableEntry, showToast]
  );

  // Dedicated Phone-to-TV Remote Pad View (?remote=CODE)
  if (mobileRemoteCode) {
    return (
      <MobileRemoteView
        initialPairCode={mobileRemoteCode}
        onExitRemote={() => {
          setMobileRemoteCode(null);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  // Helper Banner for Mobile Phone Shell Mode (makes Phone visually & ergonomically distinct from Desktop!)
  const renderPhoneModeTopStrip = () =>
    deviceMode === 'mobile' ? (
      <div
        dir="rtl"
        data-testid="phone-mode-banner"
        className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-[var(--accent-gold)]/35 bg-[#120E09]/98 px-3 py-1.5 text-[11px] font-bold text-[#F5D68A] backdrop-blur-md"
      >
        <span className="inline-flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
          <span>وضع الهاتف الذكي</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectDeviceMode('desktop')}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-extrabold text-slate-200 hover:border-[#D9A441] hover:text-white"
          >
            <Monitor className="h-3 w-3" />
            <span>كمبيوتر</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectDeviceMode('tv')}
            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-extrabold text-slate-200 hover:border-[#D9A441] hover:text-white"
          >
            <Tv className="h-3 w-3" />
            <span>تلفاز</span>
          </button>
        </div>
      </div>
    ) : null;

  const sharedMobileBottomNav =
    !playerMedia && deviceMode !== 'tv' ? (
      <MobileBottomNav
        activeApp={activeApp}
        activeTab={activeTab}
        favoritesCount={persisted.favorites.length}
        forceShow={deviceMode === 'mobile'}
        onSelectTab={(tab) => {
          switchApp('cinema');
          setActiveTab(tab);
        }}
        onSwitchToNovels={() => switchApp('novels')}
        onSwitchToAi={() => switchApp('ai')}
        onOpenServers={() => {
          switchApp('cinema');
          setServerModalOpen(true);
        }}
      />
    ) : null;

  // Standalone App 3: SUTOOR NOVELS (Full Arabic Novels, Luxury Reader & AI Author Studio)
  if (activeApp === 'novels') {
    return (
      <div
        className={
          deviceMode === 'mobile'
            ? 'min-h-screen bg-[#050406]'
            : 'min-h-screen'
        }
      >
        <div
          className={
            deviceMode === 'mobile'
              ? 'mx-auto min-h-screen w-full max-w-[480px] overflow-x-clip border-x border-[var(--accent-gold)]/25 bg-[#100D14] pb-20 shadow-[0_0_90px_rgba(0,0,0,0.95)]'
              : ''
          }
        >
          {renderPhoneModeTopStrip()}
          <NovelsApp
            initialTab={novelsInitialTab}
            deviceMode={deviceMode}
            onConsumeInitialTab={() => setNovelsInitialTab(undefined)}
            onSwitchToAi={() => switchApp('ai')}
            onSwitchToCinema={() => switchApp('cinema')}
            onSwitchToPrivateAi={() => switchApp('private-ai')}
            onOpenDevicePicker={() => setDevicePickerOpen(true)}
            onToast={showToast}
          />
        </div>
        {sharedMobileBottomNav}
        <DraggableQuickDock
          visible={deviceCaps.showFloatingDock && deviceMode !== 'mobile'}
          deviceMode={deviceMode}
          accentTheme={accentTheme}
          eyeComfort={eyeComfort}
          ambientRain={ambientRain}
          onChangeAccentTheme={(t) => {
            setAccentTheme(t);
            showToast(`تم تغيير لون التطبيق إلى: ${ACCENT_THEMES[t].label}`);
          }}
          onToggleEyeComfort={() => {
            setEyeComfort((v) => !v);
            showToast(!eyeComfort ? 'تم تفعيل فلتر راحة العين الليلي' : 'تم إيقاف فلتر راحة العين');
          }}
          onToggleAmbientRain={() => {
            setAmbientRain((v) => !v);
            showToast(!ambientRain ? 'تم تشغيل صوت المطر الهادئ للقراءة' : 'تم إيقاف صوت المطر');
          }}
          onOpenDeviceSelector={() => setDevicePickerOpen(true)}
          onOpenSecurityShield={() => setSecurityShieldOpen(true)}
          onCaptureSnapshot={handleCaptureInstantSnapshot}
        />
        <DeviceSelectorModal
          open={devicePickerOpen}
          currentMode={deviceMode}
          canClose={loadSavedDeviceMode() !== null}
          onSelectMode={handleSelectDeviceMode}
          onClose={() => setDevicePickerOpen(false)}
        />
        {eyeComfort && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[95] bg-amber-500/[0.11] mix-blend-multiply"
          />
        )}
        <OfflineIndicator />
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-amber-400/50 bg-[#1B1712]/95 px-5 py-2.5 text-center text-xs font-bold text-[#FBF5E8] shadow-2xl backdrop-blur-md sm:text-sm"
          >
            {toastMsg}
          </div>
        )}
      </div>
    );
  }

  // Standalone App 4: VALDRION PRIVATE VAULT (100% Decoupled, Zero-Cloud, AES-256 Encrypted)
  if (activeApp === 'private-ai') {
    return (
      <>
        <PrivateSovereignAi
          onExitToHub={() => switchApp('ai')}
          onSwitchToCinema={() => switchApp('cinema')}
          onSwitchToNovels={() => switchApp('novels')}
          onToast={showToast}
        />
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed top-16 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-emerald-500/45 bg-[#0C1220]/95 px-4 py-2 text-center text-xs font-bold text-slate-100 shadow-2xl backdrop-blur-md sm:text-sm"
          >
            {toastMsg}
          </div>
        )}
      </>
    );
  }

  // Standalone App 2: AETHERMIND AI (Full-Screen Rebranded AI OS)
  if (activeApp === 'ai') {
    return (
      <div className={deviceMode === 'mobile' ? 'min-h-screen bg-[#05060B]' : 'min-h-screen'}>
        <div
          className={
            deviceMode === 'mobile'
              ? 'mx-auto min-h-screen w-full max-w-[480px] overflow-x-clip border-x border-[var(--accent-gold)]/25 bg-[#0B0D14] pb-20 shadow-[0_0_90px_rgba(0,0,0,0.95)]'
              : ''
          }
        >
          {renderPhoneModeTopStrip()}
          <AiStudioHub
            user={user}
            catalogItems={fullSafeCatalogForAI}
            findItemById={findItemById}
            activeProfileName={activeProfile.name}
            familyGuard={persisted.familyGuard}
            activeServerName={activeServer.name}
            watchQueue={persisted.watchQueue}
            initialPrompt={studioInitialPrompt}
            onClearInitialPrompt={() => setStudioInitialPrompt(undefined)}
            onPlayItem={(it) => {
              switchApp('cinema');
              handlePlayItemDirect(it);
            }}
            onOpenDetails={(it) => {
              switchApp('cinema');
              setDetailsItem(it);
            }}
            onToggleQueue={handleToggleQueue}
            onPlaySequence={(items, label) => {
              switchApp('cinema');
              handlePlaySequence(items, label);
            }}
            onApplyTab={(tab) => {
              if (tab !== 'ai') {
                switchApp('cinema');
                setActiveTab(tab);
              }
            }}
            onApplySearch={(q) => {
              switchApp('cinema');
              setSearch(q);
            }}
            onApplyProfile={handleSelectProfile}
            onSwitchToCinema={() => switchApp('cinema')}
            onSwitchToNovels={() => switchApp('novels')}
            onSwitchToPrivateAi={() => switchApp('private-ai')}
            appController={valdrionAppController}
            onToast={showToast}
          />
        </div>
        {sharedMobileBottomNav}
        <OfflineIndicator />
        <DraggableQuickDock
          visible={deviceCaps.showFloatingDock && deviceMode !== 'mobile'}
          deviceMode={deviceMode}
          accentTheme={accentTheme}
          eyeComfort={eyeComfort}
          ambientRain={ambientRain}
          onChangeAccentTheme={(t) => {
            setAccentTheme(t);
            showToast(`تم تغيير لون التطبيق إلى: ${ACCENT_THEMES[t].label}`);
          }}
          onToggleEyeComfort={() => {
            setEyeComfort((v) => !v);
            showToast(!eyeComfort ? 'تم تفعيل فلتر راحة العين الليلي' : 'تم إيقاف فلتر راحة العين');
          }}
          onToggleAmbientRain={() => {
            setAmbientRain((v) => !v);
            showToast(!ambientRain ? 'تم تشغيل صوت المطر الهادئ للتركيز' : 'تم إيقاف صوت المطر');
          }}
          onOpenDeviceSelector={() => setDevicePickerOpen(true)}
          onOpenSecurityShield={() => setSecurityShieldOpen(true)}
          onCaptureSnapshot={handleCaptureInstantSnapshot}
        />
        <DeviceSelectorModal
          open={devicePickerOpen}
          currentMode={deviceMode}
          canClose={loadSavedDeviceMode() !== null}
          onSelectMode={handleSelectDeviceMode}
          onClose={() => setDevicePickerOpen(false)}
        />
        {eyeComfort && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[95] bg-amber-500/[0.11] mix-blend-multiply"
          />
        )}
        <SecurityShieldModal
          open={securityShieldOpen}
          onClose={() => setSecurityShieldOpen(false)}
          config={securityShield}
          onChangeConfig={updateSecurityShield}
          onLockNow={handleLockAppNow}
          onEmergencyWipe={handleEmergencyWipe}
          onLogEvent={logSecurityEvent}
          onToast={showToast}
        />
        <AppLockOverlay
          locked={appLocked}
          credential={securityShield.credential}
          onUnlockSuccess={() => {
            setAppLocked(false);
            logSecurityEvent('lock', 'تم فك قفل التطبيق بنجاح', 'التحقق المشفّر مكتمل.', 'success');
          }}
          onFailedAttempt={() => {
            logSecurityEvent('lock', 'محاولة فاشلة لفك القفل', 'تم تسجيل محاولة إدخال رمز غير صحيح.', 'warn');
          }}
        />
        {toastMsg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-[#60A5FA]/50 bg-[#141824]/95 px-5 py-2.5 text-center text-xs font-bold text-[#F1F5F9] shadow-2xl backdrop-blur-md sm:text-sm"
          >
            {toastMsg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        deviceMode === 'mobile'
          ? 'min-h-screen bg-[#050403]'
          : 'min-h-screen bg-[#0B0907]'
      }
    >
      <div
        className={`flex min-h-screen flex-col bg-[#0B0907] text-[#F3EBD8] ${
          deviceMode === 'mobile'
            ? 'mx-auto w-full max-w-[480px] overflow-x-clip border-x border-[var(--accent-gold)]/25 pb-16 shadow-[0_0_90px_rgba(0,0,0,0.95)]'
            : ''
        }`}
      >
        {renderPhoneModeTopStrip()}

        {/* Smart TV 10-Foot Cinema-Only Remote Guide Strip */}
        {deviceMode === 'tv' && (
          <div
            dir="rtl"
            data-testid="tv-mode-banner"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/30 bg-gradient-to-l from-[#1C1408] via-[#120D06] to-[#1C1408] px-5 py-2 text-xs font-extrabold text-[#F6D37A]"
          >
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-amber-400" />
              <span>وضع شاشات السمارت TV — سينما فورية عالية السرعة · تنقّل بالريموت (↑ ↓ ← → و OK)</span>
            </div>
            <button
              type="button"
              onClick={() => setDevicePickerOpen(true)}
              className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-[11px] font-black text-amber-100 hover:bg-amber-400 hover:text-[#110D08]"
            >
              تبديل الجهاز (هاتف / كمبيوتر)
            </button>
          </div>
        )}
      {/* Global Admin Announcement Banner */}
      {globalAnnouncement && !announcementDismissed && (
        <div
          dir="rtl"
          className="flex items-center justify-between gap-3 border-b border-[var(--accent-gold)]/40 bg-gradient-to-l from-[#241B10] via-[#1B140C] to-[#241B10] px-4 py-2 text-xs font-bold text-[#F8EDD4]"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-[var(--accent-gold)]" aria-hidden="true" />
            <span>{globalAnnouncement}</span>
          </div>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="إغلاق الإعلان"
            className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'ai') {
            switchApp('ai');
            return;
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSwitchToAi={() => switchApp('ai')}
        onSwitchToNovels={() => switchApp('novels')}
        onSwitchToPrivateAi={() => switchApp('private-ai')}
        onOpenServers={() => setServerModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenDevices={() => setDeviceModalOpen(true)}
        onOpenDevicePicker={() => setDevicePickerOpen(true)}
        deviceMode={deviceMode}
        deviceCaps={deviceCaps}
        isSuperAdmin={isSuperAdmin}
        onOpenAdminModal={() => setAdminModalOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSecurityShield={() => setSecurityShieldOpen(true)}
        hasAppLock={Boolean(securityShield.credential)}
        onToggleTvMode={() => {
          setTvMode((prev) => {
            const next = !prev;
            showToast(
              next
                ? 'تم تفعيل وضع التلفاز الخفيف (بدون ضبابية + تحكم بأسهم الريموت)'
                : 'تم إيقاف وضع التلفاز الخفيف'
            );
            return next;
          });
        }}
        tvMode={tvMode}
        user={user}
        favoritesCount={persisted.favorites.length}
        onToast={showToast}
      />

      <main className="flex-1">
        {/* Home Tab: Full-bleed Hero First, Discovery Toolbar directly below */}
        {activeTab === 'home' && !search.trim() && (
          <HeroShowcase
            items={featuredHeroItems}
            serverName={activeServer.name}
            isFavorite={isFavorite}
            isInQueue={isInQueue}
            onPlay={handlePlayItemDirect}
            onOpenDetails={(it) => setDetailsItem(it)}
            onToggleFavorite={handleToggleFavorite}
            onToggleQueue={handleToggleQueue}
          />
        )}

        <DiscoveryToolbar
          search={search}
          onSearchChange={setSearch}
          familyGuard={persisted.familyGuard}
          onToggleFamilyGuard={handleToggleFamilyGuard}
          activeProfileId={persisted.activeProfileId}
          onSelectProfile={handleSelectProfile}
          pinEnabled={Boolean(persisted.pinHash)}
          onOpenPinModal={() =>
            setPinModalState({ open: true, mode: 'setup' })
          }
          showSort={activeTab !== 'home' && activeTab !== 'mylist'}
          sort={sort}
          onSortChange={setSort}
          activeServerName={activeServer.name}
          watchQueueCount={watchQueueItems.length}
          remindersCount={(persisted.epgReminders || []).length}
          activePartyCode={activePartyCode}
          onOpenAiConcierge={(prefill) => {
            if (prefill) {
              setStudioInitialPrompt(prefill);
              switchApp('ai');
            } else {
              setAiDrawerOpen(true);
            }
          }}
          onOpenTonightPick={handleOpenTonightPick}
          onOpenWatchParty={() => setWatchPartyModalOpen(true)}
          onOpenEpgGuide={() => setEpgModalOpen(true)}
          onPlayWatchQueue={() =>
            handlePlaySequence(watchQueueItems, 'قائمة السهرة')
          }
        />

        {/* PROMINENT ALWAYS-VISIBLE CINEMA SERVERS BAR (Xtream / M3U / Quick Switch) */}
        <section
          dir="rtl"
          data-testid="cinema-servers-bar"
          aria-label="شريط السيرفرات السريع بالسينما"
          className="border-b border-[#D9A441]/25 bg-gradient-to-l from-[#17120A] via-[#120E09] to-[#17120A]"
        >
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3 py-1.5 text-xs font-black text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
                <Server className="h-3.5 w-3.5 text-emerald-300" />
                <span>السيرفر النشط: {activeServer.name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {persisted.servers.slice(0, 5).map((srv) => {
                  const isCurrent = srv.id === activeServer.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => void handleConnectServer(srv)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-extrabold transition ${
                        isCurrent
                          ? 'border-[#F5D68A] bg-[#D9A441] text-[#110D08]'
                          : 'border-white/12 bg-white/[0.04] text-[#D7CCB8] hover:border-[#D9A441]/60 hover:text-white'
                      }`}
                    >
                      {srv.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              data-testid="cinema-open-servers-btn"
              onClick={() => setServerModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#F5D68A]/70 bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] px-3.5 py-1.5 text-xs font-black text-[#110D08] shadow-[0_4px_16px_rgba(217,164,65,0.35)] transition hover:brightness-110 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إدارة وإضافة سيرفرات (Xtream / M3U) · ({persisted.servers.length})</span>
            </button>
          </div>
        </section>

        {/* AUTOMATIC CROSS-SERVER LIVE SEARCH RESULTS BANNER */}
        {search.trim().length >= 2 &&
          persisted.servers.length > 1 &&
          (crossServerSearching || crossServerSearchMatches.length > 0) && (
            <section
              dir="rtl"
              data-testid="cross-server-search-banner"
              aria-label="نتائج البحث التلقائي في كل السيرفرات"
              className="mx-auto mt-4 max-w-[1440px] px-4 sm:px-6 lg:px-10"
            >
              <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-l from-emerald-950/60 via-[#0E1815] to-[#14111A] p-4 shadow-xl">
                {crossServerSearching ? (
                  <div className="flex items-center gap-2.5 text-xs font-extrabold text-emerald-200">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>
                      جاري البحث التلقائي عن «{search.trim()}» في جميع السيرفرات المضافة ({persisted.servers.length} سيرفرات)...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-black text-emerald-300 sm:text-sm">
                        <Server className="h-4 w-4" aria-hidden="true" />
                        <span>
                          تم العثور تلقائياً على «{search.trim()}» في سيرفراتك الأخرى ({crossServerSearchMatches.length} نتيجة جاهزة)!
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-200/80">
                        اضغط على أي نتيجة لفتحها أو تشغيلها فوراً
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {crossServerSearchMatches.slice(0, 9).map((m) => (
                        <button
                          key={`${m.serverId}_${m.item.id}`}
                          type="button"
                          onClick={() => handleOpenCrossServerMatch(m)}
                          className="group flex items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-black/35 px-3 py-2.5 text-right transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-500/15"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-white group-hover:text-emerald-200">
                              {m.item.title}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-emerald-300/90">
                              السيرفر: {m.serverName} ·{' '}
                              {m.item.kind === 'series'
                                ? 'مسلسل'
                                : m.item.kind === 'live'
                                ? 'بث مباشر'
                                : 'فيلم'}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-[#D9A441] px-2 py-1 text-[10px] font-black text-[#110D08]">
                            {m.qualityTag}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

        {/* Global Search Results on Home */}
        {activeTab === 'home' && search.trim() ? (
          <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
              <h1 className="text-xl font-black text-[#F4F3EF]">
                نتائج البحث عن "{search.trim()}" ({allSafeItems.length})
              </h1>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAiPrefillQuery(search.trim());
                    setAiDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/45 bg-[#D4AF37]/12 px-3 py-1.5 text-xs font-extrabold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>بحث أعمق بالمساعد الذكي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs font-bold text-[#9B9AA2] hover:text-white"
                >
                  مسح البحث
                </button>
              </div>
            </div>

            {allSafeItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {allSafeItems.slice(0, 60).map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isFavorite={isFavorite(item.id)}
                    progress={persisted.progress[item.id]}
                    onOpen={handleOpenItem}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-[#101015] py-16 text-center text-sm text-[#9B9AA2]">
                <p>لم نعثر على تطابق حرفي لـ "{search.trim()}".</p>
                <button
                  type="button"
                  onClick={() => {
                    setAiPrefillQuery(search.trim());
                    setAiDrawerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-extrabold text-[#060608]"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>دع مرشد فالدريون الذكي يبحث بالمعنى والوصف</span>
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'home' ? (
          <div className="mx-auto max-w-[1440px] space-y-12 px-4 py-10 sm:px-6 lg:px-10">
            {/* Smart Cinema Mood Matcher ("شو أحضر اليوم؟") */}
            <section
              data-testid="cinema-mood-matcher"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--accent-gold)]/25 bg-[#120F0C] px-4 py-3.5"
            >
              <div>
                <h2 className="text-sm font-black text-[#F6ECDA]">
                  شو مزاجك للمشاهدة اليوم؟
                </h2>
                <p className="text-[11px] text-[#B5A78F]">
                  اختر مزاجك وسنرشّح لك عملاً مناسباً من المكتبة فوراً بضغطة واحدة
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {CINEMA_MOOD_PICKS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => {
                      const pool = [...movies, ...series];
                      const matches = pool.filter((it) =>
                        mood.regex.test(`${it.title} ${(it.genres || []).join(' ')} ${it.desc || ''}`)
                      );
                      const chosen =
                        matches.length > 0
                          ? matches[Math.floor(Math.random() * matches.length)]
                          : pool[0];
                      if (chosen) {
                        setDetailsItem(chosen);
                        showToast(`ترشيح مزاج «${mood.label}»: ${chosen.title}`);
                      }
                    }}
                    className="rounded-xl border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-extrabold text-[#F3EBD8] transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/15 hover:text-white"
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </section>

            {continueWatchingItems.length > 0 && (
              <MediaRow
                title="متابعة المشاهدة"
                subtitle="استأنف من آخر لحظة توقفت عندها تلقائياً"
                items={continueWatchingItems}
                isFavorite={isFavorite}
                progressMap={persisted.progress}
                onOpenItem={handleOpenItem}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            <MediaRow
              title="الأكثر مشاهدة اليوم — Top 10"
              subtitle="أعلى الأعمال تقييماً في مكتبة فالدريون بالملصقات الرسمية"
              items={topTenItems}
              ranked
              isFavorite={isFavorite}
              progressMap={persisted.progress}
              onOpenItem={handleOpenItem}
              onToggleFavorite={handleToggleFavorite}
            />

            <MediaRow
              title="الأفلام السينمائية المختارة"
              subtitle="عروض عالية الدقة 4K و HDR مع دعم فلتر المشاهد العائلي وضبط الصورة"
              items={movies}
              isFavorite={isFavorite}
              progressMap={persisted.progress}
              onOpenItem={handleOpenItem}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={() => setActiveTab('movies')}
              seeAllLabel={`عرض الكل (${movies.length})`}
            />

            <MediaRow
              title="المسلسلات والأنمي"
              subtitle="مواسم كاملة وتنقل سلس بين الحلقات داخل المشغل"
              items={series}
              isFavorite={isFavorite}
              progressMap={persisted.progress}
              onOpenItem={handleOpenItem}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={() => setActiveTab('series')}
              seeAllLabel={`عرض الكل (${series.length})`}
            />

            <MediaRow
              title="قنوات البث المباشر — Live TV"
              subtitle="بث فوري بتقنية HLS مع وضع 4 شاشات (Quad Multi-View) ودليل البرامج"
              items={liveStreams}
              isFavorite={isFavorite}
              progressMap={persisted.progress}
              onOpenItem={handleOpenItem}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={() => setActiveTab('live')}
              seeAllLabel={`عرض الكل (${liveStreams.length})`}
            />
          </div>
        ) : activeTab === 'movies' ? (
          renderCatalogGrid('movies')
        ) : activeTab === 'series' ? (
          renderCatalogGrid('series')
        ) : activeTab === 'live' ? (
          renderCatalogGrid('live')
        ) : (
          /* My List & Watch-Night Queue View */
          <div className="mx-auto max-w-[1440px] space-y-10 px-4 py-8 sm:px-6 lg:px-10">
            {/* Watch-Night Queue Section */}
            {watchQueueItems.length > 0 && (
              <section className="space-y-4 rounded-2xl border border-[#D4AF37]/30 bg-[#101016] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ListVideo className="h-5 w-5 text-[#D4AF37]" aria-hidden="true" />
                    <div>
                      <h2 className="text-lg font-black text-[#F4F3EF]">
                        قائمة السهرة المتتابعة ({watchQueueItems.length})
                      </h2>
                      <p className="text-xs text-[#9B9AA2]">
                        تشغيل متواصل للأعمال المختارة بالترتيب داخل المشغل
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handlePlaySequence(watchQueueItems, 'قائمة السهرة')
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC143C] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#EF234B]"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>تشغيل السهرة الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPersisted((prev) => ({ ...prev, watchQueue: [] }));
                        showToast('تم تفريغ قائمة السهرة');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171722] px-3 py-2 text-xs font-bold text-[#9B9AA2] hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>تفريغ</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {watchQueueItems.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      isFavorite={isFavorite(item.id)}
                      progress={persisted.progress[item.id]}
                      onOpen={handleOpenItem}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </section>
            )}

            <div className="space-y-6">
              <div className="border-b border-white/[0.07] pb-4">
                <h1 className="text-2xl font-black text-[#F4F3EF] sm:text-3xl">
                  قائمتي المفضلة
                </h1>
                <p className="mt-1 text-xs tabular-nums text-[#9B9AA2]">
                  {favoriteItems.length} عمل محفوظ للمشاهدة لاحقاً
                </p>
              </div>

              {favoriteItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {favoriteItems.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      isFavorite={true}
                      progress={persisted.progress[item.id]}
                      onOpen={handleOpenItem}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#101015] px-6 py-16 text-center">
                  <p className="text-sm font-bold text-[#F4F3EF]">
                    قائمتك المفضلة فارغة حالياً
                  </p>
                  <p className="max-w-md text-xs text-[#9B9AA2]">
                    اضغط على أيقونة الحفظ على أي فيلم أو مسلسل أو قناة لبناء مكتبتك الشخصية.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="rounded-lg bg-[#DC143C] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#EF234B]"
                  >
                    استكشاف المكتبة
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Hand-Drawn Editorial Atelier Footer */}
      <footer className="mt-12 border-t border-[#D9A441]/20 bg-[#0E0B08] pb-20 md:pb-0">
        <div className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-6 lg:px-10">
          <HandDrawnDivider />
        </div>
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-4 py-7 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3.5">
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار التنين المرسوم يدوياً لفالدريون"
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-full border border-[#D9A441]/70 object-cover"
            />
            <div>
              <div className="font-imperial text-base font-bold tracking-[0.14em] text-[#F6ECDA]">
                VALDRION
              </div>
              <p className="text-xs text-[#B5A78F]">
                دار فالدريون — السينما الإمبراطورية وسيرفرات Xtream/M3U ومرسم الذكاء الاصطناعي
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#B5A78F]">
            <button
              type="button"
              onClick={() => setServerModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-semibold text-[#D9A441] hover:underline"
            >
              <Server className="h-3.5 w-3.5" aria-hidden="true" />
              <span>إدارة السيرفرات ({persisted.servers.length})</span>
            </button>
            <span aria-hidden="true" className="text-[#D9A441]/30">
              ◆
            </span>
            <button
              type="button"
              onClick={() => switchApp('ai')}
              className="inline-flex items-center gap-1.5 font-semibold text-[#93C5FD] hover:text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#60A5FA]" aria-hidden="true" />
              <span>تطبيق الذكاء الاصطناعي (أثيرمايند AI)</span>
            </button>
            <span aria-hidden="true" className="text-white/20">
              ·
            </span>
            <button
              type="button"
              onClick={() => setDeviceModalOpen(true)}
              className="font-semibold text-[#D6D5CE] hover:text-[#D4AF37]"
            >
              الأندرويد والكمبيوتر وشاشات السمارت (TV)
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (hidden on Smart TV, always visible in Phone Mode) */}
      {sharedMobileBottomNav}

      {/* Modals, AI Concierge Drawer & Pro Cinema Player */}
      <AiConciergeDrawer
        open={aiDrawerOpen}
        initialQuery={aiPrefillQuery}
        onClearInitialQuery={() => setAiPrefillQuery(undefined)}
        catalogItems={fullSafeCatalogForAI}
        findItemById={findItemById}
        activeProfileName={activeProfile.name}
        familyGuard={persisted.familyGuard}
        activeServerName={activeServer.name}
        watchQueue={persisted.watchQueue}
        onClose={() => setAiDrawerOpen(false)}
        onPlayItem={handlePlayItemDirect}
        onOpenDetails={(it) => setDetailsItem(it)}
        onToggleQueue={handleToggleQueue}
        onPlaySequence={handlePlaySequence}
        onApplyTab={(tab) => setActiveTab(tab)}
        onApplySearch={(q) => setSearch(q)}
        onApplyProfile={handleSelectProfile}
        onToast={showToast}
      />

      <TonightPickModal
        open={tonightModalOpen}
        item={tonightPickItem}
        profileName={activeProfile.name}
        inQueue={tonightPickItem ? isInQueue(tonightPickItem.id) : false}
        onClose={() => setTonightModalOpen(false)}
        onReroll={handleRerollTonightPick}
        onPlay={handlePlayItemDirect}
        onOpenDetails={(it) => setDetailsItem(it)}
        onToggleQueue={handleToggleQueue}
      />

      <DetailsModal
        item={detailsItem}
        activeServer={activeServer}
        allServers={persisted.servers}
        isFavorite={detailsItem ? isFavorite(detailsItem.id) : false}
        isInQueue={detailsItem ? isInQueue(detailsItem.id) : false}
        progress={detailsItem ? persisted.progress[detailsItem.id] : undefined}
        seriesCache={seriesCache}
        onCacheSeries={handleCacheSeries}
        onClose={() => setDetailsItem(null)}
        onToggleFavorite={handleToggleFavorite}
        onToggleQueue={handleToggleQueue}
        onPlayMedia={(req) => setPlayerMedia(req)}
        onSelectCrossServerMatch={handleOpenCrossServerMatch}
        onToast={showToast}
        relatedItems={relatedForDetails}
        onSelectRelated={(it) => setDetailsItem(it)}
      />

      <ServerManagerModal
        open={serverModalOpen}
        servers={persisted.servers}
        activeServerId={persisted.activeServerId}
        accountInfo={accountInfo}
        syncState={syncState}
        user={user}
        onClose={() => setServerModalOpen(false)}
        onOpenAuth={() => {
          setServerModalOpen(false);
          setAuthModalOpen(true);
        }}
        onConnectServer={handleConnectServer}
        onAddAndConnectServer={handleAddAndConnectServer}
        onAddMultipleServers={handleAddMultipleServers}
        onDeleteServer={handleDeleteServer}
        onRestoreShowcase={handleRestoreShowcase}
      />

      <AuthModal
        open={authModalOpen}
        user={user}
        authLoading={!authReady}
        savedServersCount={
          persisted.servers.filter((s) => s.type !== 'showcase').length
        }
        favoritesCount={persisted.favorites.length}
        onClose={() => setAuthModalOpen(false)}
        onSignInWithGoogle={handleSignInWithGoogle}
        onContinueAsGuest={() =>
          showToast('أنت تتصفح الآن كضيف — يتم الحفظ محلياً على جهازك')
        }
        onSignOut={handleSignOut}
      />

      <DevicePlatformModal
        open={deviceModalOpen}
        tvMode={tvMode}
        remotePairCode={remotePairCode}
        remotePhonesConnected={remotePhonesConnected}
        onRegeneratePairCode={() => {
          const next = generateRoomCode(6);
          setRemotePairCode(next);
          showToast(`تم توليد رمز اقتران ريموت جديد (${next})`);
        }}
        onOpenRemotePadHere={() => {
          setDeviceModalOpen(false);
          setMobileRemoteCode(remotePairCode);
        }}
        onToggleTvMode={() => {
          setTvMode((prev) => {
            const next = !prev;
            showToast(
              next
                ? 'تم تفعيل وضع شاشات السمارت (TV) — استخدم أسهم الريموت للتنقل'
                : 'تم العودة للوضع القياسي'
            );
            return next;
          });
        }}
        onClose={() => setDeviceModalOpen(false)}
        onToast={showToast}
      />

      <EpgGuideModal
        open={epgModalOpen}
        liveChannels={liveStreams}
        reminders={persisted.epgReminders || []}
        onToggleReminder={handleToggleEpgReminder}
        onPlayChannel={(ch) => {
          setEpgModalOpen(false);
          handleOpenItem(ch);
        }}
        onClose={() => setEpgModalOpen(false)}
      />

      <ProfilePinModal
        open={pinModalState.open}
        mode={pinModalState.mode}
        existingPinHash={persisted.pinHash}
        verifyReason={pinModalState.reason}
        onSavePin={(newHash) => {
          setPersisted((prev) => ({ ...prev, pinHash: newHash }));
          showToast(
            newHash
              ? 'تم تفعيل قفل PIN العائلي بنجاح'
              : 'تم إزالة قفل PIN العائلي'
          );
        }}
        onVerified={() => {
          pinModalState.onVerifiedAction?.();
        }}
        onClose={() => setPinModalState({ open: false, mode: 'setup' })}
      />

      <WatchPartyModal
        open={watchPartyModalOpen}
        defaultUserName={user?.displayName || activeProfile.name}
        featuredItems={[...movies, ...liveStreams].slice(0, 14)}
        onCreateParty={handleCreateWatchParty}
        onJoinParty={handleJoinWatchParty}
        onClose={() => setWatchPartyModalOpen(false)}
        onToast={showToast}
      />

      <OfflineIndicator />

      <ProVideoPlayer
        media={playerMedia}
        liveChannels={liveStreams}
        allServers={persisted.servers}
        activeServerId={activeServer.id}
        initialFilter={playerMedia ? persisted.filters[playerMedia.id] : undefined}
        savedProgress={playerMedia ? persisted.progress[playerMedia.id] : undefined}
        defaultUserName={user?.displayName || activeProfile.name}
        initialWatchParty={initialWatchParty}
        remotePlayerAction={remotePlayerAction}
        onWatchPartyCodeChange={setActivePartyCode}
        onSaveProgress={handleSaveProgress}
        onSaveFilter={handleSaveFilter}
        onSwitchMedia={(next) => setPlayerMedia(next)}
        onOpenAlternateMatch={handleOpenCrossServerMatch}
        onClose={() => {
          setPlayerMedia(null);
          setInitialWatchParty(null);
        }}
        onToast={showToast}
      />

      <SecurityShieldModal
        open={securityShieldOpen}
        onClose={() => setSecurityShieldOpen(false)}
        config={securityShield}
        onChangeConfig={updateSecurityShield}
        onLockNow={handleLockAppNow}
        onEmergencyWipe={handleEmergencyWipe}
        onLogEvent={logSecurityEvent}
        onToast={showToast}
      />

      <AppLockOverlay
        locked={appLocked}
        credential={securityShield.credential}
        onUnlockSuccess={() => {
          setAppLocked(false);
          logSecurityEvent('lock', 'تم فك قفل التطبيق بنجاح', 'التحقق المشفّر مكتمل.', 'success');
        }}
        onFailedAttempt={() => {
          logSecurityEvent('lock', 'محاولة فاشلة لفك القفل', 'تم تسجيل محاولة إدخال رمز غير صحيح.', 'warn');
        }}
      />

      <DraggableQuickDock
        visible={deviceCaps.showFloatingDock && deviceMode !== 'mobile' && !playerMedia}
        deviceMode={deviceMode}
        accentTheme={accentTheme}
        eyeComfort={eyeComfort}
        ambientRain={ambientRain}
        onChangeAccentTheme={(t) => {
          setAccentTheme(t);
          showToast(`تم تغيير لون التطبيق إلى: ${ACCENT_THEMES[t].label}`);
        }}
        onToggleEyeComfort={() => {
          setEyeComfort((v) => !v);
          showToast(!eyeComfort ? 'تم تفعيل فلتر راحة العين الليلي' : 'تم إيقاف فلتر راحة العين');
        }}
        onToggleAmbientRain={() => {
          setAmbientRain((v) => !v);
          showToast(!ambientRain ? 'تم تشغيل صوت المطر الهادئ' : 'تم إيقاف صوت المطر');
        }}
        onOpenDeviceSelector={() => setDevicePickerOpen(true)}
        onOpenSecurityShield={() => setSecurityShieldOpen(true)}
        onCaptureSnapshot={handleCaptureInstantSnapshot}
      />

      <DeviceSelectorModal
        open={devicePickerOpen}
        currentMode={deviceMode}
        canClose={loadSavedDeviceMode() !== null}
        onSelectMode={handleSelectDeviceMode}
        onClose={() => setDevicePickerOpen(false)}
      />

      <AdminCommandModal
        open={adminModalOpen}
        user={user}
        onClose={() => setAdminModalOpen(false)}
        onAnnouncementUpdated={(text) => {
          setGlobalAnnouncement(text);
          setAnnouncementDismissed(false);
        }}
        onToast={showToast}
      />

      {/* Quick Command Palette (Ctrl+K) */}
      {commandPaletteOpen && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="لوحة الانتقال السريع"
          className="fixed inset-0 z-[118] flex items-start justify-center bg-black/80 px-4 pt-20 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCommandPaletteOpen(false);
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--accent-gold)]/40 bg-[#0D111C] text-slate-100 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-[var(--accent-gold)]" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="ابحث عن فيلم، مسلسل، أو أمر سريع (مثال: روايات، ذكاء، لقطة، لون، تلفزيون)..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 space-y-1.5 overflow-y-auto p-3 text-xs">
              <div className="px-2 pb-1 text-[10px] font-bold text-slate-400">
                أوامر فورية
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    switchApp('ai');
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right font-bold hover:border-[#60A5FA]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#60A5FA]" />
                  <span>فالدريون AI (الهيدروجين ⚡)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    switchApp('novels');
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right font-bold hover:border-emerald-400"
                >
                  <Command className="h-3.5 w-3.5 text-emerald-400" />
                  <span>مكتبة الروايات 4D والمانهوا</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    handleCaptureInstantSnapshot();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right font-bold hover:border-sky-400"
                >
                  <Camera className="h-3.5 w-3.5 text-sky-400" />
                  <span>التقاط صورة للشاشة الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    setDevicePickerOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right font-bold hover:border-[var(--accent-gold)]"
                >
                  <Palette className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  <span>تبديل الجهاز (TV / هاتف / PC)</span>
                </button>
              </div>

              {commandQuery.trim().length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[10px] font-bold text-slate-400">
                    نتائج فورية من المكتبة
                  </div>
                  {[...movies, ...series]
                    .filter((it) =>
                      `${it.title} ${it.originalTitle || ''} ${(it.genres || []).join(' ')}`
                        .toLowerCase()
                        .includes(commandQuery.trim().toLowerCase())
                    )
                    .slice(0, 6)
                    .map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          setCommandPaletteOpen(false);
                          setCommandQuery('');
                          setDetailsItem(it);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-right hover:bg-white/10"
                      >
                        <span className="font-bold text-white">{it.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {it.kind === 'series' ? 'مسلسل' : 'فيلم'} · {it.year || '4K'}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {eyeComfort && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[95] bg-amber-500/[0.11] mix-blend-multiply"
        />
      )}

      {/* Clean Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-[#D4AF37]/60 bg-[#121218]/95 px-5 py-2.5 text-center text-xs font-bold text-[#F4F3EF] shadow-2xl backdrop-blur-md sm:text-sm ${
            playerMedia ? 'top-20' : 'bottom-20'
          }`}
        >
          {toastMsg}
        </div>
      )}
      </div>
    </div>
  );
}
