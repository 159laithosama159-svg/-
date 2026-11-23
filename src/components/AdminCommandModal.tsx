import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Code2,
  Copy,
  Crown,
  Database,
  Download,
  FileCode2,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Server,
  X,
} from 'lucide-react';

export const SUPER_ADMIN_EMAIL = '159laithosama159@gmail.com';

export function isSuperAdminUser(user: User | null | undefined): boolean {
  return Boolean(user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL);
}

interface AdminOverview {
  adminEmail: string;
  uptimeSec: number;
  memoryMb: number;
  heapUsedMb: number;
  nodeVersion: string;
  totalSourceFiles: number;
  announcement: string;
  serverTime: string;
}

interface AdminCommandModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onAnnouncementUpdated?: (text: string) => void;
  onToast: (msg: string) => void;
}

export const AdminCommandModal: React.FC<AdminCommandModalProps> = ({
  open,
  user,
  onClose,
  onAnnouncementUpdated,
  onToast,
}) => {
  const [tab, setTab] = useState<'overview' | 'code' | 'backup'>('overview');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [files, setFiles] = useState<Array<{ path: string; size: number }>>([]);
  const [fileQuery, setFileQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [downloadingBundle, setDownloadingBundle] = useState(false);

  const authorized = isSuperAdminUser(user);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const loadAdminData = useCallback(async () => {
    if (!authorized || !user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [ovRes, filesRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/files', { headers }),
      ]);
      if (ovRes.ok) {
        const ov = (await ovRes.json()) as AdminOverview;
        setOverview(ov);
        setAnnouncementInput(ov.announcement || '');
      }
      if (filesRes.ok) {
        const fData = (await filesRes.json()) as {
          files?: Array<{ path: string; size: number }>;
        };
        setFiles(fData.files || []);
      }
    } catch {
      onToast('تعذّر جلب بيانات لوحة الأدمن حالياً.');
    } finally {
      setLoading(false);
    }
  }, [authorized, getAuthHeaders, onToast, user]);

  useEffect(() => {
    if (open && authorized) {
      void loadAdminData();
    }
  }, [authorized, loadAdminData, open]);

  if (!open || !authorized) return null;

  const handleOpenFile = async (filePath: string) => {
    setSelectedFile(filePath);
    setLoadingFile(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/file?path=${encodeURIComponent(filePath)}`, {
        headers,
      });
      if (!res.ok) throw new Error('تعذّرت قراءة الملف');
      const data = (await res.json()) as { content?: string };
      setFileContent(data.content || '');
    } catch {
      setFileContent('// تعذّرت قراءة هذا الملف حالياً.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDownloadSingleFile = () => {
    if (!selectedFile || !fileContent) return;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'code.txt';
    a.click();
    URL.revokeObjectURL(url);
    onToast(`تم تنزيل الملف ${selectedFile}`);
  };

  const handleDownloadCodeBundle = async () => {
    setDownloadingBundle(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/download-bundle', { headers });
      if (!res.ok) throw new Error('فشل تنزيل حزمة الكود');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valdrion-full-source-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('تم تنزيل كامل كود التطبيق المصدري بنجاح!');
    } catch {
      onToast('تعذّر تنزيل حزمة الكود حالياً.');
    } finally {
      setDownloadingBundle(false);
    }
  };

  const handleDownloadAllClientData = () => {
    const dump: Record<string, unknown> = {
      exportedBy: user?.email,
      exportedAt: new Date().toISOString(),
      localStorage: {} as Record<string, string>,
    };
    const ls: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) ls[k] = localStorage.getItem(k) || '';
    }
    dump.localStorage = ls;
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valdrion-admin-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('تم تصدير وتنزيل جميع بيانات التطبيق (السيرفرات، الروايات، المحادثات، الإعدادات).');
  };

  const handlePublishAnnouncement = async () => {
    setSavingAnnouncement(true);
    try {
      const headers = {
        ...(await getAuthHeaders()),
        'Content-Type': 'application/json',
      };
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers,
        body: JSON.stringify({ announcement: announcementInput.trim() }),
      });
      if (!res.ok) throw new Error('فشل نشر الإعلان');
      onAnnouncementUpdated?.(announcementInput.trim());
      onToast(
        announcementInput.trim()
          ? 'تم نشر إعلان الأدمن العام للجميع!'
          : 'تمت إزالة إعلان الأدمن العام.'
      );
    } catch {
      onToast('تعذّر حفظ الإعلان العام.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.path.toLowerCase().includes(fileQuery.trim().toLowerCase())
  );

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="super-admin-title"
      className="fixed inset-0 z-[115] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#F5C76B]/45 bg-[#0A0E18] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111728] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F5C76B]/50 bg-[#F5C76B]/15 text-[#F5C76B]">
              <Crown className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="super-admin-title" className="text-base font-black text-white sm:text-lg">
                لوحة الأدمن العليا — تحكم كامل بالكود والنظام
              </h2>
              <p className="text-xs text-emerald-300">
                حساب موثّق: {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAdminData()}
              className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-300 hover:text-white"
              title="تحديث بيانات الأدمن"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق لوحة الأدمن"
              className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0D1322] px-6 py-2.5">
          {(
            [
              { id: 'overview', label: 'نظرة عامة وإعلانات', icon: Server },
              { id: 'code', label: `مستكشف الكود وتنزيله (${files.length})`, icon: Code2 },
              { id: 'backup', label: 'تصدير وتنزيل كل شيء', icon: Database },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-colors ${
                  tab === t.id
                    ? 'bg-[#F5C76B] text-[#0E0B07]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#12192B] p-4">
                  <p className="text-[11px] text-slate-400">ملفات الكود المصدري</p>
                  <p className="mt-1 text-2xl font-black text-[#F5C76B]">
                    {overview?.totalSourceFiles ?? files.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#12192B] p-4">
                  <p className="text-[11px] text-slate-400">استهلاك الذاكرة (RAM)</p>
                  <p className="mt-1 text-2xl font-black text-emerald-300">
                    {overview?.memoryMb ?? '—'} MB
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#12192B] p-4">
                  <p className="text-[11px] text-slate-400">زمن تشغيل الخادم</p>
                  <p className="mt-1 text-2xl font-black text-sky-300">
                    {overview ? `${Math.floor(overview.uptimeSec / 60)} د` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#12192B] p-4">
                  <p className="text-[11px] text-slate-400">إصدار Node.js</p>
                  <p className="mt-1 text-lg font-black text-white">
                    {overview?.nodeVersion || '—'}
                  </p>
                </div>
              </div>

              {/* Global Announcement Broadcast */}
              <div className="rounded-2xl border border-[#F5C76B]/25 bg-[#12192B] p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-black text-[#F5C76B]">
                  <Megaphone className="h-4 w-4" aria-hidden="true" />
                  <span>بث إعلان عام في أعلى التطبيق للجميع</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    placeholder="اكتب رسالة إعلان تظهر لجميع مستخدمي التطبيق (أو اتركه فارغاً للإخفاء)..."
                    className="flex-1 rounded-xl border border-white/15 bg-[#090D16] px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#F5C76B] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={savingAnnouncement}
                    onClick={() => void handlePublishAnnouncement()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F5C76B] px-5 py-2.5 text-xs font-black text-[#120D08] hover:brightness-110 disabled:opacity-50"
                  >
                    {savingAnnouncement && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>حفظ ونشر</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'code' && (
            <div className="grid gap-4 lg:grid-cols-12">
              {/* File Tree */}
              <div className="flex max-h-[56vh] flex-col rounded-2xl border border-white/10 bg-[#0E1423] lg:col-span-4">
                <div className="border-b border-white/10 p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fileQuery}
                      onChange={(e) => setFileQuery(e.target.value)}
                      placeholder="ابحث عن ملف كود..."
                      className="w-full rounded-xl border border-white/10 bg-[#090D16] py-2 pr-8 pl-3 text-xs text-white focus:border-[#F5C76B] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
                  {filteredFiles.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      onClick={() => void handleOpenFile(f.path)}
                      dir="ltr"
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                        selectedFile === f.path
                          ? 'bg-[#F5C76B]/20 text-[#F5C76B]'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-75" />
                        <span className="truncate">{f.path}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {Math.max(1, Math.round(f.size / 1024))}KB
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Viewer */}
              <div className="flex max-h-[56vh] flex-col rounded-2xl border border-white/10 bg-[#080B12] lg:col-span-8">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#101626] px-4 py-2.5">
                  <span dir="ltr" className="truncate font-mono text-xs font-bold text-[#F5C76B]">
                    {selectedFile || 'اختر أي ملف من القائمة لعرض الكود وتنزيله'}
                  </span>
                  {selectedFile && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(fileContent);
                          setCopiedCode(true);
                          window.setTimeout(() => setCopiedCode(false), 1800);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:text-white"
                      >
                        {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedCode ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadSingleFile}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F5C76B] px-2.5 py-1 text-[11px] font-black text-[#120D08]"
                      >
                        <Download className="h-3 w-3" />
                        <span>تنزيل الملف</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {loadingFile ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin text-[#F5C76B]" />
                      <span>جاري تحميل الكود...</span>
                    </div>
                  ) : (
                    <pre
                      dir="ltr"
                      className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-emerald-100/90"
                    >
                      {fileContent || '// اختر ملفاً من القائمة اليسرى للاطلاع عليه أو تنزيله.'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'backup' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#F5C76B]/30 bg-[#12192B] p-5 space-y-3">
                <h3 className="text-sm font-black text-white">
                  تنزيل الكود المصدري الكامل للتطبيق
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  يحزّم جميع ملفات الكود الأمامي والخلفي (`src/`, `server.ts`, `index.html`, `package.json`) في ملف واحد جاهز للتحميل والأرشفة (بدون أي أسرار حساسة).
                </p>
                <button
                  type="button"
                  disabled={downloadingBundle}
                  onClick={() => void handleDownloadCodeBundle()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F5C76B] px-4 py-2.5 text-xs font-black text-[#120D08] hover:brightness-110 disabled:opacity-50"
                >
                  {downloadingBundle ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>تنزيل كامل كود التطبيق الآن</span>
                </button>
              </div>

              <div className="rounded-2xl border border-emerald-400/30 bg-[#12192B] p-5 space-y-3">
                <h3 className="text-sm font-black text-white">
                  تصدير وتنزيل جميع بيانات الجلسة والمكتبات
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  يشمل جميع السيرفرات المحفوظة، الروايات، المانهوا، محادثات الذكاء، مجموعات واتساب المسموحة، وإعدادات الأمان بملف JSON واحد.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadAllClientData}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400"
                >
                  <Database className="h-4 w-4" />
                  <span>تنزيل النسخة الشاملة للبيانات</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
