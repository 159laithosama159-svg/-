import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  Unlink,
  Upload,
} from 'lucide-react';
import {
  DIRECT_SOCIAL_PLATFORMS,
  SOCIAL_OAUTH_PLATFORMS,
  type SocialOAuthProviderId,
} from '../utils/securityShield';
import {
  disconnectSocialProvider,
  fetchSocialHubStatus,
  fetchWhatsAppCloudStatus,
  requestSocialOAuthUrl,
  searchConnectedSocialAccounts,
  setSocialSessionToken,
  type ConnectedSocialSearchHit,
  type SocialHubStatusResponse,
  type WhatsAppCloudStatus,
} from '../services/xtreamApi';
import {
  buildAuthorizedWhatsAppGroup,
  loadAuthorizedWhatsAppGroups,
  saveAuthorizedWhatsAppGroups,
  type AuthorizedWhatsAppGroup,
} from '../utils/whatsappGroupBridge';
import type { ParsedXtreamCredential } from '../utils/cinemaLogic';

interface SocialOAuthHubProps {
  accountConsentGranted: boolean;
  onToggleAccountConsent: (granted: boolean) => void;
  onImportDetectedServers?: (creds: ParsedXtreamCredential[]) => void;
  onToast: (msg: string) => void;
}

export const SocialOAuthHub: React.FC<SocialOAuthHubProps> = ({
  accountConsentGranted,
  onToggleAccountConsent,
  onImportDetectedServers,
  onToast,
}) => {
  const [status, setStatus] = useState<SocialHubStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<SocialOAuthProviderId | null>(null);
  const [setupInfo, setSetupInfo] = useState<{
    provider: SocialOAuthProviderId;
    label: string;
    callbackUrl: string;
    envKeys: string[];
    portalUrl?: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<ConnectedSocialSearchHit[]>([]);

  // Authorized WhatsApp Groups Whitelist state
  const [waGroups, setWaGroups] = useState<AuthorizedWhatsAppGroup[]>(() =>
    loadAuthorizedWhatsAppGroups()
  );
  const [waGroupName, setWaGroupName] = useState('');
  const [waRawText, setWaRawText] = useState('');
  const waFileInputRef = useRef<HTMLInputElement | null>(null);
  const [waCloud, setWaCloud] = useState<WhatsAppCloudStatus | null>(null);

  const persistWaGroups = (next: AuthorizedWhatsAppGroup[]) => {
    setWaGroups(next);
    saveAuthorizedWhatsAppGroups(next);
  };

  const handleAddWaGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waRawText.trim()) return;
    const grp = buildAuthorizedWhatsAppGroup(waGroupName || 'مجموعة واتساب مسموحة', waRawText);
    persistWaGroups([grp, ...waGroups]);
    setWaGroupName('');
    setWaRawText('');
    onToast(
      grp.extractedServers.length > 0
        ? `تم استيعاب المجموعة «${grp.name}» ورصد ${grp.extractedServers.length} سيرفر تلقائياً!`
        : `تمت إضافة المجموعة «${grp.name}» لقائمة مجموعات واتساب المسموحة.`
    );
  };

  const handleImportWaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const content = await file.text();
      const baseName = file.name.replace(/\.txt$/i, '').replace(/^WhatsApp Chat with /i, '');
      const grp = buildAuthorizedWhatsAppGroup(waGroupName || baseName, content);
      persistWaGroups([grp, ...waGroups]);
      setWaGroupName('');
      onToast(`تم استيراد ملف مجموعة «${grp.name}» (${grp.messages.length} رسالة) بنجاح!`);
    } catch {
      onToast('تعذّر قراءة ملف تصدير واتساب (.txt).');
    }
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [data, wa] = await Promise.all([
        fetchSocialHubStatus(),
        fetchWhatsAppCloudStatus().catch(() => null),
      ]);
      setStatus(data);
      if (wa) setWaCloud(wa);
    } catch {
      // Keep UI responsive if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Listen for OAuth popup completion via postMessage (origin-validated)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      const validOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost');
      if (!validOrigin) return;

      const data = event.data as {
        type?: string;
        provider?: string;
        sessionToken?: string;
        account?: { handle?: string };
        error?: string;
      } | null;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'OAUTH_AUTH_SUCCESS') {
        if (typeof data.sessionToken === 'string') {
          setSocialSessionToken(data.sessionToken);
        }
        setConnectingProvider(null);
        setSetupInfo(null);
        onToast(`تم ربط حساب ${data.provider || ''} (${data.account?.handle || ''}) بأمان مشفّر!`);
        void loadStatus();
      } else if (data.type === 'OAUTH_AUTH_ERROR') {
        setConnectingProvider(null);
        onToast(data.error || 'لم يكتمل ربط الحساب.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadStatus, onToast]);

  const handleConnectOAuth = async (provider: SocialOAuthProviderId) => {
    const desc = SOCIAL_OAUTH_PLATFORMS.find((p) => p.oauthProvider === provider);
    setConnectingProvider(provider);
    try {
      const res = await requestSocialOAuthUrl(provider);
      if (!res.ok || !res.url) {
        setConnectingProvider(null);
        setSetupInfo({
          provider,
          label: desc?.nameAr || provider,
          callbackUrl:
            res.callbackUrl ||
            `${status?.baseUrl || window.location.origin}/api/social/oauth/${provider}/callback`,
          envKeys: res.requiredEnv || desc?.envKeys || [],
          portalUrl: desc?.developerPortalUrl,
        });
        onToast(res.error || 'أضف مفاتيح OAuth للمنصة في الإعدادات أولاً.');
        return;
      }

      // Open OAuth provider's authorization URL directly in popup (never container route!)
      const popup = window.open(res.url, `valdrion_oauth_${provider}`, 'width=600,height=720');
      if (!popup) {
        setConnectingProvider(null);
        onToast('يرجى السماح بالنوافذ المنبثقة (Popups) لإتمام تسجيل الدخول الرسمي.');
      }
    } catch {
      setConnectingProvider(null);
      onToast('تعذّر بدء ربط الحساب حالياً.');
    }
  };

  const handleDisconnect = async (provider: SocialOAuthProviderId) => {
    await disconnectSocialProvider(provider);
    onToast('تم فصل الحساب ومسح رمزه المشفّر من الخادم.');
    await loadStatus();
  };

  const handleCopyCallback = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 1800);
      onToast('تم نسخ رابط الاستدعاء (Callback URL).');
    } catch {
      onToast('انسخ الرابط يدوياً من المربع.');
    }
  };

  const connectedCount = status?.providers.filter((p) => p.connected).length || 0;

  const handleRunSocialSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountConsentGranted) {
      onToast('فعّل إذن البحث داخل حسابك أولاً للمتابعة.');
      return;
    }
    setSearching(true);
    try {
      const res = await searchConnectedSocialAccounts(searchQuery.trim(), true);
      setSearchHits(res.hits);
      if (res.hits.length === 0) {
        onToast('لم يتم العثور على نتائج مطابقة في الحسابات المربوطة.');
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Honest Security & Official OAuth Notice */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <h3 className="text-xs font-black text-white">
                ربط حسابات التواصل الاجتماعي الرسمي (OAuth 2.0 + تشفير AES-256-GCM)
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                لا يقوم أي تطبيق بإنشاء حسابات آلياً نيابةً عنك (حمايةً لخصوصيتك وقوانين المنصات). اربط حساباتك الحقيقية هنا بتسجيل دخول رسمي آمن، وسيتولّى القائد الشامل البحث داخلها <strong className="text-emerald-300">بإذنك الصريح فقط</strong> مع حفظ الرموز مشفّرة بالكامل على الخادم.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            aria-label="تحديث حالة منصات التواصل"
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-900/70 p-1.5 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Official OAuth 2.0 Connectors Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SOCIAL_OAUTH_PLATFORMS.map((plat) => {
          const provKey = plat.oauthProvider!;
          const live = status?.providers.find((p) => p.provider === provKey);
          const isConnected = Boolean(live?.connected && live?.account);
          const isConfigured = Boolean(live?.configured);
          const isBusy = connectingProvider === provKey;

          return (
            <div
              key={plat.id}
              className="flex flex-col justify-between gap-2.5 rounded-xl border border-slate-800 bg-[#111827] p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{plat.nameAr}</span>
                    {isConnected ? (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        مربوط · {live?.account?.handle}
                      </span>
                    ) : isConfigured ? (
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                        جاهز للربط
                      </span>
                    ) : (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                        بانتظار المفاتيح
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                    {plat.descriptionAr}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] font-semibold text-slate-500">
                  {plat.searchCapabilityAr}
                </span>
                <div className="flex items-center gap-1.5">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => void handleDisconnect(provKey)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-500/20"
                    >
                      <Unlink className="h-3 w-3" aria-hidden="true" />
                      <span>فصل</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleConnectOAuth(provKey)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-black text-[#0B0907] hover:bg-amber-400 disabled:opacity-50"
                    >
                      <Link2 className="h-3 w-3" aria-hidden="true" />
                      <span>{isBusy ? 'جاري الفتح...' : 'ربط الحساب'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline Setup Helper when OAuth Env Vars aren't configured yet */}
      {setupInfo && (
        <div className="space-y-2.5 rounded-xl border border-amber-400/40 bg-amber-500/[0.07] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-amber-200">
              خطوات تفعيل الربط الرسمي لـ {setupInfo.label} (مرة واحدة فقط)
            </p>
            <button
              type="button"
              onClick={() => setSetupInfo(null)}
              className="text-[11px] font-bold text-slate-400 hover:text-white"
            >
              إخفاء
            </button>
          </div>
          <ol className="list-decimal space-y-1.5 pr-4 text-[11px] leading-relaxed text-slate-300">
            <li>
              أنشئ تطبيق OAuth في لوحة مطوّري {setupInfo.label}
              {setupInfo.portalUrl && (
                <>
                  {' '}
                  (
                  <a
                    href={setupInfo.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-300 underline"
                  >
                    فتح لوحة المطوّرين
                  </a>
                  )
                </>
              )}
              .
            </li>
            <li>أضف رابط الاستدعاء التالي (Callback URL) داخل إعدادات التطبيق:</li>
          </ol>
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2">
            <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-emerald-300">
              {setupInfo.callbackUrl}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyCallback(setupInfo.callbackUrl)}
              className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
            >
              {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedUrl ? 'نُسخ' : 'نسخ'}</span>
            </button>
          </div>
          {setupInfo.envKeys.length > 0 && (
            <p className="text-[11px] text-slate-300">
              ثم أضف المتغيّرات التالية في <strong className="text-white">Settings &gt; Secrets</strong>:{' '}
              <code dir="ltr" className="font-mono text-amber-300">
                {setupInfo.envKeys.join(' , ')}
              </code>
            </p>
          )}
        </div>
      )}

      {/* Official Meta WhatsApp Cloud API Live Status Card */}
      <div className="space-y-2.5 rounded-xl border border-emerald-400/35 bg-[#0C1917] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h4 className="text-xs font-black text-white">
              واتساب الرسمي المباشر (Meta WhatsApp Cloud API)
            </h4>
          </div>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
              waCloud?.configured
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-200'
            }`}
          >
            {waCloud?.configured
              ? `متصل مباشر · ${waCloud.receivedCount} رسالة واردة`
              : 'جاهز للربط الرسمي عبر Webhook'}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-300">
          الربط المباشر المسموح رسمياً بدون حظر رقمك يتم عبر <strong className="text-emerald-300">WhatsApp Business Cloud API</strong> من Meta. أضف رابط الاستقبال (Webhook URL) التالي في لوحة Meta Developers لتصل الرسائل مباشرة إلى القائد:
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#080D14] px-3 py-2">
          <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[11px] text-emerald-300">
            {`${status?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')}${waCloud?.webhookPath || '/api/whatsapp/webhook'}`}
          </code>
          <button
            type="button"
            onClick={() =>
              void handleCopyCallback(
                `${status?.baseUrl || window.location.origin}${waCloud?.webhookPath || '/api/whatsapp/webhook'}`
              )
            }
            className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700"
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            <span>نسخ Webhook</span>
          </button>
        </div>
      </div>

      {/* Authorized WhatsApp Groups Whitelist (Safe, Zero-Ban Group Absorption & Server Extraction) */}
      <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-[#0F1B18] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <h4 className="text-xs font-black text-white">
                مجموعات واتساب المسموح بها فقط ({waGroups.filter((g) => g.allowed).length} مسموحة / {waGroups.length})
              </h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">
                حمايةً لحسابك الشخصي من الحظر، لا يقتحم التطبيق واتسابك — يمكنك استيراد ملف تصدير أي مجموعة تسمح بها هنا أو ربط WhatsApp Cloud API أعلاه.
              </p>
            </div>
          </div>
          <input
            ref={waFileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={(e) => void handleImportWaFile(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => waFileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/45 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-black text-emerald-200 hover:bg-emerald-500/25"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>استيراد ملف تصدير واتساب (.txt)</span>
          </button>
        </div>

        <form onSubmit={handleAddWaGroup} className="space-y-2">
          <input
            type="text"
            value={waGroupName}
            onChange={(e) => setWaGroupName(e.target.value)}
            placeholder="اسم مجموعة واتساب المسموحة (مثلاً: مجموعة أبو آدم للسيرفرات)"
            className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
          />
          <textarea
            rows={3}
            value={waRawText}
            onChange={(e) => setWaRawText(e.target.value)}
            placeholder="الصق رسائل المجموعة هنا ليستوعبها القائد الشامل تلقائياً (ويكتشف السيرفرات والمواضيع بداخلها)..."
            className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!waRawText.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-45"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>إضافة واستيعاب المجموعة</span>
            </button>
          </div>
        </form>

        {waGroups.length > 0 && (
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0B101B]">
            {waGroups.map((grp) => (
              <div
                key={grp.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{grp.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{grp.summaryAr}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {grp.extractedServers.length > 0 && onImportDetectedServers && (
                    <button
                      type="button"
                      onClick={() => onImportDetectedServers(grp.extractedServers)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30"
                    >
                      <Server className="h-3 w-3" aria-hidden="true" />
                      <span>استيراد {grp.extractedServers.length} سيرفر</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      persistWaGroups(
                        waGroups.map((g) => (g.id === grp.id ? { ...g, allowed: !g.allowed } : g))
                      )
                    }
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      grp.allowed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {grp.allowed ? 'مسموح للقائد' : 'محظور'}
                  </button>
                  <button
                    type="button"
                    onClick={() => persistWaGroups(waGroups.filter((g) => g.id !== grp.id))}
                    aria-label={`حذف مجموعة ${grp.name}`}
                    className="rounded p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Search inside Connected Social Accounts (Consent-Gated) */}
      <div className="space-y-2.5 rounded-xl border border-slate-800 bg-[#111827] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-white">
              البحث المباشر داخل حساباتك المربوطة ({connectedCount} متصل)
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleAccountConsent(!accountConsentGranted)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
              accountConsentGranted
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {accountConsentGranted ? 'إذن البحث مفعّل' : 'تفعيل إذن البحث'}
          </button>
        </div>

        <form onSubmit={(e) => void handleRunSocialSearch(e)} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              connectedCount > 0
                ? 'ابحث في مستودعاتك، سيرفراتك، منشوراتك أو قوائمك...'
                : 'اربط حساباً واحداً أعلاه لتفعيل البحث المباشر داخله...'
            }
            disabled={connectedCount === 0}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={connectedCount === 0 || searching}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-45"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{searching ? 'يبحث...' : 'بحث'}</span>
          </button>
        </form>

        {searchHits.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {searchHits.map((h, idx) => (
              <a
                key={`${h.provider}_${idx}`}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-[#090D16] px-3 py-2 text-xs hover:border-emerald-500/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    <span className="ml-1.5 text-[10px] text-emerald-300">[{h.providerLabel}]</span>
                    {h.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{h.snippet}</p>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Direct Access Social Media Platforms (Instagram, Facebook, TikTok, Snapchat, YouTube, WhatsApp, Telegram) */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-white">
          منصات التواصل السريعة والمشاركة المباشرة ({DIRECT_SOCIAL_PLATFORMS.length})
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DIRECT_SOCIAL_PLATFORMS.map((ext) => (
            <a
              key={ext.id}
              href={ext.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-right transition-colors hover:border-amber-400/40 hover:bg-[#161F33]"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-100">{ext.nameAr}</p>
                <p className="truncate text-[10px] text-slate-400">{ext.descriptionAr}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

