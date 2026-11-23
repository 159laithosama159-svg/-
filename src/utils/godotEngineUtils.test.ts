import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZipArchive, computeCrc32 } from './zipBuilder';
import {
  buildGodotBridgePluginFiles,
  buildSandboxedPlayableHtml,
  generateGodotPairCode,
  isGodotGameIntent,
  normalizeGodotProjectPayload,
  parseGodotSceneNodes,
  repairGodotScriptForGodot4,
  sanitizeGodotFilePath,
} from './godotEngineUtils';
import { buildRobloxGta6GodotProject } from './godotFlagshipPresets';

test('buildZipArchive produces valid PK ZIP binary with accurate CRC32 and UTF-8 paths', () => {
  const hello = 'config_version=5\n[application]\nconfig/name="Test"\n';
  const bytes = buildZipArchive([
    { path: 'project.godot', content: hello },
    { path: 'scripts/player.gd', content: 'extends CharacterBody2D\n' },
    { path: '../../evil.txt', content: 'sanitized' },
  ]);

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Local file header signature PK\x03\x04
  assert.equal(view.getUint32(0, true), 0x04034b50);
  // EOCD signature PK\x05\x06 at bytes.length - 22
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  // Total entries count in EOCD = 3
  assert.equal(view.getUint16(bytes.length - 12, true), 3);

  // Verify CRC32 of first entry matches computeCrc32
  const expectedCrc = computeCrc32(new TextEncoder().encode(hello));
  assert.equal(view.getUint32(14, true), expectedCrc);

  // Path traversal segments must be stripped
  const decoded = new TextDecoder().decode(bytes);
  assert.ok(decoded.includes('project.godot'));
  assert.ok(decoded.includes('scripts/player.gd'));
  assert.ok(!decoded.includes('../'));
});

test('sanitizeGodotFilePath normalizes res:// prefixes and prevents path traversal', () => {
  assert.equal(sanitizeGodotFilePath('res://scenes/main.tscn'), 'scenes/main.tscn');
  assert.equal(sanitizeGodotFilePath('../../etc/passwd'), 'etc/passwd');
  assert.equal(sanitizeGodotFilePath('\\scripts\\player.gd'), 'scripts/player.gd');
});

test('parseGodotSceneNodes extracts root and nested Godot 4 nodes with depths', () => {
  const sampleTscn = `[gd_scene load_steps=2 format=3]

[node name="Main" type="Node2D"]

[node name="Player" type="CharacterBody2D" parent="."]

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]

[node name="HUD" type="CanvasLayer" parent="."]
`;
  const nodes = parseGodotSceneNodes(sampleTscn);
  assert.equal(nodes.length, 4);
  assert.deepEqual(nodes[0], { name: 'Main', type: 'Node2D', parent: '', depth: 0 });
  assert.deepEqual(nodes[1], { name: 'Player', type: 'CharacterBody2D', parent: '.', depth: 1 });
  assert.deepEqual(nodes[2], {
    name: 'CollisionShape2D',
    type: 'CollisionShape2D',
    parent: 'Player',
    depth: 2,
  });
});

test('normalizeGodotProjectPayload guarantees project.godot, icon.svg, and Live Bridge plugin', () => {
  const bundle = normalizeGodotProjectPayload(
    {
      projectName: 'Desert Knight',
      dimension: '2d',
      mainScene: 'scenes/main.tscn',
      files: [
        { path: 'scenes/main.tscn', content: '[gd_scene format=3]\n[node name="Main" type="Node2D"]\n' },
        { path: 'scripts/main.gd', content: 'extends Node2D\nfunc _ready(): pass\n' },
      ],
    },
    {
      bridgeWsUrl: 'wss://example.com/ws/realtime',
      pairCode: 'GD9X2K',
    }
  );

  assert.equal(bundle.dimension, '2d');
  assert.equal(bundle.mainScene, 'res://scenes/main.tscn');
  assert.ok(bundle.files.some((f) => f.path === 'project.godot'));
  assert.ok(bundle.files.some((f) => f.path === 'icon.svg'));
  assert.ok(bundle.files.some((f) => f.path === 'addons/valdrion_bridge/plugin.cfg'));
  const pluginGd = bundle.files.find((f) => f.path === 'addons/valdrion_bridge/valdrion_bridge.gd');
  assert.ok(pluginGd?.content.includes('wss://example.com/ws/realtime'));
  assert.ok(pluginGd?.content.includes('GD9X2K'));
});

test('repairGodotScriptForGodot4 auto-upgrades legacy Godot 3 syntax and sandbox harness wraps HTML', () => {
  const broken = `extends KinematicBody3D
export var speed = 10
onready var cam = $Camera
func _physics_process(_d):
  var b = scene.instance()
  move_and_slide(velocity, Vector3.UP)`;
  const fixed = repairGodotScriptForGodot4(broken);
  assert.ok(fixed.includes('extends CharacterBody3D'));
  assert.ok(fixed.includes('@export var speed'));
  assert.ok(fixed.includes('@onready var cam'));
  assert.ok(fixed.includes('.instantiate()'));
  assert.ok(fixed.includes('move_and_slide()'));

  const wrapped = buildSandboxedPlayableHtml('<html><head><title>Game</title></head><body><canvas id="c"></canvas></body></html>');
  assert.ok(wrapped.includes('VALDRION_SANDBOX_ERROR'));
  assert.ok(wrapped.includes('e.preventDefault()'));
});

test('buildRobloxGta6GodotProject builds a complete runnable 3D Roblox x GTA 6 bundle', () => {
  const { project, guideMarkdown } = buildRobloxGta6GodotProject({
    bridgeWsUrl: 'wss://example.com/ws/realtime',
    pairCode: 'GD6666',
  });
  assert.equal(project.dimension, '3d');
  assert.ok(project.files.some((f) => f.path === 'project.godot'));
  assert.ok(project.files.some((f) => f.path === 'scripts/player.gd'));
  assert.ok(project.files.some((f) => f.path === 'scripts/vehicle.gd'));
  assert.ok(project.files.some((f) => f.path === 'scripts/city_builder.gd'));
  assert.ok(project.previewHtml && project.previewHtml.includes('VALDRION CITY 6'));
  assert.ok(guideMarkdown.includes('VALDRION CITY 6'));
});

test('isGodotGameIntent and pair code helpers detect Godot requests accurately', () => {
  assert.equal(isGodotGameIntent('سوي لعبة منصات داخل محرك جودوت'), true);
  assert.equal(isGodotGameIntent('Build a 3D Godot racing game in GDScript'), true);
  assert.equal(isGodotGameIntent('رشح لي فيلم أكشن الليلة'), false);

  const code = generateGodotPairCode();
  assert.match(code, /^GD[A-Z0-9]{4}$/);

  const pluginFiles = buildGodotBridgePluginFiles('ws://localhost:3000/ws/realtime', code);
  assert.equal(pluginFiles.length, 2);
});
