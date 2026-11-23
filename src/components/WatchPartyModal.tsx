import { useEffect, useState } from 'react';
import { Copy, Play, Users, X } from 'lucide-react';
import type { MediaItem } from '../types/cinema';
import {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '../utils/cinemaProUtils';

interface WatchPartyModalProps {
  open: boolean;
  defaultUserName: string;
  featuredItems: MediaItem[];
  onCreateParty: (roomCode: string, userName: string, mediaItem: MediaItem) => void;
  onJoinParty: (roomCode: string, userName: string) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function WatchPartyModal({
  open,
  defaultUserName,
  featuredItems,
  onCreateParty,
  onJoinParty,
  onClose,
  onToast,
}: WatchPartyModalProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [userName, setUserName] = useState(defaultUserName || 'مشاهد فالدريون');
  const [createdCode, setCreatedCode] = useState(() => generateRoomCode(6));
  const [joinCode, setJoinCode] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>(
    () => featuredItems[0]?.id || ''
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCreatedCode(generateRoomCode(6));
    if (!selectedItemId && featuredItems[0]) {
      setSelectedItemId(featuredItems[0].id);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, featuredItems, selectedItemId, onClose]);

  if (!open) return null;

  const selectedItem =
    featuredItems.find((it) => it.id === selectedItemId) || featuredItems[0];

  const handleCopyInvite = async () => {
    const url = `${window.location.origin}${window.location.pathname}?party=${createdCode}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast(`تم نسخ رابط الدعوة للغرفة (${createdCode})`);
    } catch {
      onToast(`رمز الغرفة: ${createdCode}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-party-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-[#D4AF37]/35 bg-[#0D0D13] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/45 bg-[#D4AF37]/12 text-[#D4AF37]">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="watch-party-modal-title"
                className="text-lg font-black text-[#F4F3EF]"
              >
                غرفة المشاهدة الجماعية (Watch Party)
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                شاهد الأفلام والمباريات مع أصدقائك بتزامن لحظي ودردشة وتفاعلات حيّة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المشاهدة الجماعية"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#171722] text-[#D6D5CE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-[#13131C] p-1">
          <button
            type="button"
            onClick={() => {
              setTab('create');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-extrabold transition-colors ${
              tab === 'create'
                ? 'bg-[#D4AF37] text-[#060608]'
                : 'text-[#9B9AA2] hover:text-white'
            }`}
          >
            إنشاء غرفة جديدة
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('join');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-extrabold transition-colors ${
              tab === 'join'
                ? 'bg-[#D4AF37] text-[#060608]'
                : 'text-[#9B9AA2] hover:text-white'
            }`}
          >
            الانضمام برمز غرفة
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

        <div className="space-y-1.5">
          <label htmlFor="wp-name" className="block text-xs font-bold text-[#D6D5CE]">
            اسمك داخل الغرفة
          </label>
          <input
            id="wp-name"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="مثال: ليث"
            className="w-full rounded-xl border border-white/12 bg-[#08080D] px-3.5 py-2.5 text-sm text-[#F4F3EF] focus:border-[#D4AF37]"
          />
        </div>

        {tab === 'create' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#12121B] px-4 py-3">
              <div>
                <div className="text-[11px] text-[#9B9AA2]">رمز الغرفة الجاهز</div>
                <div dir="ltr" className="font-mono text-xl font-black tracking-[0.22em] text-[#D4AF37]">
                  {createdCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B1B27] px-3 py-2 text-xs font-bold text-[#F4F3EF] hover:border-[#D4AF37]"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>نسخ رابط الدعوة</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wp-media" className="block text-xs font-bold text-[#D6D5CE]">
                اختر الفيلم أو القناة لبدء العرض الجماعي
              </label>
              <select
                id="wp-media"
                value={selectedItem?.id || ''}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-[#08080D] px-3.5 py-2.5 text-xs font-semibold text-[#F4F3EF] focus:border-[#D4AF37]"
              >
                {featuredItems.slice(0, 30).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kind === 'live' ? '🔴 مباشر: ' : '🎬 '}
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!selectedItem) {
                  setError('يرجى اختيار عمل متاح للتشغيل أولاً.');
                  return;
                }
                onCreateParty(
                  createdCode,
                  userName.trim() || 'مضيف فالدريون',
                  selectedItem
                );
                onClose();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#DC143C] py-3 text-sm font-black text-white hover:bg-[#EF234B]"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>ابدأ غرفة المشاهدة الآن</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="wp-join-code" className="block text-xs font-bold text-[#D6D5CE]">
                أدخل رمز الغرفة (6 أحرف/أرقام)
              </label>
              <input
                id="wp-join-code"
                type="text"
                dir="ltr"
                value={joinCode}
                onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
                placeholder="VALDR9"
                className="w-full rounded-xl border border-white/12 bg-[#08080D] py-3 text-center font-mono text-xl font-black tracking-[0.28em] text-[#D4AF37] focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const clean = normalizeRoomCode(joinCode);
                if (!isValidRoomCode(clean)) {
                  setError('يرجى إدخال رمز غرفة صالح (من 4 إلى 8 أحرف أو أرقام).');
                  return;
                }
                onJoinParty(clean, userName.trim() || 'مشاهد فالدريون');
                onClose();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] py-3 text-sm font-black text-[#060608] hover:bg-[#E5C158]"
            >
              <Users className="h-4 w-4" />
              <span>انضم إلى الغرفة الآن</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
