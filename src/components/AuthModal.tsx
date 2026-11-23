import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Cloud,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { BRAND_ASSETS } from '../data/showcaseCatalog';

interface AuthModalProps {
  open: boolean;
  user: User | null;
  authLoading: boolean;
  savedServersCount: number;
  favoritesCount: number;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<void>;
  onContinueAsGuest: () => void;
  onSignOut: () => Promise<void>;
}

export function AuthModal({
  open,
  user,
  authLoading,
  savedServersCount,
  favoritesCount,
  onClose,
  onSignInWithGoogle,
  onContinueAsGuest,
  onSignOut,
}: AuthModalProps) {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogleClick = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await onSignInWithGoogle();
      onClose();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('قام المتصفح بحظر النافذة المنبثقة — يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      } else {
        setErrorMsg('تعذّر إتمام تسجيل الدخول بحساب Google حالياً. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOutClick = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await onSignOut();
      onClose();
    } catch {
      setErrorMsg('حدث خطأ أثناء تسجيل الخروج.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#0E0E14] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار فالدريون"
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full border border-[#D4AF37]/70 object-cover"
            />
            <div>
              <h2
                id="auth-modal-title"
                className="text-base font-black text-[#F4F3EF]"
              >
                {user ? 'حساب فالدريون السحابي' : 'تسجيل الدخول إلى فالدريون'}
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                {user
                  ? 'مزامنة سحابية خاصة لسيرفراتك وقائمتك'
                  : 'سجّل بحساب Google أو تابع كضيف فوراً'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الحساب"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171720] text-[#D6D5CE] hover:border-[#D4AF37] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {authLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#D4AF37]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>جاري التحقق من حالة الحساب...</span>
            </div>
          ) : user ? (
            <div className="space-y-5">
              {/* Signed-In User Card */}
              <div className="flex items-center gap-4 rounded-xl border border-[#D4AF37]/30 bg-[#14141E] p-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'صورة الحساب'}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-full border border-[#D4AF37]/60 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/60 bg-[#1C1C28] text-[#D4AF37]">
                    <UserRound className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-extrabold text-[#F4F3EF]">
                    {user.displayName || 'مستخدم فالدريون'}
                  </div>
                  <div
                    dir="ltr"
                    className="truncate text-right text-xs text-[#9B9AA2]"
                  >
                    {user.email}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>المزامنة السحابية مفعّلة</span>
                  </div>
                </div>
              </div>

              {/* Account Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-white/[0.08] bg-[#12121A] p-3">
                  <div className="text-[11px] text-[#9B9AA2]">السيرفرات المحفوظة</div>
                  <div className="mt-1 font-mono-tabular text-lg font-black text-[#D4AF37]">
                    {savedServersCount}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#12121A] p-3">
                  <div className="text-[11px] text-[#9B9AA2]">قائمتي المفضلة</div>
                  <div className="mt-1 font-mono-tabular text-lg font-black text-[#F4F3EF]">
                    {favoritesCount}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleSignOutClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 py-3 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )}
                <span>تسجيل الخروج والعودة لوضع الضيف</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Benefits List */}
              <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-[#13131C] p-4 text-xs text-[#CFCED6]">
                <div className="flex items-start gap-2.5">
                  <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" aria-hidden="true" />
                  <span>
                    حفظ سيرفرات Xtream Codes وM3U الخاصة بك ومزامنة قائمتك المفضلة وقائمة السهرة سحابياً.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>
                    بياناتك وسيرفراتك معزولة وخاصة بحسابك فقط ولا يمكن لأي مستخدم آخر الوصول إليها.
                  </span>
                </div>
              </div>

              {/* Google Sign-In Primary Button */}
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleClick}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#111116] shadow-lg transition-colors hover:bg-[#F1F1F5] disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#111116]" />
                ) : (
                  <svg
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.29v-3.1H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.39l4-3.1Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1c.94-2.84 3.59-4.95 6.71-4.95Z"
                    />
                  </svg>
                )}
                <span>تسجيل الدخول بحساب Google</span>
              </button>

              <div className="flex items-center gap-3 text-[11px] text-[#7E7D86]">
                <span className="h-px flex-1 bg-white/10" />
                <span>أو</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {/* Guest Mode Button */}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onContinueAsGuest();
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#15151E] py-3 text-sm font-bold text-[#F4F3EF] transition-colors hover:border-[#D4AF37]/55 hover:text-[#D4AF37]"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span>المتابعة كضيف (حفظ محلي على جهازك)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
