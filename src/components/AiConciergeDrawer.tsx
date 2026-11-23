import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Compass,
  Film,
  Info,
  ListPlus,
  Loader2,
  Mic,
  MicOff,
  Play,
  Radio,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AiChatMessage,
  MediaItem,
  NavTab,
  ProfileId,
} from '../types/cinema';
import { askAiConcierge } from '../services/xtreamApi';
import { buildCatalogSummaryForAI } from '../utils/cinemaLogic';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface AiConciergeDrawerProps {
  open: boolean;
  initialQuery?: string;
  onClearInitialQuery: () => void;
  catalogItems: MediaItem[];
  findItemById: (id: string) => MediaItem | undefined;
  activeProfileName: string;
  familyGuard: boolean;
  activeServerName: string;
  watchQueue: string[];
  onClose: () => void;
  onPlayItem: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleQueue: (id: string) => void;
  onPlaySequence: (items: MediaItem[], label: string) => void;
  onApplyTab: (tab: NavTab) => void;
  onApplySearch: (query: string) => void;
  onApplyProfile: (profileId: ProfileId) => void;
  onToast: (msg: string) => void;
}

const QUICK_PROMPTS = [
  'اقترح لي خطة سهرة سينمائية من عملين ممتعين الليلة',
  'أريد فيلم خيال علمي عميق بتقييم عالي',
  'رشّح لي مسلسلاً أو أنمي مشوّقاً أبدأ به الآن',
  'اقترح عملاً عائلياً آمناً وممتعاً للأطفال',
  'ما قنوات البث المباشر المتاحة حالياً؟',
];

const TAB_LABELS: Record<NavTab, string> = {
  home: 'الرئيسية',
  movies: 'الأفلام',
  series: 'المسلسلات والأنمي',
  live: 'البث المباشر',
  ai: 'فالدريون AI',
  mylist: 'قائمتي',
};

const PROFILE_LABELS: Record<ProfileId, string> = {
  imperial: 'سينمائي VIP',
  family: 'العائلة',
  kids: 'الأطفال',
};

export function AiConciergeDrawer({
  open,
  initialQuery,
  onClearInitialQuery,
  catalogItems,
  findItemById,
  activeProfileName,
  familyGuard,
  activeServerName,
  watchQueue,
  onClose,
  onPlayItem,
  onOpenDetails,
  onToggleQueue,
  onPlaySequence,
  onApplyTab,
  onApplySearch,
  onApplyProfile,
  onToast,
}: AiConciergeDrawerProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesRef = useRef<AiChatMessage[]>(messages);
  messagesRef.current = messages;

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendPrompt = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || loading) return;

      const userMsg: AiChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        text,
        ts: Date.now(),
      };

      const historySnapshot = messagesRef.current
        .filter((m) => !m.error)
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
      setLastFailedPrompt(null);

      try {
        const catalogSummary = buildCatalogSummaryForAI(catalogItems, 100);
        const res = await askAiConcierge({
          message: text,
          history: historySnapshot,
          catalogSummary,
          context: {
            activeProfile: activeProfileName,
            familyGuard,
            activeServerName,
          },
        });

        const assistantMsg: AiChatMessage = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          matchedIds: res.matchedIds,
          suggestedTab: res.suggestedTab,
          suggestedSearch: res.suggestedSearch,
          suggestedProfile: res.suggestedProfile,
          watchNightPlan: res.watchNightPlan,
          followUpChips: res.followUpChips,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errText =
          err instanceof Error
            ? err.message
            : 'تعذّر الاتصال بالمساعد الذكي حالياً.';
        setLastFailedPrompt(text);
        setMessages((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            role: 'assistant',
            text: errText,
            error: true,
            ts: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, catalogItems, activeProfileName, familyGuard, activeServerName]
  );

  // Auto-send initial query when launched from the search bar
  useEffect(() => {
    if (open && initialQuery && initialQuery.trim()) {
      const q = initialQuery.trim();
      onClearInitialQuery();
      void sendPrompt(q);
    }
  }, [open, initialQuery, onClearInitialQuery, sendPrompt]);

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      onToast('البحث الصوتي غير مدعوم في هذا المتصفح.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const RecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const rec = new RecognitionCtor();
    rec.lang = 'ar-SA';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      if (transcript.trim()) {
        setInput(transcript.trim());
        void sendPrompt(transcript.trim());
      }
    };
    rec.onerror = () => {
      setListening(false);
      onToast('تعذّر التقاط الصوت — تأكد من إذن الميكروفون.');
    };
    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-concierge-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="flex h-full w-full max-w-[490px] flex-col border-r border-[#D4AF37]/30 bg-[#0B0B10] shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#101017] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/12 text-[#D4AF37]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="ai-concierge-title"
                className="truncate text-base font-black text-[#F4F3EF]"
              >
                مرشد فالدريون الذكي
              </h2>
              <p className="truncate text-xs text-[#9B9AA2]">
                بحث ذكي · خطط سهرة · ترشيحات من مكتبة {activeServerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onApplyTab('ai');
                onClose();
              }}
              className="rounded-lg border border-[#D4AF37]/45 bg-[#D4AF37]/12 px-2.5 py-1.5 text-[11px] font-extrabold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]"
            >
              الاستوديو الكامل
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setLastFailedPrompt(null);
                }}
                aria-label="مسح المحادثة"
                title="بدء محادثة جديدة"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171720] text-[#9B9AA2] transition-colors hover:border-white/25 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق المساعد الذكي"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171720] text-[#D6D5CE] transition-colors hover:border-[#D4AF37] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Active Context Line (Unboxed, zero pills) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#0D0D13] px-5 py-2 text-[11px] text-[#9B9AA2]">
          <span>
            الملف: <strong className="text-[#F4F3EF]">{activeProfileName}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            الحماية العائلية:{' '}
            <strong className={familyGuard ? 'text-emerald-300' : 'text-[#D6D5CE]'}>
              {familyGuard ? 'مفعّلة' : 'متوقفة'}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            المتاح للبحث: <strong className="text-[#D4AF37]">{catalogItems.length}</strong> عمل
          </span>
        </div>

        {/* Conversation Body */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {messages.length === 0 ? (
            <div className="space-y-5 py-4">
              <div className="space-y-2 rounded-2xl border border-white/[0.08] bg-[#12121A] p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#D4AF37]">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>اسألني بأي وصف أو مزاج</span>
                </div>
                <p className="text-xs leading-relaxed text-[#CFCED6]">
                  أستطيع البحث داخل مكتبة السيرفر الحالي بالوصف أو القصة أو المزاج، بناء خطة سهرة سينمائية متكاملة وتشغيلها مباشرة، أو ترشيح أعمال مناسبة للعائلة والأطفال.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#9B9AA2]">
                  أفكار سريعة للبدء:
                </p>
                <div className="flex flex-col gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendPrompt(prompt)}
                      className="rounded-xl border border-white/[0.08] bg-[#13131C] px-3.5 py-2.5 text-right text-xs font-semibold text-[#E8E7E1] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#191925]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const matchedItems = (msg.matchedIds || [])
                .map(findItemById)
                .filter((x): x is MediaItem => Boolean(x));

              const planEntries = (msg.watchNightPlan || [])
                .map((step) => ({
                  step,
                  item: findItemById(step.itemId),
                }))
                .filter(
                  (entry): entry is { step: NonNullable<typeof entry.step>; item: MediaItem } =>
                    Boolean(entry.item)
                );

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2.5 ${
                    msg.role === 'user' ? 'items-start' : 'items-stretch'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm ${
                      msg.role === 'user'
                        ? 'max-w-[88%] bg-[#DC143C] font-semibold text-white'
                        : msg.error
                        ? 'border border-rose-500/40 bg-rose-500/10 text-rose-200'
                        : 'border border-white/[0.08] bg-[#14141D] text-[#F4F3EF]'
                    }`}
                  >
                    {msg.error && (
                      <div className="mb-1.5 flex items-center gap-1.5 font-bold text-rose-300">
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>تنبيه من المساعد الذكي</span>
                      </div>
                    )}
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {msg.error && lastFailedPrompt && (
                      <button
                        type="button"
                        onClick={() => void sendPrompt(lastFailedPrompt)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500/30"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>إعادة المحاولة</span>
                      </button>
                    )}
                  </div>

                  {/* Interactive Matched Media Cards */}
                  {matchedItems.length > 0 && (
                    <div className="space-y-2">
                      {matchedItems.slice(0, 5).map((item) => {
                        const inQueue = watchQueue.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111119] p-2.5 transition-colors hover:border-[#D4AF37]/40"
                          >
                            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1A1A24]">
                              {item.poster ? (
                                <img
                                  src={item.poster}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  className={`h-full w-full ${
                                    item.kind === 'live'
                                      ? 'object-contain p-1.5'
                                      : 'object-cover'
                                  }`}
                                />
                              ) : item.kind === 'live' ? (
                                <Radio className="h-5 w-5 text-[#D4AF37]" />
                              ) : (
                                <Film className="h-5 w-5 text-[#D4AF37]" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="truncate text-xs font-extrabold text-[#F4F3EF]">
                                {item.title}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9B9AA2]">
                                <span>
                                  {item.kind === 'series'
                                    ? 'مسلسل'
                                    : item.kind === 'live'
                                    ? 'مباشر'
                                    : 'فيلم'}
                                </span>
                                {item.year && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="tabular-nums">{item.year}</span>
                                  </>
                                )}
                                {item.rating && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="tabular-nums text-[#D4AF37]">
                                      ★ {item.rating}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onPlayItem(item);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#DC143C] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#EF234B]"
                                >
                                  <Play className="h-3 w-3 fill-current" />
                                  <span>تشغيل</span>
                                </button>
                                {item.kind !== 'live' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenDetails(item);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#181822] px-2.5 py-1 text-[11px] font-semibold text-[#D6D5CE] hover:border-white/25"
                                  >
                                    <Info className="h-3 w-3" />
                                    <span>التفاصيل</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onToggleQueue(item.id)}
                                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                    inQueue
                                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#D4AF37]'
                                      : 'border-white/10 bg-[#181822] text-[#9B9AA2] hover:text-white'
                                  }`}
                                >
                                  <ListPlus className="h-3 w-3" />
                                  <span>{inQueue ? 'في السهرة' : '+ للسهرة'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Watch-Night Plan Sequence */}
                  {planEntries.length > 0 && (
                    <div className="space-y-2.5 rounded-xl border border-[#D4AF37]/35 bg-[#131218] p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#D4AF37]">
                          خطة السهرة السينمائية المقترحة
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPlaySequence(
                              planEntries.map((e) => e.item),
                              'خطة السهرة السينمائية'
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37] px-2.5 py-1 text-[11px] font-extrabold text-[#060608] hover:bg-[#E5C158]"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>تشغيل بالترتيب</span>
                        </button>
                      </div>

                      <ol className="space-y-2">
                        {planEntries.map(({ step, item }, idx) => (
                          <li
                            key={`${item.id}_${idx}`}
                            className="flex items-start gap-2.5 rounded-lg bg-[#0D0D12] p-2.5 text-xs"
                          >
                            <span className="font-mono-tabular mt-0.5 text-xs font-black text-[#D4AF37]">
                              0{idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#F4F3EF]">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-[#9B9AA2]">
                                {step.slotLabel ? `${step.slotLabel} · ` : ''}
                                {step.reason}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Suggested Direct App Actions */}
                  {(msg.suggestedTab || msg.suggestedSearch || msg.suggestedProfile) && (
                    <div className="flex flex-wrap gap-2">
                      {msg.suggestedTab && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyTab(msg.suggestedTab as NavTab);
                            onClose();
                          }}
                          className="rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/20"
                        >
                          انتقال إلى قسم: {TAB_LABELS[msg.suggestedTab as NavTab]}
                        </button>
                      )}
                      {msg.suggestedSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplySearch(msg.suggestedSearch || '');
                            onClose();
                          }}
                          className="rounded-lg border border-white/15 bg-[#171722] px-3 py-1.5 text-xs font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
                        >
                          تطبيق البحث: "{msg.suggestedSearch}"
                        </button>
                      )}
                      {msg.suggestedProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyProfile(msg.suggestedProfile as ProfileId);
                          }}
                          className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                        >
                          التبديل إلى ملف:{' '}
                          {PROFILE_LABELS[msg.suggestedProfile as ProfileId]}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Follow-up Suggestion Chips */}
                  {msg.followUpChips && msg.followUpChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.followUpChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => void sendPrompt(chip)}
                          disabled={loading}
                          className="rounded-lg border border-white/10 bg-[#12121A] px-2.5 py-1.5 text-[11px] font-semibold text-[#C9C8D0] transition-colors hover:border-[#D4AF37]/45 hover:text-white disabled:opacity-50"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div className="flex items-center gap-2.5 rounded-xl border border-[#D4AF37]/30 bg-[#13131C] px-4 py-3 text-xs font-bold text-[#D4AF37]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>مرشد فالدريون يبحث في المكتبة ويرتّب أفضل الترشيحات...</span>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendPrompt(input);
          }}
          className="border-t border-white/[0.08] bg-[#101017] p-4"
        >
          <div className="flex items-center gap-2">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                aria-label={listening ? 'إيقاف البحث الصوتي' : 'بحث صوتي بالعربية'}
                aria-pressed={listening}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  listening
                    ? 'border-[#DC143C] bg-[#DC143C] text-white'
                    : 'border-white/10 bg-[#171720] text-[#D6D5CE] hover:border-[#D4AF37]'
                }`}
              >
                {listening ? (
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                listening
                  ? 'تحدث الآن بالعربية...'
                  : 'اكتب وصف الفيلم أو مزاج السهرة...'
              }
              aria-label="اسأل مرشد فالدريون الذكي"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0A0A0F] px-3.5 text-sm text-[#F4F3EF] placeholder:text-[#7E7D86] focus:border-[#D4AF37]"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="إرسال للمساعد الذكي"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 text-xs font-extrabold text-[#060608] transition-colors hover:bg-[#E5C158] disabled:opacity-45"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">بحث</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
