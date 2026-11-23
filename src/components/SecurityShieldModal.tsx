import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { BRAND_ASSETS } from '../data/showcaseCatalog';
import {
  evaluateLockoutOnFailure,
  getRemainingLockoutSeconds,
  hashAppPasscode,
  verifyAppPasscode,
  type AppLockCredential,
  type LockoutState,
  type SecurityShieldConfig,
} from '../utils/securityShield';

interface AppLockOverlayProps {
  locked: boolean;
  credential: AppLockCredential | null;
  onUnlockSuccess: () => void;
  onFailedAttempt?: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
  locked,
  credential,
  onUnlockSuccess,
  onFailedAttempt,
}) => {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [lockout, setLockout] = useState<LockoutState>({
    failedAttempts: 0,
    lockedUntilMs: 0,
  });
  const [remainingSec, setRemainingSec] = useState(0);

  useEffect(() => {
    if (!locked) return undefined;
    const tick = () => {
      setRemainingSec(getRemainingLockoutSeconds(lockout));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [locked, lockout]);

  if (!locked || !credential) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wait = getRemainingLockoutSeconds(lockout);
    if (wait > 0) {
      setErrorMsg(`الحماية النشطة مفعّلة — انتظر ${wait} ثانية قبل المحاولة مجدداً.`);
      return;
    }
    if (!passcode.trim()) {
      setErrorMsg('أدخل رمز فك القفل للمتابعة.');
      return;
    }
    setChecking(true);
    setErrorMsg('');
    try {
      const ok = await verifyAppPasscode(passcode, credential);
      if (ok) {
        setPasscode('');
        setLockout({ failedAttempts: 0, lockedUntilMs: 0 });
        onUnlockSuccess();
      } else {
        const res = evaluateLockoutOnFailure(lockout);
        setLockout(res.next);
        onFailedAttempt?.();
        setErrorMsg(
          res.waitSeconds > 0
            ? `رمز غير صحيح — تم تفعيل قفل الأمان المؤقت لمدة ${res.waitSeconds} ثانية.`
            : `رمز القفل غير صحيح (محاولة ${res.next.failedAttempts} من 3).`
        );
        setPasscode('');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="valdrion-lock-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070605] p-4 text-[#F6ECDA]"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#D9A441]/35 bg-[#120F0B] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-[#D9A441]/80 bg-[#0B0907] shadow-[0_0_28px_rgba(217,164,65,0.28)]">
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار فالدريون"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>درع فالدريون مقفول · PBKDF2-SHA256</span>
          </div>
          <h1 id="valdrion-lock-title" className="mt-3 text-xl font-black text-white">
            التطبيق محمي بقفل الأمان الفائق
          </h1>
          <p className="mt-1 text-xs text-[#B5A78F]">
            أدخل رمز القفل الخاص بك لفتح فالدريون واستعادة جلستك الآمنة.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-3">
          <div>
            <label htmlFor="valdrion-unlock-input" className="mb-1.5 block text-xs font-bold text-[#F6ECDA]">
              رمز فك القفل
            </label>
            <input
              id="valdrion-unlock-input"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={remainingSec > 0 || checking}
              placeholder="أدخل رمز القفل..."
              className="w-full rounded-xl border border-[#D9A441]/35 bg-[#090806] px-4 py-3 text-center text-base font-bold tracking-[0.25em] text-white outline-none focus:border-[#F5C76B] disabled:opacity-50"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-center text-xs font-bold text-rose-200">
              {errorMsg}
            </p>
          )}

          {remainingSec > 0 && (
            <p className="text-center text-xs font-bold text-amber-300">
              الوقت المتبقي قبل المحاولة التالية: {remainingSec} ثانية
            </p>
          )}

          <button
            type="submit"
            disabled={checking || remainingSec > 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#D9A441] to-[#F5C76B] px-4 py-3 text-sm font-black text-[#0B0907] transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            <Unlock className="h-4 w-4" aria-hidden="true" />
            <span>{checking ? 'جاري التحقق المشفّر...' : 'فك القفل وفتح فالدريون'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

interface SecurityShieldModalProps {
  open: boolean;
  onClose: () => void;
  config: SecurityShieldConfig;
  onChangeConfig: (next: SecurityShieldConfig) => void;
  onLockNow: () => void;
  onEmergencyWipe: () => void;
  onLogEvent: (
    category: 'lock' | 'oauth' | 'account_search' | 'secret_guard' | 'wipe',
    titleAr: string,
    detailAr: string,
    severity?: 'info' | 'success' | 'warn'
  ) => void;
  onToast: (msg: string) => void;
}

export const SecurityShieldModal: React.FC<SecurityShieldModalProps> = ({
  open,
  onClose,
  config,
  onChangeConfig,
  onLockNow,
  onEmergencyWipe,
  onLogEvent,
  onToast,
}) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!open) return null;

  const hasLock = Boolean(config.credential);

  const handleSavePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPass.trim().length < 4) {
      setPassError('يجب أن يتكون رمز القفل من 4 خانات على الأقل.');
      return;
    }
    if (newPass.trim() !== confirmPass.trim()) {
      setPassError('رمزا القفل غير متطابقين.');
      return;
    }
    setSavingPass(true);
    try {
      const cred = await hashAppPasscode(newPass.trim());
      onChangeConfig({
        ...config,
        credential: cred,
      });
      onLogEvent(
        'lock',
        hasLock ? 'تم تحديث رمز القفل الرئيسي' : 'تم تفعيل قفل الأمان الفائق (PBKDF2)',
        'تشفير 210,000 جولة مع ملح عشوائي وحماية ضد التخمين.',
        'success'
      );
      setNewPass('');
      setConfirmPass('');
      onToast('تم تفعيل قفل الأمان الفائق بنجاح! يمكنك القفل السريع عبر Ctrl+Shift+L');
    } catch (err) {
      setPassError(err instanceof Error ? err.message : 'تعذّر حفظ رمز القفل.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleRemovePasscode = () => {
    onChangeConfig({ ...config, credential: null });
    onLogEvent('lock', 'تم إلغاء قفل التطبيق الرئيسي', 'يمكنك إعادة تفعيله في أي وقت.', 'warn');
    onToast('تم إلغاء قفل التطبيق الرئيسي.');
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-shield-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#D9A441]/30 bg-[#0B101B] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/15 text-emerald-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="security-shield-title" className="text-base font-black text-white">
                درع الأمان الفائق — VALDRION Shield
              </h2>
              <p className="text-xs text-slate-400">
                حماية متعددة الطبقات · قفل PBKDF2 · تشفير OAuth بالخادم · منع تسريب الأسرار
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق درع الأمان"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Active Protections Matrix */}
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              {
                title: 'تشفير جلسات التواصل AES-256-GCM',
                desc: 'رموز OAuth مشفّرة بالكامل على الخادم ولا تُخزّن أبداً في المتصفح',
              },
              {
                title: 'حارس معدل الطلبات (Rate Shield)',
                desc: 'حماية نشطة ضد محاولات الإغراق والتخمين الآلي على الخادم',
              },
              {
                title: 'التحقق الصريح قبل بحث الحساب',
                desc: 'لا يُسمح لأي وكيل بالبحث في حساباتك دون موافقتك الصريحة',
              },
              {
                title: 'تصفية روابط الشبكة الداخلية',
                desc: 'فحص صارم لجميع الروابط الخارجية قبل أي اتصال من الخادم',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </section>

          {/* Master App Lock (PBKDF2-SHA256) */}
          <section className="space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-black text-white">
                    قفل التطبيق الرئيسي (PBKDF2-SHA256 · 210,000 جولة)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    اختصار القفل الفوري من أي مكان: <span dir="ltr" className="font-mono text-amber-300">Ctrl + Shift + L</span>
                  </p>
                </div>
              </div>
              {hasLock && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLockNow();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-[#0B0907] hover:bg-amber-400"
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>اقفل التطبيق الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePasscode}
                    className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 hover:border-rose-500/50 hover:text-rose-300"
                  >
                    إلغاء القفل
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={(e) => void handleSavePasscode(e)} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder={hasLock ? 'رمز قفل جديد...' : 'أنشئ رمز قفل (4+ خانات)...'}
                aria-label="رمز القفل الجديد"
                className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="تأكيد رمز القفل..."
                aria-label="تأكيد رمز القفل"
                className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={savingPass || !newPass.trim() || !confirmPass.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-45"
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{savingPass ? 'جاري التشفير...' : hasLock ? 'تحديث الرمز' : 'تفعيل القفل'}</span>
              </button>
            </form>

            {passError && (
              <p role="alert" className="text-xs font-bold text-rose-300">
                {passError}
              </p>
            )}

            {/* Idle Auto-Lock Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>القفل التلقائي عند عدم الاستخدام</span>
              </span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { val: 0, label: 'يدوي' },
                    { val: 1, label: '1 دقيقة' },
                    { val: 5, label: '5 دقائق' },
                    { val: 15, label: '15 دقيقة' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => onChangeConfig({ ...config, idleLockMinutes: opt.val })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      config.idleLockMinutes === opt.val
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Secret Leak Prevention Toggle */}
          <section className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] px-4 py-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-white">
                  درع منع تسريب المفاتيح والبطاقات قبل الإرسال للذكاء
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  يكشف تلقائياً مفاتيح API ورموز الجلسات وأرقام البطاقات البنكية ويحجبها قبل مغادرة جهازك.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextVal = !config.secretLeakGuard;
                onChangeConfig({ ...config, secretLeakGuard: nextVal });
                onToast(
                  nextVal
                    ? 'تم تفعيل درع منع تسريب الأسرار تلقائياً.'
                    : 'تم إيقاف الحجب التلقائي للأسرار.'
                );
              }}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-black ${
                config.secretLeakGuard
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {config.secretLeakGuard ? 'مفعّل' : 'متوقف'}
            </button>
          </section>

          {/* Security Audit Log */}
          <section className="space-y-2 rounded-xl border border-slate-800 bg-[#111827] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white">
                سجل الأمان والتدقيق الفوري ({config.auditLog.length})
              </h3>
              {config.auditLog.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeConfig({ ...config, auditLog: [] })}
                  className="text-[11px] font-bold text-slate-400 hover:text-white"
                >
                  تنظيف السجل
                </button>
              )}
            </div>
            {config.auditLog.length === 0 ? (
              <p className="text-xs text-slate-500">
                لا توجد أحداث أمنية مسجّلة بعد — ستظهر هنا عمليات القفل، وربط OAuth، وبحث الحساب، ومنع التسريب.
              </p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {config.auditLog.slice(0, 12).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-[#090D16] px-3 py-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <p
                        className={`font-bold ${
                          ev.severity === 'warn'
                            ? 'text-amber-300'
                            : ev.severity === 'success'
                            ? 'text-emerald-300'
                            : 'text-slate-200'
                        }`}
                      >
                        {ev.titleAr}
                      </p>
                      <p className="text-slate-400">{ev.detailAr}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {new Date(ev.ts).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Emergency Zero-Trace Wipe */}
          <section className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-black text-rose-200">
                    مسح الطوارئ الفوري (Zero-Trace Wipe)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-rose-200/75">
                    يفصل جميع جلسات التواصل الاجتماعي المربوطة ويمسح ذاكرة المحادثات والبيانات المحلية فوراً.
                  </p>
                </div>
              </div>
              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/45 bg-rose-500/15 px-3 py-1.5 text-xs font-black text-rose-200 hover:bg-rose-500/25"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>مسح طوارئ</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmWipe(false);
                      onClose();
                      onEmergencyWipe();
                    }}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-500"
                  >
                    تأكيد المسح الكامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300"
                  >
                    تراجع
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
