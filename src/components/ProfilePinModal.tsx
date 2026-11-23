import { useEffect, useState } from 'react';
import { KeyRound, Lock, ShieldCheck, Unlock, X } from 'lucide-react';
import { hashPin, isValidPin } from '../utils/cinemaProUtils';

interface ProfilePinModalProps {
  open: boolean;
  mode: 'setup' | 'verify';
  existingPinHash?: string;
  verifyReason?: string;
  onSavePin: (newPinHash: string | undefined) => void;
  onVerified: () => void;
  onClose: () => void;
}

export function ProfilePinModal({
  open,
  mode,
  existingPinHash,
  verifyReason,
  onSavePin,
  onVerified,
  onClose,
}: ProfilePinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPin('');
    setConfirmPin('');
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mode, onClose]);

  if (!open) return null;

  const hasPin = Boolean(existingPinHash);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidPin(pin)) {
      setError('يجب إدخال رمز PIN مكوّن من 4 أرقام بالضبط.');
      return;
    }

    if (mode === 'verify') {
      if (hashPin(pin) !== existingPinHash) {
        setError('رمز PIN غير صحيح — يرجى المحاولة مجدداً.');
        return;
      }
      onVerified();
      onClose();
      return;
    }

    // Setup mode
    if (pin !== confirmPin) {
      setError('رمزا PIN غير متطابقين.');
      return;
    }
    onSavePin(hashPin(pin));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-[#D4AF37]/35 bg-[#0D0D13] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/12 text-[#D4AF37]">
              {mode === 'verify' ? (
                <Lock className="h-5 w-5" aria-hidden="true" />
              ) : (
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="pin-modal-title" className="text-base font-black text-[#F4F3EF]">
                {mode === 'verify'
                  ? 'التحقق من رمز قفل العائلة (PIN)'
                  : hasPin
                  ? 'تعديل أو إلغاء رمز القفل (PIN)'
                  : 'تعيين رمز قفل العائلة (PIN)'}
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                {mode === 'verify'
                  ? verifyReason || 'أدخل الرمز المكون من 4 أرقام للمتابعة'
                  : 'يحمي وضع الأطفال ويمنع إيقاف الحماية العائلية بدون إذنك'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة رمز PIN"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#171722] text-[#D6D5CE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pin-input" className="block text-xs font-bold text-[#D6D5CE]">
              {mode === 'verify' ? 'أدخل رمز PIN (4 أرقام)' : 'رمز PIN الجديد (4 أرقام)'}
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              dir="ltr"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="w-full rounded-xl border border-white/15 bg-[#08080D] py-3 text-center font-mono text-2xl tracking-[0.55em] text-[#F4F3EF] focus:border-[#D4AF37]"
            />
          </div>

          {mode === 'setup' && (
            <div className="space-y-1.5">
              <label htmlFor="pin-confirm" className="block text-xs font-bold text-[#D6D5CE]">
                تأكيد رمز PIN
              </label>
              <input
                id="pin-confirm"
                type="password"
                inputMode="numeric"
                maxLength={4}
                dir="ltr"
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="••••"
                className="w-full rounded-xl border border-white/15 bg-[#08080D] py-3 text-center font-mono text-2xl tracking-[0.55em] text-[#F4F3EF] focus:border-[#D4AF37]"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#D4AF37] py-2.5 text-sm font-black text-[#060608] hover:bg-[#E5C158]"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>{mode === 'verify' ? 'تأكيد وفتح القفل' : 'حفظ رمز القفل'}</span>
            </button>

            {mode === 'setup' && hasPin && (
              <button
                type="button"
                onClick={() => {
                  onSavePin(undefined);
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/12 px-4 py-2.5 text-xs font-extrabold text-rose-300 hover:bg-rose-500/20"
              >
                <Unlock className="h-4 w-4" aria-hidden="true" />
                <span>إلغاء القفل</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
