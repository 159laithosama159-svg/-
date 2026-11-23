import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Brain,
  Check,
  Copy,
  Download,
  FileCode2,
  Package,
  Pin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  BRAIN_TONE_LABELS,
  MEMORY_CATEGORY_LABELS,
  addBrainMemory,
  createDefaultBrainProfile,
  type BrainMemoryItem,
  type BrainTone,
  type UserBrainProfile,
} from '../utils/brainMemoryUtils';
import {
  buildGeminiSkillZipPackage,
  buildGeminiTeamSkillMarkdown,
} from '../utils/geminiSkillExporter';

export type BrainTab = 'persona' | 'memories' | 'vault' | 'skill';

interface BrainMemoryModalProps {
  open: boolean;
  initialTab?: BrainTab;
  profile: UserBrainProfile;
  onUpdateProfile: (next: UserBrainProfile) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function BrainMemoryModal({
  open,
  initialTab,
  profile,
  onUpdateProfile,
  onClose,
  onToast,
}: BrainMemoryModalProps) {
  const [tab, setTab] = useState<BrainTab>(initialTab || 'persona');
  const [newMemory, setNewMemory] = useState('');
  const [newMemoryCat, setNewMemoryCat] = useState<BrainMemoryItem['category']>('fact');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [includePersonalMemories, setIncludePersonalMemories] = useState(true);
  const [copiedSkill, setCopiedSkill] = useState(false);

  useEffect(() => {
    if (open && initialTab) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  const skillMarkdown = useMemo(
    () =>
      buildGeminiTeamSkillMarkdown({
        skillName: 'aethermind-omni-24-agents',
        customBrainInstructions: includePersonalMemories
          ? profile.customInstructions || undefined
          : undefined,
        userMemories: includePersonalMemories
          ? profile.memories.map((m) => m.content)
          : undefined,
      }),
    [profile.customInstructions, profile.memories, includePersonalMemories]
  );

  if (!open) return null;

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const next = addBrainMemory(profile, newMemory, newMemoryCat);
    onUpdateProfile(next);
    setNewMemory('');
    onToast('تم حفظ المعلومة في الذاكرة طويلة المدى.');
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    const next: UserBrainProfile = {
      ...profile,
      knowledgeVault: [
        {
          id: `note_${Date.now()}`,
          title: newNoteTitle.trim().slice(0, 100),
          content: newNoteContent.trim().slice(0, 2400),
          updatedAt: Date.now(),
        },
        ...profile.knowledgeVault,
      ].slice(0, 20),
      updatedAt: Date.now(),
    };
    onUpdateProfile(next);
    setNewNoteTitle('');
    setNewNoteContent('');
    onToast('تم حفظ الملاحظة في خزنة المعرفة الشخصية.');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valdrion-mind-brain-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    onToast('تم تصدير نسخة احتياطية كاملة من العقل والذاكرة.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="العقل الشخصي والذاكرة طويلة المدى"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#131722] text-[#E8ECF4] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6]/15 text-[#60A5FA]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">العقل الشخصي والذاكرة · AETHERMIND AI</h2>
              <p className="text-xs text-[#94A3B8]">
                {profile.memories.length} ذاكرة محفوظة · {profile.knowledgeVault.length} مستند معرفي · وتصدير ملف المهارة إلى Gemini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg border border-white/10 bg-[#1B2130] p-2 text-[#94A3B8] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#0F131C] px-6 py-2.5">
          {(
            [
              { id: 'persona', label: 'هوية العقل والتعليمات', icon: Brain },
              { id: 'memories', label: `الذاكرة طويلة المدى (${profile.memories.length})`, icon: Pin },
              { id: 'vault', label: `خزنة المعرفة (${profile.knowledgeVault.length})`, icon: BookOpen },
              { id: 'skill', label: 'ملف مهارة Gemini (SKILL.md)', icon: FileCode2 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#94A3B8] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'persona' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#CBD5E1]">
                    اسمك (ليخاطبك العقل به دائماً)
                  </label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, displayName: e.target.value })
                    }
                    placeholder="مثال: أحمد، سارة..."
                    className="w-full rounded-xl border border-white/10 bg-[#0D1017] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#CBD5E1]">
                    تخصصك أو اهتمامك الأساسي
                  </label>
                  <input
                    type="text"
                    value={profile.roleTitle}
                    onChange={(e) =>
                      onUpdateProfile({ ...profile, roleTitle: e.target.value })
                    }
                    placeholder="مثال: مطور ألعاب Godot ومبرمج ويب"
                    className="w-full rounded-xl border border-white/10 bg-[#0D1017] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[#CBD5E1]">
                  شخصية وأسلوب تفكير العقل
                </label>
                <div className="grid gap-2 sm:grid-cols-5">
                  {(Object.keys(BRAIN_TONE_LABELS) as BrainTone[]).map((t) => {
                    const active = profile.tone === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onUpdateProfile({ ...profile, tone: t })}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-[#60A5FA] bg-[#60A5FA]/15 text-white'
                            : 'border-white/10 bg-[#0D1017] text-[#94A3B8] hover:border-white/25'
                        }`}
                      >
                        {BRAIN_TONE_LABELS[t].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#CBD5E1]">
                  تعليمات دائمة يلتزم بها العقل في كل محادثة
                </label>
                <textarea
                  rows={4}
                  value={profile.customInstructions}
                  onChange={(e) =>
                    onUpdateProfile({ ...profile, customInstructions: e.target.value })
                  }
                  placeholder="مثال: أعطني دائماً الكود كاملاً بدون اختصار، واشرح لي الخطوات بالعربية مع أمثلة عملية..."
                  className="w-full rounded-xl border border-white/10 bg-[#0D1017] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProfile({ ...profile, autoCritic: !profile.autoCritic })
                  }
                  className={`flex items-start gap-3 rounded-xl border p-4 text-right transition-colors ${
                    profile.autoCritic
                      ? 'border-emerald-400/50 bg-emerald-500/10'
                      : 'border-white/10 bg-[#0D1017] hover:border-white/20'
                  }`}
                >
                  <ShieldCheck
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      profile.autoCritic ? 'text-emerald-400' : 'text-[#64748B]'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-white">
                      التدقيق الذاتي (Auto-Critic) · {profile.autoCritic ? 'مفعّل' : 'متوقف'}
                    </p>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      يراجع العقل أكواده وإجاباته داخلياً قبل الإرسال للتحقق من خلوها من الأخطاء.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      autoSpeakReplies: !profile.autoSpeakReplies,
                    })
                  }
                  className={`flex items-start gap-3 rounded-xl border p-4 text-right transition-colors ${
                    profile.autoSpeakReplies
                      ? 'border-[#60A5FA]/50 bg-[#60A5FA]/10'
                      : 'border-white/10 bg-[#0D1017] hover:border-white/20'
                  }`}
                >
                  <Check
                    className={`mt-0.5 h-5 w-5 shrink-0 ${
                      profile.autoSpeakReplies ? 'text-[#60A5FA]' : 'text-[#64748B]'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-white">
                      نطق الردود تلقائياً · {profile.autoSpeakReplies ? 'مفعّل' : 'متوقف'}
                    </p>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      اقرأ إجابات الذكاء الاصطناعي صوتياً فور اكتمالها تلقائياً.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'memories' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={newMemoryCat}
                  onChange={(e) =>
                    setNewMemoryCat(e.target.value as BrainMemoryItem['category'])
                  }
                  className="rounded-xl border border-white/10 bg-[#0D1017] px-3 py-2.5 text-xs font-semibold text-white"
                >
                  {(Object.keys(MEMORY_CATEGORY_LABELS) as Array<BrainMemoryItem['category']>).map(
                    (c) => (
                      <option key={c} value={c}>
                        {MEMORY_CATEGORY_LABELS[c]}
                      </option>
                    )
                  )}
                </select>
                <input
                  type="text"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMemory();
                  }}
                  placeholder="أضف حقيقة أو تفضيلاً ليتذكره العقل دائماً (مثلاً: أعمل على لعبة عالم مفتوح في Godot 4)..."
                  className="flex-1 rounded-xl border border-white/10 bg-[#0D1017] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMemory}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1D4ED8]"
                >
                  <Plus className="h-4 w-4" />
                  <span>حفظ بالذاكرة</span>
                </button>
              </div>

              {profile.memories.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-xs text-[#94A3B8]">
                  الذاكرة فارغة حالياً — أضف أول معلومة بالأعلى أو اضغط «حفظ في الذاكرة» على أي رد داخل المحادثة.
                </div>
              ) : (
                <div className="space-y-2">
                  {profile.memories.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0D1017] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#94A3B8]">
                          {MEMORY_CATEGORY_LABELS[m.category]}
                          {m.pinned ? ' · مثبّتة بالأولوية' : ''}
                        </p>
                        <p className="mt-0.5 text-sm text-[#F1F5F9]">{m.content}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProfile({
                              ...profile,
                              memories: profile.memories.map((item) =>
                                item.id === m.id ? { ...item, pinned: !item.pinned } : item
                              ),
                            })
                          }
                          aria-label="تثبيت الذاكرة"
                          className={`rounded-lg p-1.5 transition-colors ${
                            m.pinned
                              ? 'bg-[#60A5FA]/20 text-[#60A5FA]'
                              : 'text-[#64748B] hover:text-white'
                          }`}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateProfile({
                              ...profile,
                              memories: profile.memories.filter((item) => item.id !== m.id),
                            })
                          }
                          aria-label="حذف الذاكرة"
                          className="rounded-lg p-1.5 text-[#64748B] hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'vault' && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#0D1017] p-4">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="عنوان المستند أو الملاحظة (مثلاً: مواصفات مشروعي أو قواعد الكود)..."
                  className="w-full rounded-lg border border-white/10 bg-[#131722] px-3 py-2 text-xs font-semibold text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
                />
                <textarea
                  rows={3}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="أدخل المعلومات التي تريد أن يستند إليها العقل دائماً عند الإجابة..."
                  className="w-full rounded-lg border border-white/10 bg-[#131722] px-3 py-2 text-xs text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-bold text-white hover:bg-[#1D4ED8]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة إلى خزنة المعرفة</span>
                </button>
              </div>

              {profile.knowledgeVault.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0D1017] p-4"
                >
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white">{note.title}</h4>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-[#94A3B8]">
                      {note.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        knowledgeVault: profile.knowledgeVault.filter((n) => n.id !== note.id),
                      })
                    }
                    className="rounded-lg p-1.5 text-[#64748B] hover:text-rose-400"
                    aria-label="حذف الملاحظة"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'skill' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#F5C76B]/30 bg-gradient-to-l from-[#1C1A12] to-[#131826] p-4">
                <h3 className="text-sm font-extrabold text-[#FDE68A]">
                  تصدير فريق الـ 24 وكيلاً كملف مهارة جاهز للرفع إلى Gemini (SKILL.md + .zip)
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#CBD5E1]">
                  يتضمن هذا الملف جميع الـ 24 وكيلاً المتخصصاً، بروتوكول القائد الشامل، سلاسل المهام المتعددة، قواعد برمجة Godot 4 والألعاب الحية، وبروتوكول التحكم بإذنك — بصيغة YAML Frontmatter قياسية قابلة للرفع مباشرة إلى Gemini Gems أو Gemini CLI أو أي منصة تدعم ملفات SKILL.md.
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#E2E8F0]">
                    <input
                      type="checkbox"
                      checked={includePersonalMemories}
                      onChange={(e) => setIncludePersonalMemories(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#2563EB]"
                    />
                    <span>تضمين ذاكرتي الشخصية وتعليماتي داخل ملف المهارة</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([skillMarkdown], {
                          type: 'text/markdown;charset=utf-8',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'SKILL.md';
                        a.click();
                        URL.revokeObjectURL(url);
                        onToast('تم تحميل ملف SKILL.md بنجاح — يمكنك رفعه مباشرة إلى Gemini!');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#1D4ED8]"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>تحميل SKILL.md</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const zipBytes = buildGeminiSkillZipPackage({
                          skillName: 'aethermind-omni-24-agents',
                          customBrainInstructions: includePersonalMemories
                            ? profile.customInstructions || undefined
                            : undefined,
                          userMemories: includePersonalMemories
                            ? profile.memories.map((m) => m.content)
                            : undefined,
                        });
                        const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
                          type: 'application/zip',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'aethermind-24-agents-skill.zip';
                        a.click();
                        URL.revokeObjectURL(url);
                        onToast('تم تحميل حزمة المهارة الكاملة (.zip) بنجاح!');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#F5C76B]/45 bg-[#262013] px-3.5 py-2 text-xs font-extrabold text-[#FDE68A] hover:bg-[#D9A441] hover:text-[#0B0907]"
                    >
                      <Package className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>تحميل حزمة .zip</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(skillMarkdown);
                          setCopiedSkill(true);
                          onToast('تم نسخ محتوى SKILL.md بالكامل للحافظة.');
                          setTimeout(() => setCopiedSkill(false), 1800);
                        } catch {
                          onToast('تعذّر النسخ التلقائي.');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1B2234] px-3 py-2 text-xs font-bold text-[#E2E8F0] hover:text-white"
                    >
                      {copiedSkill ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>نسخ</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0B0E16] p-3">
                <p className="mb-2 text-[11px] font-bold text-[#93C5FD]">
                  معاينة حيّة لملف SKILL.md ({skillMarkdown.length.toLocaleString()} حرف):
                </p>
                <pre
                  dir="ltr"
                  className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded-lg bg-[#070A10] p-3 font-mono text-[11px] leading-relaxed text-[#CBD5E1]"
                >
                  {skillMarkdown.slice(0, 4500)}
                  {skillMarkdown.length > 4500 ? '\n\n... [سيتم تصدير الملف كاملاً عند التحميل]' : ''}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#0F131C] px-6 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171C28] px-3 py-2 text-xs font-semibold text-[#CBD5E1] hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              <span>نسخ احتياطي JSON</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateProfile(createDefaultBrainProfile());
                onToast('تم تصفير إعدادات العقل والذاكرة.');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171C28] px-3 py-2 text-xs font-semibold text-[#94A3B8] hover:text-rose-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>تصفير</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onToast('تم حفظ وتفعيل العقل الشخصي بنجاح.');
              onClose();
            }}
            className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-bold text-white hover:bg-[#1D4ED8]"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
