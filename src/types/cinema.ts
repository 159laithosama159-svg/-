import type { GodotProjectBundle } from '../utils/godotEngineUtils';
import type { GodotAgentActionPlan } from '../utils/godotAgentCommands';
import type { MotionVideoProject } from '../utils/motionVideoUtils';

export type AppMode = 'cinema' | 'ai' | 'novels' | 'private-ai';

export type MediaKind = 'movie' | 'series' | 'live';

export type NavTab = 'home' | 'movies' | 'series' | 'live' | 'ai' | 'mylist';

export type SortOption = 'featured' | 'rating' | 'newest' | 'title';

export type ProfileId = 'imperial' | 'family' | 'kids';

export interface UserProfile {
  id: ProfileId;
  name: string;
  subtitle: string;
  enforceFamilyGuard: boolean;
  kidsOnly: boolean;
}

export interface Category {
  category_id: string;
  category_name: string;
}

export interface Episode {
  id: string;
  epNum: number;
  title: string;
  duration: string;
  synopsis?: string;
  url: string;
}

export interface EpgProgram {
  title: string;
  startTime: string;
  endTime: string;
  nextTitle: string;
}

export interface EpgReminder {
  channelId: string;
  channelTitle: string;
  programTitle: string;
  startTime: string;
  createdAt: number;
}

export interface MediaItem {
  id: string;
  streamId?: string | number;
  seriesId?: string | number;
  kind: MediaKind;
  isLive?: boolean;
  category_id: string;
  title: string;
  originalTitle?: string;
  year?: string;
  rating?: string;
  quality?: string;
  duration?: string;
  maturity?: string;
  genres?: string[];
  director?: string;
  cast?: string[];
  desc?: string;
  poster: string;
  backdrop?: string;
  url?: string;
  seasons?: Record<string, Episode[]>;
  epg?: EpgProgram;
  isKidsFriendly?: boolean;
  featuredRank?: number;
}

export interface CatalogData {
  liveCategories: Category[];
  liveStreams: MediaItem[];
  vodCategories: Category[];
  vodStreams: MediaItem[];
  seriesCategories: Category[];
  seriesList: MediaItem[];
}

export interface ServerProfile {
  id: string;
  name: string;
  type: 'showcase' | 'xtream' | 'm3u';
  host: string;
  username?: string;
  password?: string;
  useProxy: boolean;
  m3uContent?: string;
  addedAt: number;
}

export interface ServerPingResult {
  serverId: string;
  ok: boolean;
  latencyMs: number | null;
  statusCode?: number;
  grade: 'excellent' | 'good' | 'slow' | 'offline';
  label: string;
  checkedAt: number;
}

export interface AccountInfo {
  status: string;
  expiry: string;
  connections: string;
  serverLabel: string;
}

export interface WatchProgressEntry {
  t: number;
  d: number;
  updated: number;
  episodeTitle?: string;
}

export type SceneCueAction = 'skip' | 'blur_mute' | 'black_mute' | 'lenses_only';

export interface SceneCue {
  id: string;
  start: number;
  end: number;
  action: SceneCueAction;
}

export interface ShieldLens {
  id: string;
  mode: 'blur' | 'black';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MediaFilterConfig {
  blurPx: number;
  style: 'blur' | 'black';
  hideBorders: boolean;
  cues: SceneCue[];
  lenses: ShieldLens[];
}

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface SubtitleStyle {
  fontSizePx: number;
  color: '#FFFFFF' | '#D4AF37' | '#FDE047';
  bgOpacity: number;
  offsetSec: number;
}

export interface PlayerMediaRequest {
  id: string;
  parentId?: string;
  title: string;
  meta: string;
  url: string;
  isLive: boolean;
  poster?: string;
  playlist?: Array<{
    id: string;
    parentId?: string;
    title: string;
    meta: string;
    url: string;
    isLive: boolean;
    poster?: string;
  }>;
  playlistIndex?: number;
}

export interface WatchPartyChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
}

export interface WatchPartyState {
  roomCode: string;
  hostName: string;
  isHost: boolean;
  participants: string[];
  playing: boolean;
  currentTime: number;
  media: PlayerMediaRequest | null;
  messages: WatchPartyChatMessage[];
}

export interface RemoteControlCommand {
  type:
    | 'dpad'
    | 'tab'
    | 'search'
    | 'player'
    | 'ai_prompt'
    | 'tv_mode';
  key?: 'up' | 'down' | 'left' | 'right' | 'ok' | 'back';
  tab?: NavTab;
  query?: string;
  playerAction?: 'toggle' | 'seek_back' | 'seek_fwd' | 'mute' | 'panic' | 'close';
  prompt?: string;
  enabled?: boolean;
}

export interface PersistedAppState {
  familyGuard: boolean;
  activeProfileId: ProfileId;
  servers: ServerProfile[];
  activeServerId: string;
  favorites: string[];
  watchQueue: string[];
  progress: Record<string, WatchProgressEntry>;
  filters: Record<string, MediaFilterConfig>;
  pinHash?: string;
  epgReminders?: EpgReminder[];
}

export interface WatchNightStep {
  itemId: string;
  slotLabel: string;
  reason: string;
}

export interface AiConciergeResponse {
  reply: string;
  matchedIds: string[];
  suggestedTab?: NavTab | '';
  suggestedSearch?: string;
  suggestedProfile?: ProfileId | '';
  watchNightPlan?: WatchNightStep[];
  followUpChips: string[];
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  matchedIds?: string[];
  suggestedTab?: NavTab | '';
  suggestedSearch?: string;
  suggestedProfile?: ProfileId | '';
  watchNightPlan?: WatchNightStep[];
  followUpChips?: string[];
  error?: boolean;
  ts?: number;
}

export interface PictureCalibration {
  brightness: number;
  contrast: number;
  saturation: number;
}

export type AiThinkingDepth = 'fast' | 'deep' | 'ultra' | 'apex';

export type AiStudioMode =
  | 'general'
  | 'godot'
  | 'canva'
  | 'video'
  | 'deconstruct'
  | 'research'
  | 'url'
  | 'poster'
  | 'create'
  | 'audio'
  | 'media'
  | 'cinema';

export interface AiStudioSource {
  title: string;
  uri: string;
}

export interface AiStudioWebsiteInfo {
  url: string;
  hostname: string;
  title: string;
  description: string;
}

export interface AiMissionStep {
  stepId: string;
  agentId: string;
  agentName: string;
  englishRole?: string;
  taskTitle: string;
  instruction: string;
  needsWebSearch?: boolean;
  status: 'pending' | 'running' | 'done' | 'error';
  thoughts?: string;
  summary?: string;
  output?: string;
  sources?: AiStudioSource[];
  durationMs?: number;
}

export interface AiMissionPlan {
  missionSummary: string;
  stage: 'planning' | 'delegating' | 'synthesizing' | 'done' | 'error';
  steps: AiMissionStep[];
}

export interface AiExecutionStep {
  id: string;
  label: string;
  detail?: string;
  status: 'running' | 'done' | 'error';
}

export interface AiGeneratedImageBundle {
  prompt: string;
  title: string;
  aspectRatio: '1:1' | '16:9' | '9:16';
  svgCode: string;
  webPhotos: Array<{
    id: string;
    title: string;
    thumbUrl: string;
    fullUrl: string;
    author: string;
    source: string;
  }>;
}

export interface AiStudioMessage {
  id: string;
  role: 'user' | 'assistant';
  mode: AiStudioMode;
  text: string;
  thoughts?: string;
  thinkingDurationMs?: number;
  executionSteps?: AiExecutionStep[];
  missionPlan?: AiMissionPlan;
  depth?: AiThinkingDepth;
  thinkingDepth?: AiThinkingDepth;
  agentId?: string;
  agentName?: string;
  imagePreview?: string;
  generatedImages?: AiGeneratedImageBundle;
  audioDataUrl?: string;
  audioVoiceLabel?: string;
  audioTranscript?: string;
  fileName?: string;
  attachedFileName?: string;
  urlInspected?: string;
  sources?: AiStudioSource[];
  searchQueries?: string[];
  websiteInfo?: AiStudioWebsiteInfo;
  matchedIds?: string[];
  suggestedTab?: NavTab | '';
  suggestedSearch?: string;
  suggestedProfile?: ProfileId | '';
  watchNightPlan?: WatchNightStep[];
  followUpChips?: string[];
  godotProject?: GodotProjectBundle;
  godotActionPlan?: GodotAgentActionPlan;
  motionVideo?: MotionVideoProject;
  councilDebate?: import('../utils/aiPowerTools').AiCouncilDebateResult;
  mindMap?: import('../utils/aiPowerTools').AiMindMapData;
  apexReport?: import('../utils/apexEngine').ApexVerificationReport;
  error?: boolean;
  streaming?: boolean;
  ts: number;
}

export interface AiStudioSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: AiStudioMessage[];
}
