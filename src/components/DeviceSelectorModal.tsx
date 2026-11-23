import React from 'react';
import { CheckCircle2, Monitor, Smartphone, Tv, X } from 'lucide-react';
import {
  DEVICE_CAPABILITIES,
  type DevicePlatformMode,
} from '../utils/deviceModeUtils';

interface DeviceSelectorModalProps {
  open: boolean;
  currentMode: DevicePlatformMode;
  canClose: boolean;
  onSelectMode: (mode: DevicePlatformMode) => void;
  onClose: () => void;
}

const OPTIONS: Array<{
  mode: DevicePlatformMode;
  icon: typeof Tv;
  badge: string;
  accent: string;
  highlights: string[];
}> = [
  {
    mode: 'tv',
    icon: Tv,
    badge: 'للتلفزيون فقط · سينما سريعة',
    accent: 'border-[#F5C76B]/60 bg-[#F5C76B]/10 text-[#F5C76B]',
    highlights: [
      'يخفي الروايات والأدوات الثقيلة ليبقى التلفزيون للسينما والبث المباشر فقط',
      'يلغي المؤثرات الثقيلة والضبابية لضمان سرعة فائقة بدون تقطيع',
      'يدعم التنقل الكامل بأسهم الريموت (D-Pad) مع إطار تحديد واضح',
    ],
  },
  {
    mode: 'mobile',
    icon: Smartphone,
    badge: 'لمسي ومريح للجوال',
    accent: 'border-sky-400/50 bg-sky-500/10 text-sky-300',
    highlights: [
      'شريط تنقل سفلي سريع بيد واحدة للسينما والروايات 4D والذكاء',
      'دعم تقليب صفحات الكتاب 4D بالسحب باليد مع صوت الورق',
      'استخراج السيرفرات مباشرة من لقطات الشاشة (صور الجوال)',
    ],
  },
  {
    mode: 'desktop',
    icon: Monitor,
    badge: 'القوة الكاملة',
    accent: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300',
    highlights: [
      'جميع القدرات: السينما + قارئ الكتب 4D + القائد الذكي السريع + الخزنة',
      'نوافذ وأشرطة قابلة للسحب والتحريك بحرية على الشاشة',
      'لوحة درع الأمان الفائق وربط حسابات التواصل الاجتماعي',
    ],
  },
];

export const DeviceSelectorModal: React.FC<DeviceSelectorModalProps> = ({
  open,
  currentMode,
  canClose,
  onSelectMode,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-selector-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[#D9A441]/35 bg-[#0C101A] p-6 text-slate-100 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2
              id="device-selector-title"
              className="text-xl font-black text-white sm:text-2xl"
            >
              ما الجهاز الذي تستخدمه الآن؟
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
              نرتّب لك واجهة فالدريون وقدراتها تلقائياً حسب جهازك — ويمكنك تغيير اختيارك في أي وقت بضغطة واحدة من الشريط العلوي.
            </p>
          </div>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق اختيار الجهاز"
              className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const cap = DEVICE_CAPABILITIES[opt.mode];
            const selected = currentMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                data-testid={`select-device-${opt.mode}`}
                onClick={() => onSelectMode(opt.mode)}
                className={`group flex flex-col justify-between rounded-2xl border p-5 text-right transition-all hover:-translate-y-0.5 ${
                  selected
                    ? 'border-[#F5C76B] bg-[#161D2E] shadow-[0_0_24px_rgba(245,199,107,0.2)]'
                    : 'border-white/10 bg-[#111726] hover:border-[#D9A441]/55'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${opt.accent}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {selected && (
                      <CheckCircle2 className="h-5 w-5 text-[#F5C76B]" aria-hidden="true" />
                    )}
                  </div>

                  <h3 className="mt-4 text-base font-black text-white">{cap.labelAr}</h3>
                  <span className="mt-1 inline-block rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold text-[#F5C76B]">
                    {opt.badge}
                  </span>

                  <ul className="mt-4 space-y-2 text-[11px] leading-relaxed text-slate-300">
                    {opt.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9A441]" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 rounded-xl bg-[#D9A441] py-2 text-center text-xs font-black text-[#120D08] transition-colors group-hover:brightness-110">
                  {selected ? 'مفعّل حالياً · متابعة' : `اختر وضع ${cap.shortLabelAr}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
