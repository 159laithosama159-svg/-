import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  AppWindow,
  BookOpen,
  BookmarkPlus,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Code2,
  Copy,
  Cpu,
  Crown,
  Download,
  ExternalLink,
  FileAudio,
  FileCode2,
  FileText,
  Film,
  Gamepad2,
  Globe,
  GraduationCap,
  Headphones,
  ImagePlus,
  Link2,
  Loader2,
  Menu,
  MessageSquarePlus,
  Mic,
  MicOff,
  Network,
  Palette,
  Paperclip,
  Play,
  Presentation,
  Printer,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import type {
  AiExecutionStep,
  AiMissionPlan,
  AiMissionStep,
  AiStudioMessage,
  AiStudioMode,
  AiStudioSession,
  AiThinkingDepth,
  MediaItem,
  NavTab,
  ProfileId,
} from '../types/cinema';
import {
  askAiConcierge,
  buildAiLiveApp,
  generateAiAudioBrief,
  generateAiMindMap,
  generateAiQuizApp,
  generateAiSlidesDeck,
  generateAiVisualImages,
  generateGodotGameProject,
  generateMotionVideoProject,
  orchestrateAiMission,
  planGodotEditorCommands,
  refineAiAnswer,
  runAiCouncilDebate,
  searchAndDownloadWebCinema,
  searchAndDownloadWebNovel,
  streamAiApex,
  streamAiStudio,
} from '../services/xtreamApi';
import {
  deleteAiSessionFromCloud,
  saveAiSessionToCloud,
  subscribeUserAiSessions,
} from '../services/cloudSync';
import { buildCatalogSummaryForAI } from '../utils/cinemaLogic';
import {
  extractArtifactsFromMarkdown,
  extractFirstUrlFromText,
  validatePublicWebsiteUrl,
  type ExtractedArtifact,
} from '../utils/aiStudioUtils';
import { formatElapsedSeconds } from '../utils/orchestratorUtils';
import {
  AI_AGENTS,
  AI_AGENT_CATEGORIES,
  MULTI_AGENT_CHAINS,
  getAgentById,
  recommendAgentForPrompt,
  type AiAgentCategory,
  type AiAgentProfile,
} from '../data/aiAgents';
import { RichMarkdown } from './RichMarkdown';
import { AppDeconstructorPanel } from './AppDeconstructorPanel';
import { GodotStudioPanel } from './GodotStudioPanel';
import { ConnectedEcosystemPanel } from './ConnectedEcosystemPanel';
import {
  GodotProjectCard,
  GodotProjectInspector,
} from './GodotProjectInspector';
import { GodotAgentPermissionCard } from './GodotAgentPermissionCard';
import { AiVisualGalleryCard } from './AiVisualGalleryCard';
import { AiCouncilCard } from './AiCouncilCard';
import { AiMindMapCard } from './AiMindMapCard';
import { AiApexVerificationCard } from './AiApexVerificationCard';
import { LiveCodeGameRunner, type RunnableArtifact } from './LiveCodeGameRunner';
import { BrainMemoryModal, type BrainTab } from './BrainMemoryModal';
import { LiveVoiceOverlay } from './LiveVoiceOverlay';
import { CommanderFreedomModal } from './CommanderFreedomModal';
import { CommanderLiveMonitor } from './CommanderLiveMonitor';
import {
  buildCommanderRulesBlock,
  loadCommanderActiveDefault,
  loadCommanderSettings,
  saveCommanderActiveDefault,
  saveCommanderSettings,
  type CommanderFreedomSettings,
} from '../utils/commanderPolicy';
import { OmniCommander } from '../agents/orchestratorAgent';
import { SeekerAgent } from '../agents/seekerAgent';
import { getSharedVectorMemory } from '../agents/sharedVectorMemory';
import {
  loadEvolutionState,
  runSelfEvolutionCycle,
  saveEvolutionState,
  type SelfEvolutionState,
} from '../agents/selfEvolutionEngine';
import { runLocalOllamaCommanderMission } from '../services/sovereignAiApi';
import {
  buildOmniShareLinks,
  detectCrossAppActions,
  dispatchToAllConnectedWebhooks,
  downloadMarkdownForApp,
  loadOmniChannelConfig,
  saveOmniChannelConfig,
  type CrossAppAction,
  type CrossAppActionTarget,
  type OmniChannelConfig,
} from '../agents/omniChannelBridge';
import {
  buildAppControlSystemPrompt,
  detectFullAppCommands,
  parseEmbeddedAppCommands,
  type ValdrionAppCommand,
  type ValdrionAppController,
} from '../agents/appControlEngine';
import { normalizeServerHost, type ParsedXtreamCredential } from '../utils/cinemaLogic';
import {
  loadNovelsState,
  mergeAllNovels,
  saveNovelsState,
  type NovelBook,
  type NovelGenre,
} from '../utils/novelsUtils';
import {
  appendSecurityAuditEvent,
  loadSecurityShieldConfig,
  saveSecurityShieldConfig,
  scanAndRedactSecrets,
} from '../utils/securityShield';
import {
  loadAuthorizedWhatsAppGroups,
  searchAuthorizedWhatsAppGroups,
} from '../utils/whatsappGroupBridge';
import { searchConnectedSocialAccounts } from '../services/xtreamApi';
import {
  buildAdvisorCouncilPromptBlock,
  loadAdvisorCouncilConfig,
  saveAdvisorCouncilConfig,
  type AdvisorCouncilConfig,
} from '../agents/advisorCouncil';
import {
  buildAppDeconstructionPrompt,
  getDefaultDeconstructorLenses,
  type AppDeconstructionLensId,
} from '../utils/appDeconstructorUtils';
import {
  buildGodotBridgePluginFiles,
  generateGodotPairCode,
  type GodotDimension,
  type GodotProjectBundle,
  type GodotRenderer,
} from '../utils/godotEngineUtils';
import {
  applyCommandsToProjectBundle,
  type GodotAgentActionPlan,
  type GodotSceneTreeSnapshot,
} from '../utils/godotAgentCommands';
import {
  detectAiSkillIntent,
  extractAutoMemoryCandidate,
} from '../utils/aiSkillsRouter';
import {
  buildConversationMarkdownExport,
  enhanceUserPrompt,
  filterSlashCommands,
} from '../utils/aiPowerTools';
import {
  evaluateSafeMathExpression,
  isApexDeepIntent,
  isInteractiveAppIntent,
  isQuizIntent,
  isSlidesIntent,
} from '../utils/apexEngine';
import { buildRobloxGta6GodotProject } from '../utils/godotFlagshipPresets';
import {
  AUTOMATION_WORKFLOWS,
  addBrainMemory,
  buildBrainSystemContext,
  buildPrintableReportHtml,
  loadBrainProfile,
  saveBrainProfile,
  type UserBrainProfile,
} from '../utils/brainMemoryUtils';
import type { MotionVideoProject } from '../utils/motionVideoUtils';
import { buildZipArchive } from '../utils/zipBuilder';
import { realtimeClient } from '../services/realtimeClient';
import aethermindEmblem from '../assets/images/valdrion_luxury_emblem_1795269522039.jpg';

interface AiStudioHubProps {
  user: User | null;
  catalogItems: MediaItem[];
  findItemById: (id: string) => MediaItem | undefined;
  activeProfileName: string;
  familyGuard: boolean;
  activeServerName: string;
  watchQueue: string[];
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onPlayItem: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleQueue: (id: string) => void;
  onPlaySequence: (items: MediaItem[], label: string) => void;
  onApplyTab: (tab: NavTab) => void;
  onApplySearch: (query: string) => void;
  onApplyProfile: (profileId: ProfileId) => void;
  onSwitchToCinema?: () => void;
  onSwitchToNovels?: () => void;
  onSwitchToPrivateAi?: () => void;
  appController?: ValdrionAppController;
  onToast: (msg: string) => void;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((ev: {
        results: { length: number; [i: number]: { [j: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const LOCAL_SESSIONS_KEY = 'valdrion_mind_sessions_v2';
const LEGACY_SESSIONS_KEY = 'valdrion_ai_sessions_v1';

function loadLocalSessions(): AiStudioSession[] {
  try {
    const raw =
      localStorage.getItem(LOCAL_SESSIONS_KEY) ||
      localStorage.getItem(LEGACY_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AiStudioSession[]) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: AiStudioSession[]): void {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 30)));
  } catch {
    // ignore quota overflow
  }
}

function makeNewSession(): AiStudioSession {
  return {
    id: `mind_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: 'محادثة جديدة',
    messages: [],
    updatedAt: Date.now(),
  };
}

function toRunnableArtifact(art: ExtractedArtifact): RunnableArtifact {
  return {
    id: art.id,
    kind: art.kind === 'html' ? 'html' : art.kind === 'svg' ? 'svg' : 'code',
    title: art.title,
    language: art.language,
    code: art.code,
  };
}

function printHtmlViaHiddenIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // ignore
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };
  iframe.srcdoc = html;
}

type ActiveStudioDrawer =
  | 'none'
  | 'godot'
  | 'connectors'
  | 'deconstruct'
  | 'url'
  | 'audio'
  | 'cinema';

export function AiStudioHub({
  user,
  catalogItems,
  findItemById,
  activeProfileName,
  familyGuard,
  activeServerName,
  initialPrompt,
  onClearInitialPrompt,
  onPlayItem,
  onOpenDetails,
  onApplyTab,
  onApplySearch,
  onApplyProfile,
  onSwitchToCinema,
  onSwitchToNovels,
  onSwitchToPrivateAi,
  appController,
  onToast,
}: AiStudioHubProps) {
  // Sessions state
  const [sessions, setSessions] = useState<AiStudioSession[]>(() => {
    const existing = loadLocalSessions();
    return existing.length > 0 ? existing : [makeNewSession()];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => loadLocalSessions()[0]?.id || sessions[0]?.id || ''
  );

  // Personal Brain & Memory state
  const [brainProfile, setBrainProfile] = useState<UserBrainProfile>(() =>
    loadBrainProfile()
  );
  const [brainModalOpen, setBrainModalOpen] = useState(false);
  const [brainModalInitialTab, setBrainModalInitialTab] = useState<BrainTab>('persona');
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false);

  // Navigation & Gemini-style shell UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [studiosExpanded, setStudiosExpanded] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<ActiveStudioDrawer>('none');
  const [agentsModalOpen, setAgentsModalOpen] = useState(false);
  const [workflowsModalOpen, setWorkflowsModalOpen] = useState(false);
  const [agentCategory, setAgentCategory] = useState<AiAgentCategory>('all');

  // Brain Mode & Settings (Hydrogen-Speed 'fast' default for instant sub-second streaming!)
  const [mode, setMode] = useState<AiStudioMode>('general');
  const [depth, setDepth] = useState<AiThinkingDepth>('fast');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [commanderMode, setCommanderMode] = useState<boolean>(() => loadCommanderActiveDefault());
  const [commanderSettings, setCommanderSettings] = useState<CommanderFreedomSettings>(() =>
    loadCommanderSettings()
  );
  const [commanderModalOpen, setCommanderModalOpen] = useState(false);
  const [commanderModalTab, setCommanderModalTab] = useState<'basics' | 'council' | 'apps' | 'advanced'>('basics');
  const [evolutionState, setEvolutionState] = useState<SelfEvolutionState>(() =>
    loadEvolutionState()
  );
  const [vectorMemoryCount, setVectorMemoryCount] = useState<number>(() =>
    getSharedVectorMemory().count()
  );
  const [commanderCloudRequests, setCommanderCloudRequests] = useState(0);
  const [accountConsentGranted, setAccountConsentGranted] = useState(false);
  const [pendingAccountConsentPrompt, setPendingAccountConsentPrompt] = useState<string | null>(
    null
  );
  const [omniConfig, setOmniConfig] = useState<OmniChannelConfig>(() => loadOmniChannelConfig());
  const [advisorCouncil, setAdvisorCouncil] = useState<AdvisorCouncilConfig>(() =>
    loadAdvisorCouncilConfig()
  );

  const handleUpdateOmniConfig = useCallback((next: OmniChannelConfig) => {
    setOmniConfig(next);
    saveOmniChannelConfig(next);
  }, []);

  const handleUpdateAdvisorCouncil = useCallback((next: AdvisorCouncilConfig) => {
    setAdvisorCouncil(next);
    saveAdvisorCouncilConfig(next);
  }, []);

  const launchInternalApp = useCallback(
    (target: CrossAppActionTarget) => {
      if (target === 'novels' && onSwitchToNovels) onSwitchToNovels();
      else if (target === 'cinema' && onSwitchToCinema) onSwitchToCinema();
      else if (target === 'private-ai' && onSwitchToPrivateAi) onSwitchToPrivateAi();
      else if (target === 'godot') setActiveDrawer('godot');
      else if (target === 'voice') setLiveVoiceOpen(true);
      else if (target === 'connectors') setActiveDrawer('connectors');
      else if (target === 'brain') setBrainModalOpen(true);
      else if (target === 'deconstruct') setActiveDrawer('deconstruct');
      else if (target === 'agents') setAgentsModalOpen(true);
    },
    [onSwitchToCinema, onSwitchToNovels, onSwitchToPrivateAi]
  );

  const executeFullAppCommands = useCallback(
    (commands: ValdrionAppCommand[], replyText: string, messageId: string) => {
      if (!commands.length) return;
      const executedLabels: string[] = [];

      for (const cmd of commands) {
        if (cmd.type === 'speak_reply') {
          if (replyText) void handleSpeakMessage(messageId, replyText);
          executedLabels.push(cmd.labelAr);
          continue;
        }
        if (!omniConfig.allowCrossAppControl) continue;

        switch (cmd.type) {
          case 'switch_app':
            if (appController) appController.switchApp(cmd.app);
            else if (cmd.app === 'cinema') onSwitchToCinema?.();
            else if (cmd.app === 'novels') onSwitchToNovels?.();
            else if (cmd.app === 'private-ai') onSwitchToPrivateAi?.();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_tab':
            appController ? appController.openCinemaTab(cmd.tab) : onApplyTab(cmd.tab);
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_search':
            appController ? appController.searchCinema(cmd.query) : onApplySearch(cmd.query);
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_play':
            if (appController) {
              appController.playCinemaByQuery(cmd.query);
            } else {
              onApplySearch(cmd.query);
            }
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_random':
            appController?.playRandomCinema();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_open_servers':
            appController?.openServersModal();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_import_servers':
            if (appController && cmd.credentials.length > 0) {
              const now = Date.now();
              const profiles = cmd.credentials.map((cred, idx) => ({
                id: `xtream_${now}_${idx}`,
                name: cred.name || `سيرفر ${idx + 1}`,
                type: 'xtream' as const,
                host: normalizeServerHost(cred.host),
                username: cred.username,
                password: cred.password,
                useProxy: true,
                addedAt: now + idx,
              }));
              void appController.importServersLocally(profiles, true);
              executedLabels.push(cmd.labelAr);
            }
            break;
          case 'cinema_export_servers':
            appController?.exportServersBackup();
            executedLabels.push(cmd.labelAr);
            break;
          case 'novel_create': {
            const novelsState = loadNovelsState();
            const nowTs = Date.now();
            const cleanBody =
              replyText.trim().length > 80
                ? replyText.trim()
                : `الفصل الأول من رواية «${cmd.title}» — تم إنشاؤها وإضافتها تلقائياً بواسطة القائد الشامل في فالدريون.`;
            const validGenre: Exclude<NovelGenre, 'الكل'> =
              (cmd.genre as Exclude<NovelGenre, 'الكل'>) || 'فانتازيا';
            const newNovel: NovelBook = {
              id: `novel_cmd_${nowTs}`,
              title: cmd.title.slice(0, 80),
              author: user?.displayName || activeProfileName || 'القائد الشامل — فالدريون',
              genre: validGenre,
              synopsis: cleanBody.slice(0, 220),
              rating: 4.9,
              status: 'تأليف شخصي',
              coverFrom: '#2C1E14',
              coverTo: '#0B0907',
              accentColor: '#D9A441',
              tags: ['القائد الشامل', 'فالدريون'],
              isUserCreated: true,
              updatedAt: nowTs,
              chapters: [
                {
                  id: `ch_cmd_${nowTs}_1`,
                  number: 1,
                  title: 'الفصل الأول',
                  content: cleanBody,
                  createdAt: nowTs,
                },
              ],
            };
            saveNovelsState({
              ...novelsState,
              customNovels: [newNovel, ...novelsState.customNovels],
              favorites: [newNovel.id, ...novelsState.favorites.filter((x) => x !== newNovel.id)],
            });
            onToast(`تم تأليف وإضافة رواية «${newNovel.title}» مباشرة إلى مكتبة فالدريون!`);
            executedLabels.push(cmd.labelAr);
            break;
          }
          case 'novel_download': {
            const allBooks = mergeAllNovels(loadNovelsState());
            const needle = (cmd.query || '').trim().toLowerCase();
            const picked =
              (needle
                ? allBooks.find((b) => b.title.toLowerCase().includes(needle))
                : allBooks[0]) || allBooks[0];
            if (picked) {
              const fullText = [
                `# ${picked.title}`,
                `المؤلف: ${picked.author} | التصنيف: ${picked.genre}`,
                '',
                picked.synopsis,
                '',
                ...picked.chapters.map(
                  (ch) => `\n==============================\nالفصل ${ch.number}: ${ch.title}\n==============================\n\n${ch.content}\n`
                ),
              ].join('\n');
              const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
              const dlUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = dlUrl;
              a.download = `${picked.title.replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, '_')}.txt`;
              a.click();
              URL.revokeObjectURL(dlUrl);
              onToast(`تم تنزيل رواية «${picked.title}» إلى جهازك بنجاح!`);
              executedLabels.push(cmd.labelAr);
            }
            break;
          }
          case 'novel_web_download': {
            void (async () => {
              try {
                onToast(`جاري البحث وتنزيل رواية «${cmd.query}» من الإنترنت...`);
                const res = await searchAndDownloadWebNovel(cmd.query);
                const pickedNovel = res.novels?.[0];
                if (pickedNovel) {
                  const novelsState = loadNovelsState();
                  const nowTs = Date.now();
                  const importedBook: NovelBook = {
                    id: `novel_web_${nowTs}`,
                    title: pickedNovel.title.slice(0, 80),
                    author: pickedNovel.author || 'مكتبة الإنترنت',
                    genre: (pickedNovel.genre as Exclude<NovelGenre, 'الكل'>) || 'فانتازيا',
                    country: 'عالمي',
                    synopsis:
                      pickedNovel.synopsis || `رواية تم جلبها من الإنترنت: ${pickedNovel.title}`,
                    rating: 4.8,
                    status: 'مكتملة',
                    coverFrom: '#1E293B',
                    coverTo: '#0B0907',
                    accentColor: '#D9A441',
                    tags: ['تنزيل إنترنت', res.source || 'ويب'],
                    isUserCreated: true,
                    updatedAt: nowTs,
                    chapters: (pickedNovel.chapters || []).map((ch, idx) => ({
                      id: `ch_web_${nowTs}_${idx + 1}`,
                      number: ch.number || idx + 1,
                      title: ch.title || `الفصل ${idx + 1}`,
                      content: ch.content,
                      createdAt: nowTs,
                    })),
                  };
                  saveNovelsState({
                    ...novelsState,
                    customNovels: [importedBook, ...novelsState.customNovels],
                    favorites: [
                      importedBook.id,
                      ...novelsState.favorites.filter((x) => x !== importedBook.id),
                    ],
                  });
                  onToast(`تم تنزيل وحفظ رواية «${importedBook.title}» داخل مكتبة الروايات 4D!`);
                } else {
                  onToast('لم يتم العثور على الرواية في المصادر المفتوحة حالياً.');
                }
              } catch {
                onToast('تعذّر جلب الرواية من الإنترنت حالياً.');
              }
            })();
            executedLabels.push(cmd.labelAr);
            break;
          }
          case 'cinema_web_download': {
            void (async () => {
              try {
                onToast(`جاري البحث عن «${cmd.query}» في أرشيف السينما المفتوح...`);
                const res = await searchAndDownloadWebCinema(cmd.query);
                if (res.items && res.items.length > 0) {
                  appController?.addWebCinemaItems?.(res.items);
                  onToast(`تمت إضافة ${res.items.length} عمل سينمائي إلى مكتبة فالدريون بنجاح!`);
                } else {
                  onToast('لم يُعثر على نتائج متاحة للتنزيل المفتوح.');
                }
              } catch {
                onToast('تعذّر جلب الأعمال السينمائية من الإنترنت حالياً.');
              }
            })();
            executedLabels.push(cmd.labelAr);
            break;
          }
          case 'security_open_shield':
            appController?.openSecurityShield();
            executedLabels.push(cmd.labelAr);
            break;
          case 'security_lock_now':
            appController?.lockAppNow();
            executedLabels.push(cmd.labelAr);
            break;
          case 'social_open_hub':
            setCommanderModalTab('apps');
            setCommanderModalOpen(true);
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_open_epg':
            appController?.openEpgModal();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_open_watch_party':
            appController?.openWatchPartyModal();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_open_devices':
            appController?.openDevicesModal();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_open_auth':
            appController?.openAuthModal();
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_tv_mode':
            appController?.setTvMode(cmd.enabled);
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_family_guard':
            appController?.setFamilyGuard(cmd.enabled);
            executedLabels.push(cmd.labelAr);
            break;
          case 'cinema_profile':
            appController ? appController.switchProfile(cmd.profileId) : onApplyProfile(cmd.profileId);
            executedLabels.push(cmd.labelAr);
            break;
          case 'novels_tab':
            appController ? appController.openNovelsTab(cmd.tab) : onSwitchToNovels?.();
            executedLabels.push(cmd.labelAr);
            break;
          case 'open_tool':
            if (cmd.tool === 'settings' || cmd.tool === 'apps') {
              setCommanderModalTab(cmd.tool === 'apps' ? 'apps' : 'basics');
              setCommanderModalOpen(true);
            } else {
              launchInternalApp(cmd.tool);
            }
            executedLabels.push(cmd.labelAr);
            break;
          case 'ai_new_chat': {
            const fresh = makeNewSession();
            setSessions((prev) => [fresh, ...prev].slice(0, 30));
            setActiveSessionId(fresh.id);
            executedLabels.push(cmd.labelAr);
            break;
          }
          case 'ai_clear_chat':
            setSessions((prev) =>
              prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
            );
            executedLabels.push(cmd.labelAr);
            break;
          case 'ai_set_mode':
            setCommanderMode(cmd.commander);
            saveCommanderActiveDefault(cmd.commander);
            executedLabels.push(cmd.labelAr);
            break;
          case 'ai_web_search':
            setWebSearch(cmd.enabled);
            executedLabels.push(cmd.labelAr);
            break;
          case 'ai_auto_speak':
            handleUpdateOmniConfig({ ...omniConfig, autoSpeak: cmd.enabled });
            executedLabels.push(cmd.labelAr);
            break;
          case 'ai_self_evolve': {
            const store = getSharedVectorMemory();
            const res = runSelfEvolutionCycle({
              state: evolutionState,
              store,
              recentPrompts: [replyText.slice(0, 200)],
            });
            setEvolutionState(res.nextState);
            setVectorMemoryCount(store.count());
            executedLabels.push(cmd.labelAr);
            break;
          }
        }
      }

      if (executedLabels.length > 0) {
        onToast(`تم تنفيذ التحكم الشامل: ${executedLabels.slice(0, 2).join(' · ')}`);
      }
    },
    [
      activeSessionId,
      appController,
      evolutionState,
      handleUpdateOmniConfig,
      launchInternalApp,
      omniConfig,
      onApplyProfile,
      onApplySearch,
      onApplyTab,
      onSwitchToCinema,
      onSwitchToNovels,
      onSwitchToPrivateAi,
      onToast,
    ]
  );

  const executeOmniCrossAppActions = useCallback(
    (actions: CrossAppAction[] | undefined, replyText: string, messageId: string) => {
      if (!actions || actions.length === 0) return;
      for (const act of actions) {
        if (act.type === 'speak_reply' && replyText) {
          void handleSpeakMessage(messageId, replyText);
          continue;
        }
        if (act.type === 'navigate' && act.target && omniConfig.allowCrossAppControl) {
          launchInternalApp(act.target);
          onToast(`تم التنفيذ عبر القائد الشامل: ${act.labelAr}`);
        }
      }
    },
    [launchInternalApp, omniConfig.allowCrossAppControl, onToast]
  );

  const handleUpdateCommanderSettings = useCallback((next: CommanderFreedomSettings) => {
    setCommanderSettings(next);
    saveCommanderSettings(next);
  }, []);

  const handleToggleCommanderMode = useCallback((next: boolean) => {
    setCommanderMode(next);
    saveCommanderActiveDefault(next);
  }, []);

  const handleTriggerSelfEvolution = useCallback(
    (feedbackNote?: string) => {
      const store = getSharedVectorMemory();
      const { nextState, event } = runSelfEvolutionCycle({
        state: evolutionState,
        store,
        recentPrompts: sessions
          .flatMap((s) => s.messages)
          .filter((m) => m.role === 'user')
          .slice(-12)
          .map((m) => m.text),
        feedbackNote,
      });
      setEvolutionState(nextState);
      setVectorMemoryCount(store.count());
      onToast(event.summary);
    },
    [evolutionState, onToast, sessions]
  );

  const handleClearVectorMemory = useCallback(() => {
    const store = getSharedVectorMemory();
    store.clear();
    setVectorMemoryCount(0);
    onToast('تم تفريغ الذاكرة المتجهية الموحدة محلياً.');
  }, [onToast]);

  // Composer & attachments
  const [input, setInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [audioStyle, setAudioStyle] = useState<'podcast' | 'brief' | 'story'>('podcast');
  const [attachedImage, setAttachedImage] = useState<{
    mimeType: string;
    data: string;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<{
    mimeType: string;
    data: string;
    name: string;
  } | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);

  // App Deconstructor state
  const [deconstructAppName, setDeconstructAppName] = useState('');
  const [deconstructLenses, setDeconstructLenses] = useState<AppDeconstructionLensId[]>(
    () => getDefaultDeconstructorLenses()
  );

  // Godot 4 Engine & Bridge state
  const [godotPrompt, setGodotPrompt] = useState('');
  const [godotDimension, setGodotDimension] = useState<GodotDimension>('3d');
  const [godotRenderer, setGodotRenderer] = useState<GodotRenderer>('gl_compatibility');
  const [godotPairCode, setGodotPairCode] = useState<string>(() => generateGodotPairCode());
  const [godotWsReady, setGodotWsReady] = useState(false);
  const [connectedGodotEngines, setConnectedGodotEngines] = useState(0);
  const [connectedGodotVersion, setConnectedGodotVersion] = useState('');
  const [liveGodotSceneTree, setLiveGodotSceneTree] =
    useState<GodotSceneTreeSnapshot | null>(null);
  const [activeGodotProject, setActiveGodotProject] = useState<{
    project: GodotProjectBundle;
    tab: 'files' | 'tree' | 'play';
  } | null>(null);

  // Live Code / Game Runner Split Workbench
  const [activeArtifact, setActiveArtifact] = useState<RunnableArtifact | null>(null);

  // Streaming & speech state
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  isStreamingRef.current = isStreaming;
  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;
  const stickToBottomRef = useRef(true);
  const [liveStatus, setLiveStatus] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [transformingMsgKey, setTransformingMsgKey] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [openShareMenuMsgId, setOpenShareMenuMsgId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dictationRef = useRef<SpeechRecognitionLike | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const activeAgent: AiAgentProfile | undefined = useMemo(
    () => (selectedAgentId ? getAgentById(selectedAgentId) : undefined),
    [selectedAgentId]
  );

  const brainSystemContext = useMemo(
    () => buildBrainSystemContext(brainProfile),
    [brainProfile]
  );

  const displayName = useMemo(() => {
    if (brainProfile.displayName.trim()) return brainProfile.displayName.trim();
    if (user?.displayName) return user.displayName.split(' ')[0];
    return 'صديقي';
  }, [brainProfile.displayName, user]);

  // Persist sessions locally
  useEffect(() => {
    saveLocalSessions(sessions);
  }, [sessions]);

  // Cloud sync sessions when logged in — NEVER overwrite active/streaming chat or jump to message #1!
  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserAiSessions(user.uid, (cloudSessions) => {
      if (cloudSessions.length === 0) return;
      setSessions((prev) => {
        const merged = new Map<string, AiStudioSession>();
        prev.forEach((s) => merged.set(s.id, s));
        cloudSessions.forEach((cs) => {
          const existing = merged.get(cs.id);
          // Protect active session while streaming or if local has newer/more messages
          if (existing && cs.id === activeSessionIdRef.current && isStreamingRef.current) {
            return;
          }
          if (
            !existing ||
            (cs.updatedAt > existing.updatedAt + 2500 &&
              cs.messages.length >= existing.messages.length)
          ) {
            merged.set(cs.id, cs);
          }
        });
        return Array.from(merged.values())
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 30);
      });
    });
  }, [user]);

  // Godot WebSocket Bridge Host registration (FIXED: /ws/realtime + godot:studio_join + scene_tree + command_result)
  const godotBridgeWsUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3000/ws/realtime';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/realtime`;
  }, []);

  useEffect(() => {
    const registerHost = () => {
      setGodotWsReady(true);
      realtimeClient.send({ type: 'godot:studio_join', pairCode: godotPairCode });
    };
    const unsub = realtimeClient.subscribe((msg) => {
      const t = String(msg.type || '');
      if (t === 'godot:status') {
        setGodotWsReady(true);
        if (typeof msg.enginesConnected === 'number') {
          setConnectedGodotEngines(msg.enginesConnected);
        }
        if (typeof msg.godotVersion === 'string' && msg.godotVersion) {
          setConnectedGodotVersion(msg.godotVersion);
        }
      } else if (t === 'godot:ack') {
        const count = Number(msg.writtenFiles) || 0;
        const proj = String(msg.projectName || 'المشروع');
        onToast(`تمت مزامنة «${proj}» داخل محرك Godot 4 (${count} ملفات)!`);
      } else if (t === 'godot:scene_tree') {
        const nodes = Array.isArray(msg.nodes)
          ? (msg.nodes as GodotSceneTreeSnapshot['nodes'])
          : [];
        setLiveGodotSceneTree({
          scenePath: String(msg.scenePath || ''),
          nodes,
          capturedAt: Date.now(),
        });
        onToast(`تمت قراءة شجرة المشهد الحية من Godot 4 (${nodes.length} عقدة).`);
      } else if (t === 'godot:command_result') {
        const planId = String(msg.planId || '');
        const succeeded = Number(msg.succeeded) || 0;
        const failed = Number(msg.failed) || 0;
        const logs = Array.isArray(msg.logs) ? msg.logs.map((l) => String(l)) : [];
        if (planId) {
          setSessions((prev) =>
            prev.map((s) => ({
              ...s,
              messages: s.messages.map((m) =>
                m.godotActionPlan?.planId === planId
                  ? {
                      ...m,
                      godotActionPlan: {
                        ...m.godotActionPlan,
                        status: 'executed',
                        executionResult: {
                          planId,
                          succeeded,
                          failed,
                          logs,
                          executedAt: Date.now(),
                          target: 'godot_live',
                        },
                      },
                    }
                  : m
              ),
            }))
          );
        }
        onToast(`نفّذ Godot 4 الأوامر: ${succeeded} ناجحة${failed > 0 ? ` · ${failed} تعذّرت` : ''}.`);
      }
    }, registerHost);
    registerHost();
    return () => unsub();
  }, [godotPairCode, onToast]);

  // Elapsed streaming timer
  useEffect(() => {
    if (!isStreaming) {
      setElapsedSec(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [isStreaming]);

  // Smart scroll tracking: follow new answers smoothly when user is near bottom; never reset to message #1!
  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 140;
    setShowScrollBottomBtn(distanceFromBottom > 160);
  }, []);

  const scrollToBottomManually = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowScrollBottomBtn(false);
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [activeSession.messages.length, isStreaming]);

  const persistSessionUpdate = useCallback(
    (sessionId: string, updater: (prev: AiStudioSession) => AiStudioSession) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === sessionId ? updater(s) : s));
        const updated = next.find((s) => s.id === sessionId);
        if (updated && user) {
          void saveAiSessionToCloud(user.uid, updated);
        }
        return next;
      });
    },
    [user]
  );

  const handleUpdateBrainProfile = useCallback((next: UserBrainProfile) => {
    setBrainProfile(next);
    saveBrainProfile(next);
  }, []);

  const handleSaveReplyToMemory = useCallback(
    (text: string) => {
      const snippet = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[#*`>_~]/g, '')
        .trim()
        .slice(0, 220);
      if (!snippet) return;
      const next = addBrainMemory(brainProfile, snippet, 'fact');
      handleUpdateBrainProfile(next);
      onToast('تم حفظ الخلاصة في ذاكرة العقل طويلة المدى.');
    },
    [brainProfile, handleUpdateBrainProfile, onToast]
  );

  const handleSpeakMessage = useCallback(
    async (msgId: string, text: string) => {
      // Stop if already speaking this message
      if (speakingMsgId === msgId) {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current = null;
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        setSpeakingMsgId(null);
        return;
      }

      const clean = text
        .replace(/```[\s\S]*?```/g, ' يوجد كود برمجي مرفق. ')
        .replace(/[#*`>_~[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);
      if (!clean) return;

      setSpeakingMsgId(msgId);
      try {
        const res = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean }),
        });
        if (res.ok) {
          const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
          if (data.audioBase64) {
            const audio = new Audio(
              `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
            );
            ttsAudioRef.current = audio;
            audio.onended = () => setSpeakingMsgId(null);
            audio.onerror = () => setSpeakingMsgId(null);
            await audio.play();
            return;
          }
        }
      } catch {
        // fallback to browser speechSynthesis
      }

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = /[\u0600-\u06FF]/.test(clean) ? 'ar-SA' : 'en-US';
        utter.onend = () => setSpeakingMsgId(null);
        utter.onerror = () => setSpeakingMsgId(null);
        window.speechSynthesis.speak(utter);
      } else {
        setSpeakingMsgId(null);
        onToast('تعذّر تشغيل النطق الصوتي على هذا المتصفح.');
      }
    },
    [speakingMsgId, onToast]
  );

  // Instant 1-click Launch of the Flagship Roblox × GTA 6 Godot 4.3+ 3D Game!
  const handleLaunchRobloxGta6 = useCallback(() => {
    const { project, guideMarkdown } = buildRobloxGta6GodotProject();
    const sid = activeSession.id;
    const now = Date.now();
    const userMsg: AiStudioMessage = {
      id: `u_${now}`,
      role: 'user',
      text: 'أنشئ لعبة 3D عالم مفتوح طبق الأصل عن روبلوكس + GTA 6 بمحرك Godot 4 قابلة للتشغيل الفوري',
      mode: 'godot',
      ts: now,
    };
    const assistantMsg: AiStudioMessage = {
      id: `a_${now + 1}`,
      role: 'assistant',
      text: guideMarkdown,
      mode: 'godot',
      ts: now + 1,
      godotProject: project,
    };

    persistSessionUpdate(sid, (s) => ({
      ...s,
      title: s.messages.length === 0 ? 'لعبة Roblox × GTA 6 (Godot 4)' : s.title,
      updatedAt: now + 1,
      messages: [...s.messages, userMsg, assistantMsg],
    }));

    setActiveArtifact(null);
    setActiveGodotProject({ project, tab: 'play' });
    setActiveDrawer('none');
    onToast('تم تشغيل VALDRION CITY 6 (Roblox × GTA 6) — اضغط داخل اللعبة وابدأ القيادة!');
  }, [activeSession.id, onToast, persistSessionUpdate]);

  const handleDownloadGodotBridgePlugin = useCallback(() => {
    // FIXED argument order: (wsUrl, pairCode)
    const files = buildGodotBridgePluginFiles(godotBridgeWsUrl, godotPairCode);
    const zipBytes = buildZipArchive(files);
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethermind-godot4-bridge-v2-${godotPairCode}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('تم تحميل إضافة جسر جودوت 4 (الإصدار v2 مع التحكم المباشر بإذنك)!');
  }, [godotPairCode, godotBridgeWsUrl, onToast]);

  const handleSyncProjectToGodot = useCallback(
    (project: GodotProjectBundle) => {
      if (connectedGodotEngines > 0) {
        realtimeClient.send({
          type: 'godot:sync_project',
          pairCode: godotPairCode,
          projectName: project.projectName,
          mainScene: project.mainScene,
          files: project.files.map((f) => ({ path: f.path, content: f.content })),
        });
        onToast(`تم إرسال ${project.files.length} ملفات مباشرة إلى محرر Godot 4!`);
      } else {
        setActiveDrawer('godot');
        onToast('افتح إضافة AETHERMIND Bridge داخل Godot 4 بنفس الرمز للمزامنة المباشرة.');
      }
    },
    [connectedGodotEngines, godotPairCode, onToast]
  );

  const handleRunMainInGodot = useCallback(() => {
    realtimeClient.send({ type: 'godot:run_main', pairCode: godotPairCode });
    onToast('تم إرسال أمر تشغيل اللعبة (F5) إلى محرر Godot 4.');
  }, [godotPairCode, onToast]);

  const handleApproveGodotPlan = useCallback(
    (msgId: string, plan: GodotAgentActionPlan) => {
      const sid = activeSession.id;
      const updatePlan = (patch: Partial<GodotAgentActionPlan>) => {
        persistSessionUpdate(sid, (s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === msgId && m.godotActionPlan
              ? { ...m, godotActionPlan: { ...m.godotActionPlan, ...patch } }
              : m
          ),
        }));
      };

      if (connectedGodotEngines > 0) {
        updatePlan({
          status: 'executing',
          executionResult: {
            planId: plan.planId,
            succeeded: 0,
            failed: 0,
            logs: ['تمت موافقتك — جاري إرسال الأوامر الحية إلى محرر Godot 4...'],
            executedAt: Date.now(),
            target: 'godot_live',
          },
        });
        realtimeClient.send({
          type: 'godot:execute_commands',
          pairCode: godotPairCode,
          planId: plan.planId,
          commands: plan.commands,
        });
        onToast('تم إرسال الأوامر بعد إذنك إلى محرر Godot 4 للتنفيذ الحي!');
        return;
      }

      // Offline fallback: apply edits directly to active Godot project bundle (or create Roblox×GTA6 base bundle)
      const baseProject =
        activeGodotProject?.project || buildRobloxGta6GodotProject().project;
      const applied = applyCommandsToProjectBundle(baseProject, plan.commands);
      setActiveGodotProject({ project: applied.updated, tab: 'files' });
      updatePlan({
        status: 'applied_locally',
        executionResult: {
          planId: plan.planId,
          succeeded: applied.appliedCount,
          failed: 0,
          logs: [
            ...applied.logs,
            'تم تطبيق التعديلات على مشروع Godot 4 المحلي (للتنفيذ الحي داخل المحرر، حمّل الجسر v2 وفعّل الإضافة).',
          ],
          executedAt: Date.now(),
          target: 'local_project',
        },
      });
      onToast(`تم تنفيذ ${plan.commands.length} أوامر وتحديث ملفات مشروع Godot 4 بعد إذنك!`);
    },
    [activeGodotProject, activeSession.id, connectedGodotEngines, godotPairCode, onToast, persistSessionUpdate]
  );

  const handleRejectGodotPlan = useCallback(
    (msgId: string) => {
      persistSessionUpdate(activeSession.id, (s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === msgId && m.godotActionPlan
            ? {
                ...m,
                godotActionPlan: {
                  ...m.godotActionPlan,
                  status: 'rejected',
                  executionResult: {
                    planId: m.godotActionPlan.planId,
                    succeeded: 0,
                    failed: 0,
                    logs: ['تم إلغاء العملية بناءً على قرارك — لم يُمس أي ملف.'],
                    executedAt: Date.now(),
                    target: 'local_project',
                  },
                },
              }
            : m
        ),
      }));
      onToast('تم رفض خطة التحكم وإلغاء التنفيذ.');
    },
    [activeSession.id, onToast, persistSessionUpdate]
  );

  // Core send handler (Autonomous Skill Router: Godot Live Control, Godot Build, Image HD Studio, Video .webm, Live Web Search + Progress Steps, 24-Agent Commander, Code/Games, URL, Audio, Cinema)
  const sendMessage = useCallback(
    async (
      rawText: string,
      opts?: {
        forceMode?: AiStudioMode;
        forceAgentId?: string | null;
        forceCommander?: boolean;
        forceUrl?: string;
        createKind?: string;
        overrideAccountConsent?: boolean;
      }
    ) => {
      let trimmed = rawText.trim();
      if (!trimmed && !attachedImage && !attachedAudio && !attachedFile && !opts?.forceUrl) {
        return;
      }
      if (isStreaming) return;

      // Live Secret Leak Shield: automatically mask accidental API keys / tokens / payment cards before cloud dispatch
      const shieldCfg = loadSecurityShieldConfig();
      if (shieldCfg.secretLeakGuard && trimmed) {
        const scan = scanAndRedactSecrets(trimmed);
        if (scan.hasSecrets) {
          trimmed = scan.redactedText;
          saveSecurityShieldConfig({
            ...shieldCfg,
            auditLog: appendSecurityAuditEvent(shieldCfg.auditLog, {
              category: 'secret_guard',
              titleAr: `حجب تلقائي لـ ${scan.findings.length} بيانات حساسة قبل الإرسال`,
              detailAr: scan.findings.map((f) => f.labelAr).join(' · '),
              severity: 'warn',
            }),
          });
          onToast('درع الأمان حجب مفتاحاً أو بيانات حساسة تلقائياً قبل إرسال رسالتك!');
        }
      }

      // Auto-learn explicit personal memory phrases
      const autoMem = extractAutoMemoryCandidate(trimmed);
      if (autoMem) {
        const nextBrain = addBrainMemory(brainProfile, autoMem, 'fact');
        handleUpdateBrainProfile(nextBrain);
        onToast('تم حفظ معلومتك الجديدة تلقائياً في ذاكرة أثيرمايند.');
      }

      const sid = activeSession.id;
      const now = Date.now();

      // Smart Autonomous Skill Detection (executes the exact real capability automatically!)
      const skillDecision = detectAiSkillIntent(trimmed, opts?.forceMode || (mode !== 'general' ? mode : undefined));
      const effectiveMode: AiStudioMode =
        opts?.forceMode ||
        (skillDecision.intent === 'godot_build' || skillDecision.intent === 'godot_control'
          ? 'godot'
          : skillDecision.intent === 'video_gen'
          ? 'video'
          : skillDecision.intent === 'image_gen'
          ? 'poster'
          : skillDecision.intent === 'code_game'
          ? 'create'
          : skillDecision.intent === 'web_research'
          ? 'research'
          : mode);

      const effectiveWebSearch =
        webSearch || skillDecision.autoWebSearch || effectiveMode === 'research';

      const useCommander =
        typeof opts?.forceCommander === 'boolean'
          ? opts.forceCommander
          : commanderMode &&
            skillDecision.intent !== 'godot_control' &&
            skillDecision.intent !== 'godot_build' &&
            skillDecision.intent !== 'image_gen' &&
            skillDecision.intent !== 'video_gen' &&
            effectiveMode !== 'audio' &&
            effectiveMode !== 'cinema';

      const chosenAgentId =
        opts?.forceAgentId !== undefined
          ? opts.forceAgentId
          : selectedAgentId ||
            (effectiveMode === 'create' || effectiveMode === 'general' || effectiveMode === 'research'
              ? recommendAgentForPrompt(trimmed)?.id || null
              : null);
      const chosenAgent = chosenAgentId ? getAgentById(chosenAgentId) : undefined;

      const detectedUrl =
        opts?.forceUrl ||
        (effectiveMode === 'url' ? urlInput.trim() : '') ||
        extractFirstUrlFromText(trimmed) ||
        undefined;

      const userMsg: AiStudioMessage = {
        id: `u_${now}`,
        role: 'user',
        text: trimmed || (detectedUrl ? `تحليل الرابط: ${detectedUrl}` : 'تحليل المرفق'),
        mode: effectiveMode,
        ts: now,
        agentId: chosenAgent?.id,
        agentName: chosenAgent?.name,
        imagePreview: attachedImage?.previewUrl,
        attachedFileName: attachedFile?.name || attachedAudio?.name,
        urlInspected: detectedUrl,
      };

      const assistantMsgId = `a_${now + 1}`;
      const initialStep: AiExecutionStep = {
        id: 'route',
        label: skillDecision.labelAr,
        detail: effectiveWebSearch ? 'مع تفعيل البحث الحي في الويب والموسوعات' : undefined,
        status: 'running',
      };
      const placeholderAssistant: AiStudioMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        mode: effectiveMode,
        ts: now + 1,
        agentId: useCommander ? 'commander' : chosenAgent?.id,
        agentName: useCommander
          ? commanderSettings.engineMode === 'local-kernel'
            ? `القائد الشامل المستقل (7 وكلاء · Gen v${evolutionState.generation})`
            : commanderSettings.engineMode === 'local-ollama'
            ? `القائد الشامل المحلي (${commanderSettings.localModelName})`
            : advisorCouncil.advisorEnabled
            ? 'القائد الشامل + المستشار والفريق'
            : 'القائد الشامل والفريق'
          : chosenAgent?.name || 'أثيرمايند AI',
        executionSteps: [initialStep],
      };

      const historySnapshot = activeSession.messages
        .slice(-12)
        .map((m) => ({ role: m.role, text: m.text }));

      persistSessionUpdate(sid, (s) => ({
        ...s,
        title:
          s.messages.length === 0
            ? (trimmed || detectedUrl || 'محادثة جديدة').slice(0, 44)
            : s.title,
        updatedAt: now,
        messages: [...s.messages, userMsg, placeholderAssistant],
      }));

      setInput('');
      const imgSnap = attachedImage;
      const audSnap = attachedAudio;
      const fileSnap = attachedFile;
      setAttachedImage(null);
      setAttachedAudio(null);
      setAttachedFile(null);
      setIsStreaming(true);
      setLiveStatus(skillDecision.labelAr);

      const controller = new AbortController();
      abortRef.current = controller;

      const updateAssistantMsg = (
        patcher: (msg: AiStudioMessage) => AiStudioMessage
      ) => {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sid
              ? {
                  ...s,
                  updatedAt: Date.now(),
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId ? patcher(m) : m
                  ),
                }
              : s
          )
        );
      };

      const upsertStep = (step: AiExecutionStep) => {
        setLiveStatus(step.label);
        updateAssistantMsg((m) => {
          const prevSteps = m.executionSteps || [];
          const idx = prevSteps.findIndex((x) => x.id === step.id);
          const nextSteps =
            idx >= 0
              ? prevSteps.map((x, i) => (i === idx ? { ...x, ...step } : x))
              : [...prevSteps, step];
          return { ...m, executionSteps: nextSteps };
        });
      };

      try {
        // 0A-CALC) DETERMINISTIC SAFE SCIENTIFIC CALCULATOR (/حساب أو /calc)
        if (/^\/(حساب|calc|احسب)(?:\s|$)/i.test(trimmed)) {
          const expr = trimmed.replace(/^\/(حساب|calc|احسب)\s*/i, '').trim();
          upsertStep({
            id: 'route',
            label: 'تشغيل الآلة الحاسبة العلمية الحتمية (دقة رياضية 100%)',
            status: 'done',
          });
          if (!expr) {
            updateAssistantMsg((m) => ({
              ...m,
              text: 'اكتب المعادلة الرياضية بعد الأمر، مثل:\n`/حساب (125 * 4) + sqrt(144)`\nأو `/حساب sin(pi / 2) + 2^10`',
            }));
            return;
          }
          const evalRes = evaluateSafeMathExpression(expr);
          if (evalRes.ok) {
            upsertStep({
              id: 'calc_done',
              label: `تم حساب النتيجة بدقة حتمية: ${evalRes.formatted}`,
              status: 'done',
            });
            updateAssistantMsg((m) => ({
              ...m,
              text: `### نتيجة الحساب العلمي الدقيق\n\n- **المعادلة:** \`${expr}\`\n- **الناتج النهائي:** \`${evalRes.formatted}\`\n\n> تم تنفيذ العملية محلياً عبر محلّل رياضي حتمي بدقة كاملة دون تقريب عشوائي.`,
            }));
          } else {
            upsertStep({
              id: 'calc_err',
              label: 'صيغة رياضية غير صالحة',
              detail: evalRes.error,
              status: 'error',
            });
            updateAssistantMsg((m) => ({
              ...m,
              text: `تعذّر تقييم المعادلة \`${expr}\`:\n> ${evalRes.error || 'تحقق من الأقواس والعوامل الرياضية (+ - * / ^ sqrt sin cos tan log ln pi e).'}`,
            }));
          }
          return;
        }

        // 0A-OMNI-LOCAL) BUILT-FROM-SCRATCH 7-AGENT OMNI-COMMANDER / INSTANT LOCAL COMMANDS / SENTINEL CONSENT GATE
        const normalizedForPrecheck = trimmed.trim();
        const isInstantLocalCommanderCmd =
          /^(طو[ّ]?ر نفسك|تطوير ذاتي|حد[ّ]?ث نفسك|evolve|تعل[ّ]?م|در[ّ]?ب|احفظ|تذك[ّ]?ر)/i.test(
            normalizedForPrecheck
          );
        const seekerPrecheck = new SeekerAgent();
        const effectiveAccountConsent = Boolean(
          opts?.overrideAccountConsent || accountConsentGranted
        );
        const wantsAccountConsentGate =
          useCommander &&
          seekerPrecheck.detectAccountSearchIntent(normalizedForPrecheck) &&
          !effectiveAccountConsent;

        const runLocalKernelPath =
          useCommander &&
          (commanderSettings.engineMode !== 'cloud-commander' ||
            isInstantLocalCommanderCmd ||
            wantsAccountConsentGate);

        if (runLocalKernelPath) {
          const accountSnapshot = {
            isSignedIn: Boolean(user),
            displayName: user?.displayName || activeProfileName,
            email: user?.email || null,
            sessions: sessions.slice(0, 15).map((s) => ({
              id: s.id,
              title: s.title,
              snippet:
                s.messages
                  .slice(-2)
                  .map((m) => m.text)
                  .join(' — ')
                  .slice(0, 180) || 'جلسة فارغة',
            })),
            brainNotes: brainProfile.memories.map((m) => m.content).slice(0, 20),
          };

          if (
            commanderSettings.engineMode === 'local-kernel' ||
            isInstantLocalCommanderCmd ||
            wantsAccountConsentGate
          ) {
            upsertStep({
              id: 'route',
              label: wantsAccountConsentGate
                ? 'الحامي (Sentinel) يتحقق من إذن الدخول لحسابك...'
                : `تشغيل القائد الشامل (الوكلاء السبعة · الجيل ${evolutionState.generation})`,
              status: 'done',
            });

            const omni = new OmniCommander(getSharedVectorMemory());
            const streamedSteps: AiMissionStep[] = [];
            const runRes = await omni.executeTask({
              prompt: trimmed || (fileSnap ? `حلّل الملف ${fileSnap.name}` : 'تحليل المرفق'),
              settings: commanderSettings,
              webSearchEnabled: effectiveWebSearch,
              accountConsentGranted: effectiveAccountConsent,
              accountSnapshot,
              image: imgSnap
                ? { mimeType: imgSnap.mimeType, data: imgSnap.data, name: imgSnap.name }
                : null,
              fileText: fileSnap || null,
              signal: controller.signal,
              onStage: (stage, label) => {
                setLiveStatus(label);
                upsertStep({ id: `cmd_${stage}`, label, status: 'running' });
              },
              onAgentStep: (step) => {
                streamedSteps.push({
                  stepId: step.stepId,
                  agentId: step.agentId,
                  agentName: step.agentName,
                  englishRole: step.englishRole,
                  taskTitle: step.taskTitle,
                  instruction: step.instruction,
                  status: 'done',
                  summary: step.summary,
                  output: step.output,
                  thoughts: step.thoughts,
                  sources: step.sources,
                  durationMs: step.durationMs,
                });
                updateAssistantMsg((m) => ({
                  ...m,
                  missionPlan: {
                    missionSummary: `المُنسّق يدير الوكلاء السبعة عبر The Bus (${streamedSteps.length} خطوات)`,
                    stage: 'delegating',
                    steps: [...streamedSteps],
                  },
                }));
              },
            });

            if (runRes.newlyTrainedPair) {
              handleUpdateCommanderSettings({
                ...commanderSettings,
                trainedPairs: [runRes.newlyTrainedPair, ...commanderSettings.trainedPairs].slice(
                  0,
                  200
                ),
              });
            }
            if (runRes.newlyLearnedFact) {
              handleUpdateCommanderSettings({
                ...commanderSettings,
                learnedFacts: [runRes.newlyLearnedFact, ...commanderSettings.learnedFacts].slice(
                  0,
                  300
                ),
              });
            }
            if (runRes.needsAccountConsent && runRes.consentPrompt) {
              setPendingAccountConsentPrompt(runRes.consentPrompt);
            } else {
              setPendingAccountConsentPrompt(null);
            }

            setEvolutionState(runRes.evolutionState);
            setVectorMemoryCount(runRes.vectorMemoryCount);

            upsertStep({
              id: 'cmd_planning',
              label: 'المُنسّق فكّك المهمة وربط الوكلاء السبعة عبر The Bus',
              status: 'done',
            });
            upsertStep({
              id: 'cmd_delegating',
              label: `أكمل ${runRes.steps.length} وكلاء مهامهم مع تحقق الحامي (${runRes.verification.securityScore}/100)`,
              status: 'done',
            });
            upsertStep({
              id: 'cmd_synthesizing',
              label: 'تم دمج الإجابة النهائية وتحديث الذاكرة المتجهية الموحدة',
              status: 'done',
            });

            updateAssistantMsg((m) => ({
              ...m,
              text: runRes.finalMarkdown,
              sources: runRes.sources,
              thinkingDurationMs: runRes.thinkingDurationMs,
              missionPlan: {
                missionSummary: runRes.missionSummary,
                stage: 'done',
                steps: runRes.steps.map((s) => ({
                  stepId: s.stepId,
                  agentId: s.agentId,
                  agentName: s.agentName,
                  englishRole: s.englishRole,
                  taskTitle: s.taskTitle,
                  instruction: s.instruction,
                  status: 'done',
                  summary: s.summary,
                  output: s.output,
                  thoughts: s.thoughts,
                  sources: s.sources,
                  durationMs: s.durationMs,
                })),
              },
            }));

            const artifacts = extractArtifactsFromMarkdown(runRes.finalMarkdown);
            if (artifacts.length > 0) {
              setActiveGodotProject(null);
              setActiveArtifact(toRunnableArtifact(artifacts[0]));
            }
            const parsedLocalCmds = parseEmbeddedAppCommands(runRes.finalMarkdown);
            const fullDirectCmds = detectFullAppCommands(trimmed);
            const allLocalCmds = [...fullDirectCmds, ...parsedLocalCmds.commands];
            if (parsedLocalCmds.commands.length > 0) {
              updateAssistantMsg((m) => ({ ...m, text: parsedLocalCmds.cleanMarkdown }));
            }
            if (allLocalCmds.length > 0) {
              executeFullAppCommands(allLocalCmds, parsedLocalCmds.cleanMarkdown, assistantMsgId);
            } else if (runRes.crossAppActions && runRes.crossAppActions.length > 0) {
              executeOmniCrossAppActions(
                runRes.crossAppActions,
                parsedLocalCmds.cleanMarkdown,
                assistantMsgId
              );
            }
            if (
              (omniConfig.autoSpeak || brainProfile.autoSpeakReplies) &&
              runRes.finalMarkdown
            ) {
              void handleSpeakMessage(assistantMsgId, runRes.finalMarkdown);
            }
            if (
              omniConfig.autoSendWebhook &&
              (omniConfig.webhookUrl || (omniConfig.connectedWebhooks || []).some((w) => w.enabled))
            ) {
              void dispatchToAllConnectedWebhooks({
                config: omniConfig,
                prompt: trimmed,
                reply: runRes.finalMarkdown,
                generation: runRes.evolutionState.generation,
                agentsUsed: runRes.steps.map((s) => s.agentName),
              }).then((r) => {
                if (r.sentCount > 0) {
                  onToast(`تم إرسال نتيجة المهمة تلقائياً إلى ${r.sentCount} تطبيق مربوط.`);
                }
              });
            }
            return;
          }

          // Local GPU Ollama / LM Studio Commander (0 Cloud Servers!)
          upsertStep({
            id: 'route',
            label: `تشغيل القائد الشامل عبر جهازك المحلي (${commanderSettings.localModelName} · 0 سحابة)`,
            status: 'done',
          });
          const vectorHits = getSharedVectorMemory().search(trimmed, { topK: 4 });
          const vectorContext = vectorHits
            .map((h) => `- ${h.record.title}: ${h.record.response || h.record.content}`)
            .join('\n');

          let localAccum = '';
          await runLocalOllamaCommanderMission(
            {
              endpoint: {
                url: commanderSettings.localEndpointUrl,
                modelName: commanderSettings.localModelName,
                format: commanderSettings.localApiFormat === 'ollama' ? 'ollama' : 'openai',
              },
              prompt: trimmed,
              rulesBlock: buildCommanderRulesBlock(commanderSettings),
              history: historySnapshot,
              vectorContext: vectorContext || undefined,
            },
            {
              onStage: (stage, label) => {
                setLiveStatus(label);
                upsertStep({ id: `ollama_${stage}`, label, status: 'running' });
              },
              onChunk: (delta) => {
                localAccum += delta;
                updateAssistantMsg((m) => ({ ...m, text: localAccum }));
              },
              signal: controller.signal,
            }
          );
          upsertStep({
            id: 'ollama_synthesizing',
            label: `اكتملت الإجابة محلياً من جهازك (${commanderSettings.localModelName})`,
            status: 'done',
          });
          const artifacts = extractArtifactsFromMarkdown(localAccum);
          if (artifacts.length > 0) {
            setActiveGodotProject(null);
            setActiveArtifact(toRunnableArtifact(artifacts[0]));
          }
          return;
        }

        // 0A-SLIDES) INTERACTIVE HTML5 PRESENTATION SLIDE DECK GENERATOR
        if (isSlidesIntent(trimmed)) {
          const topic = trimmed.replace(/^\/(شرائح|عرض|slides?)\s*/i, '').trim() || trimmed;
          upsertStep({
            id: 'route',
            label: 'تفعيل استوديو العروض التقديمية التفاعلية HTML5',
            status: 'done',
          });
          upsertStep({
            id: 'slides_build',
            label: 'تصميم الشرائح، الأرقام المحورية، وملاحظات المتحدث...',
            status: 'running',
          });
          const result = await generateAiSlidesDeck(
            { topic, brainContext: brainSystemContext },
            controller.signal
          );
          upsertStep({
            id: 'slides_build',
            label: `تم إنتاج عرض «${result.deck.title}» (${result.deck.slides.length} شرائح تفاعلية)`,
            status: 'done',
          });
          const outline = result.deck.slides
            .map((s, idx) => `${idx + 1}. **${s.heading}**${s.highlightMetric ? ` — \`${s.highlightMetric}\`` : ''}`)
            .join('\n');
          updateAssistantMsg((m) => ({
            ...m,
            text: `### عرض تقديمي تفاعلي جاهز: ${result.deck.title}\n\n${result.deck.subtitle}\n\n${outline}\n\n> تم فتح العرض التقديمي مباشرة في **منصة المعاينة الحية** — استخدم أسهم لوحة المفاتيح أو أزرار التنقل للتصفح، وزر **«ملاحظات المتحدث»** و**«طباعة / PDF»** داخل العرض.`,
          }));
          setActiveGodotProject(null);
          setActiveArtifact({
            id: `slides_${assistantMsgId}`,
            title: `عرض: ${result.deck.title}`,
            kind: 'html',
            language: 'html',
            code: result.html,
          });
          onToast(`تم توليد العرض التقديمي (${result.deck.slides.length} شرائح)!`);
          return;
        }

        // 0A-QUIZ) INTERACTIVE MASTERY QUIZ GENERATOR
        if (isQuizIntent(trimmed)) {
          const topic = trimmed.replace(/^\/(اختبار|امتحان|quiz)\s*/i, '').trim() || trimmed;
          upsertStep({
            id: 'route',
            label: 'تفعيل صانع الاختبارات التفاعلية الذكي',
            status: 'done',
          });
          upsertStep({
            id: 'quiz_build',
            label: 'صياغة الأسئلة متعددة الخيارات مع التصحيح الفوري والشروحات...',
            status: 'running',
          });
          const result = await generateAiQuizApp(
            { topic },
            controller.signal
          );
          upsertStep({
            id: 'quiz_build',
            label: `تم بناء اختبار «${result.quiz.title}» (${result.quiz.questions.length} أسئلة)`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: `### اختبار تفاعلي جاهز: ${result.quiz.title}\n\n${result.quiz.subtitle}\n\n- **عدد الأسئلة:** ${result.quiz.questions.length} أسئلة متدرجة مع تصحيح فوري وشرح لكل إجابة.\n\n> تم فتح الاختبار مباشرة في **منصة المعاينة الحية** لبدء التحدي الآن.`,
          }));
          setActiveGodotProject(null);
          setActiveArtifact({
            id: `quiz_${assistantMsgId}`,
            title: `اختبار: ${result.quiz.title}`,
            kind: 'html',
            language: 'html',
            code: result.html,
          });
          onToast(`تم إنشاء الاختبار التفاعلي (${result.quiz.questions.length} أسئلة)!`);
          return;
        }

        // 0A-APP) INSTANT LIVE INTERACTIVE WEB APP / TOOL FACTORY (+ Iterative Live Editing)
        if (isInteractiveAppIntent(trimmed)) {
          const appPrompt = trimmed.replace(/^\/(تطبيق|app|اداة|أداة)\s*/i, '').trim() || trimmed;
          const isEditingCurrent =
            activeArtifact?.kind === 'html' &&
            /(عدّل|عدل|أضف|اضف|غيّر|غير|طوّر|طور|حسّن|حسن|edit|update|add to)/i.test(appPrompt);
          upsertStep({
            id: 'route',
            label: isEditingCurrent
              ? 'تطوير وتحديث التطبيق الحي المفتوح حالياً'
              : 'تفعيل مصنع التطبيقات والأدوات الحية HTML5',
            status: 'done',
          });
          upsertStep({
            id: 'app_build',
            label: 'هندسة الواجهة والمنطق التفاعلي وتشغيله في المنصة الحية...',
            status: 'running',
          });
          const built = await buildAiLiveApp(
            {
              prompt: appPrompt,
              existingHtml: isEditingCurrent ? activeArtifact?.code : undefined,
              brainContext: brainSystemContext,
            },
            controller.signal
          );
          upsertStep({
            id: 'app_build',
            label: `تم بناء وتشغيل «${built.title}» بنجاح`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: `### تطبيق تفاعلي حي: ${built.title}\n\n${built.summaryAr}\n\n> تم تشغيل التطبيق مباشرة في **منصة المعاينة الحية** — يمكنك تجربته الآن أو تعديله فوراً بكتابة \`/تطبيق عدّل ...\`!`,
          }));
          setActiveGodotProject(null);
          setActiveArtifact({
            id: `app_${assistantMsgId}`,
            title: built.title,
            kind: 'html',
            language: 'html',
            code: built.html,
          });
          onToast(`تم بناء وتشغيل التطبيق الحي: ${built.title}`);
          return;
        }

        // 0) PERMISSION-BASED GODOT 4 LIVE EDITOR CONTROL ("فوت جودوت اعمل كزا بعد إذني")
        if (skillDecision.intent === 'godot_control') {
          upsertStep({
            id: 'route',
            label: 'تم التعرف على أمر تحكم مباشر بمحرك Godot 4',
            status: 'done',
          });
          upsertStep({
            id: 'godot_plan',
            label: 'إعداد خطة أوامر Godot 4 الآمنة بانتظار موافقتك وإذنك...',
            status: 'running',
          });
          const plan = await planGodotEditorCommands(
            {
              prompt: trimmed,
              dimension: godotDimension,
              sceneTree: liveGodotSceneTree,
              activeProjectFiles: activeGodotProject?.project.files.map((f) => f.path),
              brainContext: brainSystemContext,
            },
            controller.signal
          );
          upsertStep({
            id: 'godot_plan',
            label: `تم تجهيز ${plan.commands.length} أوامر — بانتظار موافقتك للتنفيذ`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: `جهّزتُ لك خطة التحكم المباشر داخل محرك **Godot 4** (${plan.commands.length} خطوات).\n\nراجع الأوامر في بطاقة الإذن أدناه واضغط **«موافقة وتنفيذ»** ليقوم أثيرمايند بالتنفيذ فوراً بعد إذنك.`,
            godotActionPlan: plan,
          }));
          return;
        }

        // 0B) MULTI-AI COUNCIL (3 EXPERT MINDS DEBATE + EXECUTIVE VERDICT)
        if (skillDecision.intent === 'council') {
          upsertStep({
            id: 'route',
            label: 'عقد جلسة مجلس الخبراء الثلاثي (المهندس × الناقد × المبدع)',
            status: 'done',
          });
          upsertStep({
            id: 'council_run',
            label: 'مناقشة السؤال من 3 زوايا متخصصة وصياغة القرار التنفيذي...',
            status: 'running',
          });
          const debate = await runAiCouncilDebate(
            { prompt: trimmed, brainContext: brainSystemContext },
            controller.signal
          );
          upsertStep({
            id: 'council_run',
            label: `اكتملت المناظرة الثلاثية بنسبة ثقة ${debate.confidenceScore}%`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: `عقد **مجلس الخبراء الثلاثي في أثيرمايند AI** جلسته حول سؤالك وأصدر قراراً تنفيذياً موحّداً: **${debate.verdictTitle}**.`,
            councilDebate: debate,
          }));
          onToast('اكتملت جلسة مجلس الخبراء الثلاثي!');
          return;
        }

        // 0C) INTERACTIVE MIND MAP & FLOWCHART SVG/PNG GENERATOR
        if (skillDecision.intent === 'mindmap') {
          upsertStep({
            id: 'route',
            label: 'تفعيل مصمّم الخرائط الذهنية والمخططات التفاعلية',
            status: 'done',
          });
          upsertStep({
            id: 'mindmap_run',
            label: 'هيكلة الفروع الرئيسية والتفريعات ورسم المخطط عالي الدقة...',
            status: 'running',
          });
          const mindMap = await generateAiMindMap(
            { prompt: trimmed, brainContext: brainSystemContext },
            controller.signal
          );
          upsertStep({
            id: 'mindmap_run',
            label: `تم رسم خريطة «${mindMap.title}» (${mindMap.branches.length} فروع رئيسية)`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: `صمّمتُ لك خريطة ذهنية تفاعلية بعنوان **«${mindMap.title}»** — يمكنك التبديل بين العرض **الشعاعي** و**الهرمي** أو تحميلها فوراً بدقة **PNG HD / SVG**.`,
            mindMap,
          }));
          onToast(`تم إنشاء الخريطة الذهنية «${mindMap.title}»!`);
          return;
        }

        // 1) GODOT 4 FULL PROJECT ENGINE
        if (effectiveMode === 'godot') {
          upsertStep({ id: 'route', label: 'تفعيل مهندس محرك Godot 4.3+', status: 'done' });
          upsertStep({
            id: 'godot_build',
            label: 'هندسة ملفات GDScript 2.0 ومشاهد .tscn والنسخة القابلة للعب...',
            status: 'running',
          });
          const godotResult = await generateGodotGameProject(
            {
              prompt: trimmed,
              dimension: godotDimension,
              renderer: godotRenderer,
              depth,
              bridgeWsUrl: godotBridgeWsUrl,
              pairCode: godotPairCode,
            },
            controller.signal
          );
          upsertStep({
            id: 'godot_build',
            label: `تم بناء ${godotResult.project.files.length} ملفات لمحرك Godot 4 بنجاح`,
            status: 'done',
          });
          const finalText = `${godotResult.guideMarkdown}\n\n> تم توليد **${godotResult.project.files.length} ملفات** لمحرك **Godot ${godotResult.project.godotVersion}** جاهزة للتجربة الفورية أو التحميل بصيغة \`.zip\`.`;
          updateAssistantMsg((m) => ({
            ...m,
            text: finalText,
            godotProject: godotResult.project,
          }));
          setActiveArtifact(null);
          setActiveGodotProject({
            project: godotResult.project,
            tab: godotResult.project.previewHtml ? 'play' : 'files',
          });
          setActiveDrawer('none');
          onToast(`تم بناء لعبة Godot 4 بنجاح: ${godotResult.project.projectName}`);
          return;
        }

        // 1B) VISUAL IMAGE & ARTWORK STUDIO (Bespoke HD SVG->PNG + Real Proxied Web Photos)
        if (skillDecision.intent === 'image_gen' || effectiveMode === 'poster') {
          upsertStep({ id: 'route', label: 'تفعيل استوديو الصور والفن البصري HD', status: 'done' });
          upsertStep({
            id: 'img_gen',
            label: 'رسم العمل الفني عالي الدقة + جلب صور حقيقية مطابقة من الإنترنت...',
            status: 'running',
          });
          const aspect: '1:1' | '16:9' | '9:16' = /طولي|ستوري|ريلز|بوستر|9:16/i.test(trimmed)
            ? '9:16'
            : /عرضي|يوتيوب|غلاف|خلفية|16:9/i.test(trimmed)
            ? '16:9'
            : '1:1';
          const imgRes = await generateAiVisualImages(
            {
              prompt: trimmed,
              aspectRatio: aspect,
              brainContext: brainSystemContext,
            },
            controller.signal
          );
          upsertStep({
            id: 'img_gen',
            label: `تم إنشاء التصميم الفني + ${imgRes.bundle.webPhotos.length} صور حقيقية جاهزة للتحميل PNG`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: imgRes.description,
            generatedImages: imgRes.bundle,
          }));
          onToast(`تم إنشاء الصورة والتصميم «${imgRes.bundle.title}» — يمكنك تحميلها PNG HD فوراً!`);
          return;
        }

        // 1C) INLINE AI VIDEO STORYBOARD DIRECTLY IN CHAT (no standalone drawer needed)
        if (skillDecision.intent === 'video_gen' || effectiveMode === 'video') {
          upsertStep({ id: 'route', label: 'توليد سيناريو ومشاهد الفيديو داخل المحادثة', status: 'done' });
          upsertStep({
            id: 'vid_gen',
            label: 'كتابة السيناريو وتوليد المشاهد الحية...',
            status: 'running',
          });
          const ratio = /يوتيوب|عرضي|16:9/i.test(trimmed) ? '16:9' : '9:16';
          const videoProj = await generateMotionVideoProject({
            prompt: trimmed,
            aspectRatio: ratio,
            sceneCount: 4,
            includeInternetPhotos: true,
            brainContext: brainSystemContext,
          });
          upsertStep({
            id: 'vid_gen',
            label: `اكتمل سيناريو الفيديو (${videoProj.scenes.length} مشاهد)`,
            status: 'done',
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: `تم إخراج سيناريو ومشاهد الفيديو **«${videoProj.title}»** (${videoProj.scenes.length} مشاهد بمقاس \`${videoProj.aspectRatio}\`) مباشرة داخل المحادثة.`,
            motionVideo: videoProj,
          }));
          onToast(`تم توليد مشاهد الفيديو «${videoProj.title}» داخل المحادثة!`);
          return;
        }

        // 2) AUDIO PODCAST / BRIEF MODE
        if (effectiveMode === 'audio') {
          upsertStep({ id: 'route', label: 'تفعيل استوديو البودكاست الصوتي', status: 'done' });
          upsertStep({
            id: 'audio_gen',
            label: 'كتابة السكربت وتوليد الصوت العصبي عالي الدقة...',
            status: 'running',
          });
          const audioRes = await generateAiAudioBrief({
            text: trimmed,
            format: audioStyle === 'podcast' ? 'podcast' : 'single',
          });
          upsertStep({ id: 'audio_gen', label: 'تم إنتاج الملف الصوتي بنجاح', status: 'done' });
          updateAssistantMsg((m) => ({
            ...m,
            text: audioRes.script,
            audioDataUrl: audioRes.audioDataUrl,
            audioVoiceLabel: audioRes.voiceLabel,
          }));
          onToast('تم إنتاج البودكاست الصوتي بنجاح.');
          return;
        }

        // 3) CINEMA CONCIERGE MODE
        if (effectiveMode === 'cinema') {
          upsertStep({ id: 'route', label: 'تحليل مكتبة السينما والترشيح الفوري', status: 'done' });
          const catalogSummary = buildCatalogSummaryForAI(catalogItems);
          const res = await askAiConcierge({
            message: trimmed,
            history: historySnapshot,
            catalogSummary,
            context: {
              activeProfile: activeProfileName,
              familyGuard,
              activeServerName,
            },
          });
          updateAssistantMsg((m) => ({
            ...m,
            text: res.reply,
            matchedIds: res.matchedIds,
          }));
          if (res.suggestedTab) {
            onApplyTab(res.suggestedTab);
          } else if (res.suggestedSearch) {
            onApplySearch(res.suggestedSearch);
          } else if (res.suggestedProfile) {
            onApplyProfile(res.suggestedProfile);
          }
          return;
        }

        // 4) MULTI-AGENT COMMANDER ORCHESTRATION (Deep Neural Thinking + Vector Memory + Self-Evolution + Approved Account Context)
        if (useCommander) {
          upsertStep({ id: 'route', label: 'تفعيل القائد الشامل بالتفكير العميق والوكلاء المتخصصين', status: 'done' });
          let finalAccumulatedText = '';
          let missionPlan: AiMissionPlan | undefined;

          const vectorHits = getSharedVectorMemory().search(trimmed, { topK: 4 });
          const vectorBlock =
            vectorHits.length > 0
              ? `[سياق مسترجع من الذاكرة المتجهية الموحدة]:\n${vectorHits
                  .map((h) => `- ${h.record.title}: ${h.record.response || h.record.content}`)
                  .join('\n')}`
              : '';
          const skillsBlock =
            evolutionState.evolvedSkills.length > 0
              ? `[مهارات التطوير الذاتي المكتسبة — الجيل ${evolutionState.generation}]:\n${evolutionState.evolvedSkills
                  .slice(0, 4)
                  .map((s) => `- ${s.name}: ${s.guidance}`)
                  .join('\n')}`
              : '';
          let accountBlock = '';
          const waAllowedHits = searchAuthorizedWhatsAppGroups(
            loadAuthorizedWhatsAppGroups(),
            trimmed,
            6
          );
          if (effectiveAccountConsent && seekerPrecheck.detectAccountSearchIntent(trimmed)) {
            const accHits = seekerPrecheck.searchUserAccount(trimmed, {
              isSignedIn: Boolean(user),
              displayName: user?.displayName || activeProfileName,
              email: user?.email || null,
              sessions: sessions.slice(0, 15).map((s) => ({
                id: s.id,
                title: s.title,
                snippet:
                  s.messages
                    .slice(-2)
                    .map((m) => m.text)
                    .join(' — ')
                    .slice(0, 180) || 'جلسة فارغة',
              })),
              brainNotes: brainProfile.memories.map((m) => m.content).slice(0, 20),
            });
            const socialRes = await searchConnectedSocialAccounts(trimmed, true).catch(() => ({
              hits: [],
              searchedProviders: [],
            }));
            const sections: string[] = [];
            if (accHits.length > 0) {
              sections.push(
                `[نتائج البحث المأذون داخل حساب فالدريون]:\n${accHits
                  .map((h) => `- [${h.area}] ${h.title}: ${h.snippet}`)
                  .join('\n')}`
              );
            }
            if (socialRes.hits.length > 0) {
              sections.push(
                `[نتائج البحث المأذون داخل حسابات التواصل الاجتماعي المربوطة]:\n${socialRes.hits
                  .map((h) => `- [${h.providerLabel}] ${h.title}: ${h.snippet} (${h.url})`)
                  .join('\n')}`
              );
            }
            accountBlock = sections.join('\n\n');
          }
          if (waAllowedHits.length > 0) {
            const waSection = `[مقتطفات من مجموعات واتساب التي سمحتَ للقائد بقراءتها]:\n${waAllowedHits
              .map((h) => `- [${h.groupName} · ${h.sender}]: ${h.text}`)
              .join('\n')}`;
            accountBlock = [accountBlock, waSection].filter(Boolean).join('\n\n');
          }

          const advisorPromptBlock = buildAdvisorCouncilPromptBlock(advisorCouncil, trimmed);
          const enrichedBrainContext = [
            brainSystemContext,
            buildCommanderRulesBlock(commanderSettings),
            buildAppControlSystemPrompt(),
            advisorPromptBlock,
            vectorBlock,
            skillsBlock,
            accountBlock,
          ]
            .filter(Boolean)
            .join('\n\n');

          setCommanderCloudRequests((c) => c + 1);
          await orchestrateAiMission(
            {
              message: trimmed,
              depth,
              webSearch: effectiveWebSearch || seekerPrecheck.detectWebSearchIntent(trimmed, false),
              brainContext: enrichedBrainContext,
              url: detectedUrl,
              history: historySnapshot,
              image: imgSnap ? { mimeType: imgSnap.mimeType, data: imgSnap.data } : undefined,
              audio: audSnap ? { mimeType: audSnap.mimeType, data: audSnap.data } : undefined,
              fileText: fileSnap || undefined,
              commanderFreedom: {
                openMode: commanderSettings.openMode,
                maxAgents: commanderSettings.maxAgents,
                customDirectives: commanderSettings.customDirectives,
              },
              advisorCouncil: {
                advisorEnabled: advisorCouncil.advisorEnabled,
                advisorStyle: advisorCouncil.advisorStyle,
                enabledAssistantIds: advisorCouncil.assistants
                  .filter((a) => a.enabled)
                  .map((a) => a.id),
                customAssistants: advisorCouncil.assistants
                  .filter((a) => a.enabled && a.isCustom)
                  .map((a) => ({
                    id: a.id,
                    nameAr: a.nameAr,
                    specialtyAr: a.specialtyAr,
                  })),
              },
            },
            {
              onStage: (stage, label) => {
                setLiveStatus(label);
                upsertStep({ id: `cmd_${stage}`, label, status: 'running' });
              },
              onStatus: (label) => setLiveStatus(label),
              onPlan: (plan) => {
                upsertStep({ id: 'cmd_planning', label: 'تم وضع خطة الفريق وتوزيع المهام', status: 'done' });
                missionPlan = {
                  missionSummary: plan.missionSummary,
                  stage: 'delegating',
                  steps: plan.steps.map((st) => ({
                    stepId: st.stepId,
                    agentId: st.agentId,
                    agentName: st.agentName,
                    englishRole: st.englishRole,
                    taskTitle: st.taskTitle,
                    instruction: st.instruction,
                    needsWebSearch: st.needsWebSearch,
                    status: st.status,
                  })),
                };
                updateAssistantMsg((m) => ({ ...m, missionPlan }));
              },
              onStepStart: (stepId) => {
                if (!missionPlan) return;
                missionPlan = {
                  ...missionPlan,
                  steps: missionPlan.steps.map((st) =>
                    st.stepId === stepId ? { ...st, status: 'running' } : st
                  ),
                };
                updateAssistantMsg((m) => ({ ...m, missionPlan }));
              },
              onStepThought: (stepId, delta) => {
                if (!missionPlan) return;
                missionPlan = {
                  ...missionPlan,
                  steps: missionPlan.steps.map((st) =>
                    st.stepId === stepId
                      ? { ...st, thoughts: `${st.thoughts || ''}${delta}` }
                      : st
                  ),
                };
                updateAssistantMsg((m) => ({ ...m, missionPlan }));
              },
              onStepDone: (doneStep) => {
                if (!missionPlan) return;
                missionPlan = {
                  ...missionPlan,
                  steps: missionPlan.steps.map((st) =>
                    st.stepId === doneStep.stepId
                      ? {
                          ...st,
                          status: doneStep.status,
                          summary: doneStep.summary,
                          output: doneStep.output,
                          sources: doneStep.sources,
                          durationMs: doneStep.durationMs,
                        }
                      : st
                  ),
                };
                updateAssistantMsg((m) => ({ ...m, missionPlan }));
              },
              onThought: (delta) => {
                updateAssistantMsg((m) => ({
                  ...m,
                  thoughts: `${m.thoughts || ''}${delta}`,
                }));
              },
              onChunk: (delta) => {
                finalAccumulatedText += delta;
                updateAssistantMsg((m) => ({
                  ...m,
                  text: finalAccumulatedText,
                }));
              },
              onDone: (meta) => {
                if (missionPlan) {
                  missionPlan = { ...missionPlan, stage: 'done' };
                }
                upsertStep({ id: 'cmd_delegating', label: 'أنجز الوكلاء مهامهم بنجاح', status: 'done' });
                upsertStep({ id: 'cmd_synthesizing', label: 'تم دمج التقرير النهائي المتكامل', status: 'done' });
                updateAssistantMsg((m) => ({
                  ...m,
                  missionPlan,
                  sources: meta.sources,
                  searchQueries: meta.searchQueries,
                  websiteInfo: meta.websiteInfo,
                  thinkingDurationMs: meta.thinkingDurationMs,
                }));
                const artifacts = extractArtifactsFromMarkdown(finalAccumulatedText);
                if (artifacts.length > 0) {
                  setActiveGodotProject(null);
                  setActiveArtifact(toRunnableArtifact(artifacts[0]));
                }
                // Archive into Shared Vector Memory + Self-Evolution counter
                const store = getSharedVectorMemory();
                if (trimmed && finalAccumulatedText) {
                  store.upsert({
                    kind: 'mission',
                    title: trimmed.slice(0, 120),
                    content: `${trimmed}\n${finalAccumulatedText.slice(0, 500)}`,
                    tags: ['قائد_ذكي', `gen_v${evolutionState.generation}`],
                    agentSource: 'orchestrator',
                  });
                  setVectorMemoryCount(store.count());
                  const nextEvo: SelfEvolutionState = {
                    ...evolutionState,
                    totalMissions: evolutionState.totalMissions + 1,
                  };
                  if (nextEvo.totalMissions > 0 && nextEvo.totalMissions % 4 === 0) {
                    const auto = runSelfEvolutionCycle({
                      state: nextEvo,
                      store,
                      recentPrompts: [trimmed],
                    });
                    setEvolutionState(auto.nextState);
                  } else {
                    saveEvolutionState(nextEvo);
                    setEvolutionState(nextEvo);
                  }
                }
                // Full App Control + Embedded LLM Directives + Auto-Speak + Auto-Webhook
                const parsedAiCmds = parseEmbeddedAppCommands(finalAccumulatedText);
                const cleanFinalText = parsedAiCmds.cleanMarkdown || finalAccumulatedText;
                if (parsedAiCmds.commands.length > 0) {
                  updateAssistantMsg((m) => ({ ...m, text: cleanFinalText }));
                }
                const directUserCmds = detectFullAppCommands(trimmed);
                const mergedCmds = [...directUserCmds, ...parsedAiCmds.commands];
                if (mergedCmds.length > 0) {
                  executeFullAppCommands(mergedCmds, cleanFinalText, assistantMsgId);
                } else {
                  const crossActs = detectCrossAppActions(trimmed);
                  if (crossActs.length > 0) {
                    executeOmniCrossAppActions(crossActs, cleanFinalText, assistantMsgId);
                  }
                }
                if (
                  (omniConfig.autoSpeak || brainProfile.autoSpeakReplies) &&
                  finalAccumulatedText
                ) {
                  void handleSpeakMessage(assistantMsgId, finalAccumulatedText);
                }
                if (
                  omniConfig.autoSendWebhook &&
                  (omniConfig.webhookUrl || (omniConfig.connectedWebhooks || []).some((w) => w.enabled)) &&
                  finalAccumulatedText
                ) {
                  void dispatchToAllConnectedWebhooks({
                    config: omniConfig,
                    prompt: trimmed,
                    reply: finalAccumulatedText,
                    generation: evolutionState.generation,
                    agentsUsed: missionPlan?.steps.map((s) => s.agentName) || ['القائد الشامل'],
                  });
                }
              },
            },
            controller.signal
          );
          return;
        }

        // 4B) AETHERMIND APEX 4-STAGE AUTONOMOUS SELF-VERIFYING REASONING ENGINE
        const useApexEngine = depth === 'apex' || isApexDeepIntent(trimmed);

        if (useApexEngine) {
          const cleanApexPrompt = trimmed.replace(/^\/(ابكس|أبكس|apex|تدقيق|critique|بحث_عميق)\s*/i, '').trim() || trimmed;
          upsertStep({
            id: 'route',
            label: 'تفعيل محرك APEX الأقصى (تخطيط + بحث حي + نقد ذاتي + صياغة XHIGH)',
            status: 'done',
          });
          let apexAccumulated = '';
          await streamAiApex(
            {
              message: cleanApexPrompt,
              history: historySnapshot,
              brainContext: brainSystemContext,
              webSearch: true,
              attachedFile: fileSnap,
            },
            {
              onStep: (step) => upsertStep(step),
              onChunk: (delta) => {
                apexAccumulated += delta;
                updateAssistantMsg((m) => ({ ...m, text: apexAccumulated }));
              },
              onDone: (meta) => {
                updateAssistantMsg((m) => ({
                  ...m,
                  sources: meta.sources,
                  searchQueries: meta.searchQueries,
                  apexReport: meta.apexReport,
                  thinkingDurationMs: meta.thinkingDurationMs,
                }));
                const artifacts = extractArtifactsFromMarkdown(apexAccumulated);
                const runnable =
                  artifacts.find((a) => a.kind === 'html' || a.kind === 'svg') || artifacts[0];
                if (runnable) {
                  setActiveGodotProject(null);
                  setActiveArtifact(toRunnableArtifact(runnable));
                }
                if (brainProfile.autoSpeakReplies && apexAccumulated) {
                  void handleSpeakMessage(assistantMsgId, apexAccumulated);
                }
              },
            },
            controller.signal
          );
          return;
        }

        // 5) STANDARD / DEEP / ULTRA / CREATE / RESEARCH / URL / DECONSTRUCT STREAMING WITH LIVE PROGRESS TIMELINE
        upsertStep({ id: 'route', label: skillDecision.labelAr, status: 'done' });
        const apiMode: Exclude<AiStudioMode, 'cinema' | 'audio'> = effectiveMode;
        let accumulated = '';
        await streamAiStudio(
          {
            mode: apiMode,
            depth: skillDecision.recommendedDepth || depth,
            webSearch: effectiveWebSearch,
            agentId: chosenAgent?.id,
            agentName: chosenAgent?.name,
            agentSystemPrompt: chosenAgent?.systemPersona,
            brainContext: brainSystemContext,
            message: trimmed || (detectedUrl ? `اقرأ وحلّل هذا الرابط بعمق: ${detectedUrl}` : 'حلّل المرفق'),
            url: detectedUrl,
            createKind: opts?.createKind,
            history: historySnapshot,
            image: imgSnap ? { mimeType: imgSnap.mimeType, data: imgSnap.data } : undefined,
            audio: audSnap ? { mimeType: audSnap.mimeType, data: audSnap.data } : undefined,
            fileText: fileSnap || undefined,
          },
          {
            onStatus: (label) => setLiveStatus(label),
            onStep: (step) => upsertStep(step),
            onThought: (delta) => {
              updateAssistantMsg((m) => ({
                ...m,
                thoughts: `${m.thoughts || ''}${delta}`,
              }));
            },
            onChunk: (delta) => {
              accumulated += delta;
              updateAssistantMsg((m) => ({ ...m, text: accumulated }));
            },
            onDone: (meta) => {
              updateAssistantMsg((m) => ({
                ...m,
                sources: meta.sources,
                searchQueries: meta.searchQueries,
                websiteInfo: meta.websiteInfo,
                audioTranscript: meta.audioTranscript,
                thinkingDurationMs: meta.thinkingDurationMs,
              }));
              const artifacts = extractArtifactsFromMarkdown(accumulated);
              const runnable =
                artifacts.find((a) => a.kind === 'html' || a.kind === 'svg') ||
                artifacts[0];
              if (runnable) {
                setActiveGodotProject(null);
                setActiveArtifact(toRunnableArtifact(runnable));
              }
              if (brainProfile.autoSpeakReplies && accumulated) {
                void handleSpeakMessage(assistantMsgId, accumulated);
              }
            },
          },
          controller.signal
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          updateAssistantMsg((m) => ({
            ...m,
            text: m.text || 'تم إيقاف التوليد بناءً على طلبك.',
          }));
        } else {
          const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالذكاء.';
          updateAssistantMsg((m) => ({
            ...m,
            executionSteps: [
              ...(m.executionSteps || []).map((st) =>
                st.status === 'running' ? { ...st, status: 'done' as const } : st
              ),
              { id: 'err', label: 'توقف التنفيذ بسبب خطأ', detail: msg, status: 'error' as const },
            ],
            text: m.text ? `${m.text}\n\n> ملاحظة: ${msg}` : `تعذّر إكمال الطلب: ${msg}`,
          }));
          onToast(msg);
        }
      } finally {
        setIsStreaming(false);
        setLiveStatus('');
        abortRef.current = null;
        if (user) {
          setSessions((curr) => {
            const latest = curr.find((s) => s.id === sid);
            if (latest) void saveAiSessionToCloud(user.uid, latest);
            return curr;
          });
        }
      }
    },
    [
      activeArtifact,
      activeGodotProject,
      activeProfileName,
      activeServerName,
      activeSession,
      attachedAudio,
      attachedFile,
      attachedImage,
      audioStyle,
      accountConsentGranted,
      brainProfile,
      brainSystemContext,
      catalogItems,
      commanderMode,
      commanderSettings,
      depth,
      evolutionState.generation,
      executeOmniCrossAppActions,
      familyGuard,
      godotBridgeWsUrl,
      godotDimension,
      godotPairCode,
      godotRenderer,
      handleSpeakMessage,
      handleUpdateBrainProfile,
      handleUpdateCommanderSettings,
      isStreaming,
      liveGodotSceneTree,
      mode,
      omniConfig,
      onApplyProfile,
      onApplySearch,
      onApplyTab,
      onToast,
      persistSessionUpdate,
      selectedAgentId,
      sessions,
      urlInput,
      user,
      webSearch,
    ]
  );

  // Consume initialPrompt if passed from Cinema app
  useEffect(() => {
    if (!initialPrompt || isStreaming) return;
    const prompt = initialPrompt;
    onClearInitialPrompt?.();
    void sendMessage(prompt, { forceMode: 'create' });
  }, [initialPrompt, isStreaming, onClearInitialPrompt, sendMessage]);

  const handleStopStreaming = () => {
    abortRef.current?.abort();
  };

  const handleNewChat = () => {
    if (isStreaming) handleStopStreaming();
    const fresh = makeNewSession();
    setSessions((prev) => [fresh, ...prev].slice(0, 30));
    setActiveSessionId(fresh.id);
    setActiveArtifact(null);
    setActiveGodotProject(null);
    setActiveDrawer('none');
    setMode('general');
    setSelectedAgentId(null);
    setCommanderMode(false);
  };

  const handleDeleteSession = (id: string) => {
    if (user) void deleteAiSessionFromCloud(user.uid, id);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = makeNewSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      dictationRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      onToast('المتصفح لا يدعم الإملاء الصوتي المباشر — يمكنك استخدام التحدث الحي أو الكتابة.');
      return;
    }
    try {
      const rec = new Rec();
      rec.lang = 'ar-SA';
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (ev) => {
        let txt = '';
        for (let i = 0; i < ev.results.length; i++) {
          txt += ev.results[i][0]?.transcript || '';
        }
        setInput(txt.trim());
      };
      rec.onerror = () => setIsDictating(false);
      rec.onend = () => setIsDictating(false);
      dictationRef.current = rec;
      setIsDictating(true);
      rec.start();
    } catch {
      setIsDictating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      onToast('الحد الأقصى لحجم الصورة 6 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      setAttachedImage({
        mimeType: file.type || 'image/jpeg',
        data: base64,
        previewUrl: result,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onToast('الحد الأقصى للملف الصوتي 10 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      setAttachedAudio({
        mimeType: file.type || 'audio/mp3',
        data: base64,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      onToast('الحد الأقصى لملف الكود أو النص 1.5 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        content: String(reader.result || '').slice(0, 60000),
      });
      onToast(`تم إرفاق الملف: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCommitVoiceExchange = useCallback(
    (userText: string, assistantText: string) => {
      const now = Date.now();
      persistSessionUpdate(activeSession.id, (s) => ({
        ...s,
        title: s.messages.length === 0 ? userText.slice(0, 44) : s.title,
        updatedAt: now + 1,
        messages: [
          ...s.messages,
          { id: `vu_${now}`, role: 'user', text: userText, mode: 'general', ts: now },
          {
            id: `va_${now + 1}`,
            role: 'assistant',
            text: assistantText,
            mode: 'general',
            ts: now + 1,
          },
        ],
      }));
    },
    [activeSession.id, persistSessionUpdate]
  );

  const hasSplitPane = Boolean(activeArtifact || activeGodotProject);
  const isEmptyWelcome =
    activeSession.messages.length === 0 && activeDrawer === 'none' && !hasSplitPane;

  const filteredAgents = useMemo(() => {
    if (agentCategory === 'all') return AI_AGENTS;
    return AI_AGENTS.filter((a) => a.category === agentCategory);
  }, [agentCategory]);

  const slashMatches = useMemo(() => filterSlashCommands(input), [input]);

  const handleExportSessionMarkdown = useCallback(() => {
    const md = buildConversationMarkdownExport(
      activeSession.title || 'محادثة أثيرمايند AI',
      activeSession.messages
    );
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethermind-chat-${Date.now()}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast('تم تصدير المحادثة كاملة بصيغة Markdown (.md).');
  }, [activeSession.messages, activeSession.title, onToast]);

  // 1-Click Message Super-Powers (Adversarial Refine / Slides / Quiz / Live App)
  const handleRefineMessage = useCallback(
    async (msg: AiStudioMessage) => {
      if (transformingMsgKey || isStreaming || !msg.text.trim()) return;
      const key = `refine_${msg.id}`;
      setTransformingMsgKey(key);
      try {
        const msgs = activeSession.messages;
        const idx = msgs.findIndex((m) => m.id === msg.id);
        const precedingUser = idx > 0 ? msgs.slice(0, idx).reverse().find((m) => m.role === 'user') : undefined;
        const originalPrompt = precedingUser?.text || activeSession.title || 'تحسين وتدقيق الإجابة';
        const res = await refineAiAnswer({
          originalQuestion: originalPrompt,
          previousAnswer: msg.text,
          brainContext: brainSystemContext,
        });
        persistSessionUpdate(activeSession.id, (s) => ({
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  text: res.refinedText,
                  apexReport: res.apexReport,
                }
              : m
          ),
        }));
        onToast('تم تدقيق الإجابة وترقيتها بالكامل عبر محرك النقد الذاتي APEX!');
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'تعذّر تدقيق الإجابة حالياً.');
      } finally {
        setTransformingMsgKey(null);
      }
    },
    [activeSession.id, activeSession.messages, activeSession.title, brainSystemContext, isStreaming, onToast, persistSessionUpdate, transformingMsgKey]
  );

  const handleTurnMessageIntoSlides = useCallback(
    async (msg: AiStudioMessage) => {
      if (transformingMsgKey || isStreaming || !msg.text.trim()) return;
      const key = `slides_${msg.id}`;
      setTransformingMsgKey(key);
      try {
        const topic = activeSession.title || 'عرض تقديمي ذكي';
        const res = await generateAiSlidesDeck({
          topic,
          sourceContent: msg.text,
          brainContext: brainSystemContext,
        });
        setActiveGodotProject(null);
        setActiveArtifact({
          id: `slides_${msg.id}_${Date.now()}`,
          title: `عرض: ${res.deck.title}`,
          kind: 'html',
          language: 'html',
          code: res.html,
        });
        onToast(`تم تحويل الرد إلى عرض تقديمي حي (${res.deck.slides.length} شرائح)!`);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'تعذّر إنشاء الشرائح.');
      } finally {
        setTransformingMsgKey(null);
      }
    },
    [activeSession.title, brainSystemContext, isStreaming, onToast, transformingMsgKey]
  );

  const handleTurnMessageIntoQuiz = useCallback(
    async (msg: AiStudioMessage) => {
      if (transformingMsgKey || isStreaming || !msg.text.trim()) return;
      const key = `quiz_${msg.id}`;
      setTransformingMsgKey(key);
      try {
        const topic = activeSession.title || 'اختبار إتقان تفاعلي';
        const res = await generateAiQuizApp({
          topic,
          sourceContent: msg.text,
        });
        setActiveGodotProject(null);
        setActiveArtifact({
          id: `quiz_${msg.id}_${Date.now()}`,
          title: `اختبار: ${res.quiz.title}`,
          kind: 'html',
          language: 'html',
          code: res.html,
        });
        onToast(`تم إنشاء اختبار تفاعلي من هذا الرد (${res.quiz.questions.length} أسئلة)!`);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'تعذّر إنشاء الاختبار.');
      } finally {
        setTransformingMsgKey(null);
      }
    },
    [activeSession.title, brainSystemContext, isStreaming, onToast, transformingMsgKey]
  );

  const handleTurnMessageIntoApp = useCallback(
    async (msg: AiStudioMessage) => {
      if (transformingMsgKey || isStreaming || !msg.text.trim()) return;
      const key = `app_${msg.id}`;
      setTransformingMsgKey(key);
      try {
        const res = await buildAiLiveApp({
          prompt: `حوّل هذه الفكرة أو الشرح إلى أداة ويب تفاعلية حية وعملية بالكامل:\n\n${msg.text.slice(0, 3500)}`,
          brainContext: brainSystemContext,
        });
        setActiveGodotProject(null);
        setActiveArtifact({
          id: `app_${msg.id}_${Date.now()}`,
          title: res.title,
          kind: 'html',
          language: 'html',
          code: res.html,
        });
        onToast(`تم بناء تطبيق حي من هذا الرد: ${res.title}`);
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'تعذّر بناء التطبيق التفاعلي.');
      } finally {
        setTransformingMsgKey(null);
      }
    },
    [brainSystemContext, isStreaming, onToast, transformingMsgKey]
  );

  // Power-User Keyboard Shortcuts (Ctrl/Cmd+K for Slash Commands, Escape to close preview)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setInput((prev) => (prev.startsWith('/') ? prev : '/'));
        textareaRef.current?.focus();
      } else if (e.key === 'Escape' && activeArtifact) {
        setActiveArtifact(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeArtifact]);

  const handleSubmitInput = useCallback(
    (rawValue: string) => {
      const t = rawValue.trim();
      if (/^\/(مهارة|skill)(?:\s|$)/i.test(t)) {
        setInput('');
        setBrainModalInitialTab('skill');
        setBrainModalOpen(true);
        onToast('تم فتح نافذة تصدير ملف مهارة Gemini (SKILL.md).');
        return;
      }
      void sendMessage(rawValue);
    },
    [onToast, sendMessage]
  );

  // Shared AETHERMIND Composer Box with Slash Commands + Smart Prompt Enhancer
  const renderComposer = (centered: boolean) => (
    <div className={centered ? 'relative mx-auto w-full max-w-3xl' : 'relative mx-auto w-full max-w-3xl'}>
      {/* Floating Slash Command Palette */}
      {slashMatches.length > 0 && !isStreaming && (
        <div
          role="listbox"
          aria-label="أوامر أثيرمايند السريعة"
          className="mb-2 max-h-64 overflow-y-auto rounded-2xl border border-[#60A5FA]/35 bg-[#121827]/98 p-2 shadow-2xl backdrop-blur-xl"
        >
          <p className="mb-1.5 px-2 text-[10px] font-extrabold text-[#93C5FD]">
            أوامر أثيرمايند السريعة (اضغط لاختيار المهارة فوراً)
          </p>
          <div className="grid gap-1 sm:grid-cols-2">
            {slashMatches.map((cmd) => (
              <button
                key={cmd.command}
                type="button"
                onClick={() => {
                  if (cmd.command === '/مهارة') {
                    setInput('');
                    setBrainModalInitialTab('skill');
                    setBrainModalOpen(true);
                    return;
                  }
                  setInput(cmd.template);
                  textareaRef.current?.focus();
                }}
                className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#182034] px-3 py-2 text-right transition-colors hover:border-[#60A5FA]/60 hover:bg-[#1E2942]"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-white">
                    <span className="text-[#F5C76B]">{cmd.command}</span> · {cmd.titleAr}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-[#94A3B8]">
                    {cmd.descriptionAr}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[#2563EB]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#93C5FD]">
                  {cmd.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Consent-Gated Account Search Approval Card (Sentinel Gate) */}
      {pendingAccountConsentPrompt && (
        <div
          role="region"
          aria-label="طلب إذن الدخول والبحث داخل حسابك"
          className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-emerald-400/45 bg-emerald-950/35 px-3.5 py-2.5 text-xs text-emerald-100"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>
              <strong>بوابة الحامي (Sentinel):</strong> هل تأذن للقائد بالبحث داخل حسابك ومحادثاتك المحفوظة؟
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const retryPrompt = pendingAccountConsentPrompt;
                setPendingAccountConsentPrompt(null);
                void sendMessage(retryPrompt, {
                  forceCommander: true,
                  overrideAccountConsent: true,
                });
              }}
              className="whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-[#051812] hover:bg-emerald-400"
            >
              أوافق — ابحث في حسابي الآن
            </button>
            <button
              type="button"
              onClick={() => {
                const retryPrompt = pendingAccountConsentPrompt;
                setAccountConsentGranted(true);
                setPendingAccountConsentPrompt(null);
                onToast('تم منح إذن البحث في حسابك طوال هذه الجلسة.');
                void sendMessage(retryPrompt, {
                  forceCommander: true,
                  overrideAccountConsent: true,
                });
              }}
              className="whitespace-nowrap rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
            >
              أوافق للجلسة
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingAccountConsentPrompt(null);
                onToast('تم رفض الدخول للحساب — بياناتك محمية بالكامل.');
              }}
              className="whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white"
            >
              رفض
            </button>
          </div>
        </div>
      )}

      {/* Subtle Status / Active Attachments Row */}
      {(attachedImage || attachedAudio || attachedFile || activeAgent || commanderMode) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          {commanderMode && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-300">
                {commanderSettings.engineMode === 'cloud-commander'
                  ? `القائد الشامل${advisorCouncil.advisorEnabled ? ' + المستشار' : ''} (${advisorCouncil.assistants.filter((a) => a.enabled).length} مساعدين) · تفكير عميق`
                  : commanderSettings.engineMode === 'local-ollama'
                  ? `القائد المحلي (Ollama) · ${commanderSettings.localModelName}`
                  : `القائد المحلي بدون سحابة · الجيل ${evolutionState.generation}`}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setCommanderModalOpen(true)}
                className="font-semibold text-slate-300 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-white"
              >
                الإعدادات والتطوير الذاتي
              </button>
            </div>
          )}
          {activeAgent && !commanderMode && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#60A5FA]/40 bg-[#60A5FA]/12 px-2.5 py-1 text-[11px] font-bold text-[#DBEAFE]">
              <Bot className="h-3.5 w-3.5 text-[#60A5FA]" aria-hidden="true" />
              <span>الوكيل: {activeAgent.name}</span>
              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                className="mr-1 hover:text-white"
                aria-label="إلغاء اختيار الوكيل"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {attachedImage && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#1B2030] px-2.5 py-1 text-[11px] text-[#E8EAED]">
              <img
                src={attachedImage.previewUrl}
                alt={attachedImage.name}
                className="h-6 w-6 rounded object-cover"
              />
              <span className="max-w-[140px] truncate">{attachedImage.name}</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                aria-label="إزالة الصورة"
              >
                <X className="h-3.5 w-3.5 text-[#9AA4B8] hover:text-white" />
              </button>
            </span>
          )}
          {attachedAudio && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B2030] px-2.5 py-1 text-[11px] text-[#E8EAED]">
              <FileAudio className="h-3.5 w-3.5 text-[#60A5FA]" />
              <span className="max-w-[140px] truncate">{attachedAudio.name}</span>
              <button
                type="button"
                onClick={() => setAttachedAudio(null)}
                aria-label="إزالة الصوت"
              >
                <X className="h-3.5 w-3.5 text-[#9AA4B8] hover:text-white" />
              </button>
            </span>
          )}
          {attachedFile && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B2030] px-2.5 py-1 text-[11px] text-[#E8EAED]">
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span className="max-w-[160px] truncate">{attachedFile.name}</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                aria-label="إزالة الملف"
              >
                <X className="h-3.5 w-3.5 text-[#9AA4B8] hover:text-white" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* AETHERMIND Decorated Rounded Composer Box */}
      <div className="rounded-3xl border border-[#60A5FA]/22 bg-[#141926]/95 px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.52)] transition-colors focus-within:border-[#F5C76B]/60">
        <textarea
          ref={textareaRef}
          rows={centered ? 3 : 2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitInput(input);
            }
          }}
          placeholder="اكتب طلبك هنا... (بحث، برمجة، تحليل، أو أي أمر)"
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-[#F1F5F9] placeholder:text-[#7D879C] focus:outline-none sm:text-[15px]"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
          {/* Essential Attachment & Voice Tools Only */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="إرفاق صورة"
              aria-label="إرفاق صورة"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#9AA4B8] transition-colors hover:bg-white/10 hover:text-white"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="إرفاق ملف"
              aria-label="إرفاق ملف كود"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#9AA4B8] transition-colors hover:bg-white/10 hover:text-white"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleToggleDictation}
              title={isDictating ? 'إيقاف الإملاء الصوتي' : 'إملاء صوتي'}
              aria-label="إملاء صوتي"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isDictating
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'text-[#9AA4B8] hover:bg-white/10 hover:text-white'
              }`}
            >
              {isDictating ? (
                <MicOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Mic className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setWebSearch((w) => !w)}
              className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold transition-colors ${
                webSearch
                  ? 'bg-[#60A5FA]/20 text-[#93C5FD]'
                  : 'text-[#8C96AA] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span>بحث ويب</span>
            </button>
          </div>

          {/* Live Talk + Send/Stop */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLiveVoiceOpen(true)}
              title="محادثة صوتية حية"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-[#1B2233] px-3 text-xs font-bold text-[#DCE4F2] transition-colors hover:bg-white/10 hover:text-white"
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">تحدّث</span>
            </button>

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                aria-label="إيقاف التوليد"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white transition-colors hover:bg-rose-500"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmitInput(input)}
                disabled={!input.trim() && !attachedImage && !attachedAudio && !attachedFile}
                aria-label="إرسال الرسالة"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#6366F1] text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0E1015] text-[#E8EAED]">
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.gd,.tscn,.html,.css,.sql,.csv,.xml,.yaml,.yml"
        className="hidden"
        onChange={handleTextFileUpload}
      />

      {/* COLLAPSIBLE RTL RIGHT SIDEBAR (Gemini Style) */}
      <aside
        aria-label="القائمة الجانبية لتطبيق الذكاء"
        className={`fixed inset-y-0 right-0 z-40 flex w-[272px] shrink-0 flex-col border-l border-white/[0.08] bg-[#141824] transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'
        }`}
      >
        {/* Sidebar Top: VALDRION Emblem + New Chat */}
        <div className="border-b border-white/[0.06] px-3.5 pt-3.5 pb-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <img
                src={aethermindEmblem}
                alt="شعار فالدريون"
                className="h-9 w-9 shrink-0 rounded-xl border border-[#F5C76B]/55 object-cover shadow-[0_0_18px_rgba(245,199,107,0.22)]"
              />
              <div className="min-w-0 leading-tight">
                <p className="truncate font-imperial text-xs font-bold tracking-[0.14em] text-[#F8FAFC]">
                  VALDRION
                </p>
                <p className="truncate text-[10px] font-semibold text-[#F5C76B]">
                  فالدريون · الذكاء والقائد الشامل
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="إخفاء القائمة الجانبية"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#9AA4B8] hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#1B2336] px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:border-[#F5C76B]/50 hover:bg-[#222D45]"
          >
            <MessageSquarePlus className="h-4 w-4 text-[#F5C76B]" aria-hidden="true" />
            <span>محادثة جديدة</span>
          </button>
        </div>

        {/* Recent Conversations First (Clean Chat-First Hierarchy) */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[#7D879C]">
              المحادثات
            </span>
            {user && (
              <span className="text-[10px] font-semibold text-emerald-400">
                متزامن
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            {sessions.map((s) => {
              const active = s.id === activeSession.id;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-xs transition-colors ${
                    active
                      ? 'bg-[#1F273B] font-bold text-white'
                      : 'text-[#AEB7C8] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setActiveDrawer('none');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className="min-w-0 flex-1 truncate text-right"
                  >
                    {s.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(s.id)}
                    aria-label="حذف المحادثة"
                    className="opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Extra Tools & Studios (Collapsed by default so screen stays clean) */}
        <div className="border-t border-white/[0.06] px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => setStudiosExpanded((v) => !v)}
            aria-expanded={studiosExpanded}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold text-[#CBD5E1] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#F5C76B]" aria-hidden="true" />
              <span>أدوات إضافية</span>
            </span>
            {studiosExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
            )}
          </button>

          {studiosExpanded && (
            <div className="mt-1.5 max-h-[38vh] space-y-0.5 overflow-y-auto pl-0.5">
              {onSwitchToPrivateAi && (
                <button
                  type="button"
                  onClick={onSwitchToPrivateAi}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-emerald-300 transition-colors hover:bg-white/[0.06]"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">خزنة الذكاء المشفّرة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setBrainModalInitialTab('memories');
                  setBrainModalOpen(true);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <span className="flex items-center gap-2 truncate">
                  <Brain className="h-4 w-4 shrink-0 text-[#60A5FA]" aria-hidden="true" />
                  <span className="truncate">الذاكرة الشخصية</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {brainProfile.memories.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('godot');
                  setActiveDrawer((d) => (d === 'godot' ? 'none' : 'godot'));
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Gamepad2 className="h-4 w-4 shrink-0 text-[#60A5FA]" aria-hidden="true" />
                <span className="truncate">محرك ألعاب Godot 4</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInput('/تطبيق ');
                  textareaRef.current?.focus();
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <AppWindow className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                <span className="truncate">بناء تطبيق حي</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInput('/شرائح ');
                  textareaRef.current?.focus();
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Presentation className="h-4 w-4 shrink-0 text-[#F5C76B]" aria-hidden="true" />
                <span className="truncate">شرائح عرض واختبارات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgentsModalOpen(true);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Crown className="h-4 w-4 shrink-0 text-[#F5C76B]" aria-hidden="true" />
                <span className="truncate">فريق الخبراء والوكلاء</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkflowsModalOpen(true);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Workflow className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span className="truncate">الأتمتة والروابط</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveDrawer((d) => (d === 'connectors' ? 'none' : 'connectors'));
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Palette className="h-4 w-4 shrink-0 text-[#F5C76B]" aria-hidden="true" />
                <span className="truncate">كانفا والجسور الخارجية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('deconstruct');
                  setActiveDrawer((d) => (d === 'deconstruct' ? 'none' : 'deconstruct'));
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-xs font-bold text-[#C4CCDC] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Cpu className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="truncate">تحليل وتفكيك التطبيقات</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* MAIN WORKSPACE COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* CLEAN 3-ZONE TOP BAR */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-[#0F131E] px-3 sm:px-5">
          {/* Zone 1: Menu + Brand + Simple 2-Choice Mode */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="إظهار أو إخفاء القائمة الجانبية"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#AEB7C8] transition-colors hover:bg-white/10 hover:text-white"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <span className="hidden whitespace-nowrap font-imperial text-sm font-bold tracking-[0.12em] text-white sm:inline sm:text-base">
              VALDRION
            </span>

            {/* Simple 2-option toggle: Independent Commander vs Cloud */}
            <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-[#151A28] p-0.5">
              <button
                type="button"
                onClick={() => handleToggleCommanderMode(true)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                  commanderMode
                    ? 'bg-amber-500 text-[#0B0907]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                القائد المستقل
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleCommanderMode(false);
                  setDepth('fast');
                }}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                  !commanderMode
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                السحابي
              </button>
            </div>

            {/* Gemini-Style Model Selector Dropdown (Hydrogen / Balanced / Carbon) */}
            <div className="relative shrink-0">
              <button
                type="button"
                data-testid="ai-model-selector"
                aria-expanded={modelMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setModelMenuOpen((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-[#151A28] px-2.5 text-xs font-extrabold text-white transition-colors hover:border-[#60A5FA]/60 hover:bg-[#1C2336] sm:px-3"
              >
                <Zap
                  className={`h-3.5 w-3.5 shrink-0 ${
                    depth === 'fast'
                      ? 'text-cyan-400'
                      : depth === 'ultra' || depth === 'apex'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {depth === 'fast'
                    ? 'هيدروجين'
                    : depth === 'ultra' || depth === 'apex'
                    ? 'كربون Pro'
                    : 'متوازن'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </button>

              {modelMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setModelMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="listbox"
                    data-testid="ai-model-dropdown-menu"
                    className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-white/15 bg-[#121724] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      اختر نموذج فالدريون AI
                    </div>
                    {(
                      [
                        {
                          id: 'fast' as AiThinkingDepth,
                          name: 'VALDRION Hydrogen (هيدروجين)',
                          badge: 'أسرع استجابة',
                          badgeClass: 'bg-cyan-500/20 text-cyan-200',
                          desc: 'سرعة فائقة لحظية للدردشة والأسئلة اليومية',
                        },
                        {
                          id: 'deep' as AiThinkingDepth,
                          name: 'VALDRION Balanced (متوازن)',
                          badge: 'بحث وتحليل',
                          badgeClass: 'bg-blue-500/20 text-blue-200',
                          desc: 'متوازن للبحث الحي، الكتابة، والتلخيص الدقيق',
                        },
                        {
                          id: 'ultra' as AiThinkingDepth,
                          name: 'VALDRION Carbon (كربون)',
                          badge: 'الأقوى للكود',
                          badgeClass: 'bg-amber-500/20 text-amber-200',
                          desc: 'تفكير هندسي عميق لبناء الكود والمشاريع الكاملة',
                        },
                      ] as const
                    ).map((opt) => {
                      const active =
                        opt.id === 'ultra'
                          ? depth === 'ultra' || depth === 'apex'
                          : depth === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-testid={`ai-model-option-${opt.id}`}
                          onClick={() => {
                            setDepth(opt.id);
                            setModelMenuOpen(false);
                            onToast(`تم التبديل إلى نموذج ${opt.name}`);
                          }}
                          className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-right transition-colors ${
                            active
                              ? 'bg-[#1F293F] text-white'
                              : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-extrabold">{opt.name}</span>
                              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${opt.badgeClass}`}>
                                {opt.badge}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                              {opt.desc}
                            </p>
                          </div>
                          {active && (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Zone 2 & 3: Always-Visible Unified VALDRION App Switcher + Settings */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <nav
              aria-label="أقسام فالدريون الموحدة"
              className="flex items-center gap-1 sm:gap-2"
            >
              {onSwitchToCinema && (
                <button
                  type="button"
                  data-testid="ai-nav-cinema"
                  onClick={onSwitchToCinema}
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 text-[11px] font-extrabold text-amber-200 transition-colors hover:bg-amber-500 hover:text-[#0B0907] sm:px-2.5"
                >
                  <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>السينما</span>
                </button>
              )}
              {onSwitchToNovels && (
                <button
                  type="button"
                  data-testid="ai-nav-novels"
                  onClick={onSwitchToNovels}
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-400/35 bg-emerald-500/12 px-2 text-[11px] font-extrabold text-emerald-200 transition-colors hover:bg-emerald-500 hover:text-white sm:px-2.5"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>الروايات</span>
                </button>
              )}
              {onSwitchToPrivateAi && (
                <button
                  type="button"
                  data-testid="ai-nav-vault"
                  onClick={onSwitchToPrivateAi}
                  className="hidden h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-white/12 bg-white/5 px-2.5 text-[11px] font-bold text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white md:inline-flex"
                >
                  <span>الخزنة</span>
                </button>
              )}
            </nav>

            <button
              type="button"
              onClick={() => setCommanderModalOpen(true)}
              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-white/12 bg-[#171E2E] px-2 text-[11px] font-bold text-white transition-colors hover:border-amber-400/50 hover:bg-[#1E273B] sm:h-9 sm:px-3 sm:text-xs"
            >
              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="hidden sm:inline">إعدادات القائد</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE BODY (Chat + Optional Split Code/Game/Godot Stage) */}
        <div
          className={`grid min-h-0 flex-1 ${
            hasSplitPane ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
          }`}
        >
          {/* CHAT / STUDIO COLUMN */}
          <div
            className={`flex min-h-0 flex-col ${
              hasSplitPane ? 'lg:col-span-6 lg:border-l lg:border-white/[0.08]' : ''
            }`}
          >
            {/* On-Demand Studio Drawer (Clean, Dismissible, Never Clutters Welcome Screen) */}
            {activeDrawer !== 'none' && (
              <div className="max-h-[62vh] overflow-y-auto border-b border-white/[0.08] bg-[#121622] px-4 py-3">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#93C5FD]">
                      {activeDrawer === 'godot'
                        ? 'استوديو محرك ألعاب Godot 4.3+'
                        : activeDrawer === 'connectors'
                        ? 'كانفا + 14 جسراً عالمياً مجانياً'
                        : activeDrawer === 'deconstruct'
                        ? 'مفكّك وهندسة التطبيقات'
                        : activeDrawer === 'url'
                        ? 'قارئ ومحلّل روابط الويب الحية'
                        : activeDrawer === 'audio'
                        ? 'استوديو البودكاست والملخص الصوتي'
                        : 'مرشد السينما والترشيح الفوري'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer('none')}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#9AA4B8] hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>إغلاق</span>
                    </button>
                  </div>

                  {activeDrawer === 'godot' && (
                    <GodotStudioPanel
                      gamePrompt={godotPrompt}
                      onChangeGamePrompt={setGodotPrompt}
                      dimension={godotDimension}
                      onChangeDimension={setGodotDimension}
                      renderer={godotRenderer}
                      onChangeRenderer={setGodotRenderer}
                      pairCode={godotPairCode}
                      onRegeneratePairCode={() => setGodotPairCode(generateGodotPairCode())}
                      bridgeWsUrl={godotBridgeWsUrl}
                      wsReady={godotWsReady}
                      connectedEngines={connectedGodotEngines}
                      connectedGodotVersion={connectedGodotVersion}
                      onDownloadBridgePlugin={handleDownloadGodotBridgePlugin}
                      onRunBuild={() => {
                        if (!godotPrompt.trim()) {
                          onToast('اكتب فكرة لعبتك أولاً أو اختر قالباً جاهزاً.');
                          return;
                        }
                        setActiveDrawer('none');
                        void sendMessage(godotPrompt, { forceMode: 'godot' });
                      }}
                      onLaunchRobloxGta6={handleLaunchRobloxGta6}
                      disabled={isStreaming}
                      onToast={onToast}
                    />
                  )}

                  {activeDrawer === 'connectors' && (
                    <ConnectedEcosystemPanel
                      disabled={isStreaming}
                      collapsed={false}
                      onToggleCollapsed={() => setActiveDrawer('none')}
                      onRunCanvaDesign={(prompt) => {
                        setActiveDrawer('none');
                        void sendMessage(prompt, {
                          forceMode: 'create',
                          createKind: 'svg',
                        });
                      }}
                      onAnalyzeWithAi={(prompt, targetMode, agentId) => {
                        setActiveDrawer('none');
                        void sendMessage(prompt, {
                          forceMode: targetMode || 'research',
                          forceAgentId: agentId || null,
                        });
                      }}
                      onSwitchMode={(targetMode) => {
                        setMode(targetMode);
                        if (targetMode === 'godot') setActiveDrawer('godot');
                        else if (targetMode === 'url') setActiveDrawer('url');
                        else setActiveDrawer('none');
                      }}
                      onToast={onToast}
                    />
                  )}

                  {activeDrawer === 'deconstruct' && (
                    <AppDeconstructorPanel
                      appName={deconstructAppName}
                      onChangeAppName={setDeconstructAppName}
                      selectedLenses={deconstructLenses}
                      onToggleLens={(id) =>
                        setDeconstructLenses((prev) =>
                          prev.includes(id)
                            ? prev.filter((x) => x !== id)
                            : [...prev, id]
                        )
                      }
                      hasAttachedFile={Boolean(attachedFile)}
                      attachedFileName={attachedFile?.name}
                      onTriggerUploadFile={() => fileInputRef.current?.click()}
                      onRunDeconstruct={() => {
                        if (!deconstructAppName.trim() && !attachedFile) {
                          onToast('اكتب اسم التطبيق أو ارفع ملف كود أولاً.');
                          return;
                        }
                        const prompt = buildAppDeconstructionPrompt({
                          appName: deconstructAppName.trim(),
                          selectedLenses: deconstructLenses,
                          hasAttachedFile: Boolean(attachedFile),
                          attachedFileName: attachedFile?.name,
                        });
                        setActiveDrawer('none');
                        void sendMessage(prompt, {
                          forceMode: 'deconstruct',
                          forceAgentId: 'software_architect',
                        });
                      }}
                      disabled={isStreaming}
                    />
                  )}

                  {activeDrawer === 'url' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const check = validatePublicWebsiteUrl(urlInput);
                        if (!check.valid || !check.normalizedUrl) {
                          onToast(check.error || 'الرابط غير صالح.');
                          return;
                        }
                        setActiveDrawer('none');
                        void sendMessage(
                          input.trim() || `اقرأ هذا الموقع وحلّله بعمق واستخرج أهم النقاط: ${check.normalizedUrl}`,
                          { forceMode: 'url', forceUrl: check.normalizedUrl }
                        );
                      }}
                      className="flex flex-wrap gap-2"
                    >
                      <input
                        type="url"
                        dir="ltr"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/article"
                        className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-[#0E1015] px-3.5 py-2 text-xs text-white placeholder:text-[#7D879C] focus:border-[#60A5FA]"
                      />
                      <button
                        type="submit"
                        disabled={isStreaming}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8]"
                      >
                        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>قراءة وتحليل الرابط</span>
                      </button>
                    </form>
                  )}

                  {activeDrawer === 'audio' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          { id: 'podcast', label: 'بودكاست حواري' },
                          { id: 'brief', label: 'نشرة إخبارية مركّزة' },
                          { id: 'story', label: 'سرد قصصي سينمائي' },
                        ] as const
                      ).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setAudioStyle(st.id)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                            audioStyle === st.id
                              ? 'border-[#60A5FA] bg-[#60A5FA]/20 text-white'
                              : 'border-white/10 bg-[#171C2B] text-[#AEB7C8]'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                      <span className="text-xs text-[#8C96AA]">
                        اكتب الموضوع بالأسفل وسيتم توليد ملف صوتي كامل قابل للتحميل.
                      </span>
                    </div>
                  )}

                  {activeDrawer === 'cinema' && (
                    <p className="text-xs text-[#B8C4D8]">
                      أنت الآن في وضع <strong>مرشد السينما</strong> — اسألني عن أي فيلم أو مسلسل أو قناة داخل مكتبة المشاهدة وسأرشّحها لك مع أزرار تشغيل فورية.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* GEMINI-STYLE EMPTY WELCOME STAGE OR SCROLLING CONVERSATION */}
            {isEmptyWelcome ? (
              <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(245,199,107,0.07),transparent_50%)] px-4 py-8">
                <div className="mb-7 flex flex-col items-center text-center">
                  <img
                    src={aethermindEmblem}
                    alt="شعار أثيرمايند AI"
                    className="mb-4 h-16 w-16 rounded-2xl border border-[#F5C76B]/50 object-cover shadow-xl"
                  />
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    أهلاً بك يا {displayName}
                  </h1>
                  <p className="mt-2 max-w-lg text-sm text-[#94A3B8]">
                    اكتب ما تريد مباشرة — القائد الشامل يبحث ويبرمج ويتحكم بالتطبيق ويتطور ذاتياً.
                  </p>
                </div>

                {renderComposer(true)}

                {/* 4 Simple Everyday Suggestions */}
                <div className="mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void sendMessage('ابحث في الويب عن أحدث أخبار الذكاء الاصطناعي')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#151B28] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <Globe className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                    <span>ابحث في الويب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void sendMessage('اكتب لي لعبة أو أداة تفاعلية بسيطة')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#151B28] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <Code2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>اصنع لعبة أو تطبيق</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void sendMessage('ابحث في حسابي ومحادثاتي السابقة')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#151B28] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                    <span>ابحث في حسابي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void sendMessage('طوّر نفسك الآن')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-[#151B28] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                    <span>طوّر نفسك</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Scrolling Chat Thread — stays where the user reads (no forced jump to bottom) */}
                <div
                  ref={chatScrollRef}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto px-4 py-6"
                >
                  <div className="mx-auto max-w-3xl space-y-6">
                    {activeSession.messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      const artifacts = !isUser
                        ? extractArtifactsFromMarkdown(msg.text)
                        : [];
                      const thoughtsOpen = Boolean(expandedThoughts[msg.id]);

                      if (isUser) {
                        return (
                          <div key={msg.id} className="flex justify-start">
                            <div className="max-w-[85%] rounded-3xl rounded-tr-md bg-[#1E2638] px-5 py-3.5 text-sm leading-relaxed text-[#F1F5F9]">
                              {msg.imagePreview && (
                                <img
                                  src={msg.imagePreview}
                                  alt="صورة مرفقة"
                                  className="mb-2.5 max-h-48 rounded-xl border border-white/10 object-contain"
                                />
                              )}
                              {msg.urlInspected && (
                                <p
                                  dir="ltr"
                                  className="mb-1.5 truncate font-mono text-[11px] text-[#93C5FD]"
                                >
                                  {msg.urlInspected}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <article key={msg.id} className="flex items-start gap-3">
                          <img
                            src={aethermindEmblem}
                            alt="أثيرمايند AI"
                            className="mt-0.5 h-8 w-8 shrink-0 rounded-xl border border-[#F5C76B]/50 object-cover"
                          />

                          <div className="min-w-0 flex-1 space-y-3">
                            {/* Agent / Thinking Duration Header */}
                            {(msg.agentName || msg.thinkingDurationMs) && (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#94A3B8]">
                                {msg.agentName && (
                                  <span className="font-bold text-[#F5C76B]">
                                    {msg.agentName}
                                  </span>
                                )}
                                {msg.thinkingDurationMs && (
                                  <span>
                                    · فكّر لمدة {(msg.thinkingDurationMs / 1000).toFixed(1)} ثانية
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Live Step-by-Step Execution Progress Tracker ("وين وصل") */}
                            {msg.executionSteps && msg.executionSteps.length > 0 && (
                              <div className="rounded-2xl border border-[#60A5FA]/22 bg-[#121827] px-3.5 py-2.5">
                                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#93C5FD]">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-[#F5C76B]" aria-hidden="true" />
                                    <span>مسار التنفيذ والبحث الحي (وين وصل)</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-[#94A3B8]">
                                    {msg.executionSteps.filter((s) => s.status === 'done').length}/
                                    {msg.executionSteps.length}
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {msg.executionSteps.map((step: AiExecutionStep) => (
                                    <div
                                      key={step.id}
                                      className="flex items-start gap-2 text-xs"
                                    >
                                      <span className="mt-0.5 shrink-0">
                                        {step.status === 'done' ? (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                                        ) : step.status === 'error' ? (
                                          <AlertCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                                        ) : (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#60A5FA]" aria-hidden="true" />
                                        )}
                                      </span>
                                      <div className="min-w-0">
                                        <p
                                          className={`font-bold ${
                                            step.status === 'running'
                                              ? 'text-[#DBEAFE]'
                                              : step.status === 'error'
                                              ? 'text-rose-300'
                                              : 'text-[#CBD5E1]'
                                          }`}
                                        >
                                          {step.label}
                                        </p>
                                        {step.detail && (
                                          <p className="text-[10px] text-[#8C96AA]">
                                            {step.detail}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {msg.searchQueries && msg.searchQueries.length > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-2">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#94A3B8]">
                                      <Search className="h-3 w-3 text-[#60A5FA]" aria-hidden="true" />
                                      <span>عمليات البحث:</span>
                                    </span>
                                    {msg.searchQueries.map((q, idx) => (
                                      <span
                                        key={`${q}_${idx}`}
                                        className="rounded-md border border-[#60A5FA]/25 bg-[#19233A] px-2 py-0.5 text-[10px] font-semibold text-[#BFDBFE]"
                                      >
                                        {q}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Collapsible Chain of Thought */}
                            {msg.thoughts && (
                              <div className="rounded-xl border border-white/10 bg-[#141824]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedThoughts((prev) => ({
                                      ...prev,
                                      [msg.id]: !prev[msg.id],
                                    }))
                                  }
                                  className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-bold text-[#93C5FD]"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <Brain className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>مسار التفكير الداخلي</span>
                                  </span>
                                  {thoughtsOpen ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                {thoughtsOpen && (
                                  <div className="border-t border-white/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-[#9AA4B8] whitespace-pre-wrap">
                                    {msg.thoughts}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Multi-Agent Commander Mission Plan */}
                            {msg.missionPlan && (
                              <div className="rounded-2xl border border-amber-400/25 bg-[#151A28] p-3.5">
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#F5C76B]">
                                  <Crown className="h-4 w-4" aria-hidden="true" />
                                  <span>خطة القائد الشامل: {msg.missionPlan.missionSummary}</span>
                                </p>
                                <div className="space-y-1.5">
                                  {msg.missionPlan.steps.map((st: AiMissionStep) => (
                                    <div
                                      key={st.stepId}
                                      className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0E121C] px-3 py-2 text-xs"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold text-[#E8EAED]">
                                          {st.agentName} — {st.taskTitle}
                                        </p>
                                        {st.summary && (
                                          <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                                            {st.summary}
                                          </p>
                                        )}
                                      </div>
                                      <span className="shrink-0">
                                        {st.status === 'done' ? (
                                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        ) : st.status === 'running' ? (
                                          <Loader2 className="h-4 w-4 animate-spin text-[#60A5FA]" />
                                        ) : st.status === 'error' ? (
                                          <AlertCircle className="h-4 w-4 text-rose-400" />
                                        ) : (
                                          <span className="text-[10px] text-[#7D879C]">انتظار</span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Main Markdown Content */}
                            {msg.text ? (
                              <div className="text-sm leading-relaxed text-[#E8EAED]">
                                <RichMarkdown content={msg.text} />
                              </div>
                            ) : (
                              isStreaming && (
                                <div className="inline-flex items-center gap-2 text-xs text-[#93C5FD]">
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                  <span>
                                    {liveStatus || 'جاري صياغة الرد...'}{' '}
                                    {elapsedSec > 0 ? `(${formatElapsedSeconds(elapsedSec)})` : ''}
                                  </span>
                                </div>
                              )
                            )}

                            {/* Interactive Playable Artifacts Launcher */}
                            {artifacts.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {artifacts.map((art) => (
                                  <button
                                    key={art.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveGodotProject(null);
                                      setActiveArtifact(toRunnableArtifact(art));
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#60A5FA]/40 bg-[#172136] px-3.5 py-2 text-xs font-extrabold text-[#DBEAFE] transition-colors hover:border-[#60A5FA] hover:bg-[#2563EB] hover:text-white"
                                  >
                                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                                    <span>تشغيل ومعاينة: {art.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Godot 4 Permission-Based Live Control Card */}
                            {msg.godotActionPlan && (
                              <GodotAgentPermissionCard
                                plan={msg.godotActionPlan}
                                connectedEngines={connectedGodotEngines}
                                hasActiveProject={Boolean(activeGodotProject)}
                                onApprove={() =>
                                  handleApproveGodotPlan(msg.id, msg.godotActionPlan!)
                                }
                                onReject={() => handleRejectGodotPlan(msg.id)}
                                onDownloadBridgePlugin={handleDownloadGodotBridgePlugin}
                              />
                            )}

                            {/* AI Visual Images Gallery Card (HD PNG + SVG + Real Proxied Web Photos) */}
                            {msg.generatedImages && (
                              <AiVisualGalleryCard
                                bundle={msg.generatedImages}
                                onOpenInStage={(title, svgMarkup) => {
                                  setActiveGodotProject(null);
                                  setActiveArtifact({
                                    id: `img_${msg.id}`,
                                    title,
                                    kind: 'svg',
                                    language: 'svg',
                                    code: svgMarkup,
                                  });
                                }}
                                onToast={onToast}
                              />
                            )}

                            {/* AETHERMIND APEX Self-Verification & Follow-Ups Card */}
                            {msg.apexReport && (
                              <AiApexVerificationCard
                                report={msg.apexReport}
                                onSelectFollowUp={(nextPrompt) => void sendMessage(nextPrompt)}
                              />
                            )}

                            {/* Multi-AI Council 3-Mind Debate Card */}
                            {msg.councilDebate && (
                              <AiCouncilCard
                                debate={msg.councilDebate}
                                onRunChecklistItem={(nextPrompt) => void sendMessage(nextPrompt)}
                              />
                            )}

                            {/* Interactive Mind Map & Concept Diagram Card */}
                            {msg.mindMap && (
                              <AiMindMapCard
                                data={msg.mindMap}
                                onOpenInStage={(title, svgMarkup) => {
                                  setActiveGodotProject(null);
                                  setActiveArtifact({
                                    id: `mm_${msg.id}`,
                                    title,
                                    kind: 'svg',
                                    language: 'svg',
                                    code: svgMarkup,
                                  });
                                }}
                                onToast={onToast}
                              />
                            )}

                            {/* Godot 4 Project Inline Card */}
                            {msg.godotProject && (
                              <GodotProjectCard
                                project={msg.godotProject}
                                isEngineLive={connectedGodotEngines > 0}
                                onOpenInspector={(proj, tab) => {
                                  setActiveArtifact(null);
                                  setActiveGodotProject({
                                    project: proj,
                                    tab: tab || 'play',
                                  });
                                }}
                                onSyncToGodot={handleSyncProjectToGodot}
                                onToast={onToast}
                              />
                            )}

                            {/* Inline Motion Video Storyboard Card inside Chat */}
                            {msg.motionVideo && (
                              <div className="space-y-2.5 rounded-2xl border border-violet-400/35 bg-[#151A28] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs font-extrabold text-violet-200">
                                    <Video className="h-4 w-4 text-violet-400" aria-hidden="true" />
                                    <span>مشروع فيديو: {msg.motionVideo.title}</span>
                                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                                      {msg.motionVideo.aspectRatio}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const blob = new Blob([JSON.stringify(msg.motionVideo, null, 2)], {
                                        type: 'application/json;charset=utf-8',
                                      });
                                      const u = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = u;
                                      a.download = `${msg.motionVideo!.title.replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, '_')}.json`;
                                      a.click();
                                      URL.revokeObjectURL(u);
                                      onToast('تم تنزيل سيناريو ومشاهد الفيديو!');
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1 text-[11px] font-bold text-violet-200 hover:bg-violet-500/35"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>تنزيل السيناريو</span>
                                  </button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {msg.motionVideo.scenes.map((sc, sIdx) => (
                                    <div
                                      key={sc.id || sIdx}
                                      className="overflow-hidden rounded-xl border border-white/10 bg-[#0E1320] p-2.5"
                                    >
                                      {sc.backdropImageUrl && (
                                        <img
                                          src={sc.backdropImageUrl}
                                          alt={sc.headline}
                                          referrerPolicy="no-referrer"
                                          className="mb-2 h-24 w-full rounded-lg object-cover"
                                        />
                                      )}
                                      <p className="text-xs font-bold text-white">
                                        {sIdx + 1}. {sc.headline}
                                      </p>
                                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                                        {sc.narration || sc.subtitle}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Audio Player if Podcast/Brief */}
                            {msg.audioDataUrl && (
                              <audio
                                controls
                                src={msg.audioDataUrl}
                                className="w-full max-w-md"
                              />
                            )}

                            {/* Cinema Recommended Media Cards */}
                            {msg.matchedIds && msg.matchedIds.length > 0 && (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {msg.matchedIds
                                  .map((id: string) => findItemById(id))
                                  .filter((x): x is MediaItem => Boolean(x))
                                  .map((item: MediaItem) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#151A26] p-2.5"
                                    >
                                      <img
                                        src={item.poster}
                                        alt={item.title}
                                        referrerPolicy="no-referrer"
                                        className="h-14 w-10 shrink-0 rounded-lg object-cover"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold text-white">
                                          {item.title}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onSwitchToCinema?.();
                                              onPlayItem(item);
                                            }}
                                            className="text-[11px] font-bold text-[#60A5FA] hover:underline"
                                          >
                                            تشغيل الآن
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onSwitchToCinema?.();
                                              onOpenDetails(item);
                                            }}
                                            className="text-[11px] text-[#94A3B8] hover:text-white"
                                          >
                                            التفاصيل
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}

                            {/* Web Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                <span className="font-bold text-[#7D879C]">المصادر:</span>
                                {msg.sources.slice(0, 5).map((src, i) => (
                                  <a
                                    key={`${src.uri}_${i}`}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#151926] px-2 py-0.5 text-[#93C5FD] hover:border-[#60A5FA]"
                                  >
                                    <span className="max-w-[160px] truncate">{src.title}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Clean Gemini-Style Inline Action Row */}
                            {msg.text && (
                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(msg.text);
                                      setCopiedMsgId(msg.id);
                                      onToast('تم نسخ الرد.');
                                      setTimeout(() => setCopiedMsgId(null), 1500);
                                    } catch {
                                      onToast('تعذّر النسخ.');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8C96AA] hover:bg-white/[0.06] hover:text-white"
                                >
                                  {copiedMsgId === msg.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                  <span>نسخ</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleSpeakMessage(msg.id, msg.text)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8C96AA] hover:bg-white/[0.06] hover:text-white"
                                >
                                  {speakingMsgId === msg.id ? (
                                    <VolumeX className="h-3.5 w-3.5 text-[#60A5FA]" />
                                  ) : (
                                    <Volume2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>{speakingMsgId === msg.id ? 'إيقاف' : 'استماع'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSaveReplyToMemory(msg.text)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8C96AA] hover:bg-white/[0.06] hover:text-white"
                                >
                                  <BookmarkPlus className="h-3.5 w-3.5" />
                                  <span>حفظ في الذاكرة</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const html = buildPrintableReportHtml(
                                      activeSession.title || 'تقرير أثيرمايند AI',
                                      msg.text
                                    );
                                    printHtmlViaHiddenIframe(html);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8C96AA] hover:bg-white/[0.06] hover:text-white"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>طباعة / PDF</span>
                                </button>

                                {(() => {
                                  const links = buildOmniShareLinks(
                                    activeSession.title || 'تقرير القائد الشامل',
                                    msg.text
                                  );
                                  const isMenuOpen = openShareMenuMsgId === msg.id;
                                  const hasAnyWebhook =
                                    Boolean(omniConfig.webhookUrl) ||
                                    (omniConfig.connectedWebhooks || []).some((w) => w.enabled);
                                  return (
                                    <div className="relative">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenShareMenuMsgId((curr) =>
                                            curr === msg.id ? null : msg.id
                                          )
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/10 hover:text-sky-200"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>إرسال لتطبيق</span>
                                        <ChevronDown className="h-3 w-3" aria-hidden="true" />
                                      </button>
                                      {isMenuOpen && (
                                        <div className="absolute bottom-full right-0 z-30 mb-1.5 grid w-64 grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-[#0F1524] p-2 shadow-2xl">
                                          <a
                                            href={links.whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-white/5"
                                          >
                                            واتساب
                                          </a>
                                          <a
                                            href={links.telegramUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-white/5"
                                          >
                                            تيليجرام
                                          </a>
                                          <a
                                            href={links.gmailUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-white/5"
                                          >
                                            Gmail
                                          </a>
                                          <a
                                            href={links.googleCalendarUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-white/5"
                                          >
                                            تقويم Google
                                          </a>
                                          <a
                                            href={links.googleMapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-white/5"
                                          >
                                            خرائط Google
                                          </a>
                                          <a
                                            href={links.youtubeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-white/5"
                                          >
                                            يوتيوب
                                          </a>
                                          <a
                                            href={links.githubUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
                                          >
                                            GitHub
                                          </a>
                                          <a
                                            href={links.twitterUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
                                          >
                                            X (تويتر)
                                          </a>
                                          <a
                                            href={links.linkedinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setOpenShareMenuMsgId(null)}
                                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-white/5"
                                          >
                                            LinkedIn
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              downloadMarkdownForApp(
                                                activeSession.title || 'تقرير القائد',
                                                msg.text
                                              );
                                              setOpenShareMenuMsgId(null);
                                              onToast('تم تنزيل ملف Markdown جاهز لـ Notion وObsidian.');
                                            }}
                                            className="rounded-lg px-2.5 py-1.5 text-right text-[11px] font-semibold text-purple-300 hover:bg-white/5"
                                          >
                                            Notion / .md
                                          </button>
                                          {typeof navigator !== 'undefined' &&
                                            typeof navigator.share === 'function' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setOpenShareMenuMsgId(null);
                                                  void navigator
                                                    .share({
                                                      title: activeSession.title || 'القائد الشامل',
                                                      text: msg.text.slice(0, 1500),
                                                    })
                                                    .catch(() => {});
                                                }}
                                                className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-center text-[11px] font-bold text-white hover:bg-white/10"
                                              >
                                                مشاركة مع تطبيقات جهازك
                                              </button>
                                            )}
                                          {hasAnyWebhook && (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                setOpenShareMenuMsgId(null);
                                                const r = await dispatchToAllConnectedWebhooks({
                                                  config: omniConfig,
                                                  prompt: activeSession.title || 'مهمة القائد',
                                                  reply: msg.text,
                                                  generation: evolutionState.generation,
                                                  agentsUsed: ['القائد الشامل'],
                                                });
                                                onToast(
                                                  r.sentCount > 0
                                                    ? `تم الإرسال إلى ${r.sentCount} تطبيق مربوط بنجاح!`
                                                    : 'تعذّر الإرسال للتطبيقات المربوطة.'
                                                );
                                              }}
                                              className="col-span-2 rounded-lg border border-sky-400/30 bg-sky-500/15 px-2.5 py-1.5 text-center text-[11px] font-bold text-sky-200 hover:bg-sky-500/25"
                                            >
                                              إرسال لتطبيقات Webhook المربوطة
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {!isStreaming && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={Boolean(transformingMsgKey)}
                                      onClick={() => void handleRefineMessage(msg)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-300 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:opacity-50"
                                    >
                                      {transformingMsgKey === `refine_${msg.id}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      )}
                                      <span>دقّق وحسّن</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={Boolean(transformingMsgKey)}
                                      onClick={() => void handleTurnMessageIntoSlides(msg)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#F5C76B] transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                                    >
                                      {transformingMsgKey === `slides_${msg.id}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Presentation className="h-3.5 w-3.5" />
                                      )}
                                      <span>شرائح عرض</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={Boolean(transformingMsgKey)}
                                      onClick={() => void handleTurnMessageIntoQuiz(msg)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                                    >
                                      {transformingMsgKey === `quiz_${msg.id}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <GraduationCap className="h-3.5 w-3.5" />
                                      )}
                                      <span>اختبار تفاعلي</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={Boolean(transformingMsgKey)}
                                      onClick={() => void handleTurnMessageIntoApp(msg)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                                    >
                                      {transformingMsgKey === `app_${msg.id}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <AppWindow className="h-3.5 w-3.5" />
                                      )}
                                      <span>تطبيق تفاعلي</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void sendMessage(
                                          `/خريطة ${activeSession.title || msg.text.slice(0, 120)}`
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-300 transition-colors hover:bg-white/[0.06]"
                                    >
                                      <Network className="h-3.5 w-3.5" />
                                      <span>خريطة ذهنية</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void sendMessage(
                                          'أكمل الشرح بعمق أكبر وأضف أمثلة عملية وتفاصيل إضافية لما سبق.'
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#8C96AA] hover:bg-white/[0.06] hover:text-[#93C5FD]"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      <span>أكمل بعمق</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                    <div ref={scrollEndRef} />
                  </div>
                </div>

                {/* Bottom Pinned Composer + Optional Manual Scroll-to-Bottom Button */}
                <div className="relative shrink-0 border-t border-white/[0.06] bg-[#0E1015] px-4 py-3">
                  {showScrollBottomBtn && (
                    <button
                      type="button"
                      onClick={scrollToBottomManually}
                      className="absolute -top-11 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-700 bg-[#151B28]/95 px-3.5 py-1.5 text-xs font-bold text-slate-100 shadow-lg backdrop-blur-sm transition-colors hover:border-amber-400/60 hover:text-white"
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                      <span>النزول للأسفل</span>
                    </button>
                  )}
                  {renderComposer(false)}
                </div>
              </>
            )}
          </div>

          {/* SPLIT LIVE STAGE: Self-Healing Game & Code Sandbox OR Godot 4 Inspector */}
          {hasSplitPane && (
            <div className="flex min-h-0 flex-col bg-[#0B0D13] p-3 lg:col-span-6">
              {activeArtifact ? (
                <LiveCodeGameRunner
                  artifact={activeArtifact}
                  onClose={() => setActiveArtifact(null)}
                  onRequestAiFix={(fixPrompt) =>
                    void sendMessage(fixPrompt, { forceMode: 'create' })
                  }
                  onConvertToGodot={(godotConvertPrompt) =>
                    void sendMessage(godotConvertPrompt, { forceMode: 'godot' })
                  }
                  onToast={onToast}
                />
              ) : activeGodotProject ? (
                <GodotProjectInspector
                  project={activeGodotProject.project}
                  initialTab={activeGodotProject.tab}
                  colSpanClass="h-full w-full"
                  isEngineLive={connectedGodotEngines > 0}
                  onSyncToGodot={handleSyncProjectToGodot}
                  onRunMainInGodot={handleRunMainInGodot}
                  onClose={() => setActiveGodotProject(null)}
                  onToast={onToast}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* PERSONAL BRAIN, MEMORY & GEMINI SKILL.MD MODAL */}
      <BrainMemoryModal
        open={brainModalOpen}
        initialTab={brainModalInitialTab}
        profile={brainProfile}
        onUpdateProfile={handleUpdateBrainProfile}
        onClose={() => setBrainModalOpen(false)}
        onToast={onToast}
      />

      {/* HANDS-FREE LIVE VOICE TALKING OVERLAY */}
      <LiveVoiceOverlay
        open={liveVoiceOpen}
        brainContext={brainSystemContext}
        userName={displayName}
        onClose={() => setLiveVoiceOpen(false)}
        onCommitExchange={handleCommitVoiceExchange}
      />

      {/* 24 AI AGENTS DIRECTORY MODAL */}
      {agentsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="دليل الـ 24 وكيلاً المتخصصاً"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-[#141824] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Crown className="h-5 w-5 text-[#F5C76B]" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    فريق الـ 24 وكيلاً الخبير + سلاسل المهام المتعددة
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    اختر وكيلاً متخصصاً أو شغّل سلسلة متكاملة مع القائد الشامل
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAgentsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-white/[0.07] px-5 py-3">
              <button
                type="button"
                onClick={() => setAgentCategory('all')}
                className={`rounded-lg px-3 py-1 text-xs font-bold ${
                  agentCategory === 'all'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white/5 text-[#9AA4B8] hover:text-white'
                }`}
              >
                الكل ({AI_AGENTS.length})
              </button>
              {AI_AGENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setAgentCategory(cat.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    agentCategory === cat.id
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white/5 text-[#9AA4B8] hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* Multi-Agent Chains */}
              <div>
                <p className="mb-2 text-xs font-extrabold text-[#F5C76B]">
                  سلاسل القيادة الجاهزة (يشغّلها القائد الشامل تلقائياً)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MULTI_AGENT_CHAINS.map((chain) => (
                    <button
                      key={chain.id}
                      type="button"
                      onClick={() => {
                        setCommanderMode(true);
                        setDepth('ultra');
                        setAgentsModalOpen(false);
                        setInput(chain.prompt);
                        onToast(`تم تجهيز سلسلة "${chain.title}" — اضغط إرسال للتشغيل.`);
                      }}
                      className="rounded-2xl border border-amber-400/25 bg-[#192030] p-3 text-right transition-colors hover:border-amber-400"
                    >
                      <p className="text-xs font-extrabold text-white">{chain.title}</p>
                      <p className="mt-1 text-[11px] text-[#9AA4B8]">{chain.agentsLabel}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 24 Specialist Agents Grid */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      setCommanderMode(false);
                      setAgentsModalOpen(false);
                      onToast(`تم تفعيل الوكيل: ${agent.name}`);
                    }}
                    className={`rounded-2xl border p-3 text-right transition-colors ${
                      selectedAgentId === agent.id
                        ? 'border-[#60A5FA] bg-[#1A2640]'
                        : 'border-white/10 bg-[#171C2B] hover:border-[#60A5FA]/50'
                    }`}
                  >
                    <p className="text-xs font-extrabold text-white">{agent.name}</p>
                    <p className="text-[10px] font-mono text-[#93C5FD]" dir="ltr">
                      {agent.englishRole}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-[#9AA4B8]">
                      {agent.mission}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6 AUTOMATION WORKFLOWS MODAL */}
      {workflowsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="سلاسل الأتمتة الجاهزة"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-[#141824] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Workflow className="h-5 w-5 text-amber-300" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-extrabold text-white">
                    سلاسل الأتمتة الفورية بضغطة زر
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    مهام احترافية متكاملة تجمع القائد والبرمجة والألعاب والأدوات الحية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkflowsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              {AUTOMATION_WORKFLOWS.map((wf) => (
                <button
                  key={wf.id}
                  type="button"
                  onClick={() => {
                    setWorkflowsModalOpen(false);
                    setDepth(wf.useCommander ? 'ultra' : 'fast');
                    setCommanderMode(wf.useCommander);
                    void sendMessage(wf.prompt, {
                      forceMode: wf.targetMode === 'video' ? 'general' : wf.targetMode,
                      forceCommander: wf.useCommander,
                    });
                  }}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#181E2E] p-4 text-right transition-colors hover:border-[#60A5FA]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-white">{wf.title}</span>
                      <Zap className="h-4 w-4 shrink-0 text-[#F5C76B]" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#9AA4B8]">
                      {wf.subtitle}
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] font-semibold text-[#93C5FD]">
                    {wf.stepsSummary}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {(() => {
        const lastAssistant = [...activeSession.messages]
          .reverse()
          .find((m) => m.role === 'assistant');
        return (
          <CommanderLiveMonitor
            isStreaming={isStreaming}
            liveStatus={liveStatus}
            webSearchEnabled={webSearch}
            onToggleWebSearch={(enabled) => {
              setWebSearch(enabled);
              onToast(
                enabled
                  ? 'تم فتح البحث الحر على الإنترنت للقائد الشامل.'
                  : 'تم إيقاف البحث الحي على الإنترنت.'
              );
            }}
            steps={lastAssistant?.executionSteps || []}
            searchQueries={lastAssistant?.searchQueries || []}
            sources={lastAssistant?.sources || []}
            liveThoughtPreview={lastAssistant?.thoughts || ''}
            onStopExecution={handleStopStreaming}
            onSteerMission={(instruction) => {
              if (isStreaming) {
                handleStopStreaming();
                window.setTimeout(() => {
                  void sendMessage(instruction);
                }, 120);
              } else {
                void sendMessage(instruction);
              }
            }}
            onOpenSecurityShield={() => appController?.openSecurityShield()}
          />
        );
      })()}
      <CommanderFreedomModal
        open={commanderModalOpen}
        initialTab={commanderModalTab}
        onClose={() => setCommanderModalOpen(false)}
        settings={commanderSettings}
        onChangeSettings={handleUpdateCommanderSettings}
        omniConfig={omniConfig}
        onChangeOmniConfig={handleUpdateOmniConfig}
        advisorCouncil={advisorCouncil}
        onChangeAdvisorCouncil={handleUpdateAdvisorCouncil}
        evolutionState={evolutionState}
        vectorMemoryCount={vectorMemoryCount}
        cloudRequestCount={commanderCloudRequests}
        accountConsentGranted={accountConsentGranted}
        onToggleAccountConsent={(granted) => {
          setAccountConsentGranted(granted);
          onToast(
            granted
              ? 'تم تفعيل إذن البحث في حسابك وحساباتك المربوطة لهذه الجلسة.'
              : 'تم إغلاق إذن الحساب — سيطلب الحامي إذنك قبل أي بحث.'
          );
        }}
        onTriggerSelfEvolution={handleTriggerSelfEvolution}
        onClearVectorMemory={handleClearVectorMemory}
        onLaunchInternalApp={launchInternalApp}
        onImportDetectedServers={(creds: ParsedXtreamCredential[]) => {
          if (!appController || creds.length === 0) return;
          const nowTs = Date.now();
          const profiles = creds.map((c, idx) => ({
            id: `xtream_wa_${nowTs}_${idx}`,
            name: c.name || `سيرفر واتساب ${idx + 1}`,
            type: 'xtream' as const,
            host: normalizeServerHost(c.host),
            username: c.username,
            password: c.password,
            useProxy: true,
            addedAt: nowTs + idx,
          }));
          setCommanderModalOpen(false);
          void appController.importServersLocally(profiles, true);
        }}
        onToast={onToast}
      />
    </div>
  );
}
