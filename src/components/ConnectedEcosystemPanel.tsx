import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CANVA_DESIGN_PRESETS,
  ECOSYSTEM_BRIDGES,
  buildCanvaDesignPrompt,
  type ArxivPaperAsset,
  type CanvaPresetId,
  type CountryAtlasCard,
  type DictionaryEntryAsset,
  type FreeBookAsset,
  type GitHubRepoAsset,
  type LiveFreePulseData,
  type NpmPackageAsset,
  type TvMazeShowAsset,
  type WebMediaAsset,
  type WikiKnowledgeCard,
} from '../utils/connectorsUtils';
import {
  fetchLiveFreePulse,
  searchGitHubRepos,
  searchInternetMedia,
  searchKnowledgeHub,
  searchWorldConnector,
} from '../services/xtreamApi';
import type { AiStudioMode } from '../types/cinema';

type ConnectorTab = 'canva' | 'media' | 'github' | 'knowledge' | 'pulse' | 'world';

interface ConnectedEcosystemPanelProps {
  disabled: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onRunCanvaDesign: (prompt: string) => void;
  onAnalyzeWithAi: (prompt: string, targetMode?: AiStudioMode, agentId?: string) => void;
  onSwitchMode: (mode: AiStudioMode) => void;
  onToast: (msg: string) => void;
}

const QUICK_MEDIA_TAGS = [
  { label: 'الفضاء والمجرات', query: 'space nebula galaxy' },
  { label: 'قلعة فانتازيا', query: 'medieval castle architecture' },
  { label: 'سايبربانك نيون', query: 'cyberpunk neon city night' },
  { label: 'صحراء وذهب', query: 'golden sand dunes desert' },
  { label: 'طبيعة جبلية', query: 'mountain landscape sunset' },
  { label: 'فن وزخارف', query: 'islamic geometric art' },
];

const QUICK_GITHUB_TAGS = ['godot 4', 'godot addons', 'react typescript', 'ai agents', 'python game'];

const QUICK_KNOWLEDGE_TAGS = ['الذكاء الاصطناعي', 'Godot Engine', 'الحوسبة الكمية', 'تصميم الألعاب'];

const QUICK_CITIES = ['Riyadh', 'Cairo', 'Dubai', 'Amman', 'London', 'Tokyo'];

export function ConnectedEcosystemPanel({
  disabled,
  collapsed,
  onToggleCollapsed,
  onRunCanvaDesign,
  onAnalyzeWithAi,
  onSwitchMode,
  onToast,
}: ConnectedEcosystemPanelProps) {
  const [activeTab, setActiveTab] = useState<ConnectorTab>('canva');

  // Canva Studio state
  const [presetId, setPresetId] = useState<CanvaPresetId>('ig_post');
  const [designKind, setDesignKind] = useState<'svg' | 'html'>('svg');
  const [designTopic, setDesignTopic] = useState('');
  const [selectedImage, setSelectedImage] = useState<WebMediaAsset | null>(null);

  // Internet Media state
  const [mediaQuery, setMediaQuery] = useState('golden sand dunes desert');
  const [mediaAssets, setMediaAssets] = useState<WebMediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [brokenMediaIds, setBrokenMediaIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // GitHub Explorer state
  const [ghQuery, setGhQuery] = useState('godot 4');
  const [ghRepos, setGhRepos] = useState<GitHubRepoAsset[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState('');

  // Knowledge Hub state (Wikipedia + Open Library + arXiv)
  const [knowQuery, setKnowQuery] = useState('الذكاء الاصطناعي');
  const [knowLang, setKnowLang] = useState<'ar' | 'en'>('ar');
  const [wikiCards, setWikiCards] = useState<WikiKnowledgeCard[]>([]);
  const [books, setBooks] = useState<FreeBookAsset[]>([]);
  const [papers, setPapers] = useState<ArxivPaperAsset[]>([]);
  const [knowLoading, setKnowLoading] = useState(false);
  const [knowError, setKnowError] = useState('');

  // Live Free Pulse state (Open-Meteo + CoinGecko + Frankfurter + Hacker News)
  const [pulseCity, setPulseCity] = useState('Riyadh');
  const [pulseData, setPulseData] = useState<LiveFreePulseData | null>(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseError, setPulseError] = useState('');

  // World Tools state (REST Countries + NPM Registry + Dictionary + TVMaze Shows)
  const [worldType, setWorldType] = useState<'country' | 'npm' | 'dict' | 'shows'>('country');
  const [worldQuery, setWorldQuery] = useState('Jordan');
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldError, setWorldError] = useState('');
  const [worldCountries, setWorldCountries] = useState<CountryAtlasCard[]>([]);
  const [worldPackages, setWorldPackages] = useState<NpmPackageAsset[]>([]);
  const [worldDefs, setWorldDefs] = useState<DictionaryEntryAsset[]>([]);
  const [worldShows, setWorldShows] = useState<TvMazeShowAsset[]>([]);

  const handleSearchWorld = useCallback(
    async (type: 'country' | 'npm' | 'dict' | 'shows', q: string) => {
      const clean = q.trim();
      if (!clean) return;
      setWorldLoading(true);
      setWorldError('');
      try {
        const res = await searchWorldConnector(type, clean);
        if (type === 'country') setWorldCountries(res.countries || []);
        else if (type === 'npm') setWorldPackages(res.packages || []);
        else if (type === 'dict') setWorldDefs(res.definitions || []);
        else setWorldShows(res.shows || []);
      } catch (err) {
        setWorldError(err instanceof Error ? err.message : 'تعذّر الاتصال بالأداة العالمية.');
      } finally {
        setWorldLoading(false);
      }
    },
    []
  );

  const activePreset =
    CANVA_DESIGN_PRESETS.find((p) => p.id === presetId) || CANVA_DESIGN_PRESETS[0];

  const handleSearchMedia = useCallback(async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setMediaLoading(true);
    setMediaError('');
    try {
      const list = await searchInternetMedia(clean);
      setMediaAssets(list);
      if (list.length === 0) {
        setMediaError('لم يتم العثور على صور مطابقة — جرّب كلمة بحث بالإنجليزية مثل space أو castle.');
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'تعذّر الاتصال بمصادر الصور المجانية.');
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const handleSearchGitHub = useCallback(async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setGhLoading(true);
    setGhError('');
    try {
      const repos = await searchGitHubRepos(clean);
      setGhRepos(repos);
      if (repos.length === 0) {
        setGhError('لم يتم العثور على مستودعات مطابقة حالياً.');
      }
    } catch (err) {
      setGhError(err instanceof Error ? err.message : 'تعذّر الاتصال بـ GitHub API.');
    } finally {
      setGhLoading(false);
    }
  }, []);

  const handleSearchKnowledge = useCallback(async (q: string, lang: 'ar' | 'en') => {
    const clean = q.trim();
    if (!clean) return;
    setKnowLoading(true);
    setKnowError('');
    try {
      const res = await searchKnowledgeHub(clean, lang);
      setWikiCards(res.wiki);
      setBooks(res.books);
      setPapers(res.papers);
      if (res.wiki.length === 0 && res.books.length === 0 && res.papers.length === 0) {
        setKnowError('لا توجد نتائج مطابقة — جرّب كلمة بحث أقصر أو غيّر اللغة.');
      }
    } catch (err) {
      setKnowError(err instanceof Error ? err.message : 'تعذّر الاتصال بمصادر المعرفة المجانية.');
    } finally {
      setKnowLoading(false);
    }
  }, []);

  const handleLoadPulse = useCallback(async (city: string) => {
    setPulseLoading(true);
    setPulseError('');
    try {
      const data = await fetchLiveFreePulse(city);
      setPulseData(data);
    } catch (err) {
      setPulseError(err instanceof Error ? err.message : 'تعذّر جلب النبض الحي المجاني.');
    } finally {
      setPulseLoading(false);
    }
  }, []);

  // Auto-load tab data the first time user visits each connector tab
  useEffect(() => {
    if (collapsed) return;
    if (activeTab === 'media' && mediaAssets.length === 0 && !mediaLoading) {
      void handleSearchMedia(mediaQuery);
    } else if (activeTab === 'github' && ghRepos.length === 0 && !ghLoading) {
      void handleSearchGitHub(ghQuery);
    } else if (
      activeTab === 'knowledge' &&
      wikiCards.length === 0 &&
      books.length === 0 &&
      papers.length === 0 &&
      !knowLoading
    ) {
      void handleSearchKnowledge(knowQuery, knowLang);
    } else if (activeTab === 'pulse' && !pulseData && !pulseLoading) {
      void handleLoadPulse(pulseCity);
    } else if (
      activeTab === 'world' &&
      worldCountries.length === 0 &&
      worldPackages.length === 0 &&
      worldDefs.length === 0 &&
      worldShows.length === 0 &&
      !worldLoading
    ) {
      void handleSearchWorld(worldType, worldQuery);
    }
  }, [
    activeTab,
    collapsed,
    mediaAssets.length,
    mediaLoading,
    mediaQuery,
    handleSearchMedia,
    ghRepos.length,
    ghLoading,
    ghQuery,
    handleSearchGitHub,
    wikiCards.length,
    books.length,
    papers.length,
    knowLoading,
    knowQuery,
    knowLang,
    handleSearchKnowledge,
    pulseData,
    pulseLoading,
    pulseCity,
    handleLoadPulse,
    worldCountries.length,
    worldPackages.length,
    worldDefs.length,
    worldShows.length,
    worldLoading,
    worldType,
    worldQuery,
    handleSearchWorld,
  ]);

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      onToast('تم نسخ رابط الصورة الحقيقية بنجاح.');
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      onToast('تعذّر النسخ للحافظة.');
    }
  };

  if (collapsed) {
    return (
      <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#D9A441]/30 bg-[#120E0A] px-3 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <Palette className="h-4 w-4 shrink-0 text-[#D9A441]" aria-hidden="true" />
          <span className="truncate font-bold text-[#F5EAD2]">
            الربط المجاني الشامل · كانفا · صور النت · GitHub · ويكيبيديا · النبض الحي
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[#D9A441]/35 bg-[#1B150E] px-2.5 py-1 text-[11px] font-bold text-[#F0C975] hover:border-[#D9A441]"
        >
          <span>فتح الاستوديو والروابط</span>
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 max-h-[44vh] overflow-y-auto rounded-xl border border-[#D9A441]/35 bg-[#120E0A] p-3">
      {/* Header */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#D9A441]/20 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D9A441]" aria-hidden="true" />
          <span className="font-calligraphy text-sm font-bold text-[#F6ECDA]">
            منظومة الربط المجاني الشامل ({ECOSYSTEM_BRIDGES.length} جسراً عالمياً حيّاً 100%)
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#D9A441]/25 bg-[#1A140E] px-2 py-1 text-[11px] font-bold text-[#B5A78F] hover:text-[#F5EAD2]"
        >
          <span>طيّ اللوحة</span>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* 6 Clean Navigation Tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(
          [
            { id: 'canva', label: 'استوديو كانفا', icon: Palette },
            { id: 'media', label: 'صور النت المجانية', icon: ImageIcon },
            { id: 'github', label: 'مستكشف GitHub', icon: Code2 },
            { id: 'knowledge', label: 'ويكيبيديا والكتب و arXiv', icon: BookOpen },
            { id: 'world', label: 'أدوات العالم (دول·NPM·قاموس·مسلسلات)', icon: Globe },
            { id: 'pulse', label: `النبض الحي و${ECOSYSTEM_BRIDGES.length} جسراً`, icon: Activity },
          ] as Array<{ id: ConnectorTab; label: string; icon: typeof Palette }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                  : 'border-[#D9A441]/20 bg-[#17120D] text-[#B5A78F] hover:text-[#F5EAD2]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-[#D9A441]" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CANVA STUDIO */}
      {activeTab === 'canva' && (
        <div className="space-y-2.5">
          <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {CANVA_DESIGN_PRESETS.map((preset) => {
              const selected = preset.id === presetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  className={`rounded-lg border px-2 py-1.5 text-right transition-colors ${
                    selected
                      ? 'border-[#D9A441] bg-[#D9A441]/18 text-[#F6ECDA]'
                      : 'border-[#D9A441]/18 bg-[#18120C] text-[#BFB29A] hover:border-[#D9A441]/45'
                  }`}
                >
                  <div className="truncate text-[11px] font-bold">{preset.label}</div>
                  <div className="font-mono-tabular text-[10px] text-[#D9A441]">
                    {preset.dimensionsLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedImage && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#D9A441]/40 bg-[#1B150E] px-2.5 py-1.5 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={selectedImage.thumbUrl}
                  alt={selectedImage.title}
                  referrerPolicy="no-referrer"
                  className="h-9 w-12 shrink-0 rounded border border-[#D9A441]/30 object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#F5EAD2]">
                    صورة مدمجة من النت: {selectedImage.title}
                  </p>
                  <p className="text-[10px] text-[#B5A78F]">
                    {selectedImage.source === 'openverse' ? 'Openverse CC' : 'Wikimedia Commons'} ·{' '}
                    {selectedImage.license}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                aria-label="إزالة الصورة المدمجة"
                className="rounded border border-[#D9A441]/25 p-1 text-[#B5A78F] hover:text-[#F5EAD2]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={designTopic}
              onChange={(e) => setDesignTopic(e.target.value)}
              placeholder="اكتب عنوان التصميم أو الإعلان (مثلاً: إطلاق متجر قهوة مختصة أو غلاف لعبة فضائية)..."
              className="flex-1 rounded-lg border border-[#D9A441]/30 bg-[#0B0907] px-3 py-2 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDesignKind('svg')}
                className={`whitespace-nowrap rounded-lg border px-2.5 py-2 text-[11px] font-bold ${
                  designKind === 'svg'
                    ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                    : 'border-[#D9A441]/20 bg-[#17120D] text-[#B5A78F]'
                }`}
              >
                HD SVG/PNG
              </button>
              <button
                type="button"
                onClick={() => setDesignKind('html')}
                className={`whitespace-nowrap rounded-lg border px-2.5 py-2 text-[11px] font-bold ${
                  designKind === 'html'
                    ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                    : 'border-[#D9A441]/20 bg-[#17120D] text-[#B5A78F]'
                }`}
              >
                قالب تفاعلي
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const built = buildCanvaDesignPrompt({
                    topic: designTopic,
                    presetId,
                    selectedImage,
                    outputKind: designKind,
                  });
                  onRunCanvaDesign(built);
                }}
                className="sketch-btn-crimson inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-xs font-extrabold disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>صمّم الآن بأسلوب كانفا</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D9A441]/30 bg-[#1A140E] px-3 py-2 text-xs font-bold text-[#F0C975] hover:border-[#D9A441]"
              >
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>اختر صورة حقيقية من النت</span>
              </button>
            </div>
            <a
              href={activePreset.canvaCreateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D9A441]/30 bg-[#17120D] px-3 py-2 text-xs font-bold text-[#D8CBB2] hover:border-[#D9A441] hover:text-[#F6ECDA]"
            >
              <span>فتح مقاس {activePreset.label} في Canva</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#D9A441]" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE INTERNET MEDIA (WIKIMEDIA + OPENVERSE) */}
      {activeTab === 'media' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MEDIA_TAGS.map((tag) => (
              <button
                key={tag.query}
                type="button"
                onClick={() => {
                  setMediaQuery(tag.query);
                  void handleSearchMedia(tag.query);
                }}
                className="whitespace-nowrap rounded-lg border border-[#D9A441]/25 bg-[#18120C] px-2.5 py-1 text-[11px] font-bold text-[#D8CBB2] hover:border-[#D9A441] hover:text-[#F6ECDA]"
              >
                {tag.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearchMedia(mediaQuery);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={mediaQuery}
              onChange={(e) => setMediaQuery(e.target.value)}
              placeholder="ابحث عن أي صورة حقيقية مجانية من Wikimedia و Openverse (مثلاً: space, lion, dubai)..."
              className="flex-1 rounded-lg border border-[#D9A441]/30 bg-[#0B0907] px-3 py-1.5 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
            />
            <button
              type="submit"
              disabled={mediaLoading}
              className="sketch-btn-gold inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              {mediaLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span>جلب صور حيّة</span>
            </button>
          </form>

          {mediaError && <p className="text-xs text-[#E58A94]">{mediaError}</p>}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mediaAssets.slice(0, 8).map((asset) => {
              const broken = Boolean(brokenMediaIds[asset.id]);
              return (
                <div
                  key={asset.id}
                  className="overflow-hidden rounded-lg border border-[#D9A441]/25 bg-[#17120D]"
                >
                  <div className="relative aspect-[16/10] w-full bg-[#0E0B08]">
                    {broken ? (
                      <div className="flex h-full w-full items-center justify-center text-[#8E816C]">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    ) : (
                      <img
                        src={asset.thumbUrl}
                        alt={asset.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenMediaIds((prev) => ({ ...prev, [asset.id]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-1 left-1 rounded bg-[#0B0907]/85 px-1.5 py-0.5 text-[9px] font-bold text-[#F0C975]">
                      {asset.source === 'openverse' ? 'Openverse' : 'Wikimedia'}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="truncate text-[11px] font-bold text-[#F5EAD2]" title={asset.title}>
                      {asset.title}
                    </p>
                    <p className="truncate text-[10px] text-[#9E917B]">
                      {asset.license} · {asset.author}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImage(asset);
                          setActiveTab('canva');
                          onToast('تم اختيار الصورة لاستخدامها داخل استوديو كانفا.');
                        }}
                        className="flex-1 whitespace-nowrap rounded border border-[#D9A441]/40 bg-[#D9A441]/15 px-1.5 py-1 text-[10px] font-bold text-[#F0C975] hover:bg-[#D9A441]/25"
                      >
                        دمج بكانفا
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(asset.id, asset.fullUrl)}
                        title="نسخ رابط الصورة"
                        className="rounded border border-[#D9A441]/25 bg-[#120E0A] p-1 text-[#D8CBB2] hover:border-[#D9A441]"
                      >
                        {copiedId === asset.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAnalyzeWithAi(
                            `استخدم هذه الصورة الحقيقية من الإنترنت (${asset.title} — ${asset.fullUrl}) واقترح لي 3 أفكار إبداعية لاستغلالها في تصميم أو محتوى تسويقي مع وصف فني كامل.`,
                            'general',
                            'web_media_hunter'
                          )
                        }
                        title="تحليل بالذكاء"
                        className="rounded border border-[#D9A441]/25 bg-[#120E0A] p-1 text-[#D9A441] hover:border-[#D9A441]"
                      >
                        <Sparkles className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: GITHUB OPEN-SOURCE EXPLORER */}
      {activeTab === 'github' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_GITHUB_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setGhQuery(tag);
                  void handleSearchGitHub(tag);
                }}
                className="whitespace-nowrap rounded-lg border border-[#D9A441]/25 bg-[#18120C] px-2.5 py-1 text-[11px] font-bold text-[#D8CBB2] hover:border-[#D9A441]"
              >
                {tag}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearchGitHub(ghQuery);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              dir="ltr"
              value={ghQuery}
              onChange={(e) => setGhQuery(e.target.value)}
              placeholder="Search GitHub repos (e.g. godot 4, react, ai agents)..."
              className="flex-1 rounded-lg border border-[#D9A441]/30 bg-[#0B0907] px-3 py-1.5 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
            />
            <button
              type="submit"
              disabled={ghLoading}
              className="sketch-btn-gold inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              {ghLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span>بحث GitHub</span>
            </button>
          </form>

          {ghError && <p className="text-xs text-[#E58A94]">{ghError}</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            {ghRepos.slice(0, 6).map((repo) => (
              <div
                key={repo.id}
                className="flex flex-col justify-between rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span dir="ltr" className="truncate font-mono text-xs font-bold text-[#F0C975]">
                      {repo.fullName}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 font-mono-tabular text-[11px] font-bold text-[#D9A441]">
                      <Star className="h-3 w-3" />
                      {repo.stars.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#BFB29A]">{repo.description}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#D9A441]/15 pt-2">
                  <span className="font-mono text-[10px] text-[#9E917B]">
                    {repo.language} · {repo.updatedAt}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyzeWithAi(
                          `فكّك مشروع GitHub المفتوح "${repo.fullName}" (${repo.url}) بالكامل: المعمارية، كيف يعمل، أبرز المكتبات المستخدمة، وكيف أبني نسخة عربية متطورة منه أو أدمجه في مشروعي.\nالوصف: ${repo.description}`,
                          'deconstruct',
                          'github_engineer'
                        )
                      }
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-[#D9A441]/40 bg-[#D9A441]/15 px-2 py-1 text-[10px] font-bold text-[#F0C975] hover:bg-[#D9A441]/25"
                    >
                      <Cpu className="h-3 w-3" />
                      <span>فكّك بالذكاء</span>
                    </button>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`فتح ${repo.fullName} على GitHub`}
                      className="rounded border border-[#D9A441]/25 bg-[#120E0A] p-1 text-[#D8CBB2] hover:border-[#D9A441]"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: KNOWLEDGE HUB (WIKIPEDIA + OPEN LIBRARY + ARXIV) */}
      {activeTab === 'knowledge' && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_KNOWLEDGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const lang = /[A-Za-z]/.test(tag) ? 'en' : 'ar';
                    setKnowQuery(tag);
                    setKnowLang(lang);
                    void handleSearchKnowledge(tag, lang);
                  }}
                  className="whitespace-nowrap rounded-lg border border-[#D9A441]/25 bg-[#18120C] px-2.5 py-1 text-[11px] font-bold text-[#D8CBB2] hover:border-[#D9A441]"
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['ar', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setKnowLang(l)}
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    knowLang === l
                      ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                      : 'border-[#D9A441]/20 bg-[#17120D] text-[#9E917B]'
                  }`}
                >
                  {l === 'ar' ? 'العربية' : 'EN'}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearchKnowledge(knowQuery, knowLang);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={knowQuery}
              onChange={(e) => setKnowQuery(e.target.value)}
              placeholder="ابحث في ويكيبيديا + مكتبة Open Library + أوراق arXiv العلمية مجاناً..."
              className="flex-1 rounded-lg border border-[#D9A441]/30 bg-[#0B0907] px-3 py-1.5 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
            />
            <button
              type="submit"
              disabled={knowLoading}
              className="sketch-btn-gold inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              {knowLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span>بحث معرفي</span>
            </button>
          </form>

          {knowError && <p className="text-xs text-[#E58A94]">{knowError}</p>}

          <div className="grid gap-2 md:grid-cols-3">
            {/* Wikipedia */}
            <div className="space-y-1.5 rounded-lg border border-[#D9A441]/20 bg-[#17120D] p-2.5">
              <p className="text-[11px] font-extrabold text-[#D9A441]">
                موسوعة ويكيبيديا ({wikiCards.length})
              </p>
              {wikiCards.slice(0, 2).map((card) => (
                <div key={card.url} className="rounded border border-[#D9A441]/15 bg-[#120E0A] p-2">
                  <p className="truncate text-xs font-bold text-[#F5EAD2]">{card.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-[#BFB29A]">{card.summary}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyzeWithAi(
                          `لخّص واشرح موضوع "${card.title}" بأسلوب عميق ومبسّط مع أمثلة عملية استناداً لهذا الملخص الموثّق:\n${card.summary}`,
                          'research',
                          'academic_tutor'
                        )
                      }
                      className="text-[10px] font-bold text-[#F0C975] hover:underline"
                    >
                      شرح عميق بالذكاء
                    </button>
                    <a
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#9E917B] hover:text-[#F5EAD2]"
                    >
                      المصدر ↗
                    </a>
                  </div>
                </div>
              ))}
              {wikiCards.length === 0 && !knowLoading && (
                <p className="text-[11px] text-[#8E816C]">ابحث لعرض مقالات ويكيبيديا الحية.</p>
              )}
            </div>

            {/* Open Library Books */}
            <div className="space-y-1.5 rounded-lg border border-[#D9A441]/20 bg-[#17120D] p-2.5">
              <p className="text-[11px] font-extrabold text-[#D9A441]">
                كتب Open Library ({books.length})
              </p>
              {books.slice(0, 3).map((b) => (
                <div key={b.id} className="rounded border border-[#D9A441]/15 bg-[#120E0A] p-2">
                  <p className="truncate text-xs font-bold text-[#F5EAD2]">{b.title}</p>
                  <p className="truncate text-[10px] text-[#9E917B]">
                    {b.author} {b.firstPublishYear ? `· ${b.firstPublishYear}` : ''}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyzeWithAi(
                          `قدّم لي ملخصاً تنفيذياً لأهم أفكار كتاب "${b.title}" للمؤلف ${b.author} وكيف أطبّق دروسه عملياً.`,
                          'general',
                          'academic_tutor'
                        )
                      }
                      className="text-[10px] font-bold text-[#F0C975] hover:underline"
                    >
                      ملخص الكتاب بالذكاء
                    </button>
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#9E917B] hover:text-[#F5EAD2]"
                    >
                      الكتاب ↗
                    </a>
                  </div>
                </div>
              ))}
              {books.length === 0 && !knowLoading && (
                <p className="text-[11px] text-[#8E816C]">ابحث لعرض الكتب المجانية.</p>
              )}
            </div>

            {/* arXiv Papers */}
            <div className="space-y-1.5 rounded-lg border border-[#D9A441]/20 bg-[#17120D] p-2.5">
              <p className="text-[11px] font-extrabold text-[#D9A441]">
                أوراق علمية arXiv ({papers.length})
              </p>
              {papers.slice(0, 2).map((p) => (
                <div key={p.id} className="rounded border border-[#D9A441]/15 bg-[#120E0A] p-2">
                  <p dir="ltr" className="line-clamp-2 text-left text-[11px] font-bold text-[#F5EAD2]">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#9E917B]">
                    {p.published} · {p.authors.slice(0, 2).join(', ')}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyzeWithAi(
                          `ترجم ولخّص الورقة العلمية التالية من arXiv بالعربية مع شرح الابتكار الرئيسي فيها:\nالعنوان: ${p.title}\nالملخص: ${p.summary}`,
                          'research',
                          'data_scientist'
                        )
                      }
                      className="text-[10px] font-bold text-[#F0C975] hover:underline"
                    >
                      تبسيط الورقة بالذكاء
                    </button>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#9E917B] hover:text-[#F5EAD2]"
                    >
                      arXiv ↗
                    </a>
                  </div>
                </div>
              ))}
              {papers.length === 0 && !knowLoading && (
                <p className="text-[11px] text-[#8E816C]">
                  جرّب مصطلحاً علمياً بالإنجليزية لعرض أوراق arXiv.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE FREE PULSE & 10 BRIDGES MAP */}
      {activeTab === 'pulse' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setPulseCity(city);
                    void handleLoadPulse(city);
                  }}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${
                    pulseCity === city
                      ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                      : 'border-[#D9A441]/20 bg-[#18120C] text-[#B5A78F]'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleLoadPulse(pulseCity)}
              disabled={pulseLoading}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#D9A441]/30 bg-[#1A140E] px-2.5 py-1 text-[11px] font-bold text-[#F0C975]"
            >
              <RefreshCw className={`h-3 w-3 ${pulseLoading ? 'animate-spin' : ''}`} />
              <span>تحديث النبض الحي</span>
            </button>
          </div>

          {pulseError && <p className="text-xs text-[#E58A94]">{pulseError}</p>}

          {pulseData && (
            <div className="grid gap-2 md:grid-cols-3">
              {/* Weather */}
              <div className="rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D9A441]">
                  <CloudSun className="h-3.5 w-3.5" />
                  <span>Open-Meteo طقس حي</span>
                </div>
                {pulseData.weather ? (
                  <div className="mt-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-extrabold text-[#F6ECDA]">
                        {pulseData.weather.city}
                      </span>
                      <span className="font-mono-tabular text-lg font-extrabold text-[#F0C975]">
                        {pulseData.weather.temperatureC}°C
                      </span>
                    </div>
                    <p className="text-[11px] text-[#BFB29A]">
                      {pulseData.weather.weatherLabel} · رياح {pulseData.weather.windSpeedKmh} كم/س
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-[#8E816C]">جاري جلب الطقس...</p>
                )}
              </div>

              {/* Crypto + Forex */}
              <div className="rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D9A441]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>CoinGecko + Frankfurter</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {pulseData.crypto.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-[#F5EAD2]">{c.symbol}</span>
                      <span className="font-mono-tabular text-[#E6BC66]">
                        ${c.priceUsd.toLocaleString()}
                      </span>
                      <span
                        dir="ltr"
                        className={`font-mono-tabular font-bold ${
                          c.change24h >= 0 ? 'text-emerald-400' : 'text-[#E56B7A]'
                        }`}
                      >
                        {c.change24h >= 0 ? '+' : ''}
                        {c.change24h}%
                      </span>
                    </div>
                  ))}
                  {Object.keys(pulseData.forexBaseUsd).length > 0 && (
                    <p
                      dir="ltr"
                      className="border-t border-[#D9A441]/15 pt-1 text-left font-mono-tabular text-[10px] text-[#9E917B]"
                    >
                      1 USD ={' '}
                      {Object.entries(pulseData.forexBaseUsd)
                        .slice(0, 3)
                        .map(([k, v]) => `${v} ${k}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Hacker News */}
              <div className="rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#D9A441]">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Hacker News أخبار التقنية</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {pulseData.techNews.slice(0, 3).map((story) => (
                    <div key={story.id} className="flex items-center justify-between gap-2">
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="ltr"
                        className="flex-1 truncate text-left text-[11px] text-[#E6DAC4] hover:text-[#F0C975]"
                      >
                        {story.title}
                      </a>
                      <span className="shrink-0 font-mono-tabular text-[10px] text-[#D9A441]">
                        ▲{story.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Full 10-Bridge Universal Ecosystem Grid */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold text-[#F0C975]">
              <Layers className="h-3.5 w-3.5" />
              <span>خريطة الجسور المجانية المتصلة داخل فالدريون ({ECOSYSTEM_BRIDGES.length})</span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
              {ECOSYSTEM_BRIDGES.map((bridge) => (
                <button
                  key={bridge.id}
                  type="button"
                  onClick={() => {
                    if (
                      bridge.actionTab === 'godot' ||
                      bridge.actionTab === 'research' ||
                      bridge.actionTab === 'url'
                    ) {
                      onSwitchMode(bridge.actionTab);
                    } else {
                      setActiveTab(bridge.actionTab);
                    }
                  }}
                  className="rounded-lg border border-[#D9A441]/22 bg-[#17120D] p-2 text-right transition-colors hover:border-[#D9A441]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-bold text-[#F5EAD2]">
                      {bridge.name}
                    </span>
                    <span className="shrink-0 text-[9px] font-bold text-emerald-400">
                      {bridge.costLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-[#D9A441]">
                    {bridge.englishName}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-[#9E917B]">
                    {bridge.capability}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WORLD FREE TOOLS (REST COUNTRIES + NPM + DICTIONARY + TVMAZE) */}
      {activeTab === 'world' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'country', label: 'أطلس الدول (REST Countries)', def: 'Jordan' },
                { id: 'npm', label: 'حزم البرمجة (NPM)', def: 'three' },
                { id: 'dict', label: 'القاموس العالمي', def: 'serendipity' },
                { id: 'shows', label: 'المسلسلات العالمية (TVMaze)', def: 'breaking' },
              ] as const
            ).map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setWorldType(sub.id);
                  setWorldQuery(sub.def);
                  void handleSearchWorld(sub.id, sub.def);
                }}
                className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                  worldType === sub.id
                    ? 'border-[#D9A441] bg-[#D9A441]/20 text-[#F6ECDA]'
                    : 'border-[#D9A441]/20 bg-[#18120C] text-[#B5A78F]'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearchWorld(worldType, worldQuery);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              dir="ltr"
              value={worldQuery}
              onChange={(e) => setWorldQuery(e.target.value)}
              placeholder={
                worldType === 'country'
                  ? 'Country name (e.g. Saudi, Jordan, Egypt, Japan)...'
                  : worldType === 'npm'
                  ? 'NPM package (e.g. three, react, pixi)...'
                  : worldType === 'dict'
                  ? 'English word (e.g. architecture, quantum)...'
                  : 'TV show name (e.g. Severance, Dark)...'
              }
              className="flex-1 rounded-lg border border-[#D9A441]/30 bg-[#0B0907] px-3 py-1.5 text-xs text-[#F6ECDA] placeholder:text-[#8E816C] focus:border-[#D9A441]"
            />
            <button
              type="submit"
              disabled={worldLoading}
              className="sketch-btn-gold inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              {worldLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span>استعلام حي</span>
            </button>
          </form>

          {worldError && <p className="text-xs text-[#E58A94]">{worldError}</p>}

          {worldType === 'country' && worldCountries.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {worldCountries.map((c) => (
                <div
                  key={c.nameCommon}
                  className="flex items-start gap-3 rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5"
                >
                  {c.flagPng && (
                    <img
                      src={c.flagPng}
                      alt={c.nameCommon}
                      referrerPolicy="no-referrer"
                      className="h-10 w-14 shrink-0 rounded border border-white/10 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-[#F6ECDA]">
                      {c.nameArabic || c.nameCommon} ({c.nameCommon})
                    </p>
                    <p className="text-[11px] text-[#BFB29A]">
                      العاصمة: {c.capital} · {c.region} · السكان:{' '}
                      <span className="font-mono-tabular">{c.population.toLocaleString()}</span>
                    </p>
                    <p className="text-[10px] text-[#9E917B]">
                      العملة: {c.currencies.join(' / ') || '—'} · اللغات: {c.languages.join('، ') || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {worldType === 'npm' && worldPackages.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {worldPackages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span dir="ltr" className="font-mono font-bold text-[#F0C975]">
                      {pkg.name}
                    </span>
                    <span dir="ltr" className="font-mono text-[10px] text-emerald-400">
                      v{pkg.version}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#BFB29A]">{pkg.description}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyzeWithAi(
                          `اشرح لي كيفية استخدام مكتبة NPM "${pkg.name}" (الإصدار ${pkg.version}) مع مثال عملي كامل بـ TypeScript:\n${pkg.description}`,
                          'create',
                          'software_architect'
                        )
                      }
                      className="text-[10px] font-bold text-[#F0C975] hover:underline"
                    >
                      شرح ومثال كود بالذكاء
                    </button>
                    <a
                      href={pkg.npmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#9E917B] hover:text-white"
                    >
                      NPM ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {worldType === 'dict' && worldDefs.length > 0 && (
            <div className="space-y-1.5">
              {worldDefs.map((d, idx) => (
                <div
                  key={`${d.word}_${idx}`}
                  dir="ltr"
                  className="rounded-lg border border-[#D9A441]/20 bg-[#17120D] p-2.5 text-left text-xs"
                >
                  <p className="font-bold text-[#F0C975]">
                    {d.word} {d.phonetic ? `· ${d.phonetic}` : ''}{' '}
                    <span className="text-[10px] text-[#9E917B]">({d.partOfSpeech})</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#E6DAC4]">{d.definition}</p>
                  {d.example && (
                    <p className="mt-0.5 italic text-[10px] text-[#9E917B]">“{d.example}”</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {worldType === 'shows' && worldShows.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {worldShows.map((sh) => (
                <div
                  key={sh.id}
                  className="flex items-start gap-2.5 rounded-lg border border-[#D9A441]/25 bg-[#17120D] p-2.5 text-xs"
                >
                  {sh.imageUrl && (
                    <img
                      src={sh.imageUrl}
                      alt={sh.name}
                      referrerPolicy="no-referrer"
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#F6ECDA]">
                      {sh.name} ({sh.premiered}) {sh.rating ? `· ★${sh.rating}` : ''}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-[#BFB29A]">{sh.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
