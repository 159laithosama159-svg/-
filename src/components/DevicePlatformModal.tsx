import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  Download,
  Laptop,
  QrCode,
  RefreshCw,
  Smartphone,
  Tv,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { BRAND_ASSETS } from '../data/showcaseCatalog';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-xl border border-amber-400/50 bg-[#1A1408]/95 px-3.5 py-2 text-xs font-bold text-amber-200 shadow-2xl backdrop-blur-md md:bottom-5"
    >
      <WifiOff className="h-4 w-4 text-amber-400" aria-hidden="true" />
      <span>وضع عدم الاتصال — يتم استخدام البيانات المحفوظة محلياً</span>
    </div>
  );
}

interface PWAInstallButtonProps {
  onInstalled?: () => void;
  onOpenPlatformHub: () => void;
  compact?: boolean;
}

export function PWAInstallButton({
  onInstalled,
  onOpenPlatformHub,
  compact = false,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          const accepted = await install();
          if (accepted) onInstalled?.();
        }}
        aria-label="تثبيت تطبيق فالدريون على جهازك"
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D4AF37]/60 bg-[#D4AF37]/15 font-extrabold text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#060608] ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <button
        type="button"
        onClick={onOpenPlatformHub}
        aria-label="تثبيت فالدريون على iPhone و iPad"
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D4AF37]/45 bg-[#121218] px-3 py-1.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]"
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>تثبيت iOS</span>
      </button>
    );
  }

  return null;
}

interface DevicePlatformModalProps {
  open: boolean;
  tvMode: boolean;
  remotePairCode: string;
  remotePhonesConnected: number;
  onRegeneratePairCode: () => void;
  onOpenRemotePadHere: () => void;
  onToggleTvMode: () => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function DevicePlatformModal({
  open,
  tvMode,
  remotePairCode,
  remotePhonesConnected,
  onRegeneratePairCode,
  onOpenRemotePadHere,
  onToggleTvMode,
  onClose,
  onToast,
}: DevicePlatformModalProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const remoteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?remote=${remotePairCode}`
      : `?remote=${remotePairCode}`;

  useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(remoteUrl, {
      width: 180,
      margin: 1,
      color: { dark: '#0B0B10', light: '#F8F7F2' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, remoteUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopyRemoteLink = async () => {
    try {
      await navigator.clipboard.writeText(remoteUrl);
      onToast(`تم نسخ رابط الريموت (الرمز: ${remotePairCode})`);
    } catch {
      onToast(`رمز ربط الريموت: ${remotePairCode}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-hub-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#D4AF37]/35 bg-[#0D0D13] p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار فالدريون"
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-full border border-[#D4AF37]/70 object-cover"
            />
            <div>
              <h2
                id="device-hub-title"
                className="text-lg font-black text-[#F4F3EF]"
              >
                الأجهزة، شاشات السمارت، وريموت الهاتف (QR)
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                تثبيت كتطبيق مستقل (PWA) + وضع شاشات السمارت + ربط الهاتف كـ ريموت ولوحة مفاتيح
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الأجهزة"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#15151E] text-[#D6D5CE] hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Phone-to-TV QR Remote Control Pairing Card */}
        <div className="grid gap-4 rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-l from-[#D4AF37]/12 via-[#12121B] to-[#DC143C]/10 p-4 sm:grid-cols-12 sm:items-center">
          <div className="space-y-2.5 sm:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <QrCode className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
              <h3 className="text-sm font-black text-[#F4F3EF]">
                ربط الهاتف كـ ريموت كنترول للشاشة (Phone-to-TV Remote)
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                  remotePhonesConnected > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-[#C6C5CE]'
                }`}
              >
                <Wifi className="h-3 w-3" />
                {remotePhonesConnected > 0
                  ? `${remotePhonesConnected} هاتف متصل`
                  : 'جاهز للربط'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#BDBCC6]">
              امسح رمز QR بكاميرا هاتفك ليتحول هاتفك فوراً إلى ريموت كنترول ولوحة مفاتيح للبحث والتشغيل والتحكم بالذكاء الاصطناعي على هذه الشاشة.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                dir="ltr"
                className="rounded-lg border border-[#D4AF37]/45 bg-[#09090F] px-3 py-1.5 font-mono text-sm font-black tracking-[0.22em] text-[#D4AF37]"
              >
                {remotePairCode}
              </span>
              <button
                type="button"
                onClick={handleCopyRemoteLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#181824] px-3 py-1.5 text-xs font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>نسخ رابط الريموت</span>
              </button>
              <button
                type="button"
                onClick={onRegeneratePairCode}
                aria-label="تجديد رمز الربط"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#181824] px-2.5 py-1.5 text-xs font-bold text-[#C6C5CE] hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>تجديد</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRemotePadHere();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-black text-[#060608] hover:bg-[#E5C158]"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>فتح واجهة الريموت</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center sm:col-span-4">
            <div className="rounded-xl border-2 border-[#D4AF37]/60 bg-[#F8F7F2] p-2 shadow-xl">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`رمز QR لربط ريموت فالدريون — ${remotePairCode}`}
                  className="h-32 w-32 sm:h-36 sm:w-36"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center text-xs font-bold text-black">
                  QR...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direct Install Action Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.1] bg-[#12121A] p-4">
          <div className="space-y-1">
            <div className="text-sm font-extrabold text-[#F4F3EF]">
              {isInstalled
                ? 'التطبيق مثبّت ويعمل بوضع الشاشة الكاملة'
                : 'تثبيت فالدريون كتطبيق مستقل على جهازك (PWA)'}
            </div>
            <p className="text-xs text-[#C6C5CE]">
              {isInstalled
                ? 'أنت تستخدم النسخة المثبتة من فالدريون بدون شريط متصفح.'
                : 'يظهر بأيقونة التنين الإمبراطوري على شاشة الأندرويد أو سطح المكتب ويعمل بسلاسة فائقة.'}
            </p>
          </div>

          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-extrabold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>مثبّت وجاهز</span>
            </span>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={async () => {
                const ok = await install();
                if (ok) {
                  onToast('تم تثبيت تطبيق فالدريون على جهازك بنجاح!');
                  onClose();
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-xs font-black text-[#060608] hover:bg-[#E5C158]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>تثبيت الآن بنقرة واحدة</span>
            </button>
          ) : (
            <span className="text-xs font-bold text-[#D4AF37]">
              {isIOS
                ? 'iOS: اضغط مشاركة ← إضافة للشاشة الرئيسية'
                : 'من قائمة المتصفح (⋮) ← تثبيت التطبيق'}
            </span>
          )}
        </div>

        {/* Smart TV 10-Foot Mode Switch */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.09] bg-[#12121A] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]">
              <Tv className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-[#F4F3EF]">
                وضع شاشات السمارت والريموت (Smart TV / Android TV)
              </div>
              <p className="text-xs text-[#9B9AA2]">
                يُكبّر الخطوط وإطار التركيز الذهبي ويُفعّل التنقل الكامل بأسهم الريموت وزر OK للتشغيل.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={tvMode}
            onClick={onToggleTvMode}
            className={`shrink-0 rounded-lg px-4 py-2 text-xs font-extrabold transition-colors ${
              tvMode
                ? 'bg-[#D4AF37] text-[#060608]'
                : 'border border-white/15 bg-[#1B1B25] text-[#F4F3EF] hover:border-[#D4AF37]'
            }`}
          >
            {tvMode ? 'مفعّل (وضع الشاشة الذكية)' : 'تفعيل وضع السمارت TV'}
          </button>
        </div>

        {/* 3-Platform Quick Guide */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 rounded-xl border border-white/[0.08] bg-[#111118] p-3.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#D4AF37]">
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              <span>هواتف الأندرويد و iOS</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#BDBCC5]">
              تثبيت فوري من Chrome مع شريط تنقل سفلي، أو استخدام الهاتف كـ ريموت لشاشة السمارت عبر QR.
            </p>
          </div>

          <div className="space-y-1.5 rounded-xl border border-white/[0.08] bg-[#111118] p-3.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#D4AF37]">
              <Laptop className="h-4 w-4" aria-hidden="true" />
              <span>الكمبيوتر (Win / Mac)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#BDBCC5]">
              يدعم حتى 4 شاشات بث مباشر (Quad Multi-View)، استوديو الترجمة الذكية، وغرف المشاهدة الجماعية.
            </p>
          </div>

          <div className="space-y-1.5 rounded-xl border border-white/[0.08] bg-[#111118] p-3.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#D4AF37]">
              <Tv className="h-4 w-4" aria-hidden="true" />
              <span>شاشات السمارت (Smart TV)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#BDBCC5]">
              تنقل بالأسهم وOK، تحكم بالصوت والبحث عبر ريموت الهاتف QR، وزر B لحجب المشاهد فوراً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
