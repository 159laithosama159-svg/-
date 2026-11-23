import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CloudRain,
  Eye,
  GripVertical,
  Monitor,
  Palette,
  ShieldCheck,
  Smartphone,
  Tv,
  X,
} from 'lucide-react';
import {
  clampFloatingPosition,
  type DevicePlatformMode,
  type FloatingPos,
} from '../utils/deviceModeUtils';

export type AccentThemeId = 'gold' | 'sky' | 'emerald' | 'violet' | 'crimson';

export const ACCENT_THEMES: Record<
  AccentThemeId,
  { label: string; primary: string; secondary: string; swatch: string; glow: string }
> = {
  gold: {
    label: 'ذهبي إمبراطوري',
    primary: '#D9A441',
    secondary: '#F5C76B',
    swatch: '#D9A441',
    glow: 'rgba(217, 164, 65, 0.24)',
  },
  sky: {
    label: 'أزرق سماوي',
    primary: '#38BDF8',
    secondary: '#7DD3FC',
    swatch: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.24)',
  },
  emerald: {
    label: 'زمردي فاخر',
    primary: '#10B981',
    secondary: '#34D399',
    swatch: '#10B981',
    glow: 'rgba(16, 185, 129, 0.24)',
  },
  violet: {
    label: 'أرجواني ملكي',
    primary: '#A855F7',
    secondary: '#C084FC',
    swatch: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.24)',
  },
  crimson: {
    label: 'قرمزي سينمائي',
    primary: '#EF4444',
    secondary: '#F87171',
    swatch: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.24)',
  },
};

const DOCK_POS_KEY = 'valdrion_quick_dock_pos_v1';

interface DraggableQuickDockProps {
  visible: boolean;
  deviceMode: DevicePlatformMode;
  accentTheme: AccentThemeId;
  eyeComfort: boolean;
  ambientRain: boolean;
  onChangeAccentTheme: (theme: AccentThemeId) => void;
  onToggleEyeComfort: () => void;
  onToggleAmbientRain: () => void;
  onOpenDeviceSelector: () => void;
  onOpenSecurityShield: () => void;
  onCaptureSnapshot: () => void;
}

export const DraggableQuickDock: React.FC<DraggableQuickDockProps> = ({
  visible,
  deviceMode,
  accentTheme,
  eyeComfort,
  ambientRain,
  onChangeAccentTheme,
  onToggleEyeComfort,
  onToggleAmbientRain,
  onOpenDeviceSelector,
  onOpenSecurityShield,
  onCaptureSnapshot,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [pos, setPos] = useState<FloatingPos>(() => {
    try {
      const raw = localStorage.getItem(DOCK_POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FloatingPos;
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // default below
    }
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(16, window.innerWidth - 360),
        y: Math.max(84, window.innerHeight - 92),
      };
    }
    return { x: 24, y: 120 };
  });

  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => {
      const rect = dockRef.current?.getBoundingClientRect();
      setPos((p) =>
        clampFloatingPosition(
          p,
          rect?.width || 320,
          rect?.height || 56,
          window.innerWidth,
          window.innerHeight
        )
      );
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!visible) return null;

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOffsetRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOffsetRef.current) return;
    const rect = dockRef.current?.getBoundingClientRect();
    const clamped = clampFloatingPosition(
      { x: e.clientX - dragOffsetRef.current.dx, y: e.clientY - dragOffsetRef.current.dy },
      rect?.width || 320,
      rect?.height || 56,
      window.innerWidth,
      window.innerHeight
    );
    setPos(clamped);
  };

  const handleDragEnd = () => {
    if (!dragOffsetRef.current) return;
    dragOffsetRef.current = null;
    try {
      localStorage.setItem(DOCK_POS_KEY, JSON.stringify(pos));
    } catch {
      // ignore
    }
  };

  const DeviceIcon =
    deviceMode === 'tv' ? Tv : deviceMode === 'mobile' ? Smartphone : Monitor;

  return (
    <div
      ref={dockRef}
      dir="rtl"
      data-testid="draggable-quick-dock"
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-40 select-none"
    >
      {colorsOpen && !minimized && (
        <div
          data-testid="accent-theme-picker"
          className="mb-2 flex items-center gap-1.5 rounded-2xl border border-white/15 bg-[#0D121F]/95 p-2 shadow-2xl"
        >
          {(Object.keys(ACCENT_THEMES) as AccentThemeId[]).map((id) => {
            const item = ACCENT_THEMES[id];
            return (
              <button
                key={id}
                type="button"
                data-testid={`accent-swatch-${id}`}
                title={item.label}
                aria-label={`تغيير اللون إلى ${item.label}`}
                onClick={() => {
                  onChangeAccentTheme(id);
                  setColorsOpen(false);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
                  accentTheme === id ? 'scale-110 border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: item.swatch }}
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-[#0C111E]/95 px-2 py-1.5 text-xs text-slate-100 shadow-2xl">
        {/* Draggable Handle */}
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          title="اسحب لتحريك شريط الأدوات لأي مكان"
          className="flex cursor-grab items-center rounded-lg p-1.5 text-slate-400 active:cursor-grabbing hover:bg-white/10 hover:text-white"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </div>

        {!minimized ? (
          <>
            <button
              type="button"
              data-testid="dock-theme-btn"
              onClick={() => setColorsOpen((v) => !v)}
              title="تغيير لون التطبيق"
              aria-label="تغيير لون التطبيق"
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Palette className="h-3.5 w-3.5" style={{ color: ACCENT_THEMES[accentTheme].primary }} />
              <span className="hidden sm:inline">اللون</span>
            </button>

            <button
              type="button"
              data-testid="dock-snapshot-btn"
              onClick={onCaptureSnapshot}
              title="التقاط صورة الآن"
              aria-label="التقاط صورة الآن"
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Camera className="h-3.5 w-3.5 text-sky-300" />
              <span className="hidden sm:inline">لقطة الآن</span>
            </button>

            <button
              type="button"
              data-testid="dock-eye-comfort-btn"
              onClick={onToggleEyeComfort}
              aria-pressed={eyeComfort}
              title={eyeComfort ? 'إيقاف فلتر راحة العين الليلي' : 'تفعيل فلتر راحة العين الليلي'}
              aria-label="فلتر راحة العين الليلي"
              className={`inline-flex items-center rounded-xl px-2 py-1.5 transition-colors ${
                eyeComfort
                  ? 'bg-amber-500/25 text-amber-300'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              data-testid="dock-ambient-rain-btn"
              onClick={onToggleAmbientRain}
              aria-pressed={ambientRain}
              title={ambientRain ? 'إيقاف صوت المطر الهادئ' : 'تشغيل صوت مطر هادئ للتركيز والقراءة'}
              aria-label="صوت مطر هادئ"
              className={`inline-flex items-center rounded-xl px-2 py-1.5 transition-colors ${
                ambientRain
                  ? 'bg-sky-500/25 text-sky-300'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CloudRain className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenDeviceSelector}
              title="تغيير وضع الجهاز (تلفزيون / هاتف / كمبيوتر)"
              aria-label="تغيير وضع الجهاز"
              className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <DeviceIcon className="h-3.5 w-3.5 text-[#F5C76B]" />
            </button>

            <button
              type="button"
              onClick={onOpenSecurityShield}
              title="درع الأمان"
              aria-label="درع الأمان"
              className="inline-flex items-center rounded-xl px-2 py-1.5 text-emerald-300 hover:bg-white/10"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setColorsOpen(false);
                setMinimized(true);
              }}
              aria-label="تصغير الشريط العائم"
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMinimized(false)}
            className="px-2 py-1 text-[11px] font-extrabold text-[#F5C76B]"
          >
            أدوات سريعة
          </button>
        )}
      </div>
    </div>
  );
};
