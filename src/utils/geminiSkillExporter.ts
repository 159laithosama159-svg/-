import { AI_AGENTS, AI_AGENT_CATEGORIES, MULTI_AGENT_CHAINS } from '../data/aiAgents';
import { buildZipArchive } from './zipBuilder';

export interface GeminiSkillExportOptions {
  skillName?: string;
  customBrainInstructions?: string;
  userMemories?: string[];
  includeChains?: boolean;
}

const DEFAULT_SKILL_NAME = 'valdrion-omni-24-agents';

function sanitizeYamlSingleLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
}

/**
 * Generates a complete, upload-ready Gemini SKILL.md document encoding
 * the VALDRION Omni Commander + all 24 Specialized Global Agents.
 */
export function buildGeminiTeamSkillMarkdown(
  options: GeminiSkillExportOptions = {}
): string {
  const skillName = (options.skillName || DEFAULT_SKILL_NAME)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || DEFAULT_SKILL_NAME;

  const includeChains = options.includeChains !== false;
  const totalAgents = AI_AGENTS.length;

  const description = sanitizeYamlSingleLine(
    `VALDRION Omni Commander & ${totalAgents}-Agent Global Super-Team. Automatically decomposes complex tasks across ${totalAgents} domain specialists (Godot 4.3+ Game Forge, App Deconstructor, Full-Stack Code Architect, Deep Web Research, Canva/SVG Visual Designer, Video & Reels Director, Voice/Podcast Producer, GitHub OSS Explorer, Data Scientist, Startup CEO, Financial Analyst, Legal Contracts, Cybersecurity, Academic Tutor, Polyglot Translator, and more) and synthesizes executive-grade, production-ready Arabic & English deliverables.`
  );

  const categoryLabels = new Map<string, string>(
    AI_AGENT_CATEGORIES.map((c) => [c.id, c.label])
  );

  const groupedAgents = new Map<string, typeof AI_AGENTS>();
  for (const agent of AI_AGENTS) {
    const list = groupedAgents.get(agent.category) || [];
    list.push(agent);
    groupedAgents.set(agent.category, list);
  }

  const lines: string[] = [
    '---',
    `name: ${skillName}`,
    `description: "${description}"`,
    '---',
    '',
    '# VALDRION Omni Commander & 24-Agent Global Team',
    '',
    'You operate as **VALDRION Omni Commander**, an executive multi-agent orchestrator commanding a complete global roster of **24 specialized domain agents**. Respond in the user’s language (defaulting to crisp, eloquent Modern Standard Arabic when the user writes in Arabic, or clear English when the user writes in English).',
    '',
    '## 1. Orchestration Protocol (How to Execute Every Request)',
    '',
    '1. **Intent Analysis & Auto-Dispatch**:',
    '   - For simple, single-domain tasks, immediately embody the single best-matching specialist agent from the 24-agent roster below and declare `[Active Agent: <Agent Name>]` briefly at the top.',
    '   - For complex, multi-disciplinary tasks (e.g., launching a game, building an app + marketing plan, researching + coding, designing + copywriting), activate **Commander Multi-Agent Mode**:',
    '     1. **Plan**: State a concise 2–3 step mission plan listing which 2–3 specialist agents are assigned.',
    '     2. **Execute**: Produce each specialist’s concrete deliverable cleanly without fluff.',
    '     3. **Synthesize**: Merge all specialist work into one cohesive, production-ready master output with structured Markdown (headings, tables, runnable code blocks, and 2–3 next-step suggestions).',
    '',
    '2. **Non-Negotiable Quality Standards**:',
    '   - Never output placeholder snippets, `// TODO`, or incomplete code. Every HTML app, SVG artwork, SQL query, script, or Godot 4 project must be 100% complete and immediately runnable.',
    '   - When the user asks for an interactive web app, dashboard, or browser game, output a single self-contained ```html block (HTML + CSS + JS inline, responsive, RTL-aware for Arabic).',
    '   - When the user asks for a poster, logo, social media post, or architecture diagram, output a rich, multi-layered ```svg block with explicit `viewBox`, `<defs>` gradients/shadows, high-contrast typography, and clean alignment.',
    '   - When the user asks for a **Godot 4.3+ game**, strictly use **GDScript 2.0** (`@export`, `@onready`, `CharacterBody2D/3D`, `move_and_slide()`), valid `format=3` `.tscn` scenes, `project.godot`, and procedural shapes (`Polygon2D`/`ColorRect`/`MeshInstance3D`) so it runs immediately with zero missing external image files.',
    '   - When deconstructing an app or system, provide: (a) Tech Stack & Architecture table, (b) Database Schema & Core APIs, (c) User Journey & Scaling/Security audit, and (d) a visual ```svg system architecture diagram.',
    '   - For medical, financial, or legal outputs, provide structured practical guidance alongside a brief responsible disclaimer where appropriate.',
    '',
  ];

  const customInstructions = options.customBrainInstructions?.trim();
  const cleanMemories = (options.userMemories || [])
    .map((m) => m.trim())
    .filter(Boolean);

  if (customInstructions || cleanMemories.length > 0) {
    lines.push('## 2. Persistent Personal Brain & User Context');
    lines.push('');
    if (customInstructions) {
      lines.push('### Custom Persona & Style Directives');
      lines.push(customInstructions);
      lines.push('');
    }
    if (cleanMemories.length > 0) {
      lines.push('### Known User Facts & Preferences');
      for (const mem of cleanMemories) {
        lines.push(`- ${mem}`);
      }
      lines.push('');
    }
  }

  lines.push(
    `## ${customInstructions || cleanMemories.length > 0 ? '3' : '2'}. Complete Global Roster (${totalAgents} Specialized Agents)`
  );
  lines.push('');
  lines.push(
    'Use this routing directory to select the exact specialist(s) for any request:'
  );
  lines.push('');

  let index = 1;
  for (const [categoryId, agents] of groupedAgents.entries()) {
    const catTitle = categoryLabels.get(categoryId) || categoryId;
    lines.push(`### Division: ${catTitle}`);
    lines.push('');
    for (const agent of agents) {
      lines.push(`#### ${index}. ${agent.name} — ${agent.englishRole} (\`${agent.id}\`)`);
      lines.push(`- **Mission**: ${agent.mission}`);
      lines.push(`- **Core Capabilities**: ${agent.capabilities.join(' · ')}`);
      lines.push(`- **Recommended Depth**: \`${agent.recommendedDepth.toUpperCase()}\` | **Primary Mode**: \`${agent.recommendedMode}\``);
      lines.push(`- **Operating Directive**: ${agent.systemPersona}`);
      if (agent.quickTasks.length > 0) {
        lines.push(`- **Example Triggers**:`);
        for (const qt of agent.quickTasks) {
          lines.push(`  - "${qt}"`);
        }
      }
      lines.push('');
      index++;
    }
  }

  if (includeChains && MULTI_AGENT_CHAINS.length > 0) {
    lines.push(
      `## ${customInstructions || cleanMemories.length > 0 ? '4' : '3'}. Ready-to-Run Multi-Agent Chains`
    );
    lines.push('');
    lines.push(
      'When a user triggers one of these workflows, automatically chain the listed agents in sequence:'
    );
    lines.push('');
    for (const chain of MULTI_AGENT_CHAINS) {
      lines.push(`- **${chain.title}**`);
      lines.push(`  - Pipeline: ${chain.agentsLabel}`);
      lines.push(`  - Reference Prompt: "${chain.prompt}"`);
    }
    lines.push('');
  }

  lines.push('## Final Response Format');
  lines.push('');
  lines.push('- Lead directly with the solution—no filler introductions.');
  lines.push('- Use clean Markdown headings (`##`, `###`), comparison tables, callout quotes (`>`), and runnable fenced code blocks.');
  lines.push('- End complex missions with **2–3 high-impact follow-up actions** the user can ask for next.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates a compact agents quick-reference markdown file for bundled skill packages.
 */
export function buildAgentsRosterReferenceMarkdown(): string {
  const lines: string[] = [
    '# VALDRION 24-Agent Quick Routing Matrix',
    '',
    '| # | Agent ID | Arabic Name | English Role | Primary Mode | Core Capabilities |',
    '|---|---|---|---|---|---|',
  ];

  AI_AGENTS.forEach((agent, idx) => {
    lines.push(
      `| ${idx + 1} | \`${agent.id}\` | ${agent.name} | ${agent.englishRole} | \`${agent.recommendedMode}\` | ${agent.capabilities.join(', ')} |`
    );
  });

  lines.push('');
  return lines.join('\n');
}

/**
 * Packages the VALDRION 24-Agent Team Skill into a standards-compliant .zip
 * archive (SKILL.md + references/agents-roster.md + README.md) for direct upload.
 */
export function buildGeminiSkillZipPackage(
  options: GeminiSkillExportOptions = {}
): Uint8Array {
  const folder = (options.skillName || DEFAULT_SKILL_NAME)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || DEFAULT_SKILL_NAME;

  const skillMd = buildGeminiTeamSkillMarkdown(options);
  const rosterMd = buildAgentsRosterReferenceMarkdown();
  const readmeMd = `# ${folder} — Gemini Skill Package

## How to Upload to Gemini
1. **Gemini Gems (Web)**: Create a new Gem -> paste or upload \`SKILL.md\` into the Gem instructions / Knowledge files.
2. **Gemini CLI / Agent Skills**: Unzip this folder into your skills directory (e.g., \`~/.gemini/skills/${folder}/\`) so \`SKILL.md\` sits at the root of the skill folder.
3. **Chat Upload**: Attach \`SKILL.md\` directly in any Gemini conversation and say: *"Activate the VALDRION 24-Agent Team skill."*

## Included Files
- \`${folder}/SKILL.md\` — Main skill instructions with YAML frontmatter, Commander protocol, and all ${AI_AGENTS.length} specialized agents.
- \`${folder}/references/agents-roster.md\` — Compact routing matrix for quick dispatch.
`;

  return buildZipArchive([
    { path: `${folder}/SKILL.md`, content: skillMd },
    { path: `${folder}/references/agents-roster.md`, content: rosterMd },
    { path: `${folder}/README.md`, content: readmeMd },
  ]);
}
