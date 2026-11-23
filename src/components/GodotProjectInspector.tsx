import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  FileCode2,
  FolderTree,
  Gamepad2,
  GitBranch,
  PanelLeftClose,
  Play,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  buildSandboxedPlayableHtml,
  parseGodotSceneNodes,
  type GodotProjectBundle,
} from '../utils/godotEngineUtils';
import { buildZipArchive } from '../utils/zipBuilder';

export function downloadGodotProjectZip(project: GodotProjectBundle): void {
  const zipBytes = buildZipArchive(
    project.files.map((f) => ({ path: f.path, content: f.content }))
  );
  const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
    type: 'application/zip',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.slug}-godot4.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Inline summary card displayed directly inside the chat message thread */
export function GodotProjectCard({
  project,
  isEngineLive,
  onOpenInspector,
  onSyncToGodot,
  onToast,
}: {
  project: GodotProjectBundle;
  isEngineLive: boolean;
  onOpenInspector: (project: GodotProjectBundle, initialTab?: 'files' | 'tree' | 'play') => void;
  onSyncToGodot: (project: GodotProjectBundle) => void;
  onToast: (msg: string) => void;
}) {
  const gdCount = project.files.filter(
    (f) => f.path.endsWith('.gd') && !f.path.startsWith('addons/')
  ).length;
  const tscnCount = project.files.filter((f) => f.path.endsWith('.tscn')).length;

  return (
    <div className="my-3 rounded-xl border border-[#D9A441]/38 bg-[#120E0A] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#D9A441]/16 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D9A441]/45 bg-[#1F1810] text-[#F0C975]">
            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-[#F8F0DC]">
              {project.projectName}
            </p>
            <p className="text-[11px] font-semibold text-[#B5A78F]">
              Godot {project.godotVersion} · {project.dimension.toUpperCase()} · {project.files.length} ملفات ({tscnCount} مشهد، {gdCount} سكربت GDScript)
            </p>
          </div>
        </div>
        <span className="font-mono text-[11px] font-bold text-[#D9A441]" dir="ltr">
          {project.mainScene}
        </span>
      </div>

      {project.controls.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#D8CBB2]">
          <span className="font-extrabold text-[#E6BC66]">التحكم:</span>
          {project.controls.map((ctrl, idx) => (
            <span key={ctrl}>
              {ctrl}
              {idx < project.controls.length - 1 ? ' ·' : ''}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            downloadGodotProjectZip(project);
            onToast(`تم تحميل مشروع جودوت الكامل: ${project.slug}-godot4.zip`);
          }}
          className="sketch-btn-wax inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>تحميل مشروع جودوت (.zip)</span>
        </button>

        <button
          type="button"
          onClick={() => onSyncToGodot(project)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition-colors whitespace-nowrap ${
            isEngineLive
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-[#04140B]'
              : 'border-[#D9A441]/35 bg-[#1B150E] text-[#F0C975] hover:border-[#D9A441]'
          }`}
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {isEngineLive ? 'إرسال وتشغيل مباشر داخل جودوت' : 'مزامنة مع جسر جودوت الحي'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenInspector(project, 'files')}
          className="sketch-btn-gold inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold whitespace-nowrap"
        >
          <FolderTree className="h-3.5 w-3.5" aria-hidden="true" />
          <span>استعراض الملفات والمشهد</span>
        </button>

        {project.previewHtml && (
          <button
            type="button"
            onClick={() => onOpenInspector(project, 'play')}
            className="sketch-btn-ink inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#F0C975] whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>تجربة فورية بالمتصفح</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Claude-Style Split Pane Inspector for generated Godot 4 Projects */
export function GodotProjectInspector({
  project,
  initialTab = 'files',
  colSpanClass = 'lg:col-span-5',
  isEngineLive,
  onSyncToGodot,
  onRunMainInGodot,
  onClose,
  onToast,
}: {
  project: GodotProjectBundle;
  initialTab?: 'files' | 'tree' | 'play';
  colSpanClass?: string;
  isEngineLive: boolean;
  onSyncToGodot: (project: GodotProjectBundle) => void;
  onRunMainInGodot: () => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<'files' | 'tree' | 'play'>(
    initialTab === 'play' && !project.previewHtml ? 'files' : initialTab
  );
  const [selectedPath, setSelectedPath] = useState<string>(
    () =>
      project.files.find((f) => f.path.endsWith('.gd') && !f.path.startsWith('addons/'))
        ?.path ||
      project.files[0]?.path ||
      ''
  );
  const [copiedFile, setCopiedFile] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);

  useEffect(() => {
    setTab(initialTab === 'play' && !project.previewHtml ? 'files' : initialTab);
    setSelectedPath(
      project.files.find((f) => f.path.endsWith('.gd') && !f.path.startsWith('addons/'))
        ?.path ||
        project.files[0]?.path ||
        ''
    );
    setPlayNonce((n) => n + 1);
  }, [project.id, initialTab, project.previewHtml, project.files]);

  const sandboxedPreviewHtml = useMemo(
    () => (project.previewHtml ? buildSandboxedPlayableHtml(project.previewHtml) : ''),
    [project.previewHtml]
  );

  const activeFile = useMemo(
    () => project.files.find((f) => f.path === selectedPath) || project.files[0],
    [project.files, selectedPath]
  );

  const parsedNodes = useMemo(() => {
    const mainTscn =
      project.files.find((f) => `res://${f.path}` === project.mainScene) ||
      project.files.find((f) => f.path.endsWith('.tscn'));
    return mainTscn ? parseGodotSceneNodes(mainTscn.content) : [];
  }, [project.files, project.mainScene]);

  const handleCopyActiveFile = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedFile(true);
      onToast(`تم نسخ الملف: ${activeFile.path}`);
      setTimeout(() => setCopiedFile(false), 1600);
    } catch {
      onToast('تعذّر النسخ التلقائي');
    }
  };

  return (
    <aside
      aria-label="محرر ومعاينة مشروع محرك جودوت 4"
      className={`sketch-panel flex h-[78vh] flex-col overflow-hidden rounded-2xl ${colSpanClass}`}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9A441]/20 bg-[#17120D] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-[#F0C975]">
            {project.projectName}
          </p>
          <p className="truncate text-[11px] text-[#B5A78F]">
            Godot {project.godotVersion} · {project.dimension.toUpperCase()} · {project.files.length} ملفات جاهزة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              downloadGodotProjectZip(project);
              onToast(`تم تحميل ${project.slug}-godot4.zip`);
            }}
            className="sketch-btn-wax inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            <span>تحميل .zip</span>
          </button>

          <button
            type="button"
            onClick={() => onSyncToGodot(project)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${
              isEngineLive
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-[#04140B]'
                : 'border-[#D9A441]/35 bg-[#120E0A] text-[#F0C975] hover:border-[#D9A441]'
            }`}
          >
            <Send className="h-3 w-3" aria-hidden="true" />
            <span>{isEngineLive ? 'إرسال لجودوت' : 'ربط جودوت'}</span>
          </button>

          {isEngineLive && (
            <button
              type="button"
              onClick={onRunMainInGodot}
              title="تشغيل اللعبة داخل محرر جودوت (F5)"
              className="sketch-btn-gold inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold"
            >
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>F5</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق لوحة مشروع جودوت"
            className="sketch-btn-ink flex h-7 w-7 items-center justify-center"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 border-b border-[#D9A441]/15 bg-[#120E0A] px-3 py-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setTab('files')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors ${
            tab === 'files'
              ? 'bg-[#D9A441] text-[#0B0907]'
              : 'text-[#BFB29A] hover:text-[#F6ECDA]'
          }`}
        >
          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>الملفات ({project.files.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('tree')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors ${
            tab === 'tree'
              ? 'bg-[#D9A441] text-[#0B0907]'
              : 'text-[#BFB29A] hover:text-[#F6ECDA]'
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
          <span>شجرة المشهد ({parsedNodes.length})</span>
        </button>

        {project.previewHtml && (
          <button
            type="button"
            onClick={() => setTab('play')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors ${
              tab === 'play'
                ? 'bg-[#B8243A] text-white'
                : 'text-[#F0C975] hover:bg-[#1E1710]'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>تجربة حيّة</span>
          </button>
        )}
      </div>

      {/* Tab Body */}
      {tab === 'play' && sandboxedPreviewHtml ? (
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0B0907]">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#121620] px-3 py-1.5 text-[11px] text-[#B8C4D8]">
            <span className="truncate">
              اضغط داخل شاشة اللعبة لتفعيل لوحة المفاتيح (WASD / الأسهم / Space / E / C)
            </span>
            <button
              type="button"
              onClick={() => setPlayNonce((n) => n + 1)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-[#E8EEF8] hover:border-[#60A5FA]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>إعادة تشغيل</span>
            </button>
          </div>
          <iframe
            key={`${project.id}_${playNonce}`}
            title={`معاينة لعبة ${project.projectName}`}
            srcDoc={sandboxedPreviewHtml}
            sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock"
            className="min-h-[420px] flex-1 w-full border-0 bg-[#0B0907]"
          />
        </div>
      ) : tab === 'tree' ? (
        <div className="flex-1 overflow-y-auto bg-[#0C0907] p-4">
          <p className="mb-3 text-xs font-extrabold text-[#F0C975]">
            هيكل العقد داخل المشهد الرئيسي ({project.mainScene}):
          </p>
          {parsedNodes.length === 0 ? (
            <p className="text-xs text-[#9E917B]">
              تم بناء العقد برمجياً داخل سكربتات GDScript (انظر ملف scripts/main.gd).
            </p>
          ) : (
            <ul className="space-y-1.5 font-mono text-xs" dir="ltr">
              {parsedNodes.map((node, idx) => (
                <li
                  key={`${node.name}_${idx}`}
                  style={{ paddingLeft: `${node.depth * 18}px` }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#D9A441]/14 bg-[#14100B] px-3 py-1.5"
                >
                  <span className="font-bold text-[#F6ECDA]">
                    {node.depth > 0 ? '└─ ' : ''}
                    {node.name}
                  </span>
                  <span className="text-[11px] font-semibold text-[#D9A441]">
                    {node.type}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {project.controls.length > 0 && (
            <div className="mt-5 border-t border-[#D9A441]/16 pt-3">
              <p className="mb-2 text-xs font-extrabold text-[#F0C975]">
                أزرار التحكم المهيأة في project.godot:
              </p>
              <ul className="space-y-1 text-xs text-[#D8CBB2]">
                {project.controls.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden bg-[#0C0907]">
          {/* Horizontal File Selector Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#D9A441]/14 bg-[#130F0B] px-3 py-2">
            {project.files.map((file) => {
              const active = activeFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  dir="ltr"
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                    active
                      ? 'border-[#D9A441] bg-[#D9A441]/18 text-[#F6ECDA]'
                      : 'border-[#D9A441]/16 bg-[#0E0B08] text-[#B5A78F] hover:text-[#F6ECDA]'
                  }`}
                >
                  <FileCode2 className="h-3 w-3 text-[#D9A441]" aria-hidden="true" />
                  <span>{file.path}</span>
                </button>
              );
            })}
          </div>

          {/* Active File Subheader */}
          {activeFile && (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-[#D9A441]/12 bg-[#100C09] px-3.5 py-2 text-[11px]">
                <div className="min-w-0 flex-1">
                  <span className="font-mono font-bold text-[#F0C975]" dir="ltr">
                    res://{activeFile.path}
                  </span>
                  {activeFile.description && (
                    <span className="mr-2 text-[#A89A82]">
                      · {activeFile.description}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyActiveFile()}
                  className="sketch-btn-ink inline-flex shrink-0 items-center gap-1 px-2 py-1 text-[11px] font-bold"
                >
                  {copiedFile ? (
                    <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>{copiedFile ? 'تم النسخ' : 'نسخ الملف'}</span>
                </button>
              </div>

              <pre
                dir="ltr"
                className="flex-1 overflow-auto p-4 text-left font-mono text-xs leading-relaxed text-[#EFE6D2]"
              >
                <code>{activeFile.content}</code>
              </pre>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
