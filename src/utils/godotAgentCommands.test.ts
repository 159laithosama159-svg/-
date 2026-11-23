import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCommandsToProjectBundle,
  isGodotLiveControlIntent,
  sanitizeGodotActionPlan,
} from './godotAgentCommands';
import { buildRobloxGta6GodotProject } from './godotFlagshipPresets';

test('isGodotLiveControlIntent detects Arabic and English live editor control commands', () => {
  assert.equal(isGodotLiveControlIntent('فوت جودوت ضيف سيارة نيون وشغل اللعبة'), true);
  assert.equal(isGodotLiveControlIntent('ادخل جودوت وعدل سرعة اللاعب من بعد اذني'), true);
  assert.equal(isGodotLiveControlIntent('حط إضاءة زرقاء داخل جودوت واحفظ المشهد'), true);
  assert.equal(isGodotLiveControlIntent('add node MeshInstance3D in godot'), true);
  assert.equal(isGodotLiveControlIntent('ما هو الطقس اليوم في الرياض؟'), false);
});

test('sanitizeGodotActionPlan validates actions, blocks path traversal, and repairs GDScript 2.0', () => {
  const plan = sanitizeGodotActionPlan(
    {
      summary: 'إضافة سيارة وإرفاق سكربت حركة',
      explanation: 'سيتم إضافة العقدة وتحديث السكربت وحفظ المشهد.',
      commands: [
        {
          action: 'add_node',
          labelAr: 'إضافة سيارة نيون ثلاثية الأبعاد',
          parentPath: '.',
          nodeName: 'NeonCar',
          nodeType: 'MeshInstance3D',
          position: [5, 1, -8],
          meshShape: 'box',
          color: '#38BDF8',
          addCollision: true,
        },
        {
          action: 'write_file',
          labelAr: 'كتابة سكربت حركة',
          filePath: 'scripts/neon_car.gd',
          content: 'extends KinematicBody3D\nexport var speed = 12\nfunc _physics_process(d):\n\tmove_and_slide(velocity)\n',
        },
        {
          action: 'write_file',
          labelAr: 'محاولة غير آمنة',
          filePath: 'addons/valdrion_bridge/valdrion_bridge.gd',
          content: 'malicious',
        },
        {
          action: 'run_scene',
          labelAr: 'تشغيل اللعبة الآن',
        },
      ],
    },
    'ضيف سيارة في جودوت'
  );

  assert.equal(plan.status, 'awaiting_permission');
  assert.equal(plan.riskLevel, 'modify');
  assert.equal(plan.commands.length, 3);
  assert.equal(plan.commands[0].nodeName, 'NeonCar');
  assert.ok(plan.commands[1].content?.includes('extends CharacterBody3D'));
  assert.ok(plan.commands[1].content?.includes('@export var speed = 12'));
  assert.ok(plan.commands[1].content?.includes('move_and_slide()'));
  assert.equal(plan.commands[2].action, 'run_scene');
});

test('applyCommandsToProjectBundle injects new nodes and scripts cleanly into active bundle', () => {
  const { project } = buildRobloxGta6GodotProject();
  const res = applyCommandsToProjectBundle(project, [
    {
      id: 'c1',
      action: 'add_node',
      labelAr: 'إضافة مصباح نيون',
      parentPath: '.',
      nodeName: 'ViceNeonLamp',
      nodeType: 'OmniLight3D',
      position: [4, 6, -2],
    },
    {
      id: 'c2',
      action: 'write_file',
      labelAr: 'سكربت نيترو إضافي',
      filePath: 'scripts/turbo_boost.gd',
      content: 'extends Node\n@export var multiplier: float = 2.0\n',
    },
  ]);

  assert.equal(res.appliedCount, 2);
  const mainTscn = res.updated.files.find((f) => f.path === 'scenes/main.tscn');
  assert.ok(mainTscn?.content.includes('name="ViceNeonLamp"'));
  const turbo = res.updated.files.find((f) => f.path === 'scripts/turbo_boost.gd');
  assert.ok(turbo?.content.includes('multiplier'));
});
