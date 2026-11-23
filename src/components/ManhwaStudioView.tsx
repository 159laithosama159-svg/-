import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import {
  MANHWA_STYLE_PRESETS,
  buildManhwaPrintableHtml,
  extractLocalCharacterBibleFallback,
  loadSavedManhwaEpisodes,
  parseUploadedBookFile,
  saveManhwaEpisodes,
  type ManhwaArtStyleId,
  type ManhwaCharacterBible,
  type ManhwaCharacterProfile,
  type ManhwaDialogueBubble,
  type ManhwaEpisode,
  type ManhwaPanel,
  type ParsedUploadedBook,
} from '../utils/manhwaEngine';
import {
  analyzeBookFileForManhwa,
  generateManhwaEpisode,
} from '../services/xtreamApi';
import type { NovelBook } from '../utils/novelsUtils';
import { MangaMeloReaderSection } from './MangaMeloReaderSection';
import { MANGAMELO_ART_POOL } from '../data/mangaMeloLibrary';

export interface ManhwaPrefillSource {
  bookTitle: string;
  chapterTitle: string;
  text: string;
  novelId?: string;
  chapterIndex?: number;
  nonce: number;
}

interface ManhwaStudioViewProps {
  novels: NovelBook[];
  prefillSource?: ManhwaPrefillSource | null;
  onSaveUploadedBookToLibrary?: (book: ParsedUploadedBook) => void;
  onToast: (msg: string) => void;
}

type SourceTab = 'upload' | 'library' | 'paste';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadSvgAsImage(svgMarkup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  });
}

async function renderEpisodeToVerticalPng(episode: ManhwaEpisode): Promise<string> {
  const stripWidth = 900;
  const headerH = 132;
  const gap = 26;
  const panelMetrics = episode.panels.map((p) => {
    const artH = p.layout === 'tall' ? 760 : p.layout === 'splash' ? 680 : 540;
    const narrationH = p.narrationBox ? 78 : 0;
    return { panel: p, artH, narrationH, totalH: artH + narrationH };
  });

  const totalHeight =
    headerH +
    panelMetrics.reduce((acc, m) => acc + m.totalH + gap, 40);

  const canvas = document.createElement('canvas');
  canvas.width = stripWidth;
  canvas.height = Math.min(totalHeight, 14000);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Deep Webtoon Canvas Background
  ctx.fillStyle = '#09080F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Episode Banner Header
  const [c0, c1, c2] = episode.extractedPalette;
  const headerGrad = ctx.createLinearGradient(0, 0, stripWidth, headerH);
  headerGrad.addColorStop(0, c0);
  headerGrad.addColorStop(0.55, c1);
  headerGrad.addColorStop(1, c0);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, stripWidth, headerH);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F5D68A';
  ctx.font = '800 32px Cairo, Tajawal, sans-serif';
  ctx.fillText(episode.bookTitle, stripWidth / 2, 58);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 18px Cairo, Tajawal, sans-serif';
  ctx.fillText(
    `${episode.chapterTitle} · استوديو سُطور للمانهوا`,
    stripWidth / 2,
    96
  );

  ctx.fillStyle = c2;
  ctx.fillRect(0, headerH - 4, stripWidth, 4);

  let cursorY = headerH + 22;

  for (const m of panelMetrics) {
    if (cursorY + m.totalH > canvas.height) break;
    const { panel, artH, narrationH } = m;

    // Narration box above panel
    if (panel.narrationBox && narrationH > 0) {
      ctx.fillStyle = '#FAF3E0';
      ctx.fillRect(24, cursorY, stripWidth - 48, narrationH);
      ctx.strokeStyle = '#1C1610';
      ctx.lineWidth = 3;
      ctx.strokeRect(24, cursorY, stripWidth - 48, narrationH);

      ctx.fillStyle = '#1A140B';
      ctx.font = '700 18px Cairo, Tajawal, sans-serif';
      ctx.textAlign = 'right';
      const narLines = wrapCanvasText(ctx, panel.narrationBox, stripWidth - 96).slice(0, 2);
      narLines.forEach((line, idx) => {
        ctx.fillText(line, stripWidth - 44, cursorY + 32 + idx * 28);
      });
      cursorY += narrationH;
    }

    // Panel SVG Art
    try {
      const img = await loadSvgAsImage(panel.svgArt);
      ctx.drawImage(img, 24, cursorY, stripWidth - 48, artH);
    } catch {
      ctx.fillStyle = panel.palette[0];
      ctx.fillRect(24, cursorY, stripWidth - 48, artH);
    }

    // Outer Ink Border
    ctx.strokeStyle = '#FFFFFF33';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, cursorY, stripWidth - 48, artH);

    // Dialogue Bubbles
    for (const b of panel.dialogues) {
      const bubbleW = 330;
      ctx.font = '800 16px Cairo, Tajawal, sans-serif';
      const lines = wrapCanvasText(ctx, b.text, bubbleW - 34).slice(0, 4);
      const bubbleH = Math.max(58, (b.speaker ? 24 : 0) + lines.length * 24 + 24);

      const isRight = b.position === 'top_right' || b.position === 'bottom_right';
      const isTop = b.position === 'top_right' || b.position === 'top_left';
      const bx = isRight ? stripWidth - 24 - bubbleW - 22 : 24 + 22;
      const by = isTop ? cursorY + 22 : cursorY + artH - bubbleH - 22;

      const isShout = b.bubbleType === 'shout';
      const isThought = b.bubbleType === 'thought';

      ctx.save();
      drawRoundedRect(ctx, bx, by, bubbleW, bubbleH, isThought ? 26 : 16);
      ctx.fillStyle = isShout ? '#FEF08A' : b.bubbleType === 'whisper' ? '#F8FAFCee' : '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = isShout ? 4 : 2.5;
      ctx.strokeStyle = isShout ? '#DC2626' : isThought ? '#475569' : '#111111';
      if (isThought) ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.restore();

      ctx.textAlign = 'right';
      let ty = by + 26;
      if (b.speaker) {
        ctx.fillStyle = isShout ? '#B91C1C' : '#475569';
        ctx.font = '800 13px Cairo, Tajawal, sans-serif';
        ctx.fillText(b.speaker, bx + bubbleW - 16, ty - 4);
        ty += 22;
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = '800 16px Cairo, Tajawal, sans-serif';
      lines.forEach((ln) => {
        ctx.fillText(ln, bx + bubbleW - 16, ty);
        ty += 24;
      });
    }

    // Comic SFX
    if (panel.sfxText) {
      ctx.save();
      ctx.translate(stripWidth / 2, cursorY + artH - 42);
      ctx.rotate(-0.08);
      ctx.textAlign = 'center';
      ctx.font = '900 34px Cairo, Tajawal, sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#09090B';
      ctx.strokeText(panel.sfxText, 0, 0);
      ctx.fillStyle = '#FACC15';
      ctx.fillText(panel.sfxText, 0, 0);
      ctx.restore();
    }

    cursorY += artH + gap;
  }

  return canvas.toDataURL('image/png');
}

function getBubbleClasses(b: ManhwaDialogueBubble): string {
  const pos =
    b.position === 'top_right'
      ? 'top-3 right-3 sm:top-5 sm:right-5'
      : b.position === 'top_left'
      ? 'top-3 left-3 sm:top-5 sm:left-5'
      : b.position === 'bottom_right'
      ? 'bottom-12 right-3 sm:bottom-14 sm:right-5'
      : 'bottom-12 left-3 sm:bottom-14 sm:left-5';

  if (b.bubbleType === 'shout') {
    return `${pos} border-[3px] border-red-600 bg-[#FEF08A] text-[#111] rounded-2xl shadow-[0_10px_28px_rgba(220,38,38,0.45)]`;
  }
  if (b.bubbleType === 'thought') {
    return `${pos} border-2 border-dashed border-slate-500 bg-white/95 text-[#1E293B] rounded-[28px] shadow-[0_10px_24px_rgba(0,0,0,0.4)]`;
  }
  if (b.bubbleType === 'whisper') {
    return `${pos} border border-slate-400 bg-white/85 text-[#334155] italic rounded-2xl backdrop-blur-sm shadow-lg`;
  }
  return `${pos} border-[2.5px] border-[#111] bg-white text-[#0F172A] rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.48)]`;
}

export function ManhwaStudioView({
  novels,
  prefillSource,
  onSaveUploadedBookToLibrary,
  onToast,
}: ManhwaStudioViewProps) {
  const [workspaceTab, setWorkspaceTab] = useState<'mangamelo' | 'studio'>(() =>
    prefillSource ? 'studio' : 'mangamelo'
  );
  const [useHdMangaArt, setUseHdMangaArt] = useState(true);
  const [sourceTab, setSourceTab] = useState<SourceTab>('upload');

  // Uploaded Book State
  const [uploadedBook, setUploadedBook] = useState<ParsedUploadedBook | null>(null);
  const [uploadedChapterIdx, setUploadedChapterIdx] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Library Selection State
  const [selectedNovelId, setSelectedNovelId] = useState<string>(
    novels[0]?.id || ''
  );
  const [selectedLibraryChapterIdx, setSelectedLibraryChapterIdx] = useState(0);

  // Paste Text State
  const [pasteBookTitle, setPasteBookTitle] = useState('ملحمة صيّاد الظلال');
  const [pasteChapterTitle, setPasteChapterTitle] = useState('الحلقة 1: البوابة المزدوجة');
  const [pasteText, setPasteText] = useState(
    'توقف سيف الدين أمام البوابة الحجرية العملاقة التي تتوهج بضوء أزرق بارد. همس خلفه القائد بصوت مرتجف: "إنها زنزانة مزدوجة... لا أحد يخرج منها حياً!" رفع سيف الدين خنجره المكسور، وفجأة دوّى صوت رعد معدني وظهرت أمام عينيه نافذة ضوئية زرقاء كُتب عليها: [هل تقبل أن تصبح اللاعب؟]. ابتسم رغم جراحه وقال بحزم: "نعم... لن أتراجع بعد اليوم!"'
  );

  // Art Style + Reference Image State
  const [styleId, setStyleId] = useState<ManhwaArtStyleId>('solo_manhwa');
  const [customStyleNotes, setCustomStyleNotes] = useState('');
  const [panelCount, setPanelCount] = useState<number>(6);
  const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
  const [refImagePayload, setRefImagePayload] = useState<{
    mimeType: string;
    data: string;
    name: string;
  } | null>(null);

  // File-First Character & World Bible State (100% Faithful to Uploaded Book)
  const [characterBible, setCharacterBible] = useState<ManhwaCharacterBible | null>(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [strictFileMode, setStrictFileMode] = useState(true);
  const [editingCharId, setEditingCharId] = useState<string | null>(null);

  // Generation & Episodes State
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [savedEpisodes, setSavedEpisodes] = useState<ManhwaEpisode[]>(() =>
    loadSavedManhwaEpisodes()
  );
  const [activeEpisode, setActiveEpisode] = useState<ManhwaEpisode | null>(() => {
    const existing = loadSavedManhwaEpisodes();
    return existing[0] || null;
  });

  // Webtoon Reader Extras: Auto-Scroll, Audio Drama, PNG Export, Director Notes
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [audioDramaPlaying, setAudioDramaPlaying] = useState(false);
  const [speakingPanelIdx, setSpeakingPanelIdx] = useState<number | null>(null);
  const [exportingPng, setExportingPng] = useState(false);
  const [showDirectorNotes, setShowDirectorNotes] = useState(false);

  const readerTopRef = useRef<HTMLDivElement | null>(null);
  const bookFileInputRef = useRef<HTMLInputElement | null>(null);
  const refImageInputRef = useRef<HTMLInputElement | null>(null);
  const audioDramaAbortRef = useRef<boolean>(false);

  // Sync saved gallery to localStorage
  useEffect(() => {
    saveManhwaEpisodes(savedEpisodes);
  }, [savedEpisodes]);

  // Apply external prefill (from Reader or World Novels tab)
  useEffect(() => {
    if (!prefillSource) return;
    setWorkspaceTab('studio');
    if (prefillSource.novelId) {
      setSourceTab('library');
      setSelectedNovelId(prefillSource.novelId);
      setSelectedLibraryChapterIdx(prefillSource.chapterIndex ?? 0);
    } else {
      setSourceTab('paste');
      setPasteBookTitle(prefillSource.bookTitle);
      setPasteChapterTitle(prefillSource.chapterTitle);
      setPasteText(prefillSource.text);
    }
  }, [prefillSource]);

  // Keep selectedNovelId valid
  const selectedLibraryNovel = useMemo(
    () => novels.find((n) => n.id === selectedNovelId) || novels[0],
    [novels, selectedNovelId]
  );

  // Smooth Webtoon Auto-Scroll Engine
  useEffect(() => {
    if (!autoScrolling) return;
    const pxPerTick = scrollSpeed === 'slow' ? 1.2 : scrollSpeed === 'medium' ? 2.4 : 4.2;
    let frameId = 0;
    const step = () => {
      window.scrollBy({ top: pxPerTick, behavior: 'auto' });
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (atBottom) {
        setAutoScrolling(false);
        return;
      }
      frameId = window.requestAnimationFrame(step);
    };
    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [autoScrolling, scrollSpeed]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      audioDramaAbortRef.current = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const runFullFileCharacterAnalysis = async (
    bookTitle: string,
    fullText: string,
    silent = false
  ) => {
    const clean = (fullText || '').trim();
    if (clean.length < 25) {
      if (!silent) {
        onToast('يرجى رفع ملف أو لصق نص (25 حرفاً على الأقل) لاستخراج الشخصيات والوصف منه.');
      }
      return;
    }

    // Show instant local extraction right away so the user sees results immediately!
    const instantLocal = extractLocalCharacterBibleFallback(bookTitle, clean);
    setCharacterBible(instantLocal);
    setAnalyzingFile(true);

    try {
      const deepBible = await analyzeBookFileForManhwa({
        bookTitle,
        fullText: clean,
      });
      setCharacterBible(deepBible);
      setEditingCharId(null);
      if (!silent) {
        onToast(
          deepBible.characters.length > 0
            ? `تم مسح الملف بالكامل واستخراج ${deepBible.characters.length} شخصيات بأوصافها وألوانها الحقيقية من الملف!`
            : 'تم تحليل عالم وأجواء الملف بالكامل وجاهز للرسم بالالتزام التام بالنص!'
        );
      }
    } catch {
      // Keep the instant local extraction cleanly
      if (!silent) {
        onToast(
          instantLocal.characters.length > 0
            ? `تم استخراج ${instantLocal.characters.length} شخصيات محلياً من وصف الملف.`
            : 'تم تجهيز وصف العالم من الملف — يمكنك إضافة شخصيات يدوياً أو البدء بالرسم مباشرة.'
        );
      }
    } finally {
      setAnalyzingFile(false);
    }
  };

  const handleBookFileSelected = async (file: File | null) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = parseUploadedBookFile(file.name, raw);
      if (parsed.chapters.length === 0) {
        onToast('لم يُعثر على نص مقروء داخل الملف — يرجى رفع ملف .txt أو .md أو .html أو .json.');
        return;
      }
      setUploadedBook(parsed);
      const firstStoryChapterIdx =
        parsed.chapters.length > 1 &&
        /(?:دليل\s+الشخصيات|الشخصيات|قائمة\s+الشخصيات|وصف\s+الشخصيات|تعريف\s+الشخصيات|characters|character\s+sheet|cast)/i.test(
          parsed.chapters[0].title
        )
          ? 1
          : 0;
      setUploadedChapterIdx(firstStoryChapterIdx);
      setSourceTab('upload');
      onToast(
        `تم تحليل الكتاب «${parsed.title}» (${parsed.chapters.length} فصول) — جاري استخراج وصف الشخصيات والعالم من الملف...`
      );
      void runFullFileCharacterAnalysis(parsed.title, parsed.rawFullText);
    } catch {
      onToast('تعذّر قراءة ملف الكتاب. تأكد أنه ملف نصي بترميز UTF-8.');
    }
  };

  const handleUpdateCharacter = (
    id: string,
    patch: Partial<ManhwaCharacterProfile>
  ) => {
    setCharacterBible((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      };
    });
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacterBible((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.filter((c) => c.id !== id),
      };
    });
    if (editingCharId === id) setEditingCharId(null);
  };

  const handleAddBlankCharacter = () => {
    const newId = `char_custom_${Date.now().toString(36)}`;
    const newChar: ManhwaCharacterProfile = {
      id: newId,
      name: 'شخصية جديدة',
      role: 'شخصية رئيسية',
      appearanceAr: 'شعر أسود، عيون زرقاء حادة',
      outfitAr: 'معطف داكن طويل',
      weaponOrPropAr: '',
      auraOrPowerAr: '',
      hairHex: '#141720',
      eyeHex: '#38BDF8',
      outfitHex: '#1E293B',
      skinHex: '#EED2BC',
      auraHex: '#A855F7',
    };
    setCharacterBible((prev) => {
      const src = resolveActiveSource();
      if (!prev) {
        return {
          bookTitle: src?.bookTitle || 'روايتي',
          worldSettingAr: 'بيئة مطابقة لوصف الملف.',
          atmosphereAr: 'أجواء درامية مطابقة للنص.',
          characters: [newChar],
          extractedFromFullFile: true,
          sourceCharCount: src?.text.length || 0,
        };
      }
      return {
        ...prev,
        characters: [...prev.characters, newChar],
      };
    });
    setEditingCharId(newId);
  };

  const handleReferenceImageSelected = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('يرجى اختيار ملف صورة صالح (PNG / JPG / WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) return;
      const base64 = dataUrl.slice(commaIdx + 1);
      setRefImagePreview(dataUrl);
      setRefImagePayload({
        mimeType: file.type || 'image/png',
        data: base64,
        name: file.name,
      });
      setStyleId('custom_reference');
      onToast(`تم اعتماد الصورة المرجعية «${file.name}» لاستنساخ أسلوب رسمها في كل لوحات المانهوا!`);
    };
    reader.readAsDataURL(file);
  };

  const resolveActiveSource = (overrideChapterIdx?: number): {
    bookTitle: string;
    chapterTitle: string;
    text: string;
    hasNextChapter: boolean;
    nextChapterIdx?: number;
  } | null => {
    if (sourceTab === 'upload' && uploadedBook) {
      const idx = overrideChapterIdx ?? uploadedChapterIdx;
      const ch = uploadedBook.chapters[idx];
      if (!ch) return null;
      return {
        bookTitle: uploadedBook.title,
        chapterTitle: ch.title,
        text: ch.content,
        hasNextChapter: idx + 1 < uploadedBook.chapters.length,
        nextChapterIdx: idx + 1,
      };
    }
    if (sourceTab === 'library' && selectedLibraryNovel) {
      const idx = overrideChapterIdx ?? selectedLibraryChapterIdx;
      const ch = selectedLibraryNovel.chapters[idx] || selectedLibraryNovel.chapters[0];
      if (!ch) return null;
      return {
        bookTitle: selectedLibraryNovel.title,
        chapterTitle: `الفصل ${ch.number}: ${ch.title}`,
        text: ch.content,
        hasNextChapter: idx + 1 < selectedLibraryNovel.chapters.length,
        nextChapterIdx: idx + 1,
      };
    }
    if (pasteText.trim().length >= 25) {
      return {
        bookTitle: pasteBookTitle.trim() || 'روايتي المصوّرة',
        chapterTitle: pasteChapterTitle.trim() || 'الحلقة الأولى',
        text: pasteText.trim(),
        hasNextChapter: false,
      };
    }
    return null;
  };

  const handleGenerateManhwa = async (overrideChapterIdx?: number) => {
    if (generating) return;
    const src = resolveActiveSource(overrideChapterIdx);
    if (!src) {
      onToast('اختر ملف كتاب أو رواية من المكتبة أو الصق نصاً (25 حرفاً على الأقل) لبدء الرسم.');
      return;
    }

    if (overrideChapterIdx !== undefined) {
      if (sourceTab === 'upload') setUploadedChapterIdx(overrideChapterIdx);
      if (sourceTab === 'library') setSelectedLibraryChapterIdx(overrideChapterIdx);
    }

    setGenerating(true);
    setAutoScrolling(false);
    stopAudioDrama();

    setGenerationStep(
      characterBible && characterBible.characters.length > 0
        ? `1/3 · تطبيق دليل شخصيات الملف (${characterBible.characters.length} شخصيات بأوصافها وألوانها الحقيقية)...`
        : refImagePayload
        ? '1/3 · تحليل أسلوب الرسم والألوان والإضاءة من صورتك المرجعية بالرؤية الذكية...'
        : '1/3 · تفكيك أحداث الرواية واستخراج المشاهد الدرامية والحوارات...'
    );

    const stepTimer1 = window.setTimeout(() => {
      setGenerationStep('2/3 · إخراج زوايا الكاميرا وكتابة فقاعات الكلام والمؤثرات الصوتية وفق النص...');
    }, 2600);
    const stepTimer2 = window.setTimeout(() => {
      setGenerationStep(`3/3 · رسم ${panelCount} لوحات مانهوا ملتزمة بوصف الملف وتنسيق شريط الويبتون...`);
    }, 6200);

    try {
      // Ensure we always have a character bible extracted from the active text if strictFileMode is ON
      const bibleForGen =
        characterBible ||
        (strictFileMode
          ? extractLocalCharacterBibleFallback(src.bookTitle, src.text)
          : null);

      const episode = await generateManhwaEpisode({
        bookTitle: src.bookTitle,
        chapterTitle: src.chapterTitle,
        text: src.text.slice(0, 8500),
        styleId: refImagePayload ? 'custom_reference' : styleId,
        customStyleNotes: customStyleNotes.trim() || undefined,
        panelCount,
        referenceImage: refImagePayload
          ? { mimeType: refImagePayload.mimeType, data: refImagePayload.data }
          : null,
        characterBible: bibleForGen,
        strictFileMode,
      });

      setActiveEpisode(episode);
      setSavedEpisodes((prev) => [episode, ...prev.filter((e) => e.id !== episode.id)].slice(0, 12));
      onToast(
        `تم رسم حلقة المانهوا «${episode.bookTitle}» (${episode.panels.length} لوحات كاملة بالرسم والحوارات)!`
      );
      window.setTimeout(() => {
        readerTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر رسم حلقة المانهوا حالياً.');
    } finally {
      window.clearTimeout(stepTimer1);
      window.clearTimeout(stepTimer2);
      setGenerating(false);
      setGenerationStep('');
    }
  };

  const stopAudioDrama = () => {
    audioDramaAbortRef.current = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAudioDramaPlaying(false);
    setSpeakingPanelIdx(null);
  };

  const handleToggleAudioDrama = () => {
    if (!activeEpisode) return;
    if (audioDramaPlaying) {
      stopAudioDrama();
      return;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onToast('متصفحك لا يدعم القراءة الصوتية المباشرة للدراما.');
      return;
    }

    audioDramaAbortRef.current = false;
    setAudioDramaPlaying(true);
    window.speechSynthesis.cancel();

    const speakPanel = (idx: number) => {
      if (audioDramaAbortRef.current || idx >= activeEpisode.panels.length) {
        setAudioDramaPlaying(false);
        setSpeakingPanelIdx(null);
        return;
      }
      setSpeakingPanelIdx(idx);
      const panelEl = document.getElementById(`manhwa-panel-${idx}`);
      panelEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const p = activeEpisode.panels[idx];
      const parts: string[] = [];
      if (p.narrationBox) parts.push(p.narrationBox);
      for (const d of p.dialogues) {
        parts.push(d.speaker ? `${d.speaker}: ${d.text}` : d.text);
      }
      if (parts.length === 0) parts.push(p.sceneDescriptionAr || p.title);

      const utter = new SpeechSynthesisUtterance(parts.join('. '));
      utter.lang = 'ar-SA';
      utter.rate = 0.98;
      utter.onend = () => {
        if (!audioDramaAbortRef.current) {
          speakPanel(idx + 1);
        }
      };
      utter.onerror = () => {
        setAudioDramaPlaying(false);
        setSpeakingPanelIdx(null);
      };
      window.speechSynthesis.speak(utter);
    };

    speakPanel(0);
  };

  const handleDownloadVerticalPng = async () => {
    if (!activeEpisode || exportingPng) return;
    setExportingPng(true);
    try {
      const pngUrl = await renderEpisodeToVerticalPng(activeEpisode);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${activeEpisode.bookTitle.replace(/[^\w\u0600-\u06FF-]+/g, '_')}_manhwa.png`;
      a.click();
      onToast('تم تنزيل شريط المانهوا الكامل بجودة عالية HD PNG!');
    } catch {
      onToast('تعذّر تصدير الصورة الطويلة — يمكنك تحميل نسخة HTML الفاخرة فوراً.');
    } finally {
      setExportingPng(false);
    }
  };

  const handleDownloadHtmlBook = () => {
    if (!activeEpisode) return;
    const html = buildManhwaPrintableHtml(activeEpisode);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeEpisode.bookTitle.replace(/[^\w\u0600-\u06FF-]+/g, '_')}_webtoon.html`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('تم تحميل حلقة المانهوا كملف Webtoon HTML جاهز للطباعة والقراءة دون إنترنت!');
  };

  const activeSourceMeta = resolveActiveSource();

  return (
    <div className="space-y-6">
      {/* TOP WORKSPACE SWITCHER: MangaMelo Instant HD Library vs AI Book-to-Manhwa Studio */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-400/25 bg-[#140F20] p-2.5 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="manhwa-tab-mangamelo"
            onClick={() => setWorkspaceTab('mangamelo')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
              workspaceTab === 'mangamelo'
                ? 'bg-gradient-to-l from-fuchsia-600 via-purple-600 to-indigo-600 text-white shadow-[0_6px_22px_rgba(192,38,211,0.4)]'
                : 'border border-white/10 bg-white/[0.04] text-[#D7CBE6] hover:border-fuchsia-400/40 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>مكتبة مانجاميلو HD (قراءة فورية)</span>
          </button>
          <button
            type="button"
            data-testid="manhwa-tab-studio"
            onClick={() => setWorkspaceTab('studio')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
              workspaceTab === 'studio'
                ? 'bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] text-[#110D08] shadow-[0_6px_22px_rgba(217,164,65,0.38)]'
                : 'border border-white/10 bg-white/[0.04] text-[#D7CBE6] hover:border-[#D9A441]/50 hover:text-white'
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>استوديو رسم روايتك أو كتابك بالذكاء</span>
          </button>
        </div>
        <span className="px-2 text-[11px] font-bold text-[#B8ABC7]">
          رسوم مانجاميلو كاملة الملامح · تمرير عمودي متصل
        </span>
      </div>

      {workspaceTab === 'mangamelo' ? (
        <MangaMeloReaderSection
          onOpenAiStudioTab={() => setWorkspaceTab('studio')}
          onToast={onToast}
        />
      ) : (
      <>
      {/* HERO & CONFIGURATION WORKBENCH */}
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-400/30 bg-gradient-to-l from-[#1C122D] via-[#130E1F] to-[#1D1318] p-5 sm:p-7 shadow-2xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-1 text-xs font-extrabold text-fuchsia-200">
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              <span>استوديو تحويل الروايات والكتب إلى مانهوا ومانغا كاملة بالذكاء الاصطناعي</span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              ارفع ملف كتابك أو روايتك — نقرأ وصف الشخصيات والأحداث 100% من الملف ونرسمه كـ مانهوا!
            </h1>
            <p className="max-w-3xl text-xs leading-relaxed text-[#CFC4DC] sm:text-sm">
              عند رفع ملف الكتاب، نقوم بمسح الملف بالكامل لاستخراج <strong className="text-[#F5D68A]">دليل الشخصيات وأوصافها الحقيقية</strong> (لون الشعر، العيون، الملابس، الأسلحة، الهالة، وبيئة العالم) والالتزام بها حرفياً في كل لوحة وكل فصل — مع دعم صورة مرجعية لأسلوب الرسم وتصدير PNG و HTML.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* STEP 1: BOOK / NOVEL INPUT */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0E0B15]/80 p-4 sm:p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-black text-[#F5D68A]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#D9A441] text-xs font-black text-[#120D08]">
                  1
                </span>
                <span>مصدر الرواية أو ملف الكتاب</span>
              </h2>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'upload', label: 'رفع ملف كتاب', icon: Upload },
                    { id: 'library', label: `مكتبة سُطور (${novels.length})`, icon: BookOpen },
                    { id: 'paste', label: 'لصق نص مباشر', icon: FileText },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSourceTab(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-300 active:scale-95 ${
                        sourceTab === t.id
                          ? 'border-fuchsia-400/70 bg-gradient-to-l from-fuchsia-600 to-purple-600 text-white shadow-[0_4px_14px_rgba(192,38,211,0.35)]'
                          : 'border-white/10 bg-white/[0.04] text-[#C8BCA8] hover:-translate-y-0.5 hover:border-fuchsia-400/40 hover:text-white'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1A: UPLOAD BOOK FILE */}
            {sourceTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={bookFileInputRef}
                  type="file"
                  accept=".txt,.md,.html,.htm,.json,text/plain,text/markdown,text/html,application/json"
                  className="hidden"
                  onChange={(e) => {
                    void handleBookFileSelected(e.target.files?.[0] || null);
                    e.target.value = '';
                  }}
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    void handleBookFileSelected(e.dataTransfer.files?.[0] || null);
                  }}
                  onClick={() => bookFileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') bookFileInputRef.current?.click();
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-all duration-300 ${
                    isDraggingFile
                      ? 'border-fuchsia-400 bg-fuchsia-500/15 scale-[1.01]'
                      : 'border-[#D9A441]/35 bg-[#151020] hover:border-fuchsia-400/70 hover:bg-[#1A1328]'
                  }`}
                >
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-amber-500/25 text-[#F5D68A]">
                    <Upload className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-extrabold text-white">
                    اسحب ملف الكتاب أو الرواية هنا، أو اضغط للاختيار من جهازك
                  </p>
                  <p className="mt-1 text-xs text-[#A89B89]">
                    يدعم ملفات <span className="font-mono text-[#F5D68A]">.TXT · .MD · .HTML · .JSON</span> ويُقسّمها فصولاً عربية تلقائياً
                  </p>
                </div>

                {uploadedBook && (
                  <div className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-emerald-200">
                          الكتاب المحمّل: {uploadedBook.title}
                        </p>
                        <p className="text-xs text-emerald-100/80">
                          {uploadedBook.chapters.length} فصول مكتشفة ·{' '}
                          {uploadedBook.totalWords.toLocaleString('ar-EG')} كلمة
                        </p>
                      </div>
                      {onSaveUploadedBookToLibrary && (
                        <button
                          type="button"
                          onClick={() => onSaveUploadedBookToLibrary(uploadedBook)}
                          className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/35"
                        >
                          حفظ الكتاب بمكتبة سُطور
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-white/90">
                        اختر الفصل الذي تريد رسمه الآن كحلقة مانهوا:
                      </label>
                      <select
                        value={uploadedChapterIdx}
                        onChange={(e) => setUploadedChapterIdx(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/15 bg-[#0D0A14] px-3 py-2 text-xs font-bold text-white focus:border-fuchsia-400 focus:outline-none"
                      >
                        {uploadedBook.chapters.map((ch) => (
                          <option key={ch.index} value={ch.index}>
                            {ch.index + 1}. {ch.title} ({ch.wordCount} كلمة)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1B: PICK FROM SUTOOR LIBRARY */}
            {sourceTab === 'library' && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#E7DEC8]">
                      اختر الرواية ({novels.length} رواية عربية وعالمية)
                    </label>
                    <select
                      value={selectedLibraryNovel?.id || ''}
                      onChange={(e) => {
                        setSelectedNovelId(e.target.value);
                        setSelectedLibraryChapterIdx(0);
                      }}
                      className="w-full rounded-xl border border-white/15 bg-[#151020] px-3 py-2.5 text-xs font-bold text-white focus:border-fuchsia-400 focus:outline-none"
                    >
                      {novels.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title} — {n.genre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#E7DEC8]">
                      اختر الفصل
                    </label>
                    <select
                      value={selectedLibraryChapterIdx}
                      onChange={(e) => setSelectedLibraryChapterIdx(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/15 bg-[#151020] px-3 py-2.5 text-xs font-bold text-white focus:border-fuchsia-400 focus:outline-none"
                    >
                      {(selectedLibraryNovel?.chapters || []).map((ch, idx) => (
                        <option key={ch.id} value={idx}>
                          الفصل {ch.number}: {ch.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedLibraryNovel?.chapters[selectedLibraryChapterIdx] && (
                  <div className="rounded-xl border border-white/10 bg-[#140F1E] p-3 text-xs leading-relaxed text-[#C8BCA8]">
                    <p className="mb-1 font-bold text-[#F5D68A]">مقتطف الفصل المختار:</p>
                    <p className="line-clamp-3">
                      {selectedLibraryNovel.chapters[selectedLibraryChapterIdx].content}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 1C: PASTE DIRECT TEXT */}
            {sourceTab === 'paste' && (
              <div className="space-y-3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    value={pasteBookTitle}
                    onChange={(e) => setPasteBookTitle(e.target.value)}
                    placeholder="عنوان الرواية..."
                    className="rounded-xl border border-white/12 bg-[#151020] px-3 py-2 text-xs text-white focus:border-fuchsia-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={pasteChapterTitle}
                    onChange={(e) => setPasteChapterTitle(e.target.value)}
                    placeholder="عنوان الفصل أو الحلقة..."
                    className="rounded-xl border border-white/12 bg-[#151020] px-3 py-2 text-xs text-white focus:border-fuchsia-400 focus:outline-none"
                  />
                </div>
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="الصق هنا أحداث الرواية أو المشهد الذي تريد تحويله إلى مانهوا بالصور والحوارات..."
                  className="w-full rounded-xl border border-white/12 bg-[#151020] p-3 text-xs leading-relaxed text-white placeholder:text-[#7E728A] focus:border-fuchsia-400 focus:outline-none"
                />
              </div>
            )}

            {/* 1D: FILE-FIRST CHARACTER & WORLD BIBLE PANEL */}
            <div className="space-y-3 rounded-2xl border border-[#D9A441]/30 bg-gradient-to-l from-[#181227] via-[#130E1F] to-[#171219] p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D9A441]/20 text-[#F5D68A]">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#F5D68A]">
                      دليل الشخصيات والعالم من الملف
                      {characterBible ? ` (${characterBible.characters.length} شخصيات)` : ''}
                    </h3>
                    <p className="text-[11px] text-[#B9AC99]">
                      كل شخصية تُرسم حرفياً حسب وصفها المكتوب في ملفك عبر جميع الفصول
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStrictFileMode((v) => !v)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                      strictFileMode
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                        : 'border-white/15 bg-white/[0.04] text-[#B9AC99]'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>{strictFileMode ? 'التزام 100% بالملف' : 'وضع مرن'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={analyzingFile}
                    onClick={() => {
                      if (sourceTab === 'upload' && uploadedBook) {
                        void runFullFileCharacterAnalysis(
                          uploadedBook.title,
                          uploadedBook.rawFullText
                        );
                      } else if (sourceTab === 'library' && selectedLibraryNovel) {
                        const fullNovelText = selectedLibraryNovel.chapters
                          .map((c) => `${c.title}\n${c.content}`)
                          .join('\n\n');
                        void runFullFileCharacterAnalysis(
                          selectedLibraryNovel.title,
                          fullNovelText
                        );
                      } else {
                        void runFullFileCharacterAnalysis(
                          pasteBookTitle || 'روايتي',
                          pasteText
                        );
                      }
                    }}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#D9A441]/50 bg-[#D9A441]/15 px-2.5 py-1.5 text-[11px] font-extrabold text-[#F5D68A] transition hover:bg-[#D9A441] hover:text-[#120D08] disabled:opacity-60"
                  >
                    {analyzingFile ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {analyzingFile
                        ? 'جاري استخراج الشخصيات...'
                        : characterBible
                        ? 'إعادة مسح الملف'
                        : 'استخراج الشخصيات من النص'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddBlankCharacter}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:border-fuchsia-400/60"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>إضافة شخصية</span>
                  </button>
                </div>
              </div>

              {analyzingFile && (
                <div className="flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-bold text-fuchsia-200">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>
                    جاري قراءة كامل الملف واستخراج أوصاف الشخصيات (الشعر، العيون، الملابس، الأسلحة، والأجواء)...
                  </span>
                </div>
              )}

              {characterBible && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0F0C18] px-3 py-2 text-[11px] text-[#D8CCE4]">
                    <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>
                      <strong className="text-[#F5D68A]">عالم الملف:</strong>{' '}
                      {characterBible.worldSettingAr}
                    </span>
                    <span className="text-white/25">|</span>
                    <span>
                      <strong className="text-fuchsia-300">الأجواء:</strong>{' '}
                      {characterBible.atmosphereAr}
                    </span>
                  </div>

                  {characterBible.characters.length > 0 ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {characterBible.characters.map((ch) => {
                        const isEditing = editingCharId === ch.id;
                        return (
                          <div
                            key={ch.id}
                            className="rounded-xl border border-white/12 bg-[#120E1D] p-3 text-xs transition hover:border-[#D9A441]/45"
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    value={ch.name}
                                    onChange={(e) =>
                                      handleUpdateCharacter(ch.id, { name: e.target.value })
                                    }
                                    placeholder="اسم الشخصية"
                                    className="rounded-lg border border-white/15 bg-[#0A0811] px-2 py-1 text-xs font-bold text-white"
                                  />
                                  <input
                                    type="text"
                                    value={ch.role}
                                    onChange={(e) =>
                                      handleUpdateCharacter(ch.id, { role: e.target.value })
                                    }
                                    placeholder="الدور"
                                    className="rounded-lg border border-white/15 bg-[#0A0811] px-2 py-1 text-xs text-white"
                                  />
                                </div>
                                <textarea
                                  rows={2}
                                  value={ch.appearanceAr}
                                  onChange={(e) =>
                                    handleUpdateCharacter(ch.id, {
                                      appearanceAr: e.target.value,
                                    })
                                  }
                                  placeholder="الوصف الشكلي من الملف (الشعر، العيون، البنية، الندوب)..."
                                  className="w-full rounded-lg border border-white/15 bg-[#0A0811] px-2 py-1 text-[11px] text-white"
                                />
                                <input
                                  type="text"
                                  value={ch.outfitAr}
                                  onChange={(e) =>
                                    handleUpdateCharacter(ch.id, { outfitAr: e.target.value })
                                  }
                                  placeholder="الملابس / المعطف / الدرع..."
                                  className="w-full rounded-lg border border-white/15 bg-[#0A0811] px-2 py-1 text-[11px] text-white"
                                />
                                <input
                                  type="text"
                                  value={ch.weaponOrPropAr || ''}
                                  onChange={(e) =>
                                    handleUpdateCharacter(ch.id, {
                                      weaponOrPropAr: e.target.value,
                                    })
                                  }
                                  placeholder="السلاح أو الأداة (اختياري)..."
                                  className="w-full rounded-lg border border-white/15 bg-[#0A0811] px-2 py-1 text-[11px] text-white"
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex items-center gap-2 text-[10px] text-[#C8BCA8]">
                                    <label className="flex items-center gap-1">
                                      <span>شعر</span>
                                      <input
                                        type="color"
                                        value={ch.hairHex}
                                        onChange={(e) =>
                                          handleUpdateCharacter(ch.id, {
                                            hairHex: e.target.value,
                                          })
                                        }
                                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                                      />
                                    </label>
                                    <label className="flex items-center gap-1">
                                      <span>عيون</span>
                                      <input
                                        type="color"
                                        value={ch.eyeHex}
                                        onChange={(e) =>
                                          handleUpdateCharacter(ch.id, {
                                            eyeHex: e.target.value,
                                          })
                                        }
                                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                                      />
                                    </label>
                                    <label className="flex items-center gap-1">
                                      <span>ملابس</span>
                                      <input
                                        type="color"
                                        value={ch.outfitHex}
                                        onChange={(e) =>
                                          handleUpdateCharacter(ch.id, {
                                            outfitHex: e.target.value,
                                          })
                                        }
                                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                                      />
                                    </label>
                                    <label className="flex items-center gap-1">
                                      <span>هالة</span>
                                      <input
                                        type="color"
                                        value={ch.auraHex}
                                        onChange={(e) =>
                                          handleUpdateCharacter(ch.id, {
                                            auraHex: e.target.value,
                                          })
                                        }
                                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                                      />
                                    </label>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCharId(null)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-[#06140D]"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>حفظ</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-black text-white">{ch.name}</span>
                                      <span className="rounded-md bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-200">
                                        {ch.role}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingCharId(ch.id)}
                                      aria-label={`تعديل ${ch.name}`}
                                      className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-[#F5D68A]"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCharacter(ch.id)}
                                      aria-label={`حذف ${ch.name}`}
                                      className="rounded-lg p-1 text-white/60 hover:bg-red-500/20 hover:text-red-300"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-[11px] leading-relaxed text-[#E3D8EE]">
                                  {ch.appearanceAr}
                                </p>
                                <p className="text-[11px] text-[#B8A9C9]">
                                  <strong className="text-[#F5D68A]">الزي:</strong> {ch.outfitAr}
                                  {ch.weaponOrPropAr ? ` · السلاح: ${ch.weaponOrPropAr}` : ''}
                                </p>

                                {/* Visual Color Swatches Extracted from File */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-[#A89B89]">
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="h-3 w-3 rounded-full border border-white/35"
                                      style={{ backgroundColor: ch.hairHex }}
                                    />
                                    شعر
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="h-3 w-3 rounded-full border border-white/35"
                                      style={{ backgroundColor: ch.eyeHex }}
                                    />
                                    عيون
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="h-3 w-3 rounded-full border border-white/35"
                                      style={{ backgroundColor: ch.outfitHex }}
                                    />
                                    ملابس
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <span
                                      className="h-3 w-3 rounded-full border border-white/35"
                                      style={{ backgroundColor: ch.auraHex }}
                                    />
                                    هالة
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#A89B89]">
                      لم يُذكر وصف تفصيلي محدد لشخصيات مسماة بعد — يمكنك الضغط على «إضافة شخصية» أو إكمال الرسم مباشرة بالالتزام التام بأحداث النص.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* PANEL COUNT + EXTRA ART DIRECTION */}
            <div className="grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-bold text-[#E7DEC8]">
                  عدد لوحات الحلقة
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setPanelCount(count)}
                      className={`rounded-xl border py-2 text-xs font-extrabold transition-all ${
                        panelCount === count
                          ? 'border-[#F5D68A] bg-[#D9A441] text-[#110D08]'
                          : 'border-white/10 bg-[#151020] text-[#C8BCA8] hover:border-[#D9A441]/50'
                      }`}
                    >
                      {count} لوحات
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-8">
                <label className="mb-1 block text-xs font-bold text-[#E7DEC8]">
                  ملاحظات إخراجية إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={customStyleNotes}
                  onChange={(e) => setCustomStyleNotes(e.target.value)}
                  placeholder="مثال: البطل بشعر أسود وعيون زرقاء متوهجة، أجواء مطر ليلي ومشاهد قتال سريعة..."
                  className="w-full rounded-xl border border-white/12 bg-[#151020] px-3 py-2 text-xs text-white placeholder:text-[#7E728A] focus:border-fuchsia-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: ART STYLE & REFERENCE IMAGE UPLOADER */}
          <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-white/10 bg-[#0E0B15]/80 p-4 sm:p-5 lg:col-span-5">
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-black text-[#F5D68A]">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-fuchsia-500 text-xs font-black text-white">
                  2
                </span>
                <span>أسلوب الرسم أو صورة مرجعية من اختيارك</span>
              </h2>

              {/* Reference Image Upload Box */}
              <input
                ref={refImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleReferenceImageSelected(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />

              {refImagePreview ? (
                <div className="relative overflow-hidden rounded-2xl border-2 border-fuchsia-400/70 bg-[#161024] p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={refImagePreview}
                      alt="الصورة المرجعية لأسلوب الرسم"
                      className="h-20 w-20 shrink-0 rounded-xl border border-white/20 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-500/25 px-2 py-0.5 text-[10px] font-extrabold text-fuchsia-200">
                        <Sparkles className="h-3 w-3" />
                        <span>مطابقة الأسلوب البصري مفعّلة</span>
                      </span>
                      <p className="mt-1 truncate text-xs font-bold text-white">
                        {refImagePayload?.name}
                      </p>
                      <p className="text-[11px] text-[#C4B5D6]">
                        سيتم استخراج الألوان والظلال وأسلوب الرسم من هذه الصورة وتطبيقها على كل لوحات الحلقة.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRefImagePreview(null);
                        setRefImagePayload(null);
                        setStyleId('solo_manhwa');
                      }}
                      aria-label="إزالة الصورة المرجعية"
                      className="rounded-lg border border-white/15 bg-black/40 p-1.5 text-white/80 hover:bg-red-500/30 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => refImageInputRef.current?.click()}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-fuchsia-400/45 bg-gradient-to-l from-fuchsia-500/12 via-purple-500/8 to-transparent p-3.5 text-right transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-300 hover:from-fuchsia-500/22"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300 transition-transform duration-300 group-hover:scale-110">
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-white">
                      ضع صورة لطريقة الرسم التي تريدها (اختياري)
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#BEB0CE]">
                      ارفع أي لقطة مانهوا أو أنمي أو لوحة فنية وسيرسم الذكاء كامل القصة بنفس أسلوبها وألوانها!
                    </p>
                  </div>
                </button>
              )}

              {/* 6 Crafted Preset Art Styles */}
              <div>
                <p className="mb-1.5 text-[11px] font-bold text-[#A89B89]">
                  أو اختر من أنماط الرسم الاحترافية الجاهزة:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {MANHWA_STYLE_PRESETS.map((preset) => {
                    const selected = !refImagePayload && styleId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setRefImagePreview(null);
                          setRefImagePayload(null);
                          setStyleId(preset.id);
                        }}
                        className={`flex flex-col items-start rounded-xl border p-2.5 text-right transition-all duration-300 active:scale-[0.97] ${
                          selected
                            ? 'border-[#F5D68A] bg-gradient-to-l from-[#D9A441]/20 via-[#1C1628] to-[#171222] shadow-[0_6px_16px_rgba(217,164,65,0.22)]'
                            : 'border-white/10 bg-[#140F1E] hover:-translate-y-0.5 hover:border-white/25'
                        }`}
                      >
                        <div className="mb-1.5 flex w-full items-center justify-between gap-1">
                          <span className="text-xs font-extrabold text-white">
                            {preset.nameAr}
                          </span>
                          <span className="flex items-center gap-0.5">
                            {preset.palette.map((hex, i) => (
                              <span
                                key={i}
                                className="h-2.5 w-2.5 rounded-full border border-white/25"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </span>
                        </div>
                        <span className="line-clamp-1 text-[10px] text-[#A89B89]">
                          {preset.subtitleAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GENERATE CTA BUTTON */}
            <div className="pt-1">
              <button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerateManhwa()}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-l from-fuchsia-600 via-[#D9A441] to-purple-600 bg-[length:200%_100%] bg-left px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_28px_rgba(192,38,211,0.36)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-right hover:shadow-[0_14px_34px_rgba(217,164,65,0.45)] active:scale-[0.98] disabled:opacity-65"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري رسم المانهوا وإخراج الحوارات...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                    <span>ارسم المانهوا الكاملة الآن ({panelCount} لوحات)</span>
                  </>
                )}
              </button>
              {generating && generationStep && (
                <p className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-center text-xs font-bold text-fuchsia-200">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                  <span>{generationStep}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SAVED MANHWA EPISODES GALLERY STRIP */}
      {savedEpisodes.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#15101F] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-black text-[#F5D68A]">
              <Layers className="h-4 w-4" aria-hidden="true" />
              <span>معرض حلقات المانهوا المرسومة ({savedEpisodes.length})</span>
            </h3>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {savedEpisodes.map((ep) => {
              const isCurrent = activeEpisode?.id === ep.id;
              return (
                <div
                  key={ep.id}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                    isCurrent
                      ? 'border-[#F5D68A] bg-[#D9A441]/20 text-white'
                      : 'border-white/10 bg-[#1B1528] text-[#C8BCA8] hover:border-white/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveEpisode(ep)}
                    className="text-right"
                  >
                    <p className="max-w-[190px] truncate text-xs font-extrabold">
                      {ep.bookTitle}
                    </p>
                    <p className="max-w-[190px] truncate text-[10px] text-[#A89B89]">
                      {ep.chapterTitle} · {ep.panels.length} لوحات
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = savedEpisodes.filter((x) => x.id !== ep.id);
                      setSavedEpisodes(next);
                      if (isCurrent) setActiveEpisode(next[0] || null);
                    }}
                    aria-label="حذف الحلقة"
                    className="rounded-lg p-1 text-white/50 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* VERTICAL WEBTOON / MANHWA SCROLL READER */}
      {activeEpisode && (
        <section ref={readerTopRef} className="scroll-mt-24 space-y-5">
          {/* Webtoon Controls Bar */}
          <div className="sticky top-[68px] z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D9A441]/35 bg-[#120D1C]/95 p-3.5 shadow-2xl backdrop-blur-xl">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-black text-[#FAF1DF]">
                  {activeEpisode.bookTitle}
                </h2>
                <span className="rounded-lg bg-fuchsia-500/20 px-2 py-0.5 text-[11px] font-bold text-fuchsia-200">
                  {activeEpisode.chapterTitle}
                </span>
                {activeEpisode.usedReferenceImage && (
                  <span className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-200">
                    أسلوب مستنسخ من صورتك
                  </span>
                )}
                {activeEpisode.strictFileMode && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#D9A441]/50 bg-[#D9A441]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#F5D68A]">
                    <ShieldCheck className="h-3 w-3" />
                    <span>
                      مطابق 100% لوصف الملف
                      {activeEpisode.characterBibleUsed?.characters.length
                        ? ` (${activeEpisode.characterBibleUsed.characters.length} شخصيات)`
                        : ''}
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#B9AC99]">
                <span>بصمة الألوان:</span>
                <span className="inline-flex items-center gap-1">
                  {activeEpisode.extractedPalette.map((hex, idx) => (
                    <span
                      key={idx}
                      title={hex}
                      className="h-3.5 w-3.5 rounded-full border border-white/30"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                <span className="hidden sm:inline">· {activeEpisode.styleSummaryAr}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Auto-Scroll Toggle */}
              <button
                type="button"
                onClick={() => setAutoScrolling((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all ${
                  autoScrolling
                    ? 'border-emerald-400 bg-emerald-500 text-[#07150F]'
                    : 'border-white/15 bg-white/[0.06] text-white hover:border-[#D9A441]'
                }`}
              >
                {autoScrolling ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{autoScrolling ? 'إيقاف التمرير' : 'تمرير سينمائي'}</span>
              </button>

              {autoScrolling && (
                <div className="inline-flex rounded-xl border border-white/15 bg-black/30 p-0.5 text-[10px] font-bold">
                  {(
                    [
                      { id: 'slow', label: 'بطيء' },
                      { id: 'medium', label: 'متوسط' },
                      { id: 'fast', label: 'سريع' },
                    ] as const
                  ).map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setScrollSpeed(sp.id)}
                      className={`rounded-lg px-2 py-1 ${
                        scrollSpeed === sp.id ? 'bg-[#D9A441] text-[#110D08]' : 'text-white/70'
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Audio Drama Narration Toggle */}
              <button
                type="button"
                onClick={handleToggleAudioDrama}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition-all ${
                  audioDramaPlaying
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-blue-400/35 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25'
                }`}
              >
                {audioDramaPlaying ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                <span>{audioDramaPlaying ? 'إيقاف الدراما الصوتية' : 'دراما صوتية'}</span>
              </button>

              {/* Director Notes Toggle */}
              <button
                type="button"
                onClick={() => setShowDirectorNotes((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                  showDirectorNotes
                    ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100'
                    : 'border-white/15 bg-white/[0.04] text-[#C8BCA8] hover:text-white'
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">إخراج</span>
              </button>

              {/* Art Mode Toggle: MangaMelo HD vs Sketch */}
              <button
                type="button"
                onClick={() => setUseHdMangaArt((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                  useHdMangaArt
                    ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100'
                    : 'border-white/15 bg-white/[0.04] text-[#C8BCA8] hover:text-white'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{useHdMangaArt ? 'رسم مانجاميلو HD' : 'رسم متجهي'}</span>
              </button>

              {/* Export HD Vertical PNG */}
              <button
                type="button"
                disabled={exportingPng}
                onClick={() => void handleDownloadVerticalPng()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-[#C9912E] via-[#F2C96B] to-[#D9A441] px-3 py-1.5 text-xs font-extrabold text-[#110D08] transition hover:brightness-110 disabled:opacity-60"
              >
                {exportingPng ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>حفظ PNG طويل</span>
              </button>

              {/* Export HTML Book */}
              <button
                type="button"
                onClick={handleDownloadHtmlBook}
                className="inline-flex items-center gap-1 rounded-xl border border-[#D9A441]/45 bg-[#D9A441]/12 px-3 py-1.5 text-xs font-bold text-[#F5D68A] transition hover:bg-[#D9A441] hover:text-[#110D08]"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>HTML</span>
              </button>
            </div>
          </div>

          {/* Continuous Vertical Webtoon Strip */}
          <div className="mx-auto max-w-[820px] space-y-6 pb-8">
            {activeEpisode.panels.map((panel: ManhwaPanel, idx: number) => {
              const isSpoken = speakingPanelIdx === idx;
              const svgSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                panel.svgArt
              )}`;
              const hdFallbackArt = MANGAMELO_ART_POOL[idx % MANGAMELO_ART_POOL.length];
              const displaySrc = useHdMangaArt ? hdFallbackArt : svgSrc;
              return (
                <article
                  key={panel.panelNumber}
                  id={`manhwa-panel-${idx}`}
                  className={`overflow-hidden rounded-2xl border-2 bg-[#120F1B] shadow-[0_18px_50px_rgba(0,0,0,0.65)] transition-all duration-300 ${
                    isSpoken
                      ? 'border-blue-400 ring-4 ring-blue-500/35'
                      : 'border-[#2D2542]'
                  }`}
                >
                  {/* Top Ivory Narration Box */}
                  {panel.narrationBox && (
                    <div className="border-b-2 border-[#1B140C] bg-[#FAF3E0] px-4 py-3 text-sm font-extrabold leading-relaxed text-[#1A130B] sm:px-6 sm:text-[15px]">
                      {panel.narrationBox}
                    </div>
                  )}

                  {/* Illustrated Artwork Frame + Overlays */}
                  <div className="relative bg-[#0B0912]">
                    <img
                      src={displaySrc}
                      alt={`${panel.title} — لوحة ${panel.panelNumber}`}
                      className="block h-auto max-h-[820px] w-full select-none object-cover"
                    />

                    {/* Comic Dialogue Bubbles */}
                    {panel.dialogues.map((bubble, bIdx) => (
                      <div
                        key={bIdx}
                        className={`absolute max-w-[62%] px-3.5 py-2.5 text-xs font-extrabold leading-relaxed sm:max-w-[46%] sm:px-4 sm:py-3 sm:text-sm ${getBubbleClasses(
                          bubble
                        )}`}
                      >
                        {bubble.speaker && (
                          <div
                            className={`mb-0.5 text-[10px] font-black ${
                              bubble.bubbleType === 'shout'
                                ? 'text-red-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {bubble.speaker}
                          </div>
                        )}
                        <p>{bubble.text}</p>
                      </div>
                    ))}

                    {/* Angled Comic SFX */}
                    {panel.sfxText && (
                      <div
                        className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 -rotate-6 select-none text-2xl font-black tracking-wide text-[#FACC15] sm:text-4xl"
                        style={{
                          textShadow:
                            '2px 2px 0 #09090B, -2px -2px 0 #09090B, 2px -2px 0 #09090B, -2px 2px 0 #09090B, 0 0 22px rgba(250,204,21,0.75)',
                        }}
                      >
                        {panel.sfxText}
                      </div>
                    )}

                    {/* Panel Index Badge */}
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] font-bold text-white/75 backdrop-blur-sm">
                      #{panel.panelNumber} · {panel.title}
                    </span>

                    {/* Present Characters From Uploaded File */}
                    {panel.charactersPresent && panel.charactersPresent.length > 0 && (
                      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap items-center gap-1">
                        {panel.charactersPresent.slice(0, 3).map((charName, cIdx) => (
                          <span
                            key={cIdx}
                            className="rounded-md border border-[#D9A441]/45 bg-black/75 px-2 py-0.5 text-[10px] font-extrabold text-[#F5D68A] backdrop-blur-sm"
                          >
                            {charName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optional Director/Scene Description Drawer */}
                  {showDirectorNotes && (panel.sceneDescriptionAr || panel.characterVisualNotesAr) && (
                    <div className="space-y-1 border-t border-white/10 bg-[#171226] px-4 py-2.5 text-xs text-[#C8BCA8]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong className="text-[#F5D68A]">الإخراج البصري:</strong>{' '}
                          {panel.sceneDescriptionAr}
                        </span>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80">
                          {panel.cameraAngle}
                        </span>
                      </div>
                      {panel.characterVisualNotesAr && (
                        <p className="text-[11px] text-emerald-200/90">
                          <strong>مطابقة الشخصيات من الملف:</strong> {panel.characterVisualNotesAr}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Episode End Footer + Draw Next Chapter CTA */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-[#D9A441]/30 bg-gradient-to-l from-[#1C142B] via-[#151020] to-[#1D1510] p-6 text-center sm:flex-row sm:text-right">
              <div>
                <p className="text-base font-black text-[#FAF1DF]">
                  نهاية الحلقة: {activeEpisode.chapterTitle}
                </p>
                <p className="mt-1 text-xs text-[#B9AC99]">
                  {activeSourceMeta?.hasNextChapter
                    ? 'الفصل التالي من كتابك جاهز — اضغط لرسمه فوراً بنفس أسلوب الرسم والألوان!'
                    : 'يمكنك حفظ الحلقة كصورة PNG طويلة أو رفع ملف كتاب آخر لمتابعة الرسم.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {activeSourceMeta?.hasNextChapter &&
                  activeSourceMeta.nextChapterIdx !== undefined && (
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() =>
                        void handleGenerateManhwa(activeSourceMeta.nextChapterIdx)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-fuchsia-600 via-[#D9A441] to-purple-600 px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
                    >
                      <span>ارسم الفصل التالي بنفس الأسلوب</span>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => void handleDownloadVerticalPng()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9A441]/50 bg-[#D9A441]/15 px-4 py-2.5 text-xs font-extrabold text-[#F5D68A] hover:bg-[#D9A441] hover:text-[#110D08]"
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل PNG</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
      </>
      )}
    </div>
  );
}
