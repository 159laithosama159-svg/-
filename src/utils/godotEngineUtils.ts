/**
 * Pure utilities for VALDRION Godot 4.3+ Engine Studio & Live WebSocket Editor Bridge.
 */

export type GodotDimension = '2d' | '3d';
export type GodotRenderer = 'gl_compatibility' | 'forward_plus' | 'mobile';

export interface GodotProjectFile {
  path: string;
  content: string;
  description?: string;
}

export interface GodotSceneNode {
  name: string;
  type: string;
  parent: string;
  depth: number;
}

export interface GodotProjectBundle {
  id: string;
  projectName: string;
  slug: string;
  dimension: GodotDimension;
  godotVersion: string;
  summary: string;
  controls: string[];
  mainScene: string;
  files: GodotProjectFile[];
  previewHtml?: string;
  createdAt: number;
}

export interface GodotGameTemplate {
  id: string;
  title: string;
  subtitle: string;
  dimension: GodotDimension;
  prompt: string;
}

export const GODOT_GAME_TEMPLATES: GodotGameTemplate[] = [
  {
    id: 'roblox_gta6_open_world',
    title: 'عالم مفتوح Roblox × GTA 6 (3D)',
    subtitle: 'سيارات نيون + شخصية Roblox + مهام ونجوم مطاردة',
    dimension: '3d',
    prompt:
      'اصنع لعبة عالم مفتوح 3D لمحرك Godot 4 تجمع بين أسلوب Roblox و GTA 6 Vice City: شخصية مكعّبة قابلة لتغيير الأزياء، 3 سيارات رياضية نيون قابلة للركوب والقيادة بضغط E مع نيترو، مدينة بشوارع وناطحات سحاب وشاطئ ونخيل ومنصات باركور Obby، مهام مالية، ونجوم مطاردة.',
  },
  {
    id: 'desert_knight_2d',
    title: 'فارس الصحراء 2D',
    subtitle: 'منصات وقفز وجمع جواهر',
    dimension: '2d',
    prompt:
      'اصنع لعبة منصات 2D كاملة لمحرك Godot 4 باسم "فارس الصحراء": لاعب CharacterBody2D يتحرك ويقفز فوق منصات حجرية، يجمع جواهر ذهبية تزيد النقاط، ويتفادى أشواك وأعداء يتحركون، مع شاشة نقاط وزر إعادة اللعب.',
  },
  {
    id: 'space_defender_2d',
    title: 'حارس المجرة Arcade',
    subtitle: 'إطلاق نار فضائي وموجات أعداء',
    dimension: '2d',
    prompt:
      'اصنع لعبة إطلاق نار فضائية 2D لمحرك Godot 4: مركبة فضائية تتحرك بالأسهم أو WASD وتطلق الليزر بالمسطرة، موجات نيازك وسفن عدوة تتسارع تدريجياً، عداد نقاط وصحة وانفجارات جسيمات.',
  },
  {
    id: 'dungeon_arena_2d',
    title: 'ساحة الأبطال Top-Down',
    subtitle: 'أكشن من الأعلى وموجات وحوش',
    dimension: '2d',
    prompt:
      'اصنع لعبة أكشن Top-Down 2D لمحرك Godot 4: بطل في ساحة معركة يواجه موجات متزايدة من الأعداء، يطلق قذائف سحرية نحو مؤشر الفأرة، ويجمع كرات شفاء وترقيات سرعة مع عداد موجات.',
  },
  {
    id: 'cyber_racer_3d',
    title: 'سباق النفق 3D',
    subtitle: 'سيارة ثلاثية الأبعاد وتفادي عوائق',
    dimension: '3d',
    prompt:
      'اصنع لعبة سباق وتفادي عوائق 3D لمحرك Godot 4: مركبة ثلاثية الأبعاد تتحرك يميناً ويساراً على مضمار مضيء باستخدام CSGBox3D/MeshInstance3D، عوائق متولدة تلقائياً، سرعة متصاعدة، وكاميرا خلفية ديناميكية.',
  },
  {
    id: 'endless_runner_2d',
    title: 'عدّاء القلعة اللانهائي',
    subtitle: 'جري سريع وقفز مزدوج',
    dimension: '2d',
    prompt:
      'اصنع لعبة جري لانهائي (Endless Runner) 2D لمحرك Godot 4: شخصية تجري تلقائياً مع قفز مزدوج (Double Jump)، حواجز متنوعة، عملات ذهبية، تسارع تدريجي، وحفظ أعلى نتيجة.',
  },
  {
    id: 'tower_defense_2d',
    title: 'حماية البرج التكتيكية',
    subtitle: 'بناء أبراج وصد موجات',
    dimension: '2d',
    prompt:
      'اصنع لعبة دفاع عن البرج (Tower Defense) 2D لمحرك Godot 4: مسار أعداء واضح، إمكانية وضع أبراج بالنقر بالماوس مقابل ذهب، إطلاق تلقائي نحو أقرب عدو، وموجات متدرجة الصعوبة.',
  },
];

export const DEFAULT_GODOT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#120E0A"/>
  <rect x="6" y="6" width="116" height="116" rx="18" fill="none" stroke="#D9A441" stroke-width="4"/>
  <polygon points="64,22 98,86 64,72 30,86" fill="#D9A441"/>
  <circle cx="64" cy="96" r="10" fill="#B8243A"/>
</svg>`;

/**
 * Generates a clean 6-character pairing code for the Live Godot 4 WebSocket Bridge.
 */
export function generateGodotPairCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'GD';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function normalizeGodotPairCode(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

/**
 * Detects whether a freeform Arabic or English prompt asks to build a Godot game.
 */
export function isGodotGameIntent(prompt: string): boolean {
  const text = (prompt || '').trim().toLowerCase();
  if (!text) return false;
  return /(?:جودوت|غودوت|غودو|جودو|godot|gdscript|\.tscn|\.godot|محرك\s+الالعاب|محرك\s+الألعاب)/.test(
    text
  );
}

/**
 * Sanitizes a relative Godot res:// file path and blocks path traversal.
 */
export function sanitizeGodotFilePath(rawPath: string): string {
  const stripped = (rawPath || '')
    .trim()
    .replace(/^res:\/\//i, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  const safeSegments = stripped
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s && s !== '.' && s !== '..' && !s.includes(':'));
  return safeSegments.join('/');
}

export function slugifyProjectName(name: string): string {
  const ascii = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'valdrion-godot-game';
}

/**
 * Builds a valid Godot 4.3+ project.godot configuration file with WASD + Arrow + Space input map.
 */
export function buildDefaultProjectGodot(params: {
  projectName: string;
  mainScene: string;
  dimension: GodotDimension;
  renderer?: GodotRenderer;
  includeBridgePlugin?: boolean;
}): string {
  const safeName = (params.projectName || 'VALDRION Godot Game').replace(/"/g, "'");
  const mainScene = params.mainScene.startsWith('res://')
    ? params.mainScene
    : `res://${sanitizeGodotFilePath(params.mainScene) || 'scenes/main.tscn'}`;
  const renderer = params.renderer || 'gl_compatibility';
  const featureTag =
    renderer === 'forward_plus'
      ? 'Forward Plus'
      : renderer === 'mobile'
      ? 'Mobile'
      : 'GL Compatibility';

  const pluginSection = params.includeBridgePlugin
    ? `\n[editor_plugins]\n\nenabled=PackedStringArray("res://addons/valdrion_bridge/plugin.cfg")\n`
    : '';

  return `; Engine configuration file generated by VALDRION Godot 4 Forge.
config_version=5

[application]

config/name="${safeName}"
run/main_scene="${mainScene}"
config/features=PackedStringArray("4.3", "${featureTag}")
config/icon="res://icon.svg"

[display]

window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="canvas_items"
${pluginSection}
[input]

move_left={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":65,"physical_keycode":0,"key_label":0,"unicode":97,"location":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194319,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
move_right={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":68,"physical_keycode":0,"key_label":0,"unicode":100,"location":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194321,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
move_up={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":87,"physical_keycode":0,"key_label":0,"unicode":119,"location":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194320,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
move_down={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":83,"physical_keycode":0,"key_label":0,"unicode":115,"location":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194322,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
jump={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":32,"physical_keycode":0,"key_label":0,"unicode":32,"location":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":87,"physical_keycode":0,"key_label":0,"unicode":119,"location":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194320,"physical_keycode":0,"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)
]
}
action={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":32,"physical_keycode":0,"key_label":0,"unicode":32,"location":0,"echo":false,"script":null)
]
}

[rendering]

renderer/rendering_method="${renderer}"
`;
}

/**
 * Generates the REAL Godot 4 EditorPlugin (`addons/valdrion_bridge/`) that connects
 * an open Godot 4.3+ Editor via WebSocketPeer straight to VALDRION AI so generated
 * games, scenes, and GDScripts sync & run automatically inside Godot!
 */
export function buildGodotBridgePluginFiles(
  wsUrl: string,
  pairCode: string
): GodotProjectFile[] {
  const safeWsUrl = (wsUrl || 'ws://localhost:3000/ws/realtime').replace(/"/g, '');
  const safeCode = normalizeGodotPairCode(pairCode) || 'GD2026';

  const pluginCfg = `[plugin]

name="VALDRION AI Live Bridge & Agent Controller"
description="Connects Godot 4.3+ Editor to VALDRION AI over WebSocket for live project sync, scene tree inspection, and permission-approved editor control (add nodes, edit properties, attach scripts, save & play)."
author="VALDRION Studio"
version="2.0.0"
script="valdrion_bridge.gd"
`;

  const bridgeGd = `@tool
extends EditorPlugin

const DEFAULT_WS_URL := "${safeWsUrl}"
const DEFAULT_PAIR_CODE := "${safeCode}"

var _ws := WebSocketPeer.new()
var _connected := false
var _registered := false
var _dock: VBoxContainer
var _url_input: LineEdit
var _code_input: LineEdit
var _status_label: Label
var _connect_btn: Button
var _auto_play_check: CheckBox
var _allow_agent_control: CheckBox

func _enter_tree() -> void:
\t_dock = VBoxContainer.new()
\t_dock.name = "VALDRION AI"

\tvar title := Label.new()
\ttitle.text = "VALDRION AI Live Bridge v2"
\t_dock.add_child(title)

\t_url_input = LineEdit.new()
\t_url_input.text = DEFAULT_WS_URL
\t_url_input.placeholder_text = "wss://.../ws/realtime"
\t_dock.add_child(_url_input)

\t_code_input = LineEdit.new()
\t_code_input.text = DEFAULT_PAIR_CODE
\t_code_input.placeholder_text = "Pair Code (e.g. GD4K9M)"
\t_dock.add_child(_code_input)

\t_allow_agent_control = CheckBox.new()
\t_allow_agent_control.text = "Allow Approved AI Editor Control"
\t_allow_agent_control.button_pressed = true
\t_dock.add_child(_allow_agent_control)

\t_auto_play_check = CheckBox.new()
\t_auto_play_check.text = "Auto-Run Scene on Sync (F5)"
\t_auto_play_check.button_pressed = true
\t_dock.add_child(_auto_play_check)

\t_connect_btn = Button.new()
\t_connect_btn.text = "Connect to VALDRION AI"
\t_connect_btn.pressed.connect(_on_toggle_connect)
\t_dock.add_child(_connect_btn)

\t_status_label = Label.new()
\t_status_label.text = "Status: Disconnected"
\t_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
\t_dock.add_child(_status_label)

\tadd_control_to_dock(DOCK_SLOT_RIGHT_UL, _dock)
\t_connect_bridge()

func _exit_tree() -> void:
\tif _ws.get_ready_state() == WebSocketPeer.STATE_OPEN:
\t\t_ws.close()
\tif _dock:
\t\tremove_control_from_docks(_dock)
\t\t_dock.queue_free()

func _on_toggle_connect() -> void:
\tif _ws.get_ready_state() == WebSocketPeer.STATE_OPEN or _ws.get_ready_state() == WebSocketPeer.STATE_CONNECTING:
\t\t_ws.close()
\t\t_connected = false
\t\t_registered = false
\t\t_status_label.text = "Status: Disconnected"
\t\t_connect_btn.text = "Connect to VALDRION AI"
\telse:
\t\t_connect_bridge()

func _connect_bridge() -> void:
\tvar url := _url_input.text.strip_edges()
\tif url.is_empty():
\t\t_status_label.text = "Error: WebSocket URL is empty"
\t\treturn
\t_ws = WebSocketPeer.new()
\t_ws.inbound_buffer_size = 1024 * 1024 * 6
\t_ws.outbound_buffer_size = 1024 * 1024 * 6
\tvar err := _ws.connect_to_url(url)
\tif err != OK:
\t\t_status_label.text = "Connect error: %s" % str(err)
\t\treturn
\t_registered = false
\t_status_label.text = "Connecting to VALDRION AI..."
\t_connect_btn.text = "Disconnect"

func _process(_delta: float) -> void:
\tvar state := _ws.get_ready_state()
\tif state == WebSocketPeer.STATE_CLOSED:
\t\tif _connected:
\t\t\t_connected = false
\t\t\t_registered = false
\t\t\t_status_label.text = "Status: Disconnected"
\t\t\t_connect_btn.text = "Connect to VALDRION AI"
\t\treturn

\t_ws.poll()
\tstate = _ws.get_ready_state()

\tif state == WebSocketPeer.STATE_OPEN:
\t\tif not _connected:
\t\t\t_connected = true
\t\tif not _registered:
\t\t\t_registered = true
\t\t\tvar hello := {
\t\t\t\t"type": "godot:engine_join",
\t\t\t\t"pairCode": _code_input.text.strip_edges().to_upper(),
\t\t\t\t"godotVersion": Engine.get_version_info().get("string", "4.3")
\t\t\t}
\t\t\t_ws.send_text(JSON.stringify(hello))
\t\t\t_status_label.text = "Connected! Code: %s" % _code_input.text.strip_edges().to_upper()
\t\t\t_send_scene_tree_snapshot()

\t\twhile _ws.get_available_packet_count() > 0:
\t\t\tvar packet := _ws.get_packet().get_string_from_utf8()
\t\t\t_handle_packet(packet)

func _handle_packet(raw_text: String) -> void:
\tvar parsed = JSON.parse_string(raw_text)
\tif typeof(parsed) != TYPE_DICTIONARY:
\t\treturn
\tvar msg_type := str(parsed.get("type", ""))
\tif msg_type == "godot:sync_project":
\t\tvar files = parsed.get("files", [])
\t\tvar project_name := str(parsed.get("projectName", "VALDRION Game"))
\t\tvar main_scene := str(parsed.get("mainScene", "res://scenes/main.tscn"))
\t\tvar run_now := bool(parsed.get("autoRun", _auto_play_check.button_pressed))
\t\t_apply_synced_project(project_name, main_scene, files, run_now)
\telif msg_type == "godot:run_main":
\t\tEditorInterface.play_main_scene()
\t\t_status_label.text = "Playing main scene in Godot!"
\telif msg_type == "godot:get_scene_tree":
\t\t_send_scene_tree_snapshot()
\telif msg_type == "godot:execute_commands":
\t\tif not _allow_agent_control.button_pressed:
\t\t\t_ws.send_text(JSON.stringify({
\t\t\t\t"type": "godot:command_result",
\t\t\t\t"pairCode": _code_input.text.strip_edges().to_upper(),
\t\t\t\t"planId": str(parsed.get("planId", "")),
\t\t\t\t"succeeded": 0,
\t\t\t\t"failed": 1,
\t\t\t\t"logs": ["Remote AI control is disabled in Godot Dock checkbox."]
\t\t\t}))
\t\t\treturn
\t\tvar plan_id := str(parsed.get("planId", ""))
\t\tvar cmds = parsed.get("commands", [])
\t\t_execute_editor_commands(plan_id, cmds)

func _send_scene_tree_snapshot() -> void:
\tvar root := EditorInterface.get_edited_scene_root()
\tvar nodes: Array = []
\tvar scene_path := ""
\tif root:
\t\tscene_path = root.scene_file_path
\t\t_collect_nodes(root, root, 0, nodes)
\t_ws.send_text(JSON.stringify({
\t\t"type": "godot:scene_tree",
\t\t"pairCode": _code_input.text.strip_edges().to_upper(),
\t\t"scenePath": scene_path,
\t\t"nodes": nodes
\t}))

func _collect_nodes(node: Node, root: Node, depth: int, out: Array) -> void:
\tif out.size() >= 120:
\t\treturn
\tvar rel_path := "." if node == root else str(root.get_path_to(node))
\tout.append({
\t\t"name": node.name,
\t\t"type": node.get_class(),
\t\t"path": rel_path,
\t\t"depth": depth
\t})
\tfor child in node.get_children():
\t\t_collect_nodes(child, root, depth + 1, out)

func _execute_editor_commands(plan_id: String, cmds: Array) -> void:
\tvar root := EditorInterface.get_edited_scene_root()
\tvar logs: Array = []
\tvar ok_count := 0
\tvar fail_count := 0
\tvar need_fs_scan := false

\tfor raw_cmd in cmds:
\t\tif typeof(raw_cmd) != TYPE_DICTIONARY:
\t\t\tcontinue
\t\tvar action := str(raw_cmd.get("action", ""))

\t\tif action == "get_scene_tree":
\t\t\t_send_scene_tree_snapshot()
\t\t\tlogs.append("Read current scene tree.")
\t\t\tok_count += 1
\t\t\tcontinue

\t\telif action == "write_file" or action == "attach_script":
\t\t\tvar rel_path := str(raw_cmd.get("filePath", "")).strip_edges().replace("\\\\", "/")
\t\t\tvar content := str(raw_cmd.get("content", ""))
\t\t\tif rel_path.is_empty() or rel_path.begins_with("/") or rel_path.contains("..") or rel_path.begins_with("addons/valdrion_bridge/"):
\t\t\t\tlogs.append("Skipped unsafe file path: %s" % rel_path)
\t\t\t\tfail_count += 1
\t\t\t\tcontinue
\t\t\tvar full_res := "res://" + rel_path
\t\t\tDirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(full_res.get_base_dir()))
\t\t\tvar f := FileAccess.open(full_res, FileAccess.WRITE)
\t\t\tif f:
\t\t\t\tf.store_string(content)
\t\t\t\tf.close()
\t\t\t\tneed_fs_scan = true
\t\t\t\tlogs.append("Wrote file: %s" % full_res)
\t\t\t\tif action == "attach_script" and root:
\t\t\t\t\tvar target_path := str(raw_cmd.get("nodePath", "."))
\t\t\t\t\tvar target := root if target_path == "." else root.get_node_or_null(target_path)
\t\t\t\t\tif target:
\t\t\t\t\t\tvar scr := ResourceLoader.load(full_res, "", ResourceLoader.CACHE_MODE_IGNORE)
\t\t\t\t\t\tif scr:
\t\t\t\t\t\t\ttarget.set_script(scr)
\t\t\t\t\t\t\tlogs.append("Attached script to %s" % target.name)
\t\t\t\tok_count += 1
\t\t\telse:
\t\t\t\tlogs.append("Failed writing file: %s" % full_res)
\t\t\t\tfail_count += 1

\t\telif action == "add_node":
\t\t\tif root == null:
\t\t\t\tlogs.append("No open scene in Godot Editor to add node.")
\t\t\t\tfail_count += 1
\t\t\t\tcontinue
\t\t\tvar node_type := str(raw_cmd.get("nodeType", "Node3D"))
\t\t\tvar node_name := str(raw_cmd.get("nodeName", "AINode"))
\t\t\tvar parent_path := str(raw_cmd.get("parentPath", "."))
\t\t\tvar parent := root if parent_path == "." else root.get_node_or_null(parent_path)
\t\t\tif parent == null:
\t\t\t\tparent = root
\t\t\tif not ClassDB.class_exists(node_type) or not ClassDB.can_instantiate(node_type):
\t\t\t\tlogs.append("Invalid Godot node type: %s" % node_type)
\t\t\t\tfail_count += 1
\t\t\t\tcontinue
\t\t\tvar new_node: Node = ClassDB.instantiate(node_type)
\t\t\tnew_node.name = node_name
\t\t\tparent.add_child(new_node)
\t\t\tnew_node.owner = root
\t\t\tvar pos = raw_cmd.get("position", null)
\t\t\tif typeof(pos) == TYPE_ARRAY and pos.size() >= 2:
\t\t\t\tif new_node is Node3D:
\t\t\t\t\t(new_node as Node3D).position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]) if pos.size() >= 3 else 0.0)
\t\t\t\telif new_node is Node2D:
\t\t\t\t\t(new_node as Node2D).position = Vector2(float(pos[0]), float(pos[1]))
\t\t\tvar scl = raw_cmd.get("scale", null)
\t\t\tif typeof(scl) == TYPE_ARRAY and scl.size() >= 2:
\t\t\t\tif new_node is Node3D:
\t\t\t\t\t(new_node as Node3D).scale = Vector3(float(scl[0]), float(scl[1]), float(scl[2]) if scl.size() >= 3 else 1.0)
\t\t\t\telif new_node is Node2D:
\t\t\t\t\t(new_node as Node2D).scale = Vector2(float(scl[0]), float(scl[1]))
\t\t\tvar shape_kind := str(raw_cmd.get("meshShape", "none"))
\t\t\tvar hex_color := str(raw_cmd.get("color", ""))
\t\t\tif new_node is MeshInstance3D and shape_kind != "none":
\t\t\t\tvar mesh: PrimitiveMesh
\t\t\t\tif shape_kind == "sphere":
\t\t\t\t\tmesh = SphereMesh.new()
\t\t\t\telif shape_kind == "cylinder":
\t\t\t\t\tmesh = CylinderMesh.new()
\t\t\t\telif shape_kind == "plane":
\t\t\t\t\tmesh = PlaneMesh.new()
\t\t\t\telse:
\t\t\t\t\tmesh = BoxMesh.new()
\t\t\t\tif not hex_color.is_empty():
\t\t\t\t\tvar mat := StandardMaterial3D.new()
\t\t\t\t\tmat.albedo_color = Color.html(hex_color)
\t\t\t\t\tmesh.material = mat
\t\t\t\t(new_node as MeshInstance3D).mesh = mesh
\t\t\telif new_node is Light3D and not hex_color.is_empty():
\t\t\t\t(new_node as Light3D).light_color = Color.html(hex_color)
\t\t\telif new_node is ColorRect and not hex_color.is_empty():
\t\t\t\t(new_node as ColorRect).color = Color.html(hex_color)
\t\t\tlogs.append("Added %s (%s) under %s" % [new_node.name, node_type, parent.name])
\t\t\tok_count += 1

\t\telif action == "set_property":
\t\t\tif root == null:
\t\t\t\tfail_count += 1
\t\t\t\tcontinue
\t\t\tvar target_path := str(raw_cmd.get("nodePath", "."))
\t\t\tvar target := root if target_path == "." else root.get_node_or_null(target_path)
\t\t\tvar prop := str(raw_cmd.get("property", ""))
\t\t\tvar val = raw_cmd.get("value", null)
\t\t\tif target and not prop.is_empty():
\t\t\t\tif typeof(val) == TYPE_ARRAY and val.size() == 3 and target is Node3D:
\t\t\t\t\tval = Vector3(float(val[0]), float(val[1]), float(val[2]))
\t\t\t\telif typeof(val) == TYPE_ARRAY and val.size() == 2 and target is Node2D:
\t\t\t\t\tval = Vector2(float(val[0]), float(val[1]))
\t\t\t\telif typeof(val) == TYPE_STRING and str(val).begins_with("#") and str(val).length() == 7:
\t\t\t\t\tval = Color.html(str(val))
\t\t\t\ttarget.set(prop, val)
\t\t\t\tlogs.append("Set %s.%s" % [target.name, prop])
\t\t\t\tok_count += 1
\t\t\telse:
\t\t\t\tlogs.append("Node not found for property edit: %s" % target_path)
\t\t\t\tfail_count += 1

\t\telif action == "delete_node":
\t\t\tif root == null:
\t\t\t\tfail_count += 1
\t\t\t\tcontinue
\t\t\tvar target_path := str(raw_cmd.get("nodePath", ""))
\t\t\tvar target := root.get_node_or_null(target_path)
\t\t\tif target and target != root:
\t\t\t\ttarget.get_parent().remove_child(target)
\t\t\t\ttarget.queue_free()
\t\t\t\tlogs.append("Deleted node: %s" % target_path)
\t\t\t\tok_count += 1
\t\t\telse:
\t\t\t\tlogs.append("Node not found to delete: %s" % target_path)
\t\t\t\tfail_count += 1

\t\telif action == "open_scene":
\t\t\tvar sp := str(raw_cmd.get("scenePath", "res://scenes/main.tscn"))
\t\t\tif ResourceLoader.exists(sp):
\t\t\t\tEditorInterface.open_scene_from_path(sp)
\t\t\t\tlogs.append("Opened scene: %s" % sp)
\t\t\t\tok_count += 1
\t\t\telse:
\t\t\t\tlogs.append("Scene not found: %s" % sp)
\t\t\t\tfail_count += 1

\t\telif action == "save_scene":
\t\t\tEditorInterface.save_scene()
\t\t\tlogs.append("Saved current scene.")
\t\t\tok_count += 1

\t\telif action == "run_scene":
\t\t\tEditorInterface.play_main_scene()
\t\t\tlogs.append("Started playing game in Godot!")
\t\t\tok_count += 1

\t\telif action == "stop_scene":
\t\t\tEditorInterface.stop_playing_scene()
\t\t\tlogs.append("Stopped running game.")
\t\t\tok_count += 1

\tif need_fs_scan:
\t\tEditorInterface.get_resource_filesystem().scan()

\t_status_label.text = "Executed %d AI commands (%d errors)" % [ok_count, fail_count]
\t_ws.send_text(JSON.stringify({
\t\t"type": "godot:command_result",
\t\t"pairCode": _code_input.text.strip_edges().to_upper(),
\t\t"planId": plan_id,
\t\t"succeeded": ok_count,
\t\t"failed": fail_count,
\t\t"logs": logs
\t}))
\t_send_scene_tree_snapshot()

func _apply_synced_project(project_name: String, main_scene: String, files: Array, run_now: bool) -> void:
\tvar written := 0
\tfor item in files:
\t\tif typeof(item) != TYPE_DICTIONARY:
\t\t\tcontinue
\t\tvar rel_path := str(item.get("path", "")).strip_edges().replace("\\\\", "/")
\t\tvar content := str(item.get("content", ""))
\t\tif rel_path.is_empty() or rel_path.begins_with("/") or rel_path.contains(".."):
\t\t\tcontinue
\t\tif rel_path.begins_with("addons/valdrion_bridge/"):
\t\t\tcontinue
\t\tvar full_res := "res://" + rel_path
\t\tvar dir_path := ProjectSettings.globalize_path(full_res.get_base_dir())
\t\tDirAccess.make_dir_recursive_absolute(dir_path)
\t\tvar f := FileAccess.open(full_res, FileAccess.WRITE)
\t\tif f:
\t\t\tf.store_string(content)
\t\t\tf.close()
\t\t\twritten += 1

\tEditorInterface.get_resource_filesystem().scan()
\tif not main_scene.begins_with("res://"):
\t\tmain_scene = "res://" + main_scene
\tif ResourceLoader.exists(main_scene):
\t\tEditorInterface.open_scene_from_path(main_scene)

\t_status_label.text = "Synced %d files for '%s'!" % [written, project_name]
\t_ws.send_text(JSON.stringify({
\t\t"type": "godot:ack",
\t\t"pairCode": _code_input.text.strip_edges().to_upper(),
\t\t"projectName": project_name,
\t\t"writtenFiles": written
\t}))

\tif run_now and ResourceLoader.exists(main_scene):
\t\tcall_deferred("_deferred_play", main_scene)

func _deferred_play(scene_path: String) -> void:
\tEditorInterface.play_custom_scene(scene_path)
`;

  return [
    {
      path: 'addons/valdrion_bridge/plugin.cfg',
      content: pluginCfg,
      description: 'إعداد إضافة جسر فالدريون للتحكم الذكي داخل Godot 4 Editor',
    },
    {
      path: 'addons/valdrion_bridge/valdrion_bridge.gd',
      content: bridgeGd,
      description: 'إضافة WebSocket v2 لقراءة المشهد وتنفيذ أوامر الذكاء المأذون بها داخل Godot 4',
    },
  ];
}

/**
 * Parses a Godot 4 .tscn file into a visual Scene Node Tree hierarchy.
 */
export function parseGodotSceneNodes(tscnContent: string): GodotSceneNode[] {
  const nodes: GodotSceneNode[] = [];
  if (!tscnContent) return nodes;

  const lines = tscnContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[node ')) continue;

    const nameMatch = trimmed.match(/\bname="([^"]+)"/);
    const typeMatch = trimmed.match(/\btype="([^"]+)"/);
    const parentMatch = trimmed.match(/\bparent="([^"]+)"/);

    const name = nameMatch?.[1] || 'Node';
    const type = typeMatch?.[1] || 'Node';
    const parent = parentMatch?.[1] || '';

    let depth = 0;
    if (parent === '.') {
      depth = 1;
    } else if (parent) {
      depth = parent.split('/').length + 1;
    }

    nodes.push({ name, type, parent, depth });
  }

  return nodes;
}

/**
 * Normalizes and validates an AI-generated Godot 4.3+ project payload so it is
 * always structurally sound, path-safe, and ready to open in Godot Engine.
 */
export function normalizeGodotProjectPayload(
  raw: {
    projectName?: string;
    dimension?: string;
    summary?: string;
    controls?: unknown;
    mainScene?: string;
    files?: Array<{ path?: string; content?: string; description?: string }>;
    previewHtml?: string;
  },
  options?: {
    fallbackTitle?: string;
    fallbackDimension?: GodotDimension;
    renderer?: GodotRenderer;
    bridgeWsUrl?: string;
    pairCode?: string;
  }
): GodotProjectBundle {
  const dimension: GodotDimension =
    raw.dimension === '3d' || options?.fallbackDimension === '3d' ? '3d' : '2d';
  const projectName =
    (typeof raw.projectName === 'string' && raw.projectName.trim()) ||
    options?.fallbackTitle ||
    'VALDRION Godot Game';

  const rawFiles = Array.isArray(raw.files) ? raw.files : [];
  const fileMap = new Map<string, GodotProjectFile>();

  for (const f of rawFiles) {
    if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
    const cleanPath = sanitizeGodotFilePath(f.path);
    if (!cleanPath || !f.content.trim()) continue;
    const fixedContent = cleanPath.endsWith('.gd')
      ? repairGodotScriptForGodot4(f.content)
      : f.content;
    fileMap.set(cleanPath, {
      path: cleanPath,
      content: fixedContent,
      description: typeof f.description === 'string' ? f.description.trim() : undefined,
    });
  }

  // Detect main scene
  let mainScenePath = sanitizeGodotFilePath(raw.mainScene || '');
  if (!mainScenePath || !fileMap.has(mainScenePath)) {
    const firstTscn = Array.from(fileMap.keys()).find((p) => p.endsWith('.tscn'));
    mainScenePath = firstTscn || 'scenes/main.tscn';
  }

  // Ensure icon.svg exists
  if (!fileMap.has('icon.svg')) {
    fileMap.set('icon.svg', {
      path: 'icon.svg',
      content: DEFAULT_GODOT_ICON_SVG,
      description: 'أيقونة مشروع اللعبة',
    });
  }

  // Ensure project.godot exists and has valid config_version=5
  const existingConfig = fileMap.get('project.godot');
  if (
    !existingConfig ||
    !existingConfig.content.includes('config_version=5') ||
    !existingConfig.content.includes('run/main_scene=')
  ) {
    fileMap.set('project.godot', {
      path: 'project.godot',
      content: buildDefaultProjectGodot({
        projectName,
        mainScene: mainScenePath,
        dimension,
        renderer: options?.renderer,
        includeBridgePlugin: Boolean(options?.bridgeWsUrl),
      }),
      description: 'ملف إعدادات مشروع Godot 4.3+ وخريطة التحكم',
    });
  }

  // Automatically bundle the Live Godot Bridge plugin when bridge info is provided
  if (options?.bridgeWsUrl && options?.pairCode) {
    const pluginFiles = buildGodotBridgePluginFiles(options.bridgeWsUrl, options.pairCode);
    for (const pf of pluginFiles) {
      if (!fileMap.has(pf.path)) {
        fileMap.set(pf.path, pf);
      }
    }
  }

  const controls = Array.isArray(raw.controls)
    ? raw.controls
        .filter((c): c is string => typeof c === 'string' && Boolean(c.trim()))
        .slice(0, 8)
    : ['WASD / الأسهم: الحركة', 'المسطرة (Space): القفز / الإجراء', 'R: إعادة اللعب'];

  // Order files nicely: project.godot first, then .tscn, then .gd, then addons/other
  const orderedFiles = Array.from(fileMap.values()).sort((a, b) => {
    const rank = (p: string) =>
      p === 'project.godot'
        ? 0
        : p.endsWith('.tscn')
        ? 1
        : p.endsWith('.gd') && !p.startsWith('addons/')
        ? 2
        : p === 'icon.svg'
        ? 3
        : 4;
    const diff = rank(a.path) - rank(b.path);
    return diff !== 0 ? diff : a.path.localeCompare(b.path);
  });

  const cleanPreviewHtml =
    typeof raw.previewHtml === 'string' && raw.previewHtml.trim().length > 80
      ? raw.previewHtml.trim()
      : undefined;

  return {
    id: `godot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    projectName,
    slug: slugifyProjectName(projectName),
    dimension,
    godotVersion: '4.3+',
    summary:
      (typeof raw.summary === 'string' && raw.summary.trim()) ||
      `مشروع لعبة ${dimension.toUpperCase()} متكامل وجاهز للتشغيل المباشر داخل محرك Godot 4.3+.`,
    controls,
    mainScene: `res://${mainScenePath}`,
    files: orderedFiles,
    previewHtml: cleanPreviewHtml,
    createdAt: Date.now(),
  };
}

/**
 * Automatically repairs common Godot 3 -> Godot 4.3+ GDScript 2.0 compatibility issues
 * so generated games compile and run cleanly on first F5 press.
 */
export function repairGodotScriptForGodot4(source: string): string {
  return source
    .replace(/\bKinematicBody2D\b/g, 'CharacterBody2D')
    .replace(/\bKinematicBody3D\b/g, 'CharacterBody3D')
    .replace(/^(\s*extends\s+)Spatial\b/gm, '$1Node3D')
    .replace(/^(\s*)export\s+var\b/gm, '$1@export var')
    .replace(/^(\s*)onready\s+var\b/gm, '$1@onready var')
    .replace(/\.instance\s*\(\s*\)/g, '.instantiate()')
    .replace(/\bmove_and_slide\s*\(\s*velocity(?:\s*,\s*Vector[23]\.UP)?\s*\)/g, 'move_and_slide()');
}

/**
 * Wraps any generated HTML5 Canvas game or web app inside a resilient sandbox harness that:
 * 1) Auto-focuses keyboard input & prevents Arrow/Space keys from scrolling the page
 * 2) Guarantees full viewport height so canvas elements never collapse to 0px
 * 3) Captures runtime JS errors & unhandled promise rejections and posts them to the parent IDE
 *    for 1-click AI Auto-Fix.
 */
export function buildSandboxedPlayableHtml(rawHtml: string): string {
  const trimmed = (rawHtml || '').trim();
  const harness = `<style id="valdrion-sandbox-base">html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}canvas{display:block;outline:none;}</style><script id="valdrion-sandbox-harness">(function(){
  try{var _t=window.localStorage;_t&&_t.getItem('__v');}catch(_e){
    var _mem={};
    var _shim={getItem:function(k){return Object.prototype.hasOwnProperty.call(_mem,k)?_mem[k]:null;},setItem:function(k,v){_mem[String(k)]=String(v);},removeItem:function(k){delete _mem[String(k)];},clear:function(){_mem={};},key:function(i){return Object.keys(_mem)[i]||null;},get length(){return Object.keys(_mem).length;}};
    try{Object.defineProperty(window,'localStorage',{value:_shim,configurable:true});}catch(__e){}
    try{Object.defineProperty(window,'sessionStorage',{value:_shim,configurable:true});}catch(__e){}
  }
  function postErr(msg){try{window.parent&&window.parent.postMessage({type:'VALDRION_SANDBOX_ERROR',message:String(msg||'Runtime error')},'*');}catch(e){}}
  window.addEventListener('error',function(ev){postErr(ev.message+(ev.lineno?' (line '+ev.lineno+')':''));});
  window.addEventListener('unhandledrejection',function(ev){var r=ev.reason;postErr((r&&r.message)?r.message:String(r));});
  window.addEventListener('keydown',function(e){
    var tag=e.target&&e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' '].indexOf(e.key)!==-1||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].indexOf(e.code)!==-1){e.preventDefault();}
  },{passive:false});
  window.addEventListener('pointerdown',function(){try{window.focus();}catch(e){}});
  window.addEventListener('load',function(){try{window.focus();window.parent&&window.parent.postMessage({type:'VALDRION_SANDBOX_READY'},'*');}catch(e){}});
})();</script>`;

  if (!/<html[\s>]/i.test(trimmed)) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" />${harness}</head><body>${trimmed}</body></html>`;
  }
  if (/<head[\s>]/i.test(trimmed)) {
    return trimmed.replace(/<head([^>]*)>/i, `<head$1>${harness}`);
  }
  return trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${harness}</head>`);
}

