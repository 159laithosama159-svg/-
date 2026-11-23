import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  BookOpen,
  Bookmark,
  Clapperboard,
  CloudRain,
  Compass,
  Download,
  ExternalLink,
  Feather,
  Flame,
  Globe,
  Heart,
  Library,
  Loader2,
  Minus,
  Moon,
  Palette,
  Plus,
  ScrollText,
  Search,
  Smartphone,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import type { DevicePlatformMode } from '../utils/deviceModeUtils';
import {
  NOVEL_GENRES,
  buildInteractiveChoicePrompt,
  buildNovelContinuationPrompt,
  buildNovelExportHtml,
  computeNovelWordCount,
  estimateReadingMinutes,
  loadNovelsState,
  mergeAllNovels,
  parseInteractiveStoryTurn,
  saveNovelsState,
  type NovelBook,
  type NovelChapter,
  type NovelGenre,
  type NovelReaderTheme,
  type NovelWorldEntry,
  type NovelsPersistedState,
} from '../utils/novelsUtils';
import { WORLD_MASTERPIECES_AR_CATALOG } from '../data/worldNovelsCatalog';
import {
  searchWorldNovelsArabic,
  streamAiStudio,
  translateWorldNovelChapter,
  type WorldArabicBookCard,
} from '../services/xtreamApi';
import type { ParsedUploadedBook } from '../utils/manhwaEngine';
import {
  ManhwaStudioView,
  type ManhwaPrefillSource,
} from './ManhwaStudioView';
import { Book4DReader } from './Book4DReader';
import { getNovelCountryLabel } from '../utils/book4dUtils';
import { buildNovelCharacterProfiles } from '../utils/mediaCharacters';
import sutoorEmblem from '../assets/images/valdrion_luxury_emblem_1795269522039.jpg';

const NOVEL_COUNTRY_FILTERS = [
  'الكل',
  'عربي',
  'ياباني',
  'كوري',
  'صيني',
  'روسي',
  'بريطاني',
  'فرنسي',
  'أمريكي',
  'تركي',
] as const;

interface NovelsAppProps {
  initialTab?: NovelsTab;
  deviceMode?: DevicePlatformMode;
  onConsumeInitialTab?: () => void;
  onSwitchToAi: () => void;
  onSwitchToCinema: () => void;
  onSwitchToPrivateAi?: () => void;
  onOpenDevicePicker?: () => void;
  onToast: (msg: string) => void;
}

type NovelsTab =
  | 'library'
  | 'manhwa'
  | 'reader'
  | 'studio'
  | 'interactive'
  | 'world'
  | 'shelf';

type AmbientSoundMode = 'off' | 'rain' | 'fireplace';

const WORLD_AR_QUICK_CATEGORIES = [
  { label: 'فانتازيا وملحمة عالمية', query: 'fantasy epic novel' },
  { label: 'مانهوا ولايت نوفل', query: 'japanese light novel fantasy' },
  { label: 'أدب عربي وكلاسيكيات', query: 'arabic literature novel' },
  { label: 'دوستويفسكي وتولستوي', query: 'dostoevsky tolstoy novel' },
  { label: 'أجاثا كريستي وغموض', query: 'sherlock holmes agatha christie mystery' },
  { label: 'خيال علمي وفضاء', query: 'science fiction space novel' },
  { label: 'مغامرة وتاريخ عالمي', query: 'monte cristo adventure classic' },
  { label: 'رعب وقوطي', query: 'dracula gothic horror novel' },
];

const READER_THEMES: Record<
  NovelReaderTheme,
  { label: string; bg: string; card: string; text: string; muted: string; border: string }
> = {
  dark: {
    label: 'ليلي دافئ',
    bg: 'bg-[#121016]',
    card: 'bg-[#1A1621]',
    text: 'text-[#F3EDE2]',
    muted: 'text-[#ABA0B8]',
    border: 'border-white/10',
  },
  sepia: {
    label: 'ورق بردي',
    bg: 'bg-[#F4ECD8]',
    card: 'bg-[#FAF4E6]',
    text: 'text-[#2B2218]',
    muted: 'text-[#6E5C47]',
    border: 'border-[#D9C7A3]',
  },
  paper: {
    label: 'أبيض نقي',
    bg: 'bg-[#F8FAFC]',
    card: 'bg-white',
    text: 'text-[#111827]',
    muted: 'text-[#64748B]',
    border: 'border-slate-200',
  },
  oled: {
    label: 'OLED أسود',
    bg: 'bg-[#040507]',
    card: 'bg-[#0A0C10]',
    text: 'text-[#E5E7EB]',
    muted: 'text-[#8B95A5]',
    border: 'border-white/10',
  },
};

export function NovelsApp({
  initialTab,
  deviceMode = 'desktop',
  onConsumeInitialTab,
  onSwitchToAi,
  onSwitchToCinema,
  onSwitchToPrivateAi,
  onOpenDevicePicker,
  onToast,
}: NovelsAppProps) {
  const [state, setState] = useState<NovelsPersistedState>(() => loadNovelsState());
  const [tab, setTab] = useState<NovelsTab>(initialTab || 'library');

  useEffect(() => {
    if (!initialTab) return;
    setTab(initialTab);
    onConsumeInitialTab?.();
  }, [initialTab, onConsumeInitialTab]);
  const [genre, setGenre] = useState<NovelGenre>('الكل');
  const [countryFilter, setCountryFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  // Reader State
  const [readingNovelId, setReadingNovelId] = useState<string>('novel_citadel_of_mirrors');
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [readerViewMode, setReaderViewMode] = useState<'scroll' | 'book4d'>(() =>
    deviceMode === 'mobile' ? 'scroll' : 'book4d'
  );
  const [importedWorldMeta, setImportedWorldMeta] = useState<
    Record<string, { titleOriginal: string; fullTextUrl?: string; authorAr: string; synopsisAr: string }>
  >({});
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const [chapterDirection, setChapterDirection] = useState('');
  const [speakingAudio, setSpeakingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // AI Novel Studio (Authoring) State
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState<Exclude<NovelGenre, 'الكل'>>('فانتازيا');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldDesc, setNewWorldDesc] = useState('');
  const [draftWorldEntries, setDraftWorldEntries] = useState<NovelWorldEntry[]>([]);
  const [creatingNovelAi, setCreatingNovelAi] = useState(false);

  // Interactive Branching Story ("اصنع قرارك") State
  const [interactiveGenre, setInteractiveGenre] = useState('فانتازيا ومغامرة');
  const [interactivePremise, setInteractivePremise] = useState(
    'مسافر يجد خريطة نجمية قديمة داخل مكتبة مهجورة تقود إلى مملكة تحت الرمال.'
  );
  const [interactiveTurns, setInteractiveTurns] = useState<
    Array<{ id: string; chosen?: string; narrative: string; choices: string[] }>
  >([]);
  const [interactiveLoading, setInteractiveLoading] = useState(false);

  // World Free Books Explorer (All World Novels in Arabic: Open Library + Gutenberg + Google Books)
  const [worldQuery, setWorldQuery] = useState('أشهر الروايات العالمية الكلاسيكية والفانتازيا');
  const [worldBooks, setWorldBooks] = useState<WorldArabicBookCard[]>([]);
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldLoadingMore, setWorldLoadingMore] = useState(false);
  const [worldLoadedOnce, setWorldLoadedOnce] = useState(false);
  const [worldPage, setWorldPage] = useState(1);
  const [worldHasMore, setWorldHasMore] = useState(true);
  const [worldTotalFound, setWorldTotalFound] = useState(30_450_000);
  const [activeWorldCategory, setActiveWorldCategory] = useState<string | undefined>(undefined);
  const [translatingBookId, setTranslatingBookId] = useState<string | null>(null);

  // Novel-to-Manhwa Studio Prefill
  const [manhwaPrefill, setManhwaPrefill] = useState<ManhwaPrefillSource | null>(null);

  // Ambient Reading Soundscape (Web Audio API procedural rain / cozy fireplace)
  const [ambientMode, setAmbientMode] = useState<AmbientSoundMode>('off');
  const ambientCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    saveNovelsState(state);
  }, [state]);

  // Procedural Web Audio Ambient Soundscape (Zero external audio dependencies)
  useEffect(() => {
    const stopAmbient = () => {
      if (ambientCtxRef.current) {
        void ambientCtxRef.current.close().catch(() => {});
        ambientCtxRef.current = null;
      }
    };

    if (ambientMode === 'off') {
      stopAmbient();
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ambientCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (ambientMode === 'fireplace') {
          // Warm low brown noise + subtle soft crackle
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          if (Math.random() < 0.00045) {
            data[i] += (Math.random() - 0.5) * 0.25;
          }
          data[i] *= 2.6;
        } else {
          // Soft gentle rainfall pink-filtered noise
          data[i] = (lastOut + 0.09 * white) / 1.09;
          lastOut = data[i];
          data[i] *= 1.15;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = ambientMode === 'fireplace' ? 'lowpass' : 'bandpass';
      filter.frequency.value = ambientMode === 'fireplace' ? 380 : 1250;
      filter.Q.value = ambientMode === 'fireplace' ? 0.7 : 0.6;

      const gain = ctx.createGain();
      gain.gain.value = ambientMode === 'fireplace' ? 0.14 : 0.075;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      setAmbientMode('off');
    }

    return () => {
      stopAmbient();
    };
  }, [ambientMode]);

  const allNovels = useMemo(() => {
    const base = mergeAllNovels(state);
    const existingIds = new Set(base.map((n) => n.id));
    const worldWithExtras = WORLD_MASTERPIECES_AR_CATALOG.filter(
      (n) => !existingIds.has(n.id)
    ).map((novel) => {
      const extras = state.extraChaptersByNovel[novel.id] || [];
      return extras.length > 0
        ? { ...novel, chapters: [...novel.chapters, ...extras] }
        : novel;
    });
    return [...base, ...worldWithExtras];
  }, [state]);

  const filteredNovels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allNovels.filter((n) => {
      if (genre !== 'الكل' && n.genre !== genre) return false;
      if (countryFilter !== 'الكل' && getNovelCountryLabel(n) !== countryFilter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        n.synopsis.toLowerCase().includes(q) ||
        getNovelCountryLabel(n).toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allNovels, countryFilter, genre, searchQuery]);

  const activeNovel = useMemo(
    () => allNovels.find((n) => n.id === readingNovelId) || allNovels[0],
    [allNovels, readingNovelId]
  );

  const activeChapter = activeNovel?.chapters[chapterIndex] || activeNovel?.chapters[0];

  const openNovelReader = (novel: NovelBook, chIdx?: number) => {
    const savedIdx = state.progress[novel.id]?.chapterIndex ?? 0;
    const safeIdx = Math.min(
      novel.chapters.length - 1,
      Math.max(0, chIdx !== undefined ? chIdx : savedIdx)
    );
    setReadingNovelId(novel.id);
    setChapterIndex(safeIdx);
    setTab('reader');
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [novel.id]: {
          novelId: novel.id,
          chapterIndex: safeIdx,
          scrollPct: prev.progress[novel.id]?.scrollPct || 0,
          updatedAt: Date.now(),
        },
      },
    }));
  };

  const toggleFavorite = (novelId: string) => {
    setState((prev) => {
      const exists = prev.favorites.includes(novelId);
      return {
        ...prev,
        favorites: exists
          ? prev.favorites.filter((id) => id !== novelId)
          : [novelId, ...prev.favorites],
      };
    });
  };

  const toggleBookmark = (novel: NovelBook, ch: NovelChapter) => {
    setState((prev) => {
      const exists = prev.bookmarks.some(
        (b) => b.novelId === novel.id && b.chapterId === ch.id
      );
      onToast(exists ? 'تمت إزالة العلامة المرجعية.' : `تم حفظ العلامة عند «${ch.title}».`);
      return {
        ...prev,
        bookmarks: exists
          ? prev.bookmarks.filter((b) => !(b.novelId === novel.id && b.chapterId === ch.id))
          : [
              {
                novelId: novel.id,
                chapterId: ch.id,
                label: `${novel.title} — الفصل ${ch.number}: ${ch.title}`,
                ts: Date.now(),
              },
              ...prev.bookmarks,
            ].slice(0, 40),
      };
    });
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingAudio(false);
  };

  const handleSpeakChapter = async () => {
    if (!activeChapter) return;
    if (speakingAudio) {
      handleStopAudio();
      return;
    }
    setSpeakingAudio(true);
    const snippet = `${activeChapter.title}. ${activeChapter.content}`.slice(0, 1200);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: snippet, format: 'single', voice: 'Kore' }),
      });
      if (res.ok) {
        const data = (await res.json()) as { audioBase64?: string; mimeType?: string };
        if (data.audioBase64) {
          const audio = new Audio(
            `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
          );
          audioRef.current = audio;
          audio.onended = () => setSpeakingAudio(false);
          audio.onerror = () => setSpeakingAudio(false);
          await audio.play();
          return;
        }
      }
    } catch {
      // Fallback to browser SpeechSynthesis
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(snippet);
      utter.lang = 'ar-SA';
      utter.onend = () => setSpeakingAudio(false);
      utter.onerror = () => setSpeakingAudio(false);
      window.speechSynthesis.speak(utter);
    } else {
      setSpeakingAudio(false);
      onToast('تعذّر تشغيل القراءة الصوتية على هذا المتصفح.');
    }
  };

  const handleExportBook = (novel: NovelBook) => {
    const html = buildNovelExportHtml(novel);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title.replace(/\s+/g, '_')}_sutoor.html`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`تم تصدير رواية «${novel.title}» ككتاب عربي قابل للطباعة والـ PDF!`);
  };

  const handleGenerateNextChapter = async () => {
    if (!activeNovel || generatingChapter) return;
    setGeneratingChapter(true);
    let generatedText = '';
    try {
      const worldMeta = importedWorldMeta[activeNovel.id];
      if (worldMeta && !chapterDirection.trim()) {
        const nextNum = activeNovel.chapters.length + 1;
        const translated = await translateWorldNovelChapter({
          titleAr: activeNovel.title,
          titleOriginal: worldMeta.titleOriginal,
          authorAr: worldMeta.authorAr,
          synopsisAr: worldMeta.synopsisAr,
          fullTextUrl: worldMeta.fullTextUrl,
          chapterNumber: nextNum,
        });
        const newCh: NovelChapter = {
          id: `wch_${nextNum}_${Date.now()}`,
          number: nextNum,
          title: translated.chapterTitle,
          content: translated.content,
          createdAt: Date.now(),
        };
        setState((prev) => ({
          ...prev,
          customNovels: prev.customNovels.map((n) =>
            n.id === activeNovel.id
              ? { ...n, chapters: [...n.chapters, newCh], updatedAt: Date.now() }
              : n
          ),
        }));
        setChapterIndex(activeNovel.chapters.length);
        onToast(`تمت ترجمة الفصل ${nextNum} «${translated.chapterTitle}» من المصدر الأصلي!`);
        return;
      }

      const prompt = buildNovelContinuationPrompt(activeNovel, chapterDirection);
      await streamAiStudio(
        {
          mode: 'general',
          depth: 'fast',
          webSearch: false,
          message: prompt,
          history: [],
        },
        {
          onChunk: (d) => {
            generatedText += d;
          },
          onDone: () => {},
        }
      );

      const lines = generatedText.trim().split('\n');
      const firstLine = lines[0]?.replace(/^#+\s*/, '').trim();
      const chTitle =
        firstLine && firstLine.length <= 75
          ? firstLine
          : `الفصل ${activeNovel.chapters.length + 1}`;
      const chBody =
        firstLine && firstLine.length <= 75
          ? lines.slice(1).join('\n').trim()
          : generatedText.trim();

      if (!chBody) {
        onToast('لم يتم توليد نص الفصل — حاول مرة أخرى.');
        return;
      }

      const newChapter: NovelChapter = {
        id: `ch_ai_${Date.now()}`,
        number: activeNovel.chapters.length + 1,
        title: chTitle,
        content: chBody,
        createdAt: Date.now(),
      };

      setState((prev) => {
        if (activeNovel.isUserCreated) {
          return {
            ...prev,
            customNovels: prev.customNovels.map((n) =>
              n.id === activeNovel.id
                ? { ...n, chapters: [...n.chapters, newChapter], updatedAt: Date.now() }
                : n
            ),
          };
        }
        return {
          ...prev,
          extraChaptersByNovel: {
            ...prev.extraChaptersByNovel,
            [activeNovel.id]: [...(prev.extraChaptersByNovel[activeNovel.id] || []), newChapter],
          },
        };
      });

      setChapterDirection('');
      setChapterIndex(activeNovel.chapters.length);
      onToast(`تم تأليف الفصل الجديد «${chTitle}» وإضافته للرواية!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر توليد الفصل الجديد.');
    } finally {
      setGeneratingChapter(false);
    }
  };

  const handleCreateCustomNovel = async (withAiFirstChapter: boolean) => {
    if (!newTitle.trim() || !newSynopsis.trim()) {
      onToast('أدخل عنوان الرواية ونبذتها أولاً.');
      return;
    }
    setCreatingNovelAi(true);
    try {
      let firstChapterTitle = 'البداية';
      let firstChapterBody = `في عالم ${newTitle.trim()}...\n\n${newSynopsis.trim()}`;

      if (withAiFirstChapter) {
        let out = '';
        const draftBook: NovelBook = {
          id: 'draft',
          title: newTitle.trim(),
          author: newAuthor.trim() || 'كاتب سُطور',
          genre: newGenre,
          synopsis: newSynopsis.trim(),
          rating: 5.0,
          status: 'تأليف شخصي',
          coverFrom: '#1C1427',
          coverTo: '#3C2349',
          accentColor: '#E5B454',
          tags: [newGenre, 'تأليف AI'],
          chapters: [],
          worldBible: draftWorldEntries,
          updatedAt: Date.now(),
        };
        await streamAiStudio(
          {
            mode: 'general',
            depth: 'fast',
            webSearch: false,
            message: buildNovelContinuationPrompt(draftBook, 'ابدأ الفصل الأول بمشهد افتتاحي آسر.'),
            history: [],
          },
          {
            onChunk: (d) => {
              out += d;
            },
            onDone: () => {},
          }
        );
        const lines = out.trim().split('\n');
        if (lines[0] && lines[0].length < 80) {
          firstChapterTitle = lines[0].replace(/^#+\s*/, '').trim();
          firstChapterBody = lines.slice(1).join('\n').trim() || out.trim();
        } else if (out.trim()) {
          firstChapterBody = out.trim();
        }
      }

      const created: NovelBook = {
        id: `custom_novel_${Date.now()}`,
        title: newTitle.trim(),
        author: newAuthor.trim() || 'كاتب سُطور',
        genre: newGenre,
        synopsis: newSynopsis.trim(),
        rating: 5.0,
        status: 'تأليف شخصي',
        coverFrom: '#1A1328',
        coverTo: '#3D2246',
        accentColor: '#E8B858',
        tags: [newGenre, 'تأليفي'],
        worldBible: draftWorldEntries,
        isUserCreated: true,
        updatedAt: Date.now(),
        chapters: [
          {
            id: `ch_1_${Date.now()}`,
            number: 1,
            title: firstChapterTitle,
            content: firstChapterBody,
            createdAt: Date.now(),
          },
        ],
      };

      setState((prev) => ({
        ...prev,
        customNovels: [created, ...prev.customNovels],
        favorites: [created.id, ...prev.favorites],
      }));

      setNewTitle('');
      setNewSynopsis('');
      setDraftWorldEntries([]);
      openNovelReader(created, 0);
      onToast(`تم إنشاء روايتك «${created.title}» وفتحها في القارئ الفاخر!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر إنشاء الرواية حالياً.');
    } finally {
      setCreatingNovelAi(false);
    }
  };

  const handleRunInteractiveStep = async (chosenOption?: string) => {
    if (interactiveLoading) return;
    setInteractiveLoading(true);
    let rawOut = '';
    try {
      const storySoFar = interactiveTurns.map((t) => t.narrative).join('\n\n');
      const prompt = buildInteractiveChoicePrompt(
        interactiveGenre,
        interactivePremise,
        storySoFar,
        chosenOption
      );
      await streamAiStudio(
        {
          mode: 'general',
          depth: 'fast',
          webSearch: false,
          message: prompt,
          history: [],
        },
        {
          onChunk: (d) => {
            rawOut += d;
          },
          onDone: () => {},
        }
      );

      const parsed = parseInteractiveStoryTurn(rawOut);
      setInteractiveTurns((prev) => [
        ...prev,
        {
          id: `turn_${Date.now()}`,
          chosen: chosenOption,
          narrative: parsed.narrative || rawOut.trim(),
          choices:
            parsed.choices.length > 0
              ? parsed.choices
              : ['استكشف المجهول بشجاعة', 'توقّف لتحليل الأدلة بهدوء', 'تحدث مع الشخصية الغامضة'],
        },
      ]);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر متابعة الرواية التفاعلية.');
    } finally {
      setInteractiveLoading(false);
    }
  };

  const handleSaveInteractiveAsNovel = () => {
    if (interactiveTurns.length === 0) return;
    const saved: NovelBook = {
      id: `interactive_${Date.now()}`,
      title: `مغامرتي: ${interactivePremise.slice(0, 32)}`,
      author: 'قارئ سُطور التفاعلي',
      genre: 'فانتازيا',
      synopsis: interactivePremise,
      rating: 5.0,
      status: 'تأليف شخصي',
      coverFrom: '#17122B',
      coverTo: '#311E4F',
      accentColor: '#C084FC',
      tags: ['تفاعلية', 'قراراتي'],
      isUserCreated: true,
      updatedAt: Date.now(),
      chapters: interactiveTurns.map((t, i) => ({
        id: `ich_${i}_${Date.now()}`,
        number: i + 1,
        title: t.chosen ? `قرارك: ${t.chosen.slice(0, 42)}` : 'المشهد الافتتاحي',
        content: t.narrative,
        createdAt: Date.now(),
      })),
    };
    setState((prev) => ({
      ...prev,
      customNovels: [saved, ...prev.customNovels],
    }));
    openNovelReader(saved, 0);
    onToast('تم حفظ مغامرتك التفاعلية كرواية كاملة في مكتبتك!');
  };

  const handleOpenInManhwaStudio = (novel: NovelBook, chIdx = 0) => {
    const safeIdx = Math.min(novel.chapters.length - 1, Math.max(0, chIdx));
    const ch = novel.chapters[safeIdx] || novel.chapters[0];
    setManhwaPrefill({
      bookTitle: novel.title,
      chapterTitle: ch ? `الفصل ${ch.number}: ${ch.title}` : 'الفصل الأول',
      text: ch?.content || novel.synopsis,
      novelId: novel.id,
      chapterIndex: safeIdx,
      nonce: Date.now(),
    });
    setTab('manhwa');
    onToast(`تم تحميل «${novel.title}» داخل استوديو رسم المانهوا — اختر الأسلوب أو ارفع صورة مرجعية!`);
  };

  const handleSaveUploadedBookToLibrary = (parsed: ParsedUploadedBook) => {
    if (parsed.chapters.length === 0) return;
    const saved: NovelBook = {
      id: `uploaded_${Date.now()}`,
      title: parsed.title,
      author: 'ملف كتاب مرفوع',
      genre: 'كلاسيكيات عالمية',
      synopsis: parsed.chapters[0].content.slice(0, 220) + '...',
      rating: 5.0,
      status: 'مكتملة',
      coverFrom: '#1A1328',
      coverTo: '#3D1D3B',
      accentColor: '#F472B6',
      tags: ['كتابي', 'مرفوع', 'مانهوا'],
      isUserCreated: true,
      updatedAt: Date.now(),
      chapters: parsed.chapters.map((ch, idx) => ({
        id: `up_ch_${idx}_${Date.now()}`,
        number: idx + 1,
        title: ch.title,
        content: ch.content,
        createdAt: Date.now(),
      })),
    };
    setState((prev) => ({
      ...prev,
      customNovels: [saved, ...prev.customNovels],
      favorites: [saved.id, ...prev.favorites],
    }));
    onToast(`تم حفظ كتاب «${saved.title}» (${saved.chapters.length} فصول) في مكتبتك!`);
  };

  const handleSearchWorldBooks = async (
    overrideQuery?: string,
    category?: string,
    appendPage = 1
  ) => {
    const q = (overrideQuery ?? worldQuery).trim();
    if (!q) return;
    if (appendPage === 1 && worldLoading) return;
    if (appendPage > 1 && (worldLoadingMore || worldLoading)) return;

    if (overrideQuery !== undefined) setWorldQuery(overrideQuery);
    if (appendPage === 1) {
      setActiveWorldCategory(category);
      setWorldLoading(true);
    } else {
      setWorldLoadingMore(true);
    }
    setWorldLoadedOnce(true);

    try {
      const targetCategory = appendPage === 1 ? category : activeWorldCategory;
      const res = await searchWorldNovelsArabic(q, targetCategory, appendPage);
      const incoming = res.books || [];
      if (appendPage > 1) {
        setWorldBooks((prev) => {
          const seen = new Set(prev.map((b) => b.id));
          const merged = [...prev];
          for (const item of incoming) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });
        setWorldPage(res.page || appendPage);
        if (incoming.length > 0) {
          onToast(`تم تحميل ${incoming.length} رواية إضافية (صفحة ${res.page || appendPage})`);
        }
      } else {
        setWorldBooks(incoming);
        setWorldPage(1);
        if (incoming.length === 0) {
          onToast('لم يُعثر على روايات مطابقة — جرّب تصنيفاً آخر أو اسم رواية عالمية.');
        }
      }
      setWorldHasMore(Boolean(res.hasMore));
      if (typeof res.totalFound === 'number' && res.totalFound > 0) {
        setWorldTotalFound(res.totalFound);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر البحث في مكتبة الروايات العالمية.');
    } finally {
      setWorldLoading(false);
      setWorldLoadingMore(false);
    }
  };

  // Auto-load page 1 of the multi-million World Novels catalog in both Library & World tabs
  useEffect(() => {
    if ((tab === 'library' || tab === 'world') && !worldLoadedOnce && worldBooks.length === 0 && !worldLoading) {
      void handleSearchWorldBooks('أشهر الروايات العالمية الكلاسيكية والفانتازيا', undefined, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, worldLoadedOnce]);

  const handleOpenWorldBookInArabic = async (
    book: WorldArabicBookCard,
    mode: 'read' | 'manhwa'
  ) => {
    if (translatingBookId) return;
    setTranslatingBookId(book.id);
    try {
      const res = await translateWorldNovelChapter({
        titleAr: book.titleAr,
        titleOriginal: book.titleOriginal,
        authorAr: book.authorAr,
        synopsisAr: book.synopsisAr,
        fullTextUrl: book.fullTextUrl,
        chapterNumber: 1,
      });

      const importedBook: NovelBook = {
        id: `world_imp_${book.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
        title: book.titleAr,
        author: book.authorAr,
        genre: 'كلاسيكيات عالمية',
        synopsis: book.synopsisAr,
        rating: 4.9,
        status: 'مكتملة',
        coverFrom: '#16122A',
        coverTo: '#31214C',
        accentColor: '#F59E0B',
        tags: ['روايات عالمية', book.genreAr, book.source],
        isUserCreated: true,
        updatedAt: Date.now(),
        chapters: [
          {
            id: `wch_1_${Date.now()}`,
            number: 1,
            title: res.chapterTitle,
            content: res.content,
            createdAt: Date.now(),
          },
        ],
      };

      setImportedWorldMeta((prev) => ({
        ...prev,
        [importedBook.id]: {
          titleOriginal: book.titleOriginal,
          fullTextUrl: book.fullTextUrl,
          authorAr: book.authorAr,
          synopsisAr: book.synopsisAr,
        },
      }));

      setState((prev) => ({
        ...prev,
        customNovels: [
          importedBook,
          ...prev.customNovels.filter((n) => n.id !== importedBook.id),
        ],
      }));

      if (mode === 'manhwa') {
        handleOpenInManhwaStudio(importedBook, 0);
      } else {
        openNovelReader(importedBook, 0);
        onToast(`تمت ترجمة وتجهيز «${book.titleAr}» بالعربية الفصحى — قراءة ممتعة!`);
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر ترجمة الرواية حالياً.');
    } finally {
      setTranslatingBookId(null);
    }
  };

  const readerPalette = READER_THEMES[state.readerSettings.theme];

  return (
    <div className="min-h-screen bg-[#100D14] text-[#F4EFE6]">
      {/* SUTOOR Editorial Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#D9A441]/25 bg-[#120E18]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Brand */}
          <button
            type="button"
            onClick={() => setTab('library')}
            className="group flex shrink-0 items-center gap-2.5 text-right transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <img
              src={sutoorEmblem}
              alt="شعار فالدريون"
              className="h-10 w-10 rounded-xl border border-[#D9A441]/60 object-cover shadow-[0_0_18px_rgba(217,164,65,0.22)] transition-all duration-300 group-hover:scale-105 group-hover:border-[#F5D68A] group-hover:shadow-[0_0_24px_rgba(245,214,138,0.4)]"
            />
            <span className="flex flex-col leading-none">
              <span className="font-imperial text-lg font-extrabold tracking-[0.12em] text-[#FAF1DF] transition-colors duration-300 group-hover:text-[#F5D68A]">
                VALDRION
              </span>
              <span className="text-[10px] font-semibold text-[#D9A441]">
                فالدريون · الروايات والمانهوا
              </span>
            </span>
          </button>

          {/* Navigation with Shifting Gradients & Subtle Lift */}
          <nav
            aria-label="أقسام تطبيق الروايات"
            className={deviceMode === 'mobile' ? 'hidden' : 'hidden items-center gap-1.5 md:flex'}
          >
            {(
              [
                { id: 'library', label: 'المكتبة', icon: Library },
                { id: 'manhwa', label: 'ارسم مانهوا', icon: Palette },
                { id: 'reader', label: 'القارئ الفاخر', icon: BookOpen },
                { id: 'world', label: 'روايات العالم بالعربي', icon: Globe },
                { id: 'studio', label: 'ألّف AI', icon: Feather },
                { id: 'interactive', label: 'اصنع قرارك', icon: Compass },
                { id: 'shelf', label: `رفّي (${state.favorites.length})`, icon: BookMarked },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`group relative inline-flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-300 ease-out active:translate-y-0 active:scale-[0.96] ${
                    active
                      ? 'border-[#F5D68A]/70 bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] bg-[length:200%_100%] bg-left text-[#110D08] shadow-[0_6px_20px_rgba(217,164,65,0.34)] hover:-translate-y-0.5 hover:bg-right'
                      : 'border-transparent bg-gradient-to-l from-transparent via-transparent to-transparent text-[#C8BCA8] hover:-translate-y-0.5 hover:border-[#D9A441]/40 hover:from-[#D9A441]/18 hover:via-[#8B5CF6]/14 hover:to-[#D9A441]/10 hover:text-[#FFF8EA] hover:shadow-[0_6px_16px_rgba(217,164,65,0.14)]'
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                      active
                        ? 'scale-105 text-[#110D08]'
                        : 'text-[#D9A441]/80 group-hover:scale-110 group-hover:-rotate-6 group-hover:text-[#F5D68A]'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-2.5 bottom-0.5 h-[2px] rounded-full bg-gradient-to-l from-transparent via-[#F5D68A] to-transparent transition-all duration-300 ${
                      active
                        ? 'opacity-80 scale-x-100'
                        : 'opacity-0 scale-x-50 group-hover:opacity-75 group-hover:scale-x-100'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Unified VALDRION App Switcher (AI · Cinema · Vault · Device) — ALWAYS VISIBLE */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              data-testid="novels-nav-cinema"
              onClick={onSwitchToCinema}
              aria-label="الانتقال إلى فالدريون سينما"
              title="فالدريون — السينما والبث"
              className="group inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D9A441]/55 bg-gradient-to-l from-[#1B1510] via-[#2A1D12] to-[#1B1510] bg-[length:200%_100%] bg-left px-2.5 text-xs font-extrabold text-[#F5D68A] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#F5D68A] hover:from-[#D9A441] hover:via-[#F3C86A] hover:to-[#B87D22] hover:bg-right hover:text-[#110D08] hover:shadow-[0_6px_20px_rgba(217,164,65,0.34)] active:translate-y-0 active:scale-[0.96] sm:px-3"
            >
              <Clapperboard
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                aria-hidden="true"
              />
              <span>السينما</span>
            </button>
            <button
              type="button"
              data-testid="novels-nav-ai"
              onClick={onSwitchToAi}
              aria-label="الانتقال إلى فالدريون AI"
              title="فالدريون — الذكاء والقائد الشامل"
              className="group inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#93C5FD]/65 bg-gradient-to-l from-[#2563EB] via-[#3B82F6] to-[#4F46E5] px-2.5 text-xs font-extrabold text-white shadow-[0_6px_20px_rgba(59,130,246,0.36)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.96] sm:px-3.5"
            >
              <Sparkles
                className="h-3.5 w-3.5 text-[#FDE68A] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                aria-hidden="true"
              />
              <span>الذكاء AI</span>
            </button>
            {onSwitchToPrivateAi && deviceMode !== 'mobile' && (
              <button
                type="button"
                onClick={onSwitchToPrivateAi}
                aria-label="الانتقال إلى فالدريون الخزنة"
                title="فالدريون — الخزنة الخاصة"
                className="inline-flex h-9 items-center whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white"
              >
                <span>الخزنة</span>
              </button>
            )}
            {onOpenDevicePicker && (
              <button
                type="button"
                onClick={onOpenDevicePicker}
                title="تبديل وضع الجهاز (هاتف / كمبيوتر / تلفزيون)"
                className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-2 text-xs font-bold text-[#F5D68A] hover:border-[#D9A441]"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">
                  {deviceMode === 'mobile' ? 'هاتف' : 'كمبيوتر'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div
          className={
            deviceMode === 'mobile'
              ? 'flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.06] px-3 py-2'
              : 'flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.06] px-3 py-2 md:hidden'
          }
        >
          {(
            [
              { id: 'library', label: 'المكتبة' },
              { id: 'manhwa', label: 'ارسم مانهوا' },
              { id: 'reader', label: 'القارئ' },
              { id: 'world', label: 'روايات العالم بالعربي' },
              { id: 'studio', label: 'ألّف AI' },
              { id: 'interactive', label: 'اصنع قرارك' },
              { id: 'shelf', label: 'رفّي' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-300 active:scale-95 ${
                tab === item.id
                  ? 'border-[#F5D68A]/70 bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] text-[#110D08] shadow-[0_4px_14px_rgba(217,164,65,0.3)]'
                  : 'border-white/10 bg-white/[0.05] text-[#C8BCA8] hover:-translate-y-0.5 hover:border-[#D9A441]/45 hover:bg-gradient-to-l hover:from-[#D9A441]/18 hover:to-[#8B5CF6]/14 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* 1) LIBRARY TAB */}
        {tab === 'library' && (
          <div className="space-y-6">
            {/* Hero Spotlight */}
            <section className="relative overflow-hidden rounded-3xl border border-[#D9A441]/30 bg-gradient-to-l from-[#1D152B] via-[#15111E] to-[#1D160E] p-6 sm:p-8">
              <div className="grid items-center gap-6 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#D9A441]/40 bg-[#D9A441]/10 px-3 py-1 text-xs font-bold text-[#F5D68A]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>فالدريون · مكتبة الروايات والمانهوا العربية والعالمية</span>
                  </div>
                  <h1 className="text-2xl font-black leading-tight text-[#FAF4E8] sm:text-4xl">
                    اقرأ أروع الروايات، ألّف كتابك بالذكاء الاصطناعي، أو اصنع نهايتك بيدك
                  </h1>
                  <p className="max-w-2xl text-sm leading-relaxed text-[#C6B9A6]">
                    قارئ فاخر بـ 4 أوضاع للعين، استماع صوتي للفصول، استوديو تأليف مع موسوعة العالم والشخصيات، روايات تفاعلية متعددة المسارات، وتصدير فوري بصيغة كتاب عربي قابل للطباعة والـ PDF.
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setTab('manhwa')}
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-fuchsia-600 via-[#D9A441] to-purple-600 bg-[length:200%_100%] bg-left px-5 py-2.5 text-xs font-black text-white shadow-[0_8px_24px_rgba(192,38,211,0.34)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-right hover:shadow-[0_12px_30px_rgba(217,164,65,0.44)] active:translate-y-0 active:scale-[0.97]"
                    >
                      <Palette className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" />
                      <span>حوّل كتابك أو روايتك إلى مانهوا بالرسم</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openNovelReader(allNovels[0], 0)}
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] bg-[length:200%_100%] bg-left px-5 py-2.5 text-xs font-extrabold text-[#120E0A] shadow-[0_8px_22px_rgba(217,164,65,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-right hover:shadow-[0_10px_28px_rgba(245,214,138,0.42)] active:translate-y-0 active:scale-[0.97]"
                    >
                      <BookOpen className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                      <span>ابدأ قراءة «{allNovels[0]?.title}»</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('world')}
                      className="group inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-gradient-to-l from-cyan-500/15 via-blue-500/12 to-indigo-500/15 bg-[length:200%_100%] bg-left px-4 py-2.5 text-xs font-bold text-cyan-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-right hover:text-white active:scale-[0.97]"
                    >
                      <Globe className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" aria-hidden="true" />
                      <span>ملايين روايات العالم بالعربي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('studio')}
                      className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-gradient-to-l from-white/[0.06] via-white/[0.08] to-white/[0.04] px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D9A441] hover:from-[#D9A441]/20 hover:via-[#D9A441]/10 hover:to-transparent hover:shadow-[0_6px_18px_rgba(217,164,65,0.2)] active:translate-y-0 active:scale-[0.97]"
                    >
                      <Feather className="h-4 w-4 text-[#D9A441] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" aria-hidden="true" />
                      <span>ألّف روايتك الخاصة بالذكاء</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('interactive')}
                      className="group inline-flex items-center gap-2 rounded-xl border border-purple-400/35 bg-gradient-to-l from-purple-500/15 via-fuchsia-500/12 to-indigo-500/15 bg-[length:200%_100%] bg-left px-4 py-2.5 text-xs font-bold text-purple-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/70 hover:bg-right hover:text-white hover:shadow-[0_6px_20px_rgba(168,85,247,0.3)] active:translate-y-0 active:scale-[0.97]"
                    >
                      <Compass className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" aria-hidden="true" />
                      <span>اصنع قرارك</span>
                    </button>
                  </div>
                </div>

                {/* Decorative Literary Emblem Card */}
                <div className="hidden justify-center lg:col-span-4 lg:flex">
                  <div className="relative flex flex-col items-center rounded-2xl border border-[#D9A441]/35 bg-[#120E19]/90 p-5 text-center shadow-2xl">
                    <img
                      src={sutoorEmblem}
                      alt="شعار دار سُطور"
                      className="h-28 w-28 rounded-2xl border border-[#D9A441]/60 object-cover shadow-lg"
                    />
                    <p className="mt-3 font-imperial text-base font-bold text-[#F5D68A]">
                      {allNovels.length} رواية كاملة + 30,000,000+ عالمية
                    </p>
                    <p className="mt-1 text-xs text-[#A89B89]">
                      موسوعة لا نهائية بالعربية · {state.bookmarks.length} علامة مرجعية
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Search & Genre Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {NOVEL_GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenre(g)}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-300 ease-out active:scale-[0.96] ${
                      genre === g
                        ? 'border-[#F5D68A]/70 bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] bg-[length:200%_100%] bg-left text-[#110D08] shadow-[0_4px_14px_rgba(217,164,65,0.3)] hover:-translate-y-0.5 hover:bg-right'
                        : 'border-white/10 bg-[#181320] text-[#C8BCA8] hover:-translate-y-0.5 hover:border-[#D9A441]/50 hover:bg-gradient-to-l hover:from-[#D9A441]/15 hover:to-[#7C3AED]/12 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E9180]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                        void handleSearchWorldBooks(searchQuery.trim(), undefined, 1);
                      }
                    }}
                    placeholder="ابحث في +30 مليون رواية أو مؤلف..."
                    className="w-full rounded-xl border border-white/12 bg-[#181320] py-2 pr-9 pl-3 text-xs text-white placeholder:text-[#8E8170] focus:border-[#D9A441] focus:outline-none"
                  />
                </div>
                {searchQuery.trim().length >= 2 && (
                  <button
                    type="button"
                    disabled={worldLoading}
                    onClick={() => void handleSearchWorldBooks(searchQuery.trim(), undefined, 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/45 bg-cyan-500/15 px-3 py-2 text-xs font-extrabold text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
                  >
                    {worldLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Globe className="h-3.5 w-3.5" />
                    )}
                    <span>ابحث عالمياً عن «{searchQuery.trim()}»</span>
                  </button>
                )}
              </div>
            </div>

            {/* Country / World Literature Origin Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-[#15111E] px-3 py-2.5">
              <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#F5D68A]">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>أدب الدول:</span>
              </span>
              {NOVEL_COUNTRY_FILTERS.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => setCountryFilter(country)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                    countryFilter === country
                      ? 'border-[#D9A441] bg-[#D9A441] text-[#110D08]'
                      : 'border-white/10 bg-white/[0.04] text-[#C8BCA8] hover:border-[#D9A441]/50 hover:text-white'
                  }`}
                >
                  {country === 'الكل' ? 'كل الدول' : `أدب ${country}`}
                </button>
              ))}
            </div>

            {/* Novels Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNovels.map((novel) => {
                const words = computeNovelWordCount(novel);
                const mins = estimateReadingMinutes(words);
                const isFav = state.favorites.includes(novel.id);
                const prog = state.progress[novel.id];

                return (
                  <article
                    key={novel.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17121F] transition-colors hover:border-[#D9A441]/55"
                  >
                    {/* Crafted Editorial Book Cover Header */}
                    <div
                      className="relative flex min-h-[146px] flex-col justify-between p-5"
                      style={{
                        background: `linear-gradient(135deg, ${novel.coverFrom}, ${novel.coverTo})`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className="rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-[#110D08]"
                          style={{ backgroundColor: novel.accentColor }}
                        >
                          {novel.genre}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(novel.id)}
                          aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isFav
                              ? 'bg-rose-500/25 text-rose-300'
                              : 'bg-black/30 text-white/75 hover:text-white'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      <div className="mt-4">
                        <h2 className="text-lg font-black text-white">{novel.title}</h2>
                        <p className="mt-0.5 text-xs font-semibold text-white/80">
                          بقلم: {novel.author} · ★ {novel.rating.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <p className="line-clamp-3 text-xs leading-relaxed text-[#C7BBAE]">
                          {novel.synopsis}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md border border-[#D9A441]/30 bg-[#D9A441]/10 px-2 py-0.5 text-[10px] font-bold text-[#F5D68A]">
                            أدب {getNovelCountryLabel(novel)}
                          </span>
                          {buildNovelCharacterProfiles(novel)
                            .slice(0, 2)
                            .map((ch, idx) => (
                              <span
                                key={`${novel.id}_ch_${idx}`}
                                title={`${ch.name} (${ch.role}): ${ch.bio}`}
                                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#D8CCB8]"
                              >
                                {ch.name}
                              </span>
                            ))}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#9E9180]">
                          <span>{novel.chapters.length} فصول</span>
                          <span>·</span>
                          <span>~{mins} د قراءة</span>
                          <span>·</span>
                          <span>{novel.status}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-3">
                        <button
                          type="button"
                          onClick={() => openNovelReader(novel)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D9A441] px-3.5 py-2 text-xs font-extrabold text-[#110D08] hover:bg-[#E7B95D]"
                        >
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            {prog ? `أكمل من الفصل ${prog.chapterIndex + 1}` : 'اقرأ الآن'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenInManhwaStudio(novel, prog?.chapterIndex || 0)}
                          title="حوّل هذه الرواية إلى مانهوا مصوّرة"
                          aria-label={`رسم ${novel.title} كمانهوا`}
                          className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-2 text-[11px] font-extrabold text-fuchsia-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-fuchsia-500 hover:text-white"
                        >
                          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>مانهوا</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportBook(novel)}
                          title="تحميل الكتاب HTML / PDF"
                          aria-label={`تصدير ${novel.title}`}
                          className="rounded-xl border border-white/12 bg-white/[0.04] p-2 text-[#D8CCB8] hover:border-[#D9A441] hover:text-white"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredNovels.length === 0 && searchQuery.trim().length >= 2 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D9A441]/30 bg-[#181322] p-4">
                <div>
                  <p className="text-sm font-extrabold text-white">
                    لم نجد «{searchQuery.trim()}» في المختارات المحلية — يمكنك فتحها فوراً من موسوعة الملايين!
                  </p>
                  <p className="mt-0.5 text-xs text-[#B9AC99]">
                    ابحث عنها في +30,000,000 كتاب ورواية عالمية أو استحضر فصلها الأول بالعربية مباشرة.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSearchWorldBooks(searchQuery.trim(), undefined, 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 px-3.5 py-2 text-xs font-extrabold text-cyan-100 hover:bg-cyan-500/35"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>ابحث في موسوعة الملايين</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(translatingBookId)}
                    onClick={() =>
                      void handleOpenWorldBookInArabic(
                        {
                          id: `instant_${Date.now()}`,
                          titleOriginal: searchQuery.trim(),
                          titleAr: searchQuery.trim(),
                          authorAr: 'مؤلف عالمي',
                          synopsisAr: `رواية «${searchQuery.trim()}» — نسخة عربية أدبية كاملة من موسوعة دار سُطور العالمية.`,
                          genreAr: 'روايات عالمية',
                          source: 'Open Library',
                          hasPublicFullText: false,
                          infoUrl: `https://openlibrary.org/search?q=${encodeURIComponent(searchQuery.trim())}`,
                        },
                        'read'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#D9A441] px-3.5 py-2 text-xs font-black text-[#110D08] hover:bg-[#E7B95D]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>اقرأ «{searchQuery.trim()}» بالعربية الآن</span>
                  </button>
                </div>
              </div>
            )}

            {/* Infinite Multi-Million World Novels Section directly inside Main Library */}
            <section
              data-testid="infinite-world-novels-section"
              className="space-y-4 rounded-3xl border border-cyan-400/25 bg-gradient-to-b from-[#131828]/90 via-[#15111E] to-[#120E1A] p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[11px] font-extrabold text-cyan-200">
                    <Globe className="h-3.5 w-3.5" />
                    <span>
                      موسوعة الملايين اللانهائية · +{Math.max(worldTotalFound, 30_450_000).toLocaleString('ar-EG')} رواية وكتاب عالمي
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-white sm:text-xl">
                    تصفّح لا نهائي لملايين الروايات العالمية بالعربية (Open Library + Gutenberg + Google Books)
                  </h2>
                  <p className="mt-0.5 text-xs text-[#BEB3C8]">
                    كل بطاقة جاهزة للفتح فوراً بالعربية أو للتحويل إلى مانهوا ملونة، مع تحميل صفحات لا نهائية بلا حد!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('world')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9A441]/45 bg-[#D9A441]/15 px-3.5 py-2 text-xs font-extrabold text-[#F5D68A] hover:bg-[#D9A441] hover:text-[#110D08]"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>بحث متقدم في الموسوعة</span>
                </button>
              </div>

              {/* Quick World Genre Chips */}
              <div className="flex flex-wrap gap-1.5">
                {WORLD_AR_QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={`lib_world_${cat.label}`}
                    type="button"
                    disabled={worldLoading}
                    onClick={() => void handleSearchWorldBooks(cat.query, cat.label, 1)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                      activeWorldCategory === cat.label
                        ? 'border-cyan-300 bg-cyan-400 text-[#0B101D]'
                        : 'border-white/10 bg-white/[0.05] text-[#DDD4E6] hover:border-cyan-400/60 hover:bg-cyan-500/15 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {worldLoading && (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#17121F] py-10 text-sm font-bold text-[#F5D68A]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري جلب الروايات من المكتبات العالمية وتعريبها لك...</span>
                </div>
              )}

              {!worldLoading && worldBooks.length > 0 && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#B9AC99]">
                    <span>
                      معروض حالياً <strong className="text-white">{worldBooks.length}</strong> رواية عالمية (صفحة {worldPage}) من أصل{' '}
                      <strong className="text-cyan-200">{worldTotalFound.toLocaleString('ar-EG')}</strong> نتيجة مطابقة
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {worldBooks.map((book) => {
                      const busy = translatingBookId === book.id;
                      return (
                        <article
                          key={`lib_w_${book.id}`}
                          className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#17121F] p-4 transition-colors hover:border-cyan-400/55"
                        >
                          <div>
                            <div className="mb-3 flex gap-3">
                              {book.coverUrl ? (
                                <img
                                  src={book.coverUrl}
                                  alt={book.titleAr}
                                  loading="lazy"
                                  className="h-28 w-20 shrink-0 rounded-xl border border-white/15 bg-[#100D16] object-cover"
                                />
                              ) : (
                                <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-xl border border-[#D9A441]/30 bg-gradient-to-br from-[#231936] to-[#120E1B] text-[#D9A441]">
                                  <BookOpen className="h-7 w-7" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-md bg-[#D9A441]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#F5D68A]">
                                    {book.genreAr}
                                  </span>
                                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#C8BCA8]">
                                    {book.source}
                                  </span>
                                </div>
                                <h3 className="mt-1.5 line-clamp-2 text-sm font-black text-white">
                                  {book.titleAr}
                                </h3>
                                <p className="mt-0.5 truncate text-[11px] font-semibold text-[#B9AC99]">
                                  {book.authorAr} {book.year ? `· ${book.year}` : ''}
                                </p>
                              </div>
                            </div>
                            <p className="line-clamp-3 text-xs leading-relaxed text-[#C7BBAE]">
                              {book.synopsisAr}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
                            <button
                              type="button"
                              disabled={Boolean(translatingBookId)}
                              onClick={() => void handleOpenWorldBookInArabic(book, 'read')}
                              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D9A441] px-3 py-2 text-xs font-extrabold text-[#110D08] transition hover:bg-[#E7B95D] disabled:opacity-60"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <BookOpen className="h-3.5 w-3.5" />
                              )}
                              <span>{busy ? 'جاري التعريب...' : 'اقرأ بالعربي'}</span>
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(translatingBookId)}
                              onClick={() => void handleOpenWorldBookInArabic(book, 'manhwa')}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/15 px-3 py-2 text-xs font-extrabold text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-white disabled:opacity-60"
                            >
                              <Palette className="h-3.5 w-3.5" />
                              <span>مانهوا</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {worldHasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        data-testid="load-more-world-novels-btn"
                        disabled={worldLoadingMore}
                        onClick={() => void handleSearchWorldBooks(worldQuery, activeWorldCategory, worldPage + 1)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/50 bg-gradient-to-l from-cyan-500/20 via-blue-500/20 to-indigo-500/20 px-6 py-3 text-xs font-black text-white shadow-lg transition hover:border-cyan-300 hover:from-cyan-500/35 hover:to-indigo-500/35 disabled:opacity-60"
                      >
                        {worldLoadingMore ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        <span>
                          {worldLoadingMore
                            ? 'جاري تحميل دفعة جديدة من الروايات العالمية...'
                            : `تحميل المزيد من الروايات (صفحة ${worldPage + 1})`}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {/* 1.5) NOVEL-TO-MANHWA DRAWING STUDIO */}
        {tab === 'manhwa' && (
          <ManhwaStudioView
            novels={allNovels}
            prefillSource={manhwaPrefill}
            onSaveUploadedBookToLibrary={handleSaveUploadedBookToLibrary}
            onToast={onToast}
          />
        )}

        {/* 2) LUXURY BOOK READER TAB */}
        {tab === 'reader' && activeNovel && activeChapter && (
          <div className={`rounded-3xl border p-4 sm:p-6 transition-colors ${readerPalette.bg} ${readerPalette.border}`}>
            {/* Reader Controls Bar */}
            <div className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${readerPalette.card} ${readerPalette.border}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab('library')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${readerPalette.border} ${readerPalette.text}`}
                >
                  ← المكتبة
                </button>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-extrabold ${readerPalette.text}`}>
                    {activeNovel.title}
                  </p>
                  <p className={`text-[11px] ${readerPalette.muted}`}>
                    الفصل {activeChapter.number} من {activeNovel.chapters.length}: {activeChapter.title}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Reader Layout Switcher: Continuous Comfortable Scroll vs 4D Physical Book */}
                <div
                  data-testid="reader-view-mode-switcher"
                  className={`inline-flex items-center gap-1 rounded-lg border p-0.5 ${readerPalette.border}`}
                >
                  <button
                    type="button"
                    data-testid="reader-mode-scroll"
                    onClick={() => setReaderViewMode('scroll')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                      readerViewMode === 'scroll'
                        ? 'bg-[#D9A441] text-[#110D08]'
                        : readerPalette.muted
                    }`}
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    <span>قراءة متصلة</span>
                  </button>
                  <button
                    type="button"
                    data-testid="reader-mode-book4d"
                    onClick={() => setReaderViewMode('book4d')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-extrabold transition ${
                      readerViewMode === 'book4d'
                        ? 'bg-[#D9A441] text-[#110D08]'
                        : readerPalette.muted
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>كتاب 4D</span>
                  </button>
                </div>

                {/* 4 Reader Themes */}
                {(Object.keys(READER_THEMES) as NovelReaderTheme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        readerSettings: { ...prev.readerSettings, theme: t },
                      }))
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                      state.readerSettings.theme === t
                        ? 'border-[#D9A441] bg-[#D9A441] text-[#110D08]'
                        : `${readerPalette.border} ${readerPalette.muted}`
                    }`}
                  >
                    {t === 'paper' || t === 'sepia' ? (
                      <Sun className="h-3 w-3" />
                    ) : (
                      <Moon className="h-3 w-3" />
                    )}
                    <span>{READER_THEMES[t].label}</span>
                  </button>
                ))}

                {/* Font Size */}
                <div className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 ${readerPalette.border}`}>
                  <button
                    type="button"
                    aria-label="تصغير الخط"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        readerSettings: {
                          ...prev.readerSettings,
                          fontSizePx: Math.max(14, prev.readerSettings.fontSizePx - 2),
                        },
                      }))
                    }
                    className={`p-1 ${readerPalette.text}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className={`font-mono text-xs font-bold ${readerPalette.text}`}>
                    {state.readerSettings.fontSizePx}px
                  </span>
                  <button
                    type="button"
                    aria-label="تكبير الخط"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        readerSettings: {
                          ...prev.readerSettings,
                          fontSizePx: Math.min(28, prev.readerSettings.fontSizePx + 2),
                        },
                      }))
                    }
                    className={`p-1 ${readerPalette.text}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Ambient Reading Soundscape */}
                <div className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 ${readerPalette.border}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setAmbientMode((m) => (m === 'rain' ? 'off' : 'rain'))
                    }
                    title="صوت مطر هادئ للقراءة"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                      ambientMode === 'rain'
                        ? 'bg-sky-500 text-white'
                        : `${readerPalette.muted} hover:text-sky-400`
                    }`}
                  >
                    <CloudRain className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">مطر</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAmbientMode((m) => (m === 'fireplace' ? 'off' : 'fireplace'))
                    }
                    title="صوت مدفأة دافئة للقراءة"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                      ambientMode === 'fireplace'
                        ? 'bg-amber-600 text-white'
                        : `${readerPalette.muted} hover:text-amber-400`
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">مدفأة</span>
                  </button>
                </div>

                {/* Convert Current Chapter to Manhwa */}
                <button
                  type="button"
                  onClick={() => handleOpenInManhwaStudio(activeNovel, chapterIndex)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-l from-fuchsia-600 to-purple-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md transition hover:brightness-110"
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>ارسم الفصل مانهوا</span>
                </button>

                {/* Audio Narration */}
                <button
                  type="button"
                  onClick={() => void handleSpeakChapter()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#1D4ED8]"
                >
                  {speakingAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{speakingAudio ? 'إيقاف الصوت' : 'استمع للفصل'}</span>
                </button>

                {/* Bookmark */}
                <button
                  type="button"
                  onClick={() => toggleBookmark(activeNovel, activeChapter)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${readerPalette.border} ${readerPalette.text}`}
                >
                  <Bookmark className="h-3.5 w-3.5 text-[#D9A441]" />
                  <span>علامة</span>
                </button>

                {/* Export Book */}
                <button
                  type="button"
                  onClick={() => handleExportBook(activeNovel)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${readerPalette.border} ${readerPalette.text}`}
                >
                  <Download className="h-3.5 w-3.5 text-[#D9A441]" />
                  <span>تصدير كتاب</span>
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Chapters Sidebar */}
              <aside className={`rounded-2xl border p-4 lg:col-span-3 ${readerPalette.card} ${readerPalette.border}`}>
                <h3 className={`mb-3 text-xs font-extrabold ${readerPalette.muted}`}>
                  فهرس الفصول ({activeNovel.chapters.length})
                </h3>
                <div className="space-y-1.5">
                  {activeNovel.chapters.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => openNovelReader(activeNovel, idx)}
                      className={`w-full rounded-xl border px-3 py-2 text-right text-xs font-bold transition-all duration-300 ease-out active:scale-[0.98] ${
                        idx === chapterIndex
                          ? 'border-[#F5D68A]/70 bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] text-[#110D08] shadow-[0_4px_14px_rgba(217,164,65,0.28)]'
                          : `border-transparent ${readerPalette.text} hover:-translate-x-1 hover:border-[#D9A441]/35 hover:bg-[#D9A441]/12`
                      }`}
                    >
                      {ch.number}. {ch.title}
                    </button>
                  ))}
                </div>
              </aside>

              {/* Main Reader Area: Continuous Scroll OR 4D Physical Book */}
              <article className={`rounded-2xl border p-4 sm:p-6 lg:col-span-9 ${readerPalette.card} ${readerPalette.border}`}>
                {readerViewMode === 'scroll' ? (
                  <div
                    data-testid="novel-continuous-reader"
                    className="mx-auto max-w-3xl space-y-5 py-2"
                  >
                    <header className="border-b border-[#D9A441]/25 pb-4 text-center">
                      <span className="inline-block rounded-full border border-[#D9A441]/40 bg-[#D9A441]/12 px-3 py-0.5 text-[11px] font-extrabold text-[#D9A441]">
                        الفصل {activeChapter.number} من {activeNovel.chapters.length}
                      </span>
                      <h1 className={`mt-2 text-2xl font-black sm:text-3xl ${readerPalette.text}`}>
                        {activeChapter.title}
                      </h1>
                      <p className={`mt-1 text-xs ${readerPalette.muted}`}>
                        {activeNovel.title} · بقلم {activeNovel.author}
                      </p>
                    </header>
                    <div
                      className={`space-y-5 text-justify font-medium ${readerPalette.text}`}
                      style={{
                        fontSize: `${state.readerSettings.fontSizePx}px`,
                        lineHeight: state.readerSettings.lineHeight,
                      }}
                    >
                      {activeChapter.content
                        .split(/\n+/)
                        .map((p) => p.trim())
                        .filter(Boolean)
                        .map((para, pIdx) => (
                          <p key={pIdx}>{para}</p>
                        ))}
                    </div>
                  </div>
                ) : (
                  <Book4DReader
                    novel={activeNovel}
                    chapter={activeChapter}
                    chapterIndex={chapterIndex}
                    totalChapters={activeNovel.chapters.length}
                    theme={state.readerSettings.theme}
                    fontSizePx={state.readerSettings.fontSizePx}
                    lineHeight={state.readerSettings.lineHeight}
                    flipSoundEnabled={state.readerSettings.flipSoundEnabled ?? true}
                    onToggleFlipSound={() =>
                      setState((prev) => ({
                        ...prev,
                        readerSettings: {
                          ...prev.readerSettings,
                          flipSoundEnabled: !(prev.readerSettings.flipSoundEnabled ?? true),
                        },
                      }))
                    }
                    onChangeChapter={(nextIdx) => openNovelReader(activeNovel, nextIdx)}
                  />
                )}

                {/* Chapter Navigation + AI Next Chapter Co-Writer */}
                <div className="mx-auto mt-8 max-w-3xl space-y-4 border-t border-[#D9A441]/25 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={chapterIndex === 0}
                      onClick={() => openNovelReader(activeNovel, chapterIndex - 1)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all duration-300 ease-out hover:translate-x-1 hover:border-[#D9A441]/60 hover:bg-[#D9A441]/12 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${readerPalette.border} ${readerPalette.text}`}
                    >
                      ← الفصل السابق
                    </button>
                    <button
                      type="button"
                      disabled={chapterIndex >= activeNovel.chapters.length - 1}
                      onClick={() => openNovelReader(activeNovel, chapterIndex + 1)}
                      className="rounded-xl bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] bg-[length:200%_100%] bg-left px-4 py-2 text-xs font-extrabold text-[#110D08] shadow-[0_6px_18px_rgba(217,164,65,0.28)] transition-all duration-300 ease-out hover:-translate-x-1 hover:bg-right hover:shadow-[0_8px_22px_rgba(245,214,138,0.4)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
                    >
                      الفصل التالي →
                    </button>
                  </div>

                  {/* AI Chapter Continuation Box */}
                  <div className="rounded-2xl border border-[#D9A441]/35 bg-[#D9A441]/10 p-4">
                    <p className={`mb-2 flex items-center gap-1.5 text-xs font-extrabold ${readerPalette.text}`}>
                      <Wand2 className="h-4 w-4 text-[#D9A441]" />
                      <span>أكمل الرواية بفصل جديد بالذكاء الاصطناعي (سُطور AI Co-Writer)</span>
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={chapterDirection}
                        onChange={(e) => setChapterDirection(e.target.value)}
                        placeholder="توجيه اختياري للفصل القادم (مثلاً: يكتشف البطل خيانة الحارس)..."
                        className="flex-1 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs text-white placeholder:text-white/50 focus:border-[#D9A441] focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={generatingChapter}
                        onClick={() => void handleGenerateNextChapter()}
                        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-extrabold text-[#110D08] hover:bg-[#E7B95D] disabled:opacity-60"
                      >
                        {generatingChapter ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        <span>{generatingChapter ? 'جاري التأليف...' : 'ولّد الفصل التالي'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* 3) AI NOVEL AUTHORING STUDIO & WORLD BIBLE */}
        {tab === 'studio' && (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="rounded-3xl border border-[#D9A441]/30 bg-[#17121F] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D9A441]/15 text-[#D9A441]">
                  <Feather className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    استوديو تأليف الروايات وموسوعة العالم (AI Co-Writer)
                  </h2>
                  <p className="text-xs text-[#B9AC99]">
                    ابْنِ عالم روايتك وشخصياتها، ودع الذكاء الاصطناعي يكتب معك الفصول بأسلوب أدبي رفيع ثم صدّرها ككتاب كامل.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#E7DEC8]">عنوان الرواية</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: عرش الرمال الذهبية"
                    className="w-full rounded-xl border border-white/12 bg-[#100D16] px-3.5 py-2.5 text-sm text-white placeholder:text-[#7F7364] focus:border-[#D9A441] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#E7DEC8]">اسم المؤلف</label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="اسمك أو لقبك الأدبي"
                    className="w-full rounded-xl border border-white/12 bg-[#100D16] px-3.5 py-2.5 text-sm text-white placeholder:text-[#7F7364] focus:border-[#D9A441] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold text-[#E7DEC8]">التصنيف الأدبي</label>
                <div className="flex flex-wrap gap-1.5">
                  {NOVEL_GENRES.filter((g): g is Exclude<NovelGenre, 'الكل'> => g !== 'الكل').map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNewGenre(g)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                        newGenre === g
                          ? 'bg-[#D9A441] text-[#110D08]'
                          : 'border border-white/10 bg-[#100D16] text-[#C8BCA8]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold text-[#E7DEC8]">
                  فكرة الرواية وحبكتها الأساسية
                </label>
                <textarea
                  rows={3}
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  placeholder="صف البطل، الصراع الرئيسي، والعالم الذي تدور فيه الأحداث..."
                  className="w-full rounded-xl border border-white/12 bg-[#100D16] px-3.5 py-2.5 text-sm text-white placeholder:text-[#7F7364] focus:border-[#D9A441] focus:outline-none"
                />
              </div>

              {/* World-Building Bible Entries */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#110E18] p-4">
                <p className="mb-2 text-xs font-extrabold text-[#F5D68A]">
                  موسوعة الشخصيات والعالم (World-Building Bible)
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="اسم الشخصية أو المكان (مثلاً: الأمير طارق)"
                    className="rounded-xl border border-white/10 bg-[#181322] px-3 py-2 text-xs text-white focus:border-[#D9A441] focus:outline-none sm:w-56"
                  />
                  <input
                    type="text"
                    value={newWorldDesc}
                    onChange={(e) => setNewWorldDesc(e.target.value)}
                    placeholder="الوصف المختصر أو القدرة الخاصة..."
                    className="flex-1 rounded-xl border border-white/10 bg-[#181322] px-3 py-2 text-xs text-white focus:border-[#D9A441] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newWorldName.trim() || !newWorldDesc.trim()) return;
                      setDraftWorldEntries((prev) => [
                        ...prev,
                        {
                          id: `wb_${Date.now()}`,
                          category: 'character',
                          name: newWorldName.trim(),
                          description: newWorldDesc.trim(),
                        },
                      ]);
                      setNewWorldName('');
                      setNewWorldDesc('');
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>

                {draftWorldEntries.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draftWorldEntries.map((entry) => (
                      <span
                        key={entry.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#D9A441]/30 bg-[#1D1624] px-3 py-1.5 text-xs text-[#F5E7CE]"
                      >
                        <strong>{entry.name}:</strong> {entry.description}
                        <button
                          type="button"
                          onClick={() =>
                            setDraftWorldEntries((prev) => prev.filter((x) => x.id !== entry.id))
                          }
                          aria-label="حذف"
                        >
                          <X className="h-3 w-3 text-[#B9AC99] hover:text-white" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={creatingNovelAi}
                  onClick={() => void handleCreateCustomNovel(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#D9A441] px-5 py-2.5 text-xs font-extrabold text-[#110D08] hover:bg-[#E7B95D] disabled:opacity-60"
                >
                  {creatingNovelAi ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>{creatingNovelAi ? 'جاري تأليف الفصل الأول...' : 'إنشاء الرواية وكتابة الفصل الأول بالذكاء'}</span>
                </button>
                <button
                  type="button"
                  disabled={creatingNovelAi}
                  onClick={() => void handleCreateCustomNovel(false)}
                  className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-bold text-white hover:border-[#D9A441]"
                >
                  إنشاء يدوي بدون ذكاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4) INTERACTIVE BRANCHING STORY MODE ("اصنع قرارك") */}
        {tab === 'interactive' && (
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="rounded-3xl border border-purple-400/30 bg-[#171222] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-white">
                    <Compass className="h-5 w-5 text-purple-300" />
                    <span>الرواية التفاعلية الحية — اصنع قرارك بيدك</span>
                  </h2>
                  <p className="mt-1 text-xs text-[#C4B5D6]">
                    كل قرار تختاره يغيّر مسار القصة ونهايتها مباشرة، ويمكنك حفظ المغامرة كرواية كاملة في مكتبتك!
                  </p>
                </div>
                {interactiveTurns.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSaveInteractiveAsNovel}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#D9A441] px-3.5 py-2 text-xs font-extrabold text-[#110D08]"
                  >
                    <BookMarked className="h-3.5 w-3.5" />
                    <span>حفظ كمغامرة في مكتبتي</span>
                  </button>
                )}
              </div>

              {interactiveTurns.length === 0 ? (
                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      'فانتازيا ومغامرة',
                      'خيال علمي وفضاء',
                      'غموض وتحقيق',
                      'إيسيكاي وأكشن',
                    ].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setInteractiveGenre(g)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                          interactiveGenre === g
                            ? 'bg-purple-500 text-white'
                            : 'border border-white/10 bg-[#100C1A] text-[#C4B5D6]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={interactivePremise}
                    onChange={(e) => setInteractivePremise(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#100C1A] p-3.5 text-sm text-white focus:border-purple-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={interactiveLoading}
                    onClick={() => void handleRunInteractiveStep()}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-purple-500 disabled:opacity-60"
                  >
                    {interactiveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span>{interactiveLoading ? 'جاري نسج المشهد الأول...' : 'ابدأ المغامرة التفاعلية الآن'}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {interactiveTurns.map((turn, idx) => (
                    <div
                      key={turn.id}
                      className="rounded-2xl border border-white/10 bg-[#100C19] p-5"
                    >
                      {turn.chosen && (
                        <p className="mb-2 text-xs font-bold text-purple-300">
                          قرارك في المشهد {idx}: «{turn.chosen}»
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-loose text-[#F3EDE2]">
                        {turn.narrative}
                      </p>

                      {idx === interactiveTurns.length - 1 && (
                        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                          <p className="text-xs font-extrabold text-[#F5D68A]">
                            ماذا ستفعل الآن؟ اختر مسارك:
                          </p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {turn.choices.map((ch, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                disabled={interactiveLoading}
                                onClick={() => void handleRunInteractiveStep(ch)}
                                className="rounded-xl border border-purple-400/35 bg-purple-500/12 p-3 text-right text-xs font-bold text-white transition-colors hover:border-purple-300 hover:bg-purple-500/25 disabled:opacity-50"
                              >
                                {cIdx + 1}. {ch}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {interactiveLoading && (
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>الراوي التفاعلي ينسج نتائج قرارك...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5) ALL WORLD NOVELS IN ARABIC (Open Library + Project Gutenberg + Google Books + AI Arabic Localization) */}
        {tab === 'world' && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-cyan-400/25 bg-gradient-to-l from-[#141A2C] via-[#151222] to-[#1B141A] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-500/12 px-3 py-1 text-[11px] font-extrabold text-cyan-200">
                    <Globe className="h-3.5 w-3.5" />
                    <span>موسوعة روايات العالم بالعربية · Open Library + Gutenberg + Google Books</span>
                  </div>
                  <h2 className="text-xl font-black text-white">
                    ابحث عن أي رواية في العالم بالعربية واقرأها مترجمة أو حوّلها لمانهوا فوراً!
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#C2B8CC]">
                    اكتب اسم أي رواية عالمية أو كاتب بالعربية أو الإنجليزية (مثل: هاري بوتر، الجريمة والعقاب، أجاثا كريستي، سولو ليفلينغ، البؤساء، كليلة ودمنة...) وسنجلبها لك بالعربية مع خيار القراءة المباشرة والرسم كـ مانهوا.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSearchWorldBooks();
                }}
                className="mt-4 flex flex-wrap gap-2"
              >
                <input
                  type="text"
                  value={worldQuery}
                  onChange={(e) => setWorldQuery(e.target.value)}
                  placeholder="ابحث بالعربية أو الإنجليزية (مثال: الجريمة والعقاب، هاري بوتر، شارلوك هولمز، ألف ليلة وليلة)..."
                  className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-[#0F0C17] px-4 py-2.5 text-sm text-white placeholder:text-[#8E8199] focus:border-[#D9A441] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={worldLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] px-5 py-2.5 text-xs font-black text-[#110D08] shadow-lg transition hover:brightness-110 disabled:opacity-60"
                >
                  {worldLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>بحث عالمي بالعربي</span>
                </button>
              </form>

              {/* Quick Global Categories */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {WORLD_AR_QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    disabled={worldLoading}
                    onClick={() => void handleSearchWorldBooks(cat.query, cat.label)}
                    className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-[#DDD4E6] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D9A441]/60 hover:bg-[#D9A441]/15 hover:text-white active:scale-95"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {worldLoading && (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#17121F] py-12 text-sm font-bold text-[#F5D68A]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جاري البحث في المكتبات العالمية وتعريب النتائج والنبذات...</span>
              </div>
            )}

            {!worldLoading && worldBooks.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {worldBooks.map((book) => {
                  const busy = translatingBookId === book.id;
                  return (
                    <article
                      key={book.id}
                      className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#17121F] p-4 transition-colors hover:border-[#D9A441]/55"
                    >
                      <div>
                        <div className="mb-3 flex gap-3">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={book.titleAr}
                              className="h-32 w-24 shrink-0 rounded-xl border border-white/15 object-cover bg-[#100D16]"
                            />
                          ) : (
                            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-xl border border-[#D9A441]/30 bg-gradient-to-br from-[#231936] to-[#120E1B] text-[#D9A441]">
                              <BookOpen className="h-8 w-8" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-[#D9A441]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#F5D68A]">
                                {book.genreAr}
                              </span>
                              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#C8BCA8]">
                                {book.source}
                              </span>
                            </div>
                            <h3 className="mt-1.5 line-clamp-2 text-sm font-black text-white">
                              {book.titleAr}
                            </h3>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#B9AC99]">
                              {book.authorAr} {book.year ? `· ${book.year}` : ''}
                            </p>
                            {book.titleOriginal && book.titleOriginal !== book.titleAr && (
                              <p className="mt-0.5 truncate text-[10px] text-[#8E8170]">
                                {book.titleOriginal}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-3 text-xs leading-relaxed text-[#C7BBAE]">
                          {book.synopsisAr}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
                        <button
                          type="button"
                          disabled={Boolean(translatingBookId)}
                          onClick={() => void handleOpenWorldBookInArabic(book, 'read')}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D9A441] px-3 py-2 text-xs font-extrabold text-[#110D08] transition hover:bg-[#E7B95D] disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5" />
                          )}
                          <span>{busy ? 'جاري التعريب...' : 'اقرأ بالعربي'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(translatingBookId)}
                          onClick={() => void handleOpenWorldBookInArabic(book, 'manhwa')}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/15 px-3 py-2 text-xs font-extrabold text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-white disabled:opacity-60"
                        >
                          <Palette className="h-3.5 w-3.5" />
                          <span>مانهوا</span>
                        </button>
                        <a
                          href={book.infoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="المصدر الأصلي"
                          className="rounded-xl border border-white/12 bg-white/[0.04] p-2 text-[#C8BCA8] hover:border-[#D9A441] hover:text-white"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {!worldLoading && worldBooks.length > 0 && worldHasMore && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-[#B9AC99]">
                  معروض <strong className="text-white">{worldBooks.length}</strong> رواية (صفحة {worldPage}) من أصل{' '}
                  <strong className="text-cyan-200">{worldTotalFound.toLocaleString('ar-EG')}</strong> رواية وكتاب عالمي
                </p>
                <button
                  type="button"
                  disabled={worldLoadingMore}
                  onClick={() => void handleSearchWorldBooks(worldQuery, activeWorldCategory, worldPage + 1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/50 bg-gradient-to-l from-cyan-500/20 via-blue-500/20 to-indigo-500/20 px-6 py-3 text-xs font-black text-white shadow-lg transition hover:border-cyan-300 hover:from-cyan-500/35 hover:to-indigo-500/35 disabled:opacity-60"
                >
                  {worldLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>
                    {worldLoadingMore
                      ? 'جاري تحميل المزيد...'
                      : `تحميل المزيد من الروايات العالمية (صفحة ${worldPage + 1})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6) PERSONAL SHELF & BOOKMARKS */}
        {tab === 'shelf' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              <h2 className="text-base font-black text-white">
                رواياتي المفضلة ومؤلفاتي ({state.favorites.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {allNovels
                  .filter((n) => state.favorites.includes(n.id) || n.isUserCreated)
                  .map((novel) => (
                    <div
                      key={novel.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#17121F] p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-white">{novel.title}</p>
                        <p className="text-xs text-[#B9AC99]">
                          {novel.author} · {novel.chapters.length} فصول
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openNovelReader(novel)}
                        className="shrink-0 rounded-xl bg-[#D9A441] px-3 py-1.5 text-xs font-extrabold text-[#110D08]"
                      >
                        اقرأ
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-3 lg:col-span-5">
              <h2 className="text-base font-black text-white">
                العلامات المرجعية المحفوظة ({state.bookmarks.length})
              </h2>
              {state.bookmarks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/12 p-6 text-center text-xs text-[#A89B89]">
                  لا توجد علامات مرجعية بعد — اضغط «علامة» أثناء القراءة لحفظ مكانك.
                </div>
              ) : (
                <div className="space-y-2">
                  {state.bookmarks.map((bm) => {
                    const targetNovel = allNovels.find((n) => n.id === bm.novelId);
                    const chIdx = targetNovel?.chapters.findIndex((c) => c.id === bm.chapterId) ?? 0;
                    return (
                      <button
                        key={`${bm.novelId}_${bm.chapterId}`}
                        type="button"
                        onClick={() => targetNovel && openNovelReader(targetNovel, Math.max(0, chIdx))}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#17121F] px-4 py-3 text-right text-xs font-bold text-[#F4EFE6] hover:border-[#D9A441]"
                      >
                        <span>{bm.label}</span>
                        <Bookmark className="h-3.5 w-3.5 shrink-0 text-[#D9A441]" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
