import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { generateAiAudioBrief, streamAiStudio } from '../services/xtreamApi';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: SpeechRecognitionResultItem;
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface LiveVoiceOverlayProps {
  open: boolean;
  brainContext: string;
  userName?: string;
  onClose: () => void;
  onCommitExchange?: (userText: string, assistantText: string) => void;
}

type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export function LiveVoiceOverlay({
  open,
  brainContext,
  userName,
  onClose,
  onCommitExchange,
}: LiveVoiceOverlayProps) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [lang, setLang] = useState<'ar-SA' | 'en-US'>('ar-SA');
  const [muted, setMuted] = useState(false);
  const [autoResume, setAutoResume] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [typedFallback, setTypedFallback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  }, []);

  const startListeningRef = useRef<() => void>(() => {});

  const speakReply = useCallback(
    async (text: string) => {
      const clean = text
        .replace(/```[\s\S]*?```/g, ' تم تجهيز الكود لك في المحادثة. ')
        .replace(/[#*_`>~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 700);

      if (!clean || muted || !openRef.current) {
        setPhase('idle');
        if (autoResume && openRef.current) {
          setTimeout(() => startListeningRef.current(), 450);
        }
        return;
      }

      setPhase('speaking');
      try {
        const res = await generateAiAudioBrief({
          text: clean,
          format: 'single',
          voice: 'Kore',
        });
        if (!openRef.current) return;
        const audio = new Audio(res.audioDataUrl);
        audioRef.current = audio;
        audio.onended = () => {
          audioRef.current = null;
          if (!openRef.current) return;
          setPhase('idle');
          if (autoResume) {
            setTimeout(() => startListeningRef.current(), 350);
          }
        };
        audio.onerror = () => {
          audioRef.current = null;
          setPhase('idle');
        };
        await audio.play();
        return;
      } catch {
        // Instant browser speechSynthesis fallback
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && openRef.current) {
          const utter = new SpeechSynthesisUtterance(clean);
          utter.lang = lang;
          utter.rate = 1.03;
          utter.onend = () => {
            if (!openRef.current) return;
            setPhase('idle');
            if (autoResume) {
              setTimeout(() => startListeningRef.current(), 350);
            }
          };
          utter.onerror = () => setPhase('idle');
          window.speechSynthesis.speak(utter);
          return;
        }
        setPhase('idle');
      }
    },
    [autoResume, lang, muted]
  );

  const sendVoiceTurn = useCallback(
    async (spokenText: string) => {
      const clean = spokenText.trim();
      if (!clean) return;
      stopListening();
      stopPlayback();
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setErrorMsg('');
      setTranscript(clean);
      setAssistantText('');
      setPhase('thinking');

      const nextHist = [...history.slice(-8), { role: 'user' as const, text: clean }];
      setHistory(nextHist);

      let collected = '';
      try {
        await streamAiStudio(
          {
            mode: 'general',
            depth: 'fast',
            webSearch: true,
            brainContext: `${brainContext}\n\n[وضع المحادثة الصوتية الحية]: أجب بأسلوب صوتي طبيعي وذكي ومباشر (من جملتين إلى 5 جمل واضحة) بدون رموز ماركداون معقّدة لأن ردك سيُقرأ بصوت عالٍ فوراً.`,
            message: clean,
            history: history.slice(-6),
          },
          {
            onChunk: (delta) => {
              collected += delta;
              setAssistantText(collected);
            },
            onDone: () => {
              // handled below
            },
          },
          controller.signal
        );

        const finalText = collected.trim() || 'حسناً، أنا أستمع إليك.';
        setAssistantText(finalText);
        setHistory((prev) => [...prev.slice(-9), { role: 'assistant', text: finalText }]);
        onCommitExchange?.(clean, finalText);
        await speakReply(finalText);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setErrorMsg(err instanceof Error ? err.message : 'تعذّر إكمال المحادثة الصوتية حالياً.');
        setPhase('idle');
      }
    },
    [brainContext, history, onCommitExchange, speakReply, stopListening, stopPlayback]
  );

  const startListening = useCallback(() => {
    if (!openRef.current) return;
    stopPlayback();
    stopListening();
    setErrorMsg('');

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      setErrorMsg('المتصفح لا يدعم التقاط الميكروفون التلقائي — يمكنك الكتابة بالأسفل وسأجيبك بصوت حي!');
      setPhase('idle');
      return;
    }

    try {
      const rec = new Rec();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = true;

      let latestFinal = '';
      let latestInterim = '';

      rec.onresult = (ev) => {
        let interim = '';
        let finalStr = '';
        for (let i = 0; i < ev.results.length; i++) {
          const item = ev.results[i];
          const text = item?.[0]?.transcript || '';
          if (item?.isFinal) finalStr += text + ' ';
          else interim += text + ' ';
        }
        if (finalStr.trim()) latestFinal = finalStr.trim();
        latestInterim = interim.trim();
        setTranscript(latestFinal || latestInterim);
      };

      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed') {
          setErrorMsg('يرجى السماح بصلاحية الميكروفون للمتصفح أو الكتابة مباشرة بالأسفل.');
        }
        setPhase('idle');
      };

      rec.onend = () => {
        recognitionRef.current = null;
        const spoken = (latestFinal || latestInterim).trim();
        if (spoken && openRef.current) {
          void sendVoiceTurn(spoken);
        } else if (openRef.current) {
          setPhase('idle');
        }
      };

      recognitionRef.current = rec;
      setPhase('listening');
      rec.start();
    } catch {
      setErrorMsg('تعذّر تشغيل الميكروفون — استخدم مربع الكتابة السريعة بالأسفل وسأتحدث معك بصوتي.');
      setPhase('idle');
    }
  }, [lang, sendVoiceTurn, stopListening, stopPlayback]);

  startListeningRef.current = startListening;

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      stopListening();
      stopPlayback();
      setPhase('idle');
      return;
    }
    setTranscript('');
    setAssistantText(
      userName
        ? `أهلاً بك يا ${userName} — اضغط على الميكروفون وتحدّث معي بحرية في أي موضوع.`
        : 'أهلاً بك في المحادثة الصوتية الحية — اضغط الميكروفون وتحدّث معي مباشرة.'
    );
  }, [open, stopListening, stopPlayback, userName]);

  if (!open) return null;

  const phaseLabel =
    phase === 'listening'
      ? 'أستمع إليك الآن...'
      : phase === 'thinking'
      ? 'أفكّر وأجهّز الإجابة...'
      : phase === 'speaking'
      ? 'أتحدث إليك الآن...'
      : 'جاهز للمحادثة الصوتية الحية';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="المحادثة الصوتية الحية مع عقل فالدريون"
      className="fixed inset-0 z-50 flex flex-col bg-[#0B0E14]/97 backdrop-blur-2xl"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#60A5FA]/25 to-[#A78BFA]/25 text-[#93C5FD]">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F1F5F9]">المحادثة الصوتية الحية · VALDRION LIVE</h2>
            <p className="text-xs text-[#94A3B8]">{phaseLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === 'ar-SA' ? 'en-US' : 'ar-SA'))}
            className="rounded-lg border border-white/10 bg-[#151A26] px-3 py-1.5 text-xs font-semibold text-[#E2E8F0] hover:border-[#60A5FA]/50"
          >
            {lang === 'ar-SA' ? 'العربية' : 'English'}
          </button>
          <button
            type="button"
            onClick={() => setAutoResume((p) => !p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              autoResume
                ? 'border-[#60A5FA]/50 bg-[#60A5FA]/15 text-[#BFDBFE]'
                : 'border-white/10 bg-[#151A26] text-[#94A3B8]'
            }`}
          >
            استماع متواصل: {autoResume ? 'مفعّل' : 'متوقف'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMuted((m) => {
                if (!m) stopPlayback();
                return !m;
              });
            }}
            aria-label={muted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            className="rounded-lg border border-white/10 bg-[#151A26] p-2 text-[#CBD5E1] hover:text-white"
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-[#60A5FA]" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المحادثة الصوتية"
            className="rounded-lg border border-white/10 bg-[#151A26] p-2 text-[#CBD5E1] hover:border-rose-400/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Center Luminous Acoustic Orb & Live Subtitles */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 text-center">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className={`absolute h-56 w-56 rounded-full blur-3xl transition-all duration-500 ${
              phase === 'listening'
                ? 'scale-110 bg-[#38BDF8]/30'
                : phase === 'speaking'
                ? 'scale-125 bg-[#818CF8]/35'
                : phase === 'thinking'
                ? 'scale-105 bg-[#F59E0B]/25'
                : 'scale-95 bg-[#60A5FA]/15'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              if (phase === 'listening') {
                stopListening();
                setPhase('idle');
              } else if (phase === 'speaking') {
                stopPlayback();
                setPhase('idle');
              } else if (phase === 'thinking') {
                abortRef.current?.abort();
                setPhase('idle');
              } else {
                startListening();
              }
            }}
            aria-label={phase === 'listening' ? 'إيقاف الاستماع' : 'ابدأ التحدث'}
            className={`relative flex h-40 w-40 flex-col items-center justify-center rounded-full border transition-all duration-300 ${
              phase === 'listening'
                ? 'scale-105 border-[#38BDF8] bg-gradient-to-br from-[#0EA5E9]/35 via-[#1E293B] to-[#6366F1]/30 shadow-[0_0_60px_rgba(56,189,248,0.45)]'
                : phase === 'speaking'
                ? 'scale-105 border-[#A78BFA] bg-gradient-to-br from-[#6366F1]/35 via-[#1E293B] to-[#38BDF8]/30 shadow-[0_0_60px_rgba(129,140,248,0.45)]'
                : phase === 'thinking'
                ? 'border-[#F59E0B]/70 bg-gradient-to-br from-[#F59E0B]/25 via-[#1E293B] to-[#0F172A]'
                : 'border-white/15 bg-gradient-to-br from-[#1B2234] to-[#0F131E] hover:border-[#60A5FA]/60'
            }`}
          >
            {phase === 'listening' ? (
              <Mic className="h-11 w-11 text-[#38BDF8]" />
            ) : phase === 'speaking' ? (
              <Volume2 className="h-11 w-11 text-[#A78BFA]" />
            ) : phase === 'thinking' ? (
              <Square className="h-9 w-9 text-[#F59E0B]" />
            ) : (
              <MicOff className="h-10 w-10 text-[#94A3B8]" />
            )}
            <span className="mt-2 text-xs font-bold text-[#E2E8F0]">
              {phase === 'listening'
                ? 'اضغط للإيقاف'
                : phase === 'speaking'
                ? 'مقاطعة الصوت'
                : phase === 'thinking'
                ? 'إيقاف'
                : 'اضغط وتحدّث'}
            </span>
          </button>
        </div>

        {/* Live Transcripts */}
        <div className="w-full max-w-2xl space-y-4">
          {transcript && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#141925] px-5 py-3 text-sm text-[#CBD5E1]">
              <span className="ml-2 text-xs font-semibold text-[#60A5FA]">أنت:</span>
              {transcript}
            </div>
          )}

          {assistantText && (
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-[#60A5FA]/20 bg-[#121723] px-6 py-4 text-base leading-relaxed text-[#F8FAFC]">
              {assistantText}
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-medium text-rose-400">{errorMsg}</p>
          )}
        </div>
      </div>

      {/* Bottom Fast Text-to-Voice Fallback Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!typedFallback.trim()) return;
          const q = typedFallback.trim();
          setTypedFallback('');
          void sendVoiceTurn(q);
        }}
        className="mx-auto flex w-full max-w-2xl items-center gap-2 px-5 pb-6"
      >
        <input
          type="text"
          value={typedFallback}
          onChange={(e) => setTypedFallback(e.target.value)}
          placeholder="أو اكتب سؤالك هنا وسأردّ عليك بصوت حيّ فوراً..."
          className="flex-1 rounded-full border border-white/12 bg-[#161B26] px-5 py-3 text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!typedFallback.trim() || phase === 'thinking'}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#3B82F6] px-5 text-xs font-bold text-white transition-colors hover:bg-[#2563EB] disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          <span>تحدّث</span>
        </button>
      </form>
    </div>
  );
}
