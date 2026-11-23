import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  CheckCircle2,
  ClipboardPaste,
  Cloud,
  FileCode2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import type { AccountInfo, ServerPingResult, ServerProfile } from '../types/cinema';
import { BRAND_ASSETS } from '../data/showcaseCatalog';
import {
  normalizeServerHost,
  parseSmartXtreamCredentials,
  validateXtreamForm,
  type ParsedXtreamCredential,
} from '../utils/cinemaLogic';
import { extractServersFromImage, pingServersBatch } from '../services/xtreamApi';

interface ServerManagerModalProps {
  open: boolean;
  user: User | null;
  servers: ServerProfile[];
  activeServerId: string;
  accountInfo: AccountInfo | null;
  syncState: { active: boolean; pct: number; message: string };
  onClose: () => void;
  onOpenAuth: () => void;
  onConnectServer: (server: ServerProfile) => Promise<void>;
  onAddAndConnectServer: (server: ServerProfile) => Promise<void>;
  onAddMultipleServers?: (servers: ServerProfile[], connectFirst?: boolean) => Promise<void>;
  onDeleteServer: (id: string) => void;
  onRestoreShowcase: () => Promise<void>;
}

export function ServerManagerModal({
  open,
  user,
  servers,
  activeServerId,
  accountInfo,
  syncState,
  onClose,
  onOpenAuth,
  onConnectServer,
  onAddAndConnectServer,
  onAddMultipleServers,
  onDeleteServer,
  onRestoreShowcase,
}: ServerManagerModalProps) {
  const [mode, setMode] = useState<'smart' | 'xtream' | 'm3u'>('smart');

  // Smart bulk paste fields
  const [smartRawText, setSmartRawText] = useState('');
  const [smartProxy, setSmartProxy] = useState(true);
  const [smartExtracted, setSmartExtracted] = useState<ParsedXtreamCredential[]>([]);

  // Xtream form fields
  const [srvName, setSrvName] = useState('');
  const [srvHost, setSrvHost] = useState('');
  const [srvUser, setSrvUser] = useState('');
  const [srvPass, setSrvPass] = useState('');
  const [srvProxy, setSrvProxy] = useState(true);

  // M3U form fields
  const [m3uName, setM3uName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uRaw, setM3uRaw] = useState('');
  const [m3uProxy, setM3uProxy] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const [pingMap, setPingMap] = useState<Record<string, ServerPingResult>>({});
  const [extractingImage, setExtractingImage] = useState(false);
  const [imageOcrHint, setImageOcrHint] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleRunPingCheck = async () => {
    if (pinging || servers.length === 0) return;
    setPinging(true);
    try {
      const results = await pingServersBatch(servers);
      setPingMap(results);
    } catch {
      // ignore network error
    } finally {
      setPinging(false);
    }
  };

  const fastestOnlineServer = servers
    .filter((s) => pingMap[s.id]?.ok && pingMap[s.id]?.latencyMs !== null)
    .sort(
      (a, b) =>
        (pingMap[a.id]?.latencyMs ?? 99999) - (pingMap[b.id]?.latencyMs ?? 99999)
    )[0];

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleXtreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateXtreamForm({
      name: srvName,
      host: srvHost,
      username: srvUser,
      password: srvPass,
    });
    if (!check.valid) {
      setFormError(check.error || 'يرجى التحقق من البيانات المدخلة.');
      return;
    }

    const newServer: ServerProfile = {
      id: `xtream_${Date.now()}`,
      name: srvName.trim(),
      type: 'xtream',
      host: normalizeServerHost(srvHost),
      username: srvUser.trim(),
      password: srvPass.trim(),
      useProxy: srvProxy,
      addedAt: Date.now(),
    };

    await onAddAndConnectServer(newServer);
    setSrvName('');
    setSrvHost('');
    setSrvUser('');
    setSrvPass('');
  };

  const handleM3USubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!m3uName.trim()) {
      setFormError('يرجى إدخال اسم لقائمة M3U.');
      return;
    }
    if (!m3uUrl.trim() && !m3uRaw.trim()) {
      setFormError('يرجى إدخال رابط M3U صالح أو لصق محتوى القائمة مباشرة.');
      return;
    }
    if (m3uUrl.trim() && !/^https?:\/\/.+/i.test(m3uUrl.trim())) {
      setFormError('يجب أن يبدأ رابط M3U بـ http:// أو https://');
      return;
    }

    const newServer: ServerProfile = {
      id: `m3u_${Date.now()}`,
      name: m3uName.trim(),
      type: 'm3u',
      host: m3uUrl.trim() || 'local://m3u-playlist',
      m3uContent: m3uRaw.trim() || undefined,
      useProxy: m3uProxy,
      addedAt: Date.now(),
    };

    await onAddAndConnectServer(newServer);
    setM3uName('');
    setM3uUrl('');
    setM3uRaw('');
  };

  const handleSmartTextChange = (value: string) => {
    setSmartRawText(value);
    setFormError(null);
    setSmartExtracted(parseSmartXtreamCredentials(value));
  };

  const handleExtractServerImageFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح (PNG / JPG / WebP).');
      return;
    }
    setFormError(null);
    setImageOcrHint(null);
    setExtractingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('تعذّرت قراءة ملف الصورة.'));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const result = await extractServersFromImage(file.type || 'image/png', base64);

      const combinedText = [smartRawText.trim(), result.rawText.trim()].filter(Boolean).join('\n\n');
      if (combinedText) setSmartRawText(combinedText);

      const parsedFromText = parseSmartXtreamCredentials(combinedText);
      const parsedFromAi: ParsedXtreamCredential[] = (result.servers || [])
        .filter((s) => s.host && s.username && s.password)
        .map((s, i) => ({
          name: s.name?.trim() || `سيرفر من صورة ${i + 1}`,
          host: normalizeServerHost(String(s.host)),
          username: String(s.username).trim(),
          password: String(s.password).trim(),
          expiryHint: s.expiryHint,
          recommendedProxy: /^http:\/\//i.test(String(s.host)),
        }));

      const merged: ParsedXtreamCredential[] = [];
      const seen = new Set<string>();
      for (const item of [...parsedFromAi, ...parsedFromText]) {
        const key = `${item.host.toLowerCase()}|${item.username}|${item.password}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }

      setSmartExtracted(merged);
      if (merged.length > 0) {
        setImageOcrHint(`تم استخراج ${merged.length} سيرفر بنجاح من لقطة الشاشة!`);
      } else if (result.servers.some((s) => s.m3uUrl)) {
        const firstM3u = result.servers.find((s) => s.m3uUrl)?.m3uUrl || '';
        setMode('m3u');
        setM3uName('سيرفر M3U من صورة');
        setM3uUrl(firstM3u);
        setImageOcrHint('تم استخراج رابط M3U من الصورة وتعبئته تلقائياً!');
      } else {
        setFormError('لم يُعثر على بيانات Xtream واضحة في الصورة — تأكد من وضوح الرابط واليوزر والباسورد.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذّر قراءة الصورة حالياً.');
    } finally {
      setExtractingImage(false);
    }
  };

  const handleSmartImportSubmit = async (connectFirst: boolean) => {
    setFormError(null);
    if (smartExtracted.length === 0) {
      setFormError('لم يتم العثور على رابط أو بيانات Xtream صالحة في النص الملصق.');
      return;
    }

    const now = Date.now();
    const profiles: ServerProfile[] = smartExtracted.map((item, idx) => ({
      id: `xtream_${now}_${idx}`,
      name: item.name.trim() || `سيرفر ${idx + 1}`,
      type: 'xtream',
      host: normalizeServerHost(item.host),
      username: item.username.trim(),
      password: item.password.trim(),
      useProxy: smartProxy || item.recommendedProxy,
      addedAt: now + idx,
    }));

    if (onAddMultipleServers) {
      await onAddMultipleServers(profiles, connectFirst);
    } else if (profiles[0]) {
      await onAddAndConnectServer(profiles[0]);
    }
    setSmartRawText('');
    setSmartExtracted([]);
  };

  const handleHostInputChange = (val: string) => {
    const parsed = parseSmartXtreamCredentials(val);
    if (parsed.length === 1 && /get\.php|player_api\.php/i.test(val)) {
      const first = parsed[0];
      setSrvHost(first.host);
      if (!srvUser.trim()) setSrvUser(first.username);
      if (!srvPass.trim()) setSrvPass(first.password);
      if (!srvName.trim()) setSrvName(first.name);
      if (first.recommendedProxy) setSrvProxy(true);
      return;
    }
    setSrvHost(val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="server-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#D4AF37]/30 bg-[#0D0D12] p-6 shadow-2xl sm:p-7 space-y-6">
        {/* Header with Imperial Dragon Crest */}
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3.5">
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار فالدريون"
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-full border border-[#D4AF37]/70 object-cover"
            />
            <div>
              <h2
                id="server-modal-title"
                className="text-lg font-black text-[#F4F3EF] sm:text-xl"
              >
                إدارة السيرفرات — Xtream Codes و M3U
              </h2>
              <p className="text-xs text-[#9B9AA2]">
                اربط اشتراكك الخاص أو استكشف مكتبة فالدريون الإمبراطورية فوراً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق إدارة السيرفرات"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#14141B] text-[#D6D5CE] hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cloud Sync / Guest Mode Banner */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            user
              ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
              : 'border-white/[0.09] bg-[#121218]'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Cloud
              className={`h-4 w-4 shrink-0 ${
                user ? 'text-emerald-400' : 'text-[#D4AF37]'
              }`}
              aria-hidden="true"
            />
            {user ? (
              <span className="text-[#D6D5CE]">
                <strong className="font-extrabold text-emerald-300">
                  المزامنة السحابية مفعّلة:
                </strong>{' '}
                يتم حفظ سيرفراتك الخاصة بأمان على حساب{' '}
                <span className="font-semibold text-[#F4F3EF]">
                  {user.displayName || user.email}
                </span>
              </span>
            ) : (
              <span className="text-[#C6C5CE]">
                <strong className="font-extrabold text-[#F4F3EF]">
                  وضع الضيف:
                </strong>{' '}
                تُحفظ سيرفراتك محلياً على هذا الجهاز — سجّل الدخول بحساب Google لمزامنتها سحابياً.
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenAuth}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors ${
              user
                ? 'border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                : 'border border-[#D4AF37]/50 bg-[#D4AF37]/12 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#060608]'
            }`}
          >
            {user ? 'حسابي السحابي' : 'تسجيل الدخول بـ Google'}
          </button>
        </div>

        {/* One-Click Imperial Showcase Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D4AF37]/35 bg-gradient-to-l from-[#DC143C]/18 via-[#14141B] to-[#D4AF37]/12 p-4">
          <div className="space-y-1">
            <div className="text-sm font-extrabold text-[#F4F3EF]">
              سيرفر فالدريون الإمبراطوري الجاهز
            </div>
            <p className="text-xs text-[#C6C5CE]">
              مكتبة عرض فورية تشمل أفلام 4K، مسلسلات متعددة المواسم، أنمي، كرتون، وقنوات بث مباشر HLS.
            </p>
          </div>
          <button
            type="button"
            disabled={syncState.active}
            onClick={onRestoreShowcase}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-[#DC143C] px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-[#EF234B] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>تشغيل السيرفر التجريبي الجاهز</span>
          </button>
        </div>

        {/* Live Sync Progress */}
        {syncState.active && (
          <div
            className="space-y-2 rounded-xl border border-[#D4AF37]/40 bg-[#121218] p-4"
            aria-live="polite"
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#D4AF37]">{syncState.message}</span>
              <span className="font-mono-tabular text-[#F4F3EF]">
                {Math.round(syncState.pct)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-l from-[#D4AF37] to-[#DC143C] transition-all duration-300"
                style={{ width: `${syncState.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Account Info Strip */}
        {accountInfo && (
          <div className="grid grid-cols-1 gap-3 border-y border-white/[0.07] py-4 sm:grid-cols-3">
            <div>
              <div className="text-[11px] text-[#7E7D86]">حالة الاشتراك</div>
              <div className="mt-0.5 text-sm font-bold text-emerald-400">
                {accountInfo.status}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#7E7D86]">تاريخ الانتهاء</div>
              <div className="mt-0.5 font-mono-tabular text-sm font-bold text-[#D4AF37]">
                {accountInfo.expiry}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#7E7D86]">الاتصالات / الموارد</div>
              <div className="mt-0.5 font-mono-tabular text-sm font-bold text-[#F4F3EF]">
                {accountInfo.connections}
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left/Right Form Column */}
          <div className="space-y-4 lg:col-span-7">
            {/* Protocol Mode Tabs */}
            <div
              className="flex gap-1 rounded-lg border border-white/[0.08] bg-[#13131A] p-1"
              role="tablist"
              aria-label="نوع السيرفر"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'smart'}
                onClick={() => {
                  setMode('smart');
                  setFormError(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold transition-colors ${
                  mode === 'smart'
                    ? 'bg-[#D4AF37] text-[#060608]'
                    : 'text-[#9B9AA2] hover:text-white'
                }`}
              >
                <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                <span>لصق سريع (تلقائي)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'xtream'}
                onClick={() => {
                  setMode('xtream');
                  setFormError(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold transition-colors ${
                  mode === 'xtream'
                    ? 'bg-[#D4AF37] text-[#060608]'
                    : 'text-[#9B9AA2] hover:text-white'
                }`}
              >
                <Server className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Xtream يدوي</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'm3u'}
                onClick={() => {
                  setMode('m3u');
                  setFormError(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold transition-colors ${
                  mode === 'm3u'
                    ? 'bg-[#D4AF37] text-[#060608]'
                    : 'text-[#9B9AA2] hover:text-white'
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>قائمة M3U</span>
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-300"
              >
                {formError}
              </div>
            )}

            {mode === 'smart' ? (
              <div
                className="space-y-3.5"
                onPaste={(e) => {
                  const imgItem = Array.from(e.clipboardData?.items || []).find((it) =>
                    it.type.startsWith('image/')
                  );
                  if (imgItem) {
                    const file = imgItem.getAsFile();
                    if (file) {
                      e.preventDefault();
                      void handleExtractServerImageFile(file);
                    }
                  }
                }}
              >
                {/* Automatic Screenshot OCR Extractor */}
                <div
                  data-testid="server-image-ocr-box"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleExtractServerImageFile(file);
                  }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#D4AF37]/50 bg-[#D4AF37]/[0.06] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/20 text-[#F5D68A]">
                      {extractingImage ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#F4F3EF]">
                        استخراج السيرفر تلقائياً من صورة (لقطة شاشة)
                      </p>
                      <p className="text-[11px] text-[#B8B6C0]">
                        ارفع صورة الاشتراك أو اسحبها هنا أو اضغط Ctrl+V للصقها وسيستخرج الرابط واليوزر والباسورد وحده
                      </p>
                    </div>
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      void handleExtractServerImageFile(f);
                    }}
                  />
                  <button
                    type="button"
                    disabled={extractingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3.5 py-2 text-xs font-black text-[#060608] hover:brightness-110 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{extractingImage ? 'جاري قراءة الصورة...' : 'رفع صورة السيرفر'}</span>
                  </button>
                </div>

                {imageOcrHint && (
                  <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                    {imageOcrHint}
                  </p>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="smart-xtream-paste" className="block text-xs font-semibold text-[#C6C5CE]">
                    أو الصق رسالة/روابط اشتراكاتك دفعة واحدة (سيرفر واحد أو عدة سيرفرات معاً)
                  </label>
                  <textarea
                    id="smart-xtream-paste"
                    rows={4}
                    value={smartRawText}
                    onChange={(e) => handleSmartTextChange(e.target.value)}
                    placeholder={
                      'الصق هنا رسالة اشتراكك كما هي (رابط get.php أو Host + Username + Password)...\nسيتم استخراج كل السيرفرات تلقائياً وحفظها على جهازك فقط.'
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-xs leading-relaxed text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                  />
                </div>

                {smartExtracted.length > 0 && (
                  <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                      <span>تم استخراج {smartExtracted.length} سيرفر تلقائياً:</span>
                      <span className="text-[11px] font-medium text-[#9B9AA2]">
                        يُحفظ محلياً في جهازك فقط
                      </span>
                    </div>
                    <div className="max-h-44 space-y-2 overflow-y-auto pl-1">
                      {smartExtracted.map((item, idx) => (
                        <div
                          key={`${item.host}_${item.username}_${idx}`}
                          className="rounded-lg border border-white/10 bg-[#0D0D12] p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const nextName = e.target.value;
                                setSmartExtracted((prev) =>
                                  prev.map((row, rIdx) =>
                                    rIdx === idx ? { ...row, name: nextName } : row
                                  )
                                );
                              }}
                              aria-label={`اسم السيرفر المستخرج ${idx + 1}`}
                              className="min-w-0 flex-1 rounded border border-white/10 bg-[#14141B] px-2 py-1 text-xs font-bold text-[#F4F3EF] focus:border-[#D4AF37]"
                            />
                            {item.expiryHint && (
                              <span className="shrink-0 font-mono text-[10px] text-[#D4AF37]">
                                حتى {item.expiryHint}
                              </span>
                            )}
                          </div>
                          <div
                            dir="ltr"
                            className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-left font-mono text-[11px] text-[#9B9AA2]"
                          >
                            <span className="truncate">{item.host}</span>
                            <span className="text-[#C6C5CE]">user: {item.username}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#121218] px-3.5 py-2.5 text-xs text-[#C6C5CE]">
                  <span>تفعيل وسيط تجاوز قيود المتصفح تلقائياً (موصى به لروابط HTTP)</span>
                  <input
                    type="checkbox"
                    checked={smartProxy}
                    onChange={(e) => setSmartProxy(e.target.checked)}
                    className="h-4 w-4 accent-[#D4AF37]"
                  />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={syncState.active || smartExtracted.length === 0}
                    onClick={() => void handleSmartImportSubmit(true)}
                    className="w-full rounded-lg bg-[#DC143C] py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-[#EF234B] disabled:opacity-45"
                  >
                    حفظ الكل وتشغيل أول سيرفر ({smartExtracted.length})
                  </button>
                  <button
                    type="button"
                    disabled={syncState.active || smartExtracted.length === 0}
                    onClick={() => void handleSmartImportSubmit(false)}
                    className="w-full rounded-lg border border-[#D4AF37]/45 bg-[#D4AF37]/12 py-2.5 text-xs font-extrabold text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#060608] disabled:opacity-45"
                  >
                    حفظهم في القائمة فقط
                  </button>
                </div>
              </div>
            ) : mode === 'xtream' ? (
              <form onSubmit={handleXtreamSubmit} noValidate className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="xt-name" className="block text-xs font-semibold text-[#C6C5CE]">
                    اسم السيرفر
                  </label>
                  <input
                    id="xt-name"
                    type="text"
                    value={srvName}
                    onChange={(e) => setSrvName(e.target.value)}
                    placeholder="مثال: سيرفر هايدرا الذهبي"
                    className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-sm text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="xt-host" className="block text-xs font-semibold text-[#C6C5CE]">
                    رابط السيرفر (Host URL — أو الصق رابط get.php للتعبئة التلقائية)
                  </label>
                  <input
                    id="xt-host"
                    type="url"
                    dir="ltr"
                    value={srvHost}
                    onChange={(e) => handleHostInputChange(e.target.value)}
                    placeholder="http://example.com:8080"
                    className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-left text-sm text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="xt-user" className="block text-xs font-semibold text-[#C6C5CE]">
                      اسم المستخدم (Username)
                    </label>
                    <input
                      id="xt-user"
                      type="text"
                      dir="ltr"
                      value={srvUser}
                      onChange={(e) => setSrvUser(e.target.value)}
                      placeholder="username"
                      className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-left text-sm text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="xt-pass" className="block text-xs font-semibold text-[#C6C5CE]">
                      كلمة المرور (Password)
                    </label>
                    <input
                      id="xt-pass"
                      type="password"
                      dir="ltr"
                      value={srvPass}
                      onChange={(e) => setSrvPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-left text-sm text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#121218] px-3.5 py-2.5 text-xs text-[#C6C5CE]">
                  <span>تفعيل وسيط تجاوز قيود المتصفح (CORS Proxy)</span>
                  <input
                    type="checkbox"
                    checked={srvProxy}
                    onChange={(e) => setSrvProxy(e.target.checked)}
                    className="h-4 w-4 accent-[#D4AF37]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={syncState.active}
                  className="w-full rounded-lg bg-[#DC143C] py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#EF234B] disabled:opacity-50"
                >
                  اتصال ومزامنة كل المحتوى
                </button>
              </form>
            ) : (
              <form onSubmit={handleM3USubmit} noValidate className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="m3u-name" className="block text-xs font-semibold text-[#C6C5CE]">
                    اسم قائمة التشغيل
                  </label>
                  <input
                    id="m3u-name"
                    type="text"
                    value={m3uName}
                    onChange={(e) => setM3uName(e.target.value)}
                    placeholder="مثال: باقة القنوات الرياضية"
                    className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-sm text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="m3u-url" className="block text-xs font-semibold text-[#C6C5CE]">
                    رابط ملف M3U / M3U8 (اختياري عند اللصق)
                  </label>
                  <input
                    id="m3u-url"
                    type="url"
                    dir="ltr"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u8"
                    className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2.5 text-left text-sm text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="m3u-raw" className="block text-xs font-semibold text-[#C6C5CE]">
                    أو الصق محتوى #EXTM3U مباشرة
                  </label>
                  <textarea
                    id="m3u-raw"
                    dir="ltr"
                    rows={3}
                    value={m3uRaw}
                    onChange={(e) => setM3uRaw(e.target.value)}
                    placeholder={'#EXTM3U\n#EXTINF:-1 group-title="أخبار",قناة مباشر\nhttps://...'}
                    className="w-full rounded-lg border border-white/10 bg-[#08080B] px-3.5 py-2 text-left font-mono text-xs text-[#F4F3EF] placeholder:text-[#66656E] focus:border-[#D4AF37]"
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#121218] px-3.5 py-2.5 text-xs text-[#C6C5CE]">
                  <span>استخدام CORS Proxy لجلب الرابط</span>
                  <input
                    type="checkbox"
                    checked={m3uProxy}
                    onChange={(e) => setM3uProxy(e.target.checked)}
                    className="h-4 w-4 accent-[#D4AF37]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={syncState.active}
                  className="w-full rounded-lg bg-[#DC143C] py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-[#EF234B] disabled:opacity-50"
                >
                  استيراد وتشغيل قائمة M3U
                </button>
              </form>
            )}
          </div>

          {/* Saved Servers List Column */}
          <div className="space-y-3 border-t border-white/[0.07] pt-5 lg:col-span-5 lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[#D4AF37]">
                السيرفرات المحفوظة ({servers.length})
              </h3>
              {servers.length > 0 && (
                <button
                  type="button"
                  disabled={pinging}
                  onClick={() => void handleRunPingCheck()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/12 px-2.5 py-1.5 text-[11px] font-extrabold text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-[#060608] disabled:opacity-50"
                >
                  {pinging ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{pinging ? 'جاري الفحص...' : 'فحص السرعة والبينغ'}</span>
                </button>
              )}
            </div>

            {fastestOnlineServer && pingMap[fastestOnlineServer.id] && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs">
                <div className="flex min-w-0 items-center gap-1.5 text-emerald-200">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="truncate font-bold">
                    الأسرع الآن: {fastestOnlineServer.name} (
                    {pingMap[fastestOnlineServer.id].latencyMs}ms)
                  </span>
                </div>
                {fastestOnlineServer.id !== activeServerId && (
                  <button
                    type="button"
                    disabled={syncState.active}
                    onClick={() => void onConnectServer(fastestOnlineServer)}
                    className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-extrabold text-[#04140B] hover:bg-emerald-400"
                  >
                    اتصال بالأسرع
                  </button>
                )}
              </div>
            )}

            {servers.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#9B9AA2]">
                لا توجد سيرفرات محفوظة حالياً.
              </p>
            ) : (
              <div className="max-h-[340px] space-y-2.5 overflow-y-auto pl-1">
                {servers.map((srv) => {
                  const isActive = srv.id === activeServerId;
                  const ping = pingMap[srv.id];
                  const pingTone = !ping
                    ? ''
                    : !ping.ok
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                    : ping.grade === 'excellent'
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : ping.grade === 'good'
                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#D4AF37]'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-300';
                  return (
                    <div
                      key={srv.id}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        isActive
                          ? 'border-[#D4AF37]/60 bg-[#D4AF37]/[0.06]'
                          : 'border-white/[0.08] bg-[#121218]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#F4F3EF]">
                            {isActive && (
                              <CheckCircle2
                                className="h-4 w-4 shrink-0 text-[#D4AF37]"
                                aria-hidden="true"
                              />
                            )}
                            <span className="truncate">{srv.name}</span>
                            {ping && (
                              <span
                                className={`font-mono-tabular inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${pingTone}`}
                              >
                                {ping.ok && ping.latencyMs !== null
                                  ? `${ping.latencyMs}ms · ${ping.label}`
                                  : ping.label}
                              </span>
                            )}
                          </div>
                          <div
                            dir="ltr"
                            className="mt-1 truncate text-right font-mono text-[11px] text-[#9B9AA2]"
                          >
                            {srv.type.toUpperCase()} · {srv.host}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            disabled={syncState.active}
                            onClick={() => onConnectServer(srv)}
                            aria-label={
                              isActive
                                ? `تحديث سيرفر ${srv.name}`
                                : `اتصال بسيرفر ${srv.name}`
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                              isActive
                                ? 'bg-[#D4AF37] text-[#060608]'
                                : 'border border-white/15 bg-[#191922] text-[#F4F3EF] hover:border-[#D4AF37]'
                            }`}
                          >
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            <span>{isActive ? 'تحديث' : 'اتصال'}</span>
                          </button>

                          {srv.type !== 'showcase' && (
                            <button
                              type="button"
                              onClick={() => onDeleteServer(srv.id)}
                              aria-label={`حذف سيرفر ${srv.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
