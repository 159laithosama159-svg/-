import {
  repairGodotScriptForGodot4,
  sanitizeGodotFilePath,
  type GodotProjectBundle,
} from './godotEngineUtils.ts';

export type GodotEditorCommandAction =
  | 'add_node'
  | 'set_property'
  | 'delete_node'
  | 'write_file'
  | 'attach_script'
  | 'open_scene'
  | 'save_scene'
  | 'run_scene'
  | 'stop_scene'
  | 'get_scene_tree';

export interface GodotEditorCommand {
  id: string;
  action: GodotEditorCommandAction;
  labelAr: string;
  parentPath?: string;
  nodeName?: string;
  nodeType?: string;
  nodePath?: string;
  property?: string;
  value?: unknown;
  position?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  meshShape?: 'box' | 'sphere' | 'cylinder' | 'plane' | 'none';
  addCollision?: boolean;
  filePath?: string;
  content?: string;
  scenePath?: string;
}

export interface GodotSceneTreeSnapshot {
  scenePath: string;
  capturedAt: number;
  nodes: Array<{
    name: string;
    type: string;
    path: string;
    depth: number;
  }>;
}

export interface GodotCommandExecutionResult {
  planId: string;
  succeeded: number;
  failed: number;
  logs: string[];
  executedAt: number;
  target: 'godot_live' | 'local_project';
}

export interface GodotAgentActionPlan {
  planId: string;
  summary: string;
  explanation: string;
  riskLevel: 'safe' | 'modify' | 'destructive';
  commands: GodotEditorCommand[];
  status: 'awaiting_permission' | 'executing' | 'executed' | 'applied_locally' | 'rejected';
  executionResult?: GodotCommandExecutionResult;
}

const ALLOWED_ACTIONS = new Set<GodotEditorCommandAction>([
  'add_node',
  'set_property',
  'delete_node',
  'write_file',
  'attach_script',
  'open_scene',
  'save_scene',
  'run_scene',
  'stop_scene',
  'get_scene_tree',
]);

/**
 * Detects natural Arabic or English requests asking the AI to enter/control
 * the live Godot 4 Editor (add nodes, modify properties, edit scripts, run scene, etc.).
 */
export function isGodotLiveControlIntent(prompt: string): boolean {
  const text = (prompt || '').trim().toLowerCase();
  if (!text) return false;

  const mentionsGodot = /(?:جودوت|غودوت|جودو|غودو|godot)/.test(text);
  if (!mentionsGodot) return false;

  // Explicit full-new-game creation should stay in Full Game Forge unless it asks to enter/edit
  const controlVerbs =
    /(?:فوت|ادخل|افتح|تحكم|خذ\s+التحكم|ضيف|أضف|اضف|حط|ضع|عدل|عدّل|غير|غيّر|احذف|شيل|امسح|اربط\s+سكربت|شغل|شغّل|أوقف|وقف|احفظ|اقرأ\s+المشهد|افحص\s+المشهد|من\s+بعد\s+اذني|بعد\s+اذني|بعد\s+إذني|add\s+node|set\s+property|delete\s+node|modify\s+scene|edit\s+scene|run\s+scene|control\s+godot|inspect\s+scene)/.test(
      text
    );

  return controlVerbs;
}

function clampVec3(raw: unknown): [number, number, number] | undefined {
  if (!Array.isArray(raw) || raw.length < 2) return undefined;
  const x = Number(raw[0]);
  const y = Number(raw[1]);
  const z = raw.length >= 3 ? Number(raw[2]) : 0;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return undefined;
  return [
    Math.round(x * 100) / 100,
    Math.round(y * 100) / 100,
    Math.round(z * 100) / 100,
  ];
}

function sanitizeNodeName(raw: unknown, fallback: string): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+/, '')
    .slice(0, 48);
  return cleaned || fallback;
}

function sanitizeHexColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : undefined;
}

/**
 * Validates and sanitizes an AI-generated Godot 4 Live Editor Action Plan so
 * every command is safe, path-validated, GDScript-2.0-repaired, and clear for user approval.
 */
export function sanitizeGodotActionPlan(
  raw: unknown,
  fallbackPrompt: string
): GodotAgentActionPlan {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawCommands = Array.isArray(obj.commands) ? obj.commands : [];
  const commands: GodotEditorCommand[] = [];

  for (let i = 0; i < rawCommands.length && commands.length < 16; i++) {
    const item = rawCommands[i];
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const action = String(rec.action || '') as GodotEditorCommandAction;
    if (!ALLOWED_ACTIONS.has(action)) continue;

    const cmd: GodotEditorCommand = {
      id: `cmd_${i + 1}`,
      action,
      labelAr:
        typeof rec.labelAr === 'string' && rec.labelAr.trim()
          ? rec.labelAr.trim().slice(0, 140)
          : describeGodotActionDefault(action),
    };

    if (action === 'add_node') {
      cmd.parentPath =
        typeof rec.parentPath === 'string' && rec.parentPath.trim()
          ? rec.parentPath.trim().slice(0, 120)
          : '.';
      cmd.nodeName = sanitizeNodeName(rec.nodeName, `ValdrionNode_${i + 1}`);
      cmd.nodeType =
        typeof rec.nodeType === 'string' && /^[A-Z][a-zA-Z0-9_]{1,48}$/.test(rec.nodeType.trim())
          ? rec.nodeType.trim()
          : 'Node3D';
      cmd.position = clampVec3(rec.position);
      cmd.scale = clampVec3(rec.scale);
      cmd.color = sanitizeHexColor(rec.color);
      const shape = String(rec.meshShape || 'none');
      cmd.meshShape = (['box', 'sphere', 'cylinder', 'plane', 'none'].includes(shape)
        ? shape
        : 'none') as GodotEditorCommand['meshShape'];
      cmd.addCollision = Boolean(rec.addCollision);
    } else if (action === 'set_property') {
      cmd.nodePath =
        typeof rec.nodePath === 'string' && rec.nodePath.trim()
          ? rec.nodePath.trim().slice(0, 120)
          : '.';
      cmd.property =
        typeof rec.property === 'string' && /^[a-zA-Z_][a-zA-Z0-9_/]{0,60}$/.test(rec.property.trim())
          ? rec.property.trim()
          : '';
      cmd.value = rec.value;
      if (!cmd.property) continue;
    } else if (action === 'delete_node') {
      cmd.nodePath =
        typeof rec.nodePath === 'string' && rec.nodePath.trim()
          ? rec.nodePath.trim().slice(0, 120)
          : '';
      if (!cmd.nodePath || cmd.nodePath === '.') continue;
    } else if (action === 'write_file' || action === 'attach_script') {
      const safePath = sanitizeGodotFilePath(String(rec.filePath || 'scripts/ai_generated.gd'));
      if (!safePath || safePath.startsWith('addons/valdrion_bridge/')) continue;
      const rawContent = typeof rec.content === 'string' ? rec.content : '';
      if (!rawContent.trim()) continue;
      cmd.filePath = safePath;
      cmd.content = safePath.endsWith('.gd')
        ? repairGodotScriptForGodot4(rawContent)
        : rawContent;
      if (action === 'attach_script') {
        cmd.nodePath =
          typeof rec.nodePath === 'string' && rec.nodePath.trim()
            ? rec.nodePath.trim().slice(0, 120)
            : '.';
      }
    } else if (action === 'open_scene') {
      const safeScene = sanitizeGodotFilePath(String(rec.scenePath || 'scenes/main.tscn'));
      cmd.scenePath = `res://${safeScene || 'scenes/main.tscn'}`;
    }

    commands.push(cmd);
  }

  if (commands.length === 0) {
    commands.push({
      id: 'cmd_1',
      action: 'get_scene_tree',
      labelAr: 'قراءة شجرة المشهد المفتوح حالياً داخل محرك Godot 4',
    });
  }

  const hasDestructive = commands.some((c) => c.action === 'delete_node');
  const hasModify = commands.some((c) =>
    ['add_node', 'set_property', 'write_file', 'attach_script', 'save_scene'].includes(c.action)
  );
  const riskLevel: GodotAgentActionPlan['riskLevel'] = hasDestructive
    ? 'destructive'
    : hasModify
    ? 'modify'
    : 'safe';

  return {
    planId: `gplan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    summary:
      typeof obj.summary === 'string' && obj.summary.trim()
        ? obj.summary.trim().slice(0, 180)
        : `خطة تحكم في محرك Godot 4 لتنفيذ: ${fallbackPrompt.slice(0, 90)}`,
    explanation:
      typeof obj.explanation === 'string' && obj.explanation.trim()
        ? obj.explanation.trim().slice(0, 420)
        : 'سيتم تنفيذ هذه الأوامر مباشرة داخل مشهدك المفتوح في Godot 4 فور موافقتك.',
    riskLevel,
    commands,
    status: 'awaiting_permission',
  };
}

export function describeGodotActionDefault(action: GodotEditorCommandAction): string {
  switch (action) {
    case 'add_node':
      return 'إضافة عقدة جديدة إلى المشهد المفتوح';
    case 'set_property':
      return 'تعديل خاصية عقدة في المشهد';
    case 'delete_node':
      return 'حذف عقدة من المشهد';
    case 'write_file':
      return 'إنشاء أو تحديث ملف سكربت/مشهد';
    case 'attach_script':
      return 'كتابة وإرفاق سكربت GDScript 2.0 بعقدة';
    case 'open_scene':
      return 'فتح مشهد داخل المحرر';
    case 'save_scene':
      return 'حفظ التعديلات في المشهد الحالي';
    case 'run_scene':
      return 'تشغيل اللعبة مباشرة داخل Godot (F5)';
    case 'stop_scene':
      return 'إيقاف تشغيل اللعبة';
    case 'get_scene_tree':
      return 'قراءة شجرة العقد في المشهد الحالي';
  }
}

/**
 * Applies file/script commands to an in-app GodotProjectBundle so even before the user
 * opens Godot on desktop, approved commands immediately update their downloadable .zip project!
 */
export function applyCommandsToProjectBundle(
  bundle: GodotProjectBundle,
  commands: GodotEditorCommand[]
): { updated: GodotProjectBundle; logs: string[]; appliedCount: number } {
  const fileMap = new Map(bundle.files.map((f) => [f.path, { ...f }]));
  const logs: string[] = [];
  let appliedCount = 0;

  for (const cmd of commands) {
    if ((cmd.action === 'write_file' || cmd.action === 'attach_script') && cmd.filePath && cmd.content) {
      fileMap.set(cmd.filePath, {
        path: cmd.filePath,
        content: cmd.content,
        description: cmd.labelAr,
      });
      logs.push(`✓ تم حفظ الملف ${cmd.filePath}`);
      appliedCount++;
    } else if (cmd.action === 'add_node' && cmd.nodeName && cmd.nodeType) {
      const mainKey = bundle.mainScene.replace(/^res:\/\//, '');
      const mainFile = fileMap.get(mainKey);
      if (mainFile && mainKey.endsWith('.tscn')) {
        const parent = cmd.parentPath || '.';
        const posLine =
          cmd.position && cmd.nodeType.endsWith('3D')
            ? `\ntransform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, ${cmd.position[0]}, ${cmd.position[1]}, ${cmd.position[2]})`
            : cmd.position && cmd.nodeType.endsWith('2D')
            ? `\nposition = Vector2(${cmd.position[0]}, ${cmd.position[1]})`
            : '';
        const nodeBlock = `\n[node name="${cmd.nodeName}" type="${cmd.nodeType}" parent="${parent}"]${posLine}\n`;
        mainFile.content = `${mainFile.content.trimEnd()}\n${nodeBlock}`;
        fileMap.set(mainKey, mainFile);
        logs.push(`✓ تمت إضافة العقدة ${cmd.nodeName} (${cmd.nodeType}) إلى ${mainKey}`);
        appliedCount++;
      }
    }
  }

  return {
    updated: {
      ...bundle,
      files: Array.from(fileMap.values()),
    },
    logs,
    appliedCount,
  };
}
