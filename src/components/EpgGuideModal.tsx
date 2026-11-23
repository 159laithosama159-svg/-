import { useEffect } from 'react';
import { Bell, BellRing, Clock, Play, Radio, X } from 'lucide-react';
import type { EpgReminder, MediaItem } from '../types/cinema';
import { computeEpgProgressPercent } from '../utils/cinemaProUtils';

interface EpgGuideModalProps {
  open: boolean;
  liveChannels: MediaItem[];
  reminders: EpgReminder[];
  onToggleReminder: (channel: MediaItem) => void;
  onPlayChannel: (channel: MediaItem) => void;
  onClose: () => void;
}

export function EpgGuideModal({
  open,
  liveChannels,
  reminders,
  onToggleReminder,
  onPlayChannel,
  onClose,
}: EpgGuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isReminded = (channelId: string) =>
    reminders.some((r) => r.channelId === channelId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="epg-guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#0D0D13] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#111118] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DC143C]/50 bg-[#DC143C]/15 text-[#DC143C]">
              <Radio className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="epg-guide-title" className="text-lg font-black text-[#F4F3EF]">
                دليل البرامج والمباريات المباشرة (EPG)
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                تابع البث الجاري والقادم وفعّل التذكيرات لأهم المباريات والبرامج ({reminders.length} تذكير نشط)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق دليل البرامج"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171722] text-[#D6D5CE] hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Active Reminders Bar */}
        {reminders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#141219] px-6 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#D4AF37]">
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              <span>تذكيراتك المفعّلة:</span>
            </span>
            {reminders.map((rem) => (
              <span
                key={rem.channelId}
                className="rounded-md border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2.5 py-1 text-[11px] font-bold text-[#F4F3EF]"
              >
                {rem.channelTitle} · {rem.programTitle} ({rem.startTime})
              </span>
            ))}
          </div>
        )}

        {/* Channels Timeline List */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
          {liveChannels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-[#12121A] py-14 text-center text-sm text-[#9B9AA2]">
              لا توجد قنوات بث مباشر في السيرفر الحالي.
            </div>
          ) : (
            liveChannels.map((ch) => {
              const epg = ch.epg || {
                title: 'بث مباشر متواصل على مدار الساعة',
                startTime: '20:00',
                endTime: '23:00',
                nextTitle: 'الفقرة التالية — تغطية حية',
              };
              const progressPct = computeEpgProgressPercent(epg.startTime, epg.endTime);
              const reminded = isReminded(ch.id);

              return (
                <div
                  key={ch.id}
                  className="grid gap-4 rounded-xl border border-white/[0.08] bg-[#12121A] p-4 transition-colors hover:border-[#D4AF37]/40 sm:grid-cols-12 sm:items-center"
                >
                  {/* Channel Identity */}
                  <div className="flex items-center gap-3 sm:col-span-4">
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#08080D]">
                      {ch.poster ? (
                        <img
                          src={ch.poster}
                          alt={ch.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#D4AF37]">
                          <Radio className="h-5 w-5" />
                        </div>
                      )}
                      <span className="absolute right-1 top-1 rounded bg-[#DC143C] px-1.5 py-0.5 text-[9px] font-black text-white">
                        LIVE
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-[#F4F3EF]">
                        {ch.title}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-mono-tabular text-[#9B9AA2]">
                        <Clock className="h-3 w-3 text-[#D4AF37]" aria-hidden="true" />
                        <span>
                          {epg.startTime} — {epg.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Now & Next Schedule */}
                  <div className="space-y-2 sm:col-span-5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-extrabold text-[#F4F3EF]">
                        الآن: {epg.title}
                      </span>
                      <span className="shrink-0 font-mono-tabular text-[11px] font-bold text-[#D4AF37]">
                        {progressPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-l from-[#D4AF37] to-[#DC143C]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="truncate text-[11px] text-[#9B9AA2]">
                      <strong className="text-[#D4AF37]">التالي:</strong> {epg.nextTitle}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 sm:col-span-3">
                    <button
                      type="button"
                      onClick={() => onToggleReminder(ch)}
                      aria-pressed={reminded}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition-colors ${
                        reminded
                          ? 'border-[#D4AF37] bg-[#D4AF37]/18 text-[#D4AF37]'
                          : 'border-white/12 bg-[#181824] text-[#D6D5CE] hover:border-[#D4AF37]/60'
                      }`}
                    >
                      {reminded ? (
                        <>
                          <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>مُذكّر</span>
                        </>
                      ) : (
                        <>
                          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>تذكير</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPlayChannel(ch);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC143C] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#EF234B]"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>شاهد</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
