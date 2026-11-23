import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_AGENTS, MULTI_AGENT_CHAINS } from '../data/aiAgents';
import {
  buildAgentsRosterReferenceMarkdown,
  buildGeminiSkillZipPackage,
  buildGeminiTeamSkillMarkdown,
} from './geminiSkillExporter';

test('buildGeminiTeamSkillMarkdown includes valid YAML frontmatter and all 24 agents', () => {
  const md = buildGeminiTeamSkillMarkdown();

  assert.ok(md.startsWith('---\nname: valdrion-omni-24-agents\ndescription: "'));
  assert.ok(md.includes('\n---\n'));
  assert.ok(md.includes('Godot 4.3+'));
  assert.ok(md.includes('GDScript 2.0'));

  for (const agent of AI_AGENTS) {
    assert.ok(
      md.includes(`\`${agent.id}\``),
      `Expected agent id ${agent.id} in exported SKILL.md`
    );
    assert.ok(
      md.includes(agent.name),
      `Expected Arabic name ${agent.name} in exported SKILL.md`
    );
  }

  for (const chain of MULTI_AGENT_CHAINS) {
    assert.ok(
      md.includes(chain.title),
      `Expected chain "${chain.title}" in exported SKILL.md`
    );
  }
});

test('buildGeminiTeamSkillMarkdown embeds custom brain instructions and memories when provided', () => {
  const md = buildGeminiTeamSkillMarkdown({
    skillName: 'My Custom Team!',
    customBrainInstructions: 'Always answer concisely in Arabic with bullet points.',
    userMemories: ['I build Godot 4 indie games', 'Prefer dark obsidian UI'],
  });

  assert.ok(md.includes('name: my-custom-team'));
  assert.ok(md.includes('Persistent Personal Brain & User Context'));
  assert.ok(md.includes('Always answer concisely in Arabic with bullet points.'));
  assert.ok(md.includes('- I build Godot 4 indie games'));
  assert.ok(md.includes('- Prefer dark obsidian UI'));
});

test('buildAgentsRosterReferenceMarkdown includes markdown table with 24 rows', () => {
  const roster = buildAgentsRosterReferenceMarkdown();
  assert.ok(roster.includes('| # | Agent ID |'));
  assert.ok(roster.includes('| 24 |'));
});

test('buildGeminiSkillZipPackage produces a valid ZIP archive containing SKILL.md and references', () => {
  const zipBytes = buildGeminiSkillZipPackage();
  assert.ok(zipBytes instanceof Uint8Array);
  assert.ok(zipBytes.length > 2000);
  // ZIP local file header signature: PK\x03\x04
  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);
  assert.equal(zipBytes[2], 0x03);
  assert.equal(zipBytes[3], 0x04);

  const decoded = new TextDecoder().decode(zipBytes);
  assert.ok(decoded.includes('valdrion-omni-24-agents/SKILL.md'));
  assert.ok(decoded.includes('valdrion-omni-24-agents/references/agents-roster.md'));
  assert.ok(decoded.includes('valdrion-omni-24-agents/README.md'));
});
