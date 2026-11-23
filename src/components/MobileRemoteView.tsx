import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  Sparkles,
  Tv,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { NavTab, RemoteControlCommand } from '../types/cinema';
import { realtimeClient } from '../services/realtimeClient';
import { normalizeRoomCode } from '../utils/cinemaProUtils';
import { BRAND_ASSETS } from '../data/showcaseCatalog';

interface MobileRemoteViewProps {
  initialPairCode: string;
  onExitRemote: () => void;
}

const REMOTE_TABS: Array<{ id: NavTab; label: string }> = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'movies', label: 'الأفلام' },
  { id: 'series', label: 'المسلسلات' },
  { id: 'live', label: 'مباشر' },
  { id: 'ai', label: 'فالدريون AI' },
  { id: 'mylist', label: 'قائمتي' },
];

export function MobileRemoteView({
  initialPairCode,
  onExitRemote,
}: MobileRemoteViewProps) {
  const [pairCode, setPairCode] = useState(() => normalizeRoomCode(initialPairCode));
  const [tvConnected, setTvConnected] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastFeedback, setLastFeedback] = useState('متصل بخادم الريموت...');

  useEffect(() => {
    if (!pairCode || pairCode.length < 4) return undefined;

    const sendJoin = () => {
      realtimeClient.send({ type: 'remote:join', pairCode });
    };

    const unsub = realtimeClient.subscribe((msg) => {
      if (msg.type === 'remote:status' && msg.pairCode === pairCode) {
        const connected = Boolean(msg.tvConnected);
        setTvConnected(connected);
        setLastFeedback(
          connected
            ? 'تم الربط بشاشة التلفزيون بنجاح — تحكّم الآن'
            : 'في انتظار فتح شاشة فالدريون بنفس الرمز...'
        );
      }
    }, sendJoin);

    sendJoin();
    return unsub;
  }, [pairCode]);

  const sendCommand = (command: RemoteControlCommand, feedback: string) => {
    realtimeClient.send({
      type: 'remote:cmd',
      pairCode,
      command,
    });
    setLastFeedback(feedback);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(18);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060609] text-[#F4F3EF]">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0C0C12] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src={BRAND_ASSETS.emblem}
            alt="شعار فالدريون"
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full border border-[#D4AF37]/70 object-cover"
          />
          <div>
            <h1 className="text-sm font-black text-[#F4F3EF]">
              ريموت فالدريون الذكي
            </h1>
            <div className="flex items-center gap-1.5 text-[11px]">
              {tvConnected ? (
                <Wifi className="h-3 w-3 text-emerald-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-amber-400" />
              )}
              <span className="font-mono-tabular text-[#D4AF37]">
                الرمز: {pairCode}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitRemote}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#151520] px-3 py-1.5 text-xs font-bold text-[#F4F3EF]"
        >
          <ChevronRight className="h-4 w-4" />
          <span>فتح التطبيق</span>
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-5">
        {/* Connection Status Pill */}
        <div
          role="status"
          className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
            tvConnected
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
          }`}
        >
          <span className="truncate">{lastFeedback}</span>
          <Tv className="h-4 w-4 shrink-0" />
        </div>

        {/* Change Pair Code */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            dir="ltr"
            value={pairCode}
            onChange={(e) => setPairCode(normalizeRoomCode(e.target.value))}
            placeholder="CODE"
            aria-label="رمز ربط الشاشة"
            className="w-32 rounded-xl border border-white/12 bg-[#12121A] px-3 py-2 text-center font-mono text-sm font-bold tracking-widest text-[#D4AF37]"
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCommand({ type: 'search', query: searchText }, `بحث على الشاشة: ${searchText || 'مسح'}`);
            }}
            className="flex flex-1 items-center gap-1.5"
          >
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="اكتب للبحث على الشاشة..."
              aria-label="البحث المباشر على الشاشة"
              className="w-full rounded-xl border border-white/12 bg-[#12121A] px-3 py-2 text-xs text-[#F4F3EF] placeholder:text-[#7E7D86]"
            />
            <button
              type="submit"
              aria-label="إرسال البحث للشاشة"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-[#060608]"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Quick TV Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {REMOTE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => sendCommand({ type: 'tab', tab: t.id }, `الانتقال إلى ${t.label}`)}
              className="rounded-xl border border-white/10 bg-[#12121B] py-2.5 text-xs font-extrabold text-[#E6E5DF] active:scale-95 active:border-[#D4AF37]"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Circular D-Pad Controller */}
        <div className="mx-auto grid w-60 grid-cols-3 grid-rows-3 gap-2.5 py-2">
          <div />
          <button
            type="button"
            aria-label="أعلى"
            onClick={() => sendCommand({ type: 'dpad', key: 'up' }, 'أعلى')}
            className="flex h-16 items-center justify-center rounded-2xl border border-white/12 bg-[#151522] text-[#F4F3EF] active:bg-[#D4AF37] active:text-[#060608]"
          >
            <ArrowUp className="h-6 w-6" />
          </button>
          <div />

          <button
            type="button"
            aria-label="يمين"
            onClick={() => sendCommand({ type: 'dpad', key: 'right' }, 'يمين')}
            className="flex h-16 items-center justify-center rounded-2xl border border-white/12 bg-[#151522] text-[#F4F3EF] active:bg-[#D4AF37] active:text-[#060608]"
          >
            <ArrowRight className="h-6 w-6" />
          </button>

          <button
            type="button"
            aria-label="موافق OK"
            onClick={() => sendCommand({ type: 'dpad', key: 'ok' }, 'اختيار / تشغيل OK')}
            className="flex h-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B68E23] text-base font-black text-[#060608] shadow-[0_0_24px_rgba(212,175,55,0.35)] active:scale-95"
          >
            OK
          </button>

          <button
            type="button"
            aria-label="يسار"
            onClick={() => sendCommand({ type: 'dpad', key: 'left' }, 'يسار')}
            className="flex h-16 items-center justify-center rounded-2xl border border-white/12 bg-[#151522] text-[#F4F3EF] active:bg-[#D4AF37] active:text-[#060608]"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <div />
          <button
            type="button"
            aria-label="أسفل"
            onClick={() => sendCommand({ type: 'dpad', key: 'down' }, 'أسفل')}
            className="flex h-16 items-center justify-center rounded-2xl border border-white/12 bg-[#151522] text-[#F4F3EF] active:bg-[#D4AF37] active:text-[#060608]"
          >
            <ArrowDown className="h-6 w-6" />
          </button>
          <div />
        </div>

        {/* Media Playback & Panic Shield Controls */}
        <div className="grid grid-cols-5 gap-2">
          <button
            type="button"
            aria-label="رجوع 10 ثوانٍ"
            onClick={() => sendCommand({ type: 'player', playerAction: 'seek_back' }, 'رجوع 10 ثوانٍ')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#14141F] py-3 text-[10px] font-bold"
          >
            <RotateCcw className="h-4 w-4 text-[#D4AF37]" />
            <span>-10ث</span>
          </button>
          <button
            type="button"
            aria-label="تشغيل أو إيقاف"
            onClick={() => sendCommand({ type: 'player', playerAction: 'toggle' }, 'تشغيل / إيقاف')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#DC143C] py-3 text-[10px] font-extrabold text-white"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>تشغيل</span>
          </button>
          <button
            type="button"
            aria-label="تقديم 10 ثوانٍ"
            onClick={() => sendCommand({ type: 'player', playerAction: 'seek_fwd' }, 'تقديم 10 ثوانٍ')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#14141F] py-3 text-[10px] font-bold"
          >
            <RotateCw className="h-4 w-4 text-[#D4AF37]" />
            <span>+10ث</span>
          </button>
          <button
            type="button"
            aria-label="كتم الصوت"
            onClick={() => sendCommand({ type: 'player', playerAction: 'mute' }, 'تبديل كتم الصوت')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#14141F] py-3 text-[10px] font-bold"
          >
            <VolumeX className="h-4 w-4 text-[#D6D5CE]" />
            <span>كتم</span>
          </button>
          <button
            type="button"
            aria-label="حجب فوري"
            onClick={() => sendCommand({ type: 'player', playerAction: 'panic' }, 'تبديل الحجب الفوري (B)')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#DC143C]/60 bg-[#DC143C]/15 py-3 text-[10px] font-extrabold text-rose-200"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>حجب B</span>
          </button>
        </div>

        {/* Send Prompt Directly to VALDRION AI on TV */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!aiPrompt.trim()) return;
            sendCommand(
              { type: 'ai_prompt', prompt: aiPrompt.trim() },
              'تم إرسال الأمر إلى فالدريون AI على الشاشة'
            );
            setAiPrompt('');
          }}
          className="space-y-2 rounded-2xl border border-[#D4AF37]/30 bg-[#101018] p-3.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#D4AF37]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>أرسل سؤالاً مباشراً إلى فالدريون AI على الشاشة</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="مثال: اقترح فيلم أكشن للسهرة..."
              className="flex-1 rounded-xl border border-white/10 bg-[#08080D] px-3 py-2 text-xs text-[#F4F3EF]"
            />
            <button
              type="submit"
              aria-label="إرسال إلى الذكاء الاصطناعي"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37] text-[#060608]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
