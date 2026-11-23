import React, { useState } from 'react';
import {
  Brain,
  Check,
  Cloud,
  Cpu,
  Crown,
  Database,
  Link2,
  PlugZap,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  CommanderEngineMode,
  CommanderFreedomSettings,
} from '../utils/commanderPolicy';
import { SelfEvolutionState } from '../agents/selfEvolutionEngine';
import {
  addCustomAssistant,
  removeCustomAssistant,
  toggleAssistantEnabled,
  type AdvisorCouncilConfig,
} from '../agents/advisorCouncil';
import {
  detectWebhookPlatform,
  dispatchToUserWebhook,
  INTERNAL_CONNECTED_APPS,
  validateWebhookUrl,
  type CrossAppActionTarget,
  type OmniChannelConfig,
} from '../agents/omniChannelBridge';
import { validateLocalEndpointUrl } from '../utils/sovereignAiEngine';
import { APP_CONTROL_CAPABILITIES } from '../agents/appControlEngine';
import { SocialOAuthHub } from './SocialOAuthHub';
import type { ParsedXtreamCredential } from '../utils/cinemaLogic';

interface CommanderFreedomModalProps {
  open: boolean;
  initialTab?: 'basics' | 'council' | 'apps' | 'advanced';
  onClose: () => void;
  settings: CommanderFreedomSettings;
  onChangeSettings: (next: CommanderFreedomSettings) => void;
  omniConfig: OmniChannelConfig;
  onChangeOmniConfig: (next: OmniChannelConfig) => void;
  advisorCouncil: AdvisorCouncilConfig;
  onChangeAdvisorCouncil: (next: AdvisorCouncilConfig) => void;
  evolutionState: SelfEvolutionState;
  vectorMemoryCount: number;
  cloudRequestCount: number;
  accountConsentGranted: boolean;
  onToggleAccountConsent: (granted: boolean) => void;
  onTriggerSelfEvolution: (feedbackNote?: string) => void;
  onClearVectorMemory: () => void;
  onLaunchInternalApp?: (target: CrossAppActionTarget) => void;
  onImportDetectedServers?: (creds: ParsedXtreamCredential[]) => void;
  onToast: (msg: string) => void;
}

type ModalTab = 'basics' | 'council' | 'apps' | 'advanced';

export const CommanderFreedomModal: React.FC<CommanderFreedomModalProps> = ({
  open,
  initialTab,
  onClose,
  settings,
  onChangeSettings,
  omniConfig,
  onChangeOmniConfig,
  advisorCouncil,
  onChangeAdvisorCouncil,
  evolutionState,
  vectorMemoryCount,
  cloudRequestCount,
  accountConsentGranted,
  onToggleAccountConsent,
  onTriggerSelfEvolution,
  onClearVectorMemory,
  onLaunchInternalApp,
  onImportDetectedServers,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab || 'basics');

  React.useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);
  const [newRule, setNewRule] = useState('');
  const [trainQ, setTrainQ] = useState('');
  const [trainA, setTrainA] = useState('');
  const [evolveNote, setEvolveNote] = useState('');
  const [newAsstName, setNewAsstName] = useState('');
  const [newAsstRole, setNewAsstRole] = useState('');
  const [newHookName, setNewHookName] = useState('');
  const [newHookUrl, setNewHookUrl] = useState('');
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [pingMsg, setPingMsg] = useState('');

  if (!open) return null;

  const setEngine = (engineMode: CommanderEngineMode) => {
    onChangeSettings({ ...settings, engineMode });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRule.trim();
    if (!clean) return;
    onChangeSettings({
      ...settings,
      customDirectives: [...settings.customDirectives, clean].slice(0, 20),
    });
    setNewRule('');
    onToast('تم حفظ قاعدتك الجديدة.');
  };

  const handleAddTraining = (e: React.FormEvent) => {
    e.preventDefault();
    const q = trainQ.trim();
    const a = trainA.trim();
    if (!q || !a) return;
    onChangeSettings({
      ...settings,
      trainedPairs: [
        {
          id: `ct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          prompt: q,
          response: a,
          createdAt: Date.now(),
        },
        ...settings.trainedPairs,
      ].slice(0, 200),
    });
    setTrainQ('');
    setTrainA('');
    onToast('تم حفظ التدريب في ذاكرة القائد.');
  };

  const handleAddAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsstName.trim() || !newAsstRole.trim()) return;
    const next = addCustomAssistant(advisorCouncil, newAsstName, newAsstRole);
    onChangeAdvisorCouncil(next);
    setNewAsstName('');
    setNewAsstRole('');
    onToast(`تمت إضافة المساعد «${newAsstName.trim()}» إلى فريق القائد!`);
  };

  const handleTestOllama = async () => {
    const check = validateLocalEndpointUrl(settings.localEndpointUrl);
    if (!check.valid || !check.normalized) {
      setPingStatus('fail');
      setPingMsg(check.error || 'الرابط غير صالح.');
      return;
    }
    setPingStatus('testing');
    setPingMsg('جاري فحص الاتصال...');
    try {
      const base = new URL(check.normalized).origin;
      const probeUrl =
        settings.localApiFormat === 'ollama' ? `${base}/api/tags` : `${base}/v1/models`;
      const res = await fetch(probeUrl, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPingStatus('ok');
      setPingMsg('تم الاتصال بنجاح — جاهز للعمل على جهازك.');
    } catch {
      setPingStatus('fail');
      setPingMsg('تأكد من تشغيل Ollama أو LM Studio على جهازك.');
    }
  };

  const enabledAssistantsCount = advisorCouncil.assistants.filter((a) => a.enabled).length;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="commander-freedom-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs sm:p-6"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B101B] text-slate-100 shadow-2xl">
        {/* Clean Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div>
              <h2 id="commander-freedom-title" className="text-base font-bold text-white">
                إعدادات القائد الشامل
              </h2>
              <p className="text-xs text-slate-400">
                الجيل {evolutionState.generation} · المستشار {advisorCouncil.advisorEnabled ? 'نشط' : 'متوقف'} · {enabledAssistantsCount} مساعدين · الذاكرة: {vectorMemoryCount}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق إعدادات القائد"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Clean 4-Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-800/80 bg-[#0F1524] px-5 py-2">
          {(
            [
              { id: 'basics', label: 'الأساسيات' },
              { id: 'council', label: 'المستشار والمساعدون' },
              { id: 'apps', label: 'التطبيقات المربوطة' },
              { id: 'advanced', label: 'قواعدك ومتقدم' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {activeTab === 'basics' && (
            <>
              {/* Engine Choice */}
              <section className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-300">طريقة التشغيل</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: 'cloud-commander' as const,
                        title: 'تفكير عميق ذكي (موصى به)',
                        sub: 'يفكّر بعمق ويجيب على أي سؤال مع المستشار والمساعدين',
                        icon: Cloud,
                      },
                      {
                        id: 'local-ollama' as const,
                        title: 'نموذج على جهازك',
                        sub: 'تفكير عصبي محلي 100% عبر Ollama أو LM Studio',
                        icon: Brain,
                      },
                      {
                        id: 'local-kernel' as const,
                        title: 'محلي بدون سحابة',
                        sub: 'بحث ويب مفتوح وحسابات وذاكرة سريعة بدون نموذج عصبي',
                        icon: Cpu,
                      },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = settings.engineMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEngine(opt.id)}
                        aria-pressed={active}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-right transition-colors ${
                          active
                            ? 'border-amber-400/65 bg-amber-500/12 text-white'
                            : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <Icon
                            className={`h-4 w-4 ${active ? 'text-amber-300' : 'text-slate-400'}`}
                            aria-hidden="true"
                          />
                          {active && <Check className="h-4 w-4 text-amber-400" aria-hidden="true" />}
                        </div>
                        <span className="text-xs font-bold">{opt.title}</span>
                        <span className="text-[11px] leading-relaxed text-slate-400">{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {settings.engineMode === 'local-ollama' && (
                  <div className="space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-3.5">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-300">
                          رابط الخادم المحلي
                        </label>
                        <input
                          type="url"
                          dir="ltr"
                          value={settings.localEndpointUrl}
                          onChange={(e) =>
                            onChangeSettings({ ...settings, localEndpointUrl: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-300">
                          اسم النموذج (مثل qwen2.5)
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={settings.localModelName}
                          onChange={(e) =>
                            onChangeSettings({ ...settings, localModelName: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onChangeSettings({
                              ...settings,
                              localApiFormat: 'ollama',
                              localEndpointUrl: 'http://127.0.0.1:11434/api/chat',
                            })
                          }
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                            settings.localApiFormat === 'ollama'
                              ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          Ollama
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeSettings({
                              ...settings,
                              localApiFormat: 'openai-compatible',
                              localEndpointUrl: 'http://127.0.0.1:1234/v1/chat/completions',
                            })
                          }
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                            settings.localApiFormat === 'openai-compatible'
                              ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          LM Studio
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleTestOllama()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
                      >
                        <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>فحص الاتصال</span>
                      </button>
                    </div>
                    {pingMsg && (
                      <p
                        className={`text-xs ${
                          pingStatus === 'ok'
                            ? 'text-emerald-300'
                            : pingStatus === 'fail'
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        {pingMsg}
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* 3 Simple Toggles */}
              <section className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#111827]">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-white">البحث داخل حسابك</p>
                    <p className="text-[11px] text-slate-400">
                      عند إيقافه سيطلب إذنك الصريح قبل قراءة محادثاتك
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleAccountConsent(!accountConsentGranted)}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      accountConsentGranted
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {accountConsentGranted ? 'مفعّل' : 'يطلب إذني'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-white">التحكم بأقسام التطبيق</p>
                    <p className="text-[11px] text-slate-400">
                      فتح السينما والروايات ومحرك الألعاب بأمر مباشر
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOmniConfig({
                        ...omniConfig,
                        allowCrossAppControl: !omniConfig.allowCrossAppControl,
                      })
                    }
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      omniConfig.allowCrossAppControl
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {omniConfig.allowCrossAppControl ? 'مفعّل' : 'متوقف'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-white">نطق الردود صوتياً</p>
                    <p className="text-[11px] text-slate-400">قراءة الإجابات بصوت تلقائي</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOmniConfig({
                        ...omniConfig,
                        autoSpeak: !omniConfig.autoSpeak,
                      })
                    }
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      omniConfig.autoSpeak
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {omniConfig.autoSpeak ? 'مفعّل' : 'متوقف'}
                  </button>
                </div>
              </section>

              {/* Simple One-Row Self-Evolution */}
              <section className="space-y-2.5 rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    التطوير الذاتي (الجيل {evolutionState.generation})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {evolutionState.evolvedSkills.length} مهارة مكتسبة · طلبات: {cloudRequestCount}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={evolveNote}
                    onChange={(e) => setEvolveNote(e.target.value)}
                    placeholder="اختياري: كيف تريد تطوير أسلوبه؟"
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerSelfEvolution(evolveNote.trim() || undefined);
                      setEvolveNote('');
                    }}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>طوّر القائد الآن</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {activeTab === 'council' && (
            <div className="space-y-5">
              {/* Chief Advisor Card */}
              <section className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        المستشار الأعلى للقائد (يساعده في كل شيء)
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-300">
                        يرافق القائد في كل مهمة ليكشف النقاط العمياء ويقترح أذكى حل عملي قبل عرض الإجابة.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeAdvisorCouncil({
                        ...advisorCouncil,
                        advisorEnabled: !advisorCouncil.advisorEnabled,
                      })
                    }
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      advisorCouncil.advisorEnabled
                        ? 'bg-amber-500 text-[#0B0907]'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {advisorCouncil.advisorEnabled ? 'مفعّل' : 'متوقف'}
                  </button>
                </div>

                {advisorCouncil.advisorEnabled && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {(
                      [
                        { id: 'balanced', label: 'متوازن وحكيم' },
                        { id: 'strict_critic', label: 'ناقد صارم' },
                        { id: 'creative_strategist', label: 'مبدع استراتيجي' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          onChangeAdvisorCouncil({ ...advisorCouncil, advisorStyle: st.id })
                        }
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          advisorCouncil.advisorStyle === st.id
                            ? 'bg-amber-500/25 text-amber-200'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Additional Specialist Assistants */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <h3 className="text-xs font-bold text-white">
                      المساعدون الإضافيون ({enabledAssistantsCount}/{advisorCouncil.assistants.length})
                    </h3>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#111827]">
                  {advisorCouncil.assistants.map((asst) => (
                    <div
                      key={asst.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white">{asst.nameAr}</p>
                        <p className="text-[11px] text-slate-400">{asst.specialtyAr}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onChangeAdvisorCouncil(toggleAssistantEnabled(advisorCouncil, asst.id))
                          }
                          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                            asst.enabled
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {asst.enabled ? 'مفعّل' : 'متوقف'}
                        </button>
                        {asst.isCustom && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeAdvisorCouncil(
                                removeCustomAssistant(advisorCouncil, asst.id)
                              )
                            }
                            aria-label={`حذف ${asst.nameAr}`}
                            className="rounded-lg p-1.5 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Add Custom Assistant */}
              <section className="space-y-2">
                <h3 className="text-xs font-bold text-white">أضف مساعداً جديداً حسب حاجتك</h3>
                <form
                  onSubmit={handleAddAssistant}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-[#111827] p-3 sm:grid-cols-2"
                >
                  <input
                    type="text"
                    value={newAsstName}
                    onChange={(e) => setNewAsstName(e.target.value)}
                    placeholder="اسم المساعد (مثلاً: مساعد التصميم)"
                    className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    value={newAsstRole}
                    onChange={(e) => setNewAsstRole(e.target.value)}
                    placeholder="تخصصه (مثلاً: تحسين الواجهات والألوان)"
                    className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                  />
                  <div className="flex justify-end sm:col-span-2">
                    <button
                      type="submit"
                      disabled={!newAsstName.trim() || !newAsstRole.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-[#0B0907] hover:bg-amber-400 disabled:opacity-45"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>إضافة للفريق</span>
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="space-y-5">
              {/* Internal Platform Apps */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Link2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>تطبيقات المنصة المربوطة مباشرة ({INTERNAL_CONNECTED_APPS.length})</span>
                  </h3>
                  <span className="text-[11px] text-emerald-300">متصلة وتعمل بالأوامر</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {INTERNAL_CONNECTED_APPS.map((app) => (
                    <div
                      key={app.target}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{app.nameAr}</p>
                        <p className="truncate text-[11px] text-slate-400">{app.summaryAr}</p>
                      </div>
                      {onLaunchInternalApp && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchInternalApp(app.target);
                          }}
                          className="shrink-0 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-100 hover:bg-amber-500 hover:text-[#0B0907]"
                        >
                          فتح
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Full-App AI Control Capabilities */}
              <section className="space-y-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      صلاحيات التحكم الشامل للذكاء الاصطناعي داخل فالدريون
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      اطلب من القائد مباشرةً بالمحادثة تنفيذ أي إجراء داخل التطبيق وسينفّذه فوراً:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeOmniConfig({
                        ...omniConfig,
                        allowCrossAppControl: !omniConfig.allowCrossAppControl,
                      })
                    }
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold ${
                      omniConfig.allowCrossAppControl
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {omniConfig.allowCrossAppControl ? 'مفعّل بالكامل' : 'متوقف'}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {APP_CONTROL_CAPABILITIES.map((cap) => (
                    <div
                      key={cap.id}
                      className="rounded-lg border border-slate-800 bg-[#0D1322] p-2.5"
                    >
                      <p className="text-xs font-bold text-emerald-300">{cap.areaAr}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        {cap.examplesAr}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Official Social Media OAuth 2.0 + Authorized WhatsApp Groups Whitelist */}
              <SocialOAuthHub
                accountConsentGranted={accountConsentGranted}
                onToggleAccountConsent={onToggleAccountConsent}
                onImportDetectedServers={onImportDetectedServers}
                onToast={onToast}
              />

              {/* Multi-App Webhook Connectors (Discord, Slack, Zapier, Make, n8n, Home Assistant) */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-4">
                <div>
                  <h3 className="text-xs font-bold text-white">
                    ربط تطبيقات الأتمتة و Webhooks (Discord · Slack · Zapier · Make · n8n · Home Assistant)
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    أضف رابط Webhook من أي تطبيق؛ يتم الإرسال عبر خادمنا بدون قيود CORS وبالتنسيق الأصلي لـ Discord وSlack.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const check = validateWebhookUrl(newHookUrl);
                    if (!check.valid || !check.normalized) {
                      onToast(check.error || 'أدخل رابط Webhook صحيح يبدأ بـ https://');
                      return;
                    }
                    const platform = detectWebhookPlatform(check.normalized);
                    const label = newHookName.trim() || platform.toUpperCase();
                    const nextList = [
                      ...(omniConfig.connectedWebhooks || []),
                      {
                        id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        name: label.slice(0, 48),
                        platform,
                        url: check.normalized,
                        enabled: true,
                      },
                    ].slice(0, 12);
                    onChangeOmniConfig({ ...omniConfig, connectedWebhooks: nextList });
                    setNewHookName('');
                    setNewHookUrl('');
                    onToast(`تم ربط التطبيق «${label}» بنجاح!`);
                  }}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                  <input
                    type="text"
                    value={newHookName}
                    onChange={(e) => setNewHookName(e.target.value)}
                    placeholder="اسم التطبيق (مثلاً: ديسكورد الفريق)"
                    className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                  />
                  <input
                    type="url"
                    dir="ltr"
                    value={newHookUrl}
                    onChange={(e) => setNewHookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400 sm:col-span-2"
                  />
                  <div className="flex items-center justify-between gap-2 sm:col-span-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={omniConfig.autoSendWebhook}
                        onChange={(e) =>
                          onChangeOmniConfig({ ...omniConfig, autoSendWebhook: e.target.checked })
                        }
                        className="rounded border-slate-600 bg-[#090D16]"
                      />
                      <span>إرسال نتائج المهام تلقائياً لجميع التطبيقات المفعّلة</span>
                    </label>
                    <button
                      type="submit"
                      disabled={!newHookUrl.trim()}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-[#07101C] hover:bg-sky-400 disabled:opacity-45"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>ربط التطبيق</span>
                    </button>
                  </div>
                </form>

                {(omniConfig.connectedWebhooks || []).length > 0 && (
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0B101B]">
                    {(omniConfig.connectedWebhooks || []).map((hook) => (
                      <div
                        key={hook.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-white">
                            {hook.name}{' '}
                            <span className="font-mono text-[10px] font-normal text-sky-300">
                              ({hook.platform})
                            </span>
                          </p>
                          <p dir="ltr" className="truncate font-mono text-[10px] text-slate-400">
                            {hook.url}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await dispatchToUserWebhook({
                                webhookUrl: hook.url,
                                prompt: 'اختبار ربط القائد الشامل',
                                reply: `تم ربط ${hook.name} بنجاح مع القائد الشامل!`,
                                generation: evolutionState.generation,
                                agentsUsed: ['القائد الشامل'],
                              });
                              onToast(
                                r.ok
                                  ? `تم إرسال رسالة الاختبار إلى «${hook.name}» بنجاح!`
                                  : r.error || 'تعذّر الإرسال للتطبيق.'
                              );
                            }}
                            className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                          >
                            اختبار
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeOmniConfig({
                                ...omniConfig,
                                connectedWebhooks: (omniConfig.connectedWebhooks || []).map((w) =>
                                  w.id === hook.id ? { ...w, enabled: !w.enabled } : w
                                ),
                              })
                            }
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                              hook.enabled
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {hook.enabled ? 'مفعّل' : 'موقوف'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChangeOmniConfig({
                                ...omniConfig,
                                connectedWebhooks: (omniConfig.connectedWebhooks || []).filter(
                                  (w) => w.id !== hook.id
                                ),
                              })
                            }
                            aria-label={`إزالة ${hook.name}`}
                            className="rounded p-1 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-5">
              {/* Custom Rules */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">قواعدك الخاصة</h3>
                  <button
                    type="button"
                    onClick={onClearVectorMemory}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400"
                  >
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>مسح الذاكرة ({vectorMemoryCount})</span>
                  </button>
                </div>

                <form onSubmit={handleAddRule} className="flex gap-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="مثال: أجبني باختصار ومباشرة..."
                    className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!newRule.trim()}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-[#0B0907] hover:bg-amber-400 disabled:opacity-45"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>إضافة</span>
                  </button>
                </form>

                {settings.customDirectives.length > 0 && (
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#111827]">
                    {settings.customDirectives.map((rule, idx) => (
                      <div
                        key={`${rule}-${idx}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                      >
                        <span className="text-slate-200">{rule}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeSettings({
                              ...settings,
                              customDirectives: settings.customDirectives.filter(
                                (_, i) => i !== idx
                              ),
                            })
                          }
                          aria-label="حذف القاعدة"
                          className="rounded p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Q&A Training */}
              <section className="space-y-2.5">
                <h3 className="text-xs font-bold text-white">درّبه على ردّ محدد</h3>
                <form
                  onSubmit={handleAddTraining}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-[#111827] p-3 sm:grid-cols-2"
                >
                  <input
                    id="commander-train-q"
                    type="text"
                    value={trainQ}
                    onChange={(e) => setTrainQ(e.target.value)}
                    placeholder="عندما أسأل..."
                    className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                  />
                  <input
                    id="commander-train-a"
                    type="text"
                    value={trainA}
                    onChange={(e) => setTrainA(e.target.value)}
                    placeholder="أجبني بـ..."
                    className="rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
                  />
                  <div className="flex justify-end sm:col-span-2">
                    <button
                      type="submit"
                      disabled={!trainQ.trim() || !trainA.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-45"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>حفظ التدريب</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* Webhook integration */}
              <section className="space-y-2.5 rounded-xl border border-slate-800 bg-[#111827] p-4">
                <h3 className="text-xs font-bold text-white">ربط خارجي (Webhook / n8n / Telegram)</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    dir="ltr"
                    value={omniConfig.webhookUrl}
                    onChange={(e) =>
                      onChangeOmniConfig({ ...omniConfig, webhookUrl: e.target.value })
                    }
                    placeholder="https://hooks.example.com/mission"
                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const check = validateWebhookUrl(omniConfig.webhookUrl);
                      if (!check.valid || !check.normalized) {
                        onToast(check.error || 'أدخل رابطاً صحيحاً أولاً.');
                        return;
                      }
                      const res = await dispatchToUserWebhook({
                        webhookUrl: check.normalized,
                        prompt: 'اختبار اتصال القائد الشامل',
                        reply: 'تم ربط القائد الشامل بالـ Webhook بنجاح.',
                        generation: evolutionState.generation,
                        agentsUsed: ['القائد الشامل', 'المستشار الأعلى'],
                      });
                      onToast(
                        res.ok
                          ? 'تم إرسال الاختبار بنجاح!'
                          : res.error || 'تعذّر الوصول للرابط.'
                      );
                    }}
                    className="whitespace-nowrap rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700"
                  >
                    اختبار الرابط
                  </button>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={omniConfig.autoSendWebhook}
                    onChange={(e) =>
                      onChangeOmniConfig({ ...omniConfig, autoSendWebhook: e.target.checked })
                    }
                    className="rounded border-slate-600 bg-[#090D16]"
                  />
                  <span>إرسال نتائج المهام تلقائياً للرابط</span>
                </label>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
