import { useEffect } from 'react';
import {
  Dices,
  Film,
  Info,
  ListPlus,
  Play,
  Radio,
  Sparkles,
  X,
} from 'lucide-react';
import type { MediaItem } from '../types/cinema';

interface TonightPickModalProps {
  open: boolean;
  item: MediaItem | null;
  profileName: string;
  inQueue: boolean;
  onClose: () => void;
  onReroll: () => void;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  onToggleQueue: (id: string) => void;
}

export function TonightPickModal({
  open,
  item,
  profileName,
  inQueue,
  onClose,
  onReroll,
  onPlay,
  onOpenDetails,
  onToggleQueue,
}: TonightPickModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tonight-pick-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#0F0F15] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Dices className="h-5 w-5 text-[#D4AF37]" aria-hidden="true" />
            <div>
              <h2
                id="tonight-pick-title"
                className="text-base font-black text-[#F4F3EF]"
              >
                حظ السهرة — اختيار فالدريون الذكي
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                اختيار متوافق تلقائياً مع ملف: {profileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة حظ السهرة"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171720] text-[#D6D5CE] hover:border-[#D4AF37] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {item ? (
          <div className="flex flex-col gap-6 p-6 sm:flex-row">
            <div className="mx-auto flex h-64 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-[#161620] shadow-xl sm:mx-0">
              {item.poster ? (
                <img
                  src={item.poster}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className={`h-full w-full ${
                    item.kind === 'live' ? 'object-contain p-4' : 'object-cover'
                  }`}
                />
              ) : item.kind === 'live' ? (
                <Radio className="h-10 w-10 text-[#D4AF37]" />
              ) : (
                <Film className="h-10 w-10 text-[#D4AF37]" />
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>ترشيح السهرة المختار لك</span>
                  {item.quality && (
                    <>
                      <span aria-hidden="true" className="text-white/30">
                        ·
                      </span>
                      <span>{item.quality}</span>
                    </>
                  )}
                </div>

                <h3 className="text-2xl font-black leading-snug text-[#F4F3EF]">
                  {item.title}
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9B9AA2]">
                  <span>
                    {item.kind === 'series'
                      ? 'مسلسل'
                      : item.kind === 'live'
                      ? 'بث مباشر'
                      : 'فيلم سينمائي'}
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
                      <span className="tabular-nums font-bold text-[#D4AF37]">
                        ★ {item.rating}
                      </span>
                    </>
                  )}
                  {item.maturity && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{item.maturity}</span>
                    </>
                  )}
                </div>

                <p className="line-clamp-4 text-sm leading-relaxed text-[#CFCED6]">
                  {item.desc ||
                    'عمل مختار بعناية من مكتبة السيرفر الحالي لتستمتع بسهرة سينمائية رائعة.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPlay(item);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#DC143C] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#EF234B]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>تشغيل الآن</span>
                </button>

                {item.kind !== 'live' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDetails(item);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171722] px-4 py-2.5 text-xs font-bold text-[#F4F3EF] hover:border-white/30"
                  >
                    <Info className="h-4 w-4" aria-hidden="true" />
                    <span>التفاصيل</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onToggleQueue(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-bold transition-colors ${
                    inQueue
                      ? 'border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-white/15 bg-[#171722] text-[#D6D5CE] hover:border-[#D4AF37]/40'
                  }`}
                >
                  <ListPlus className="h-4 w-4" aria-hidden="true" />
                  <span>{inQueue ? 'في قائمة السهرة' : '+ قائمة السهرة'}</span>
                </button>

                <button
                  type="button"
                  onClick={onReroll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-4 py-2.5 text-xs font-extrabold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]"
                >
                  <Dices className="h-4 w-4" aria-hidden="true" />
                  <span>اختيار آخر</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-[#9B9AA2]">
            لا توجد أعمال متاحة ضمن الفلتر والملف الحاليين.
          </div>
        )}
      </div>
    </div>
  );
}
