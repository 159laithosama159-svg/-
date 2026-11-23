/**
 * Pure utilities & data structures for VALDRION MIND's 100% Free Motion Video & Reels Studio.
 * Generates multi-scene kinetic video storyboards rendered live at 60fps on HTML5 Canvas
 * with real MediaRecorder .webm video export + optional AI neural voiceover.
 */

export type VideoAspectRatio = '16:9' | '9:16';

export type VideoMotionStyle =
  | 'orbit_particles'
  | 'aurora_waves'
  | 'geometric_grid'
  | 'starfield_warp'
  | 'golden_embers';

export interface MotionVideoScene {
  id: string;
  headline: string;
  subtitle: string;
  narration: string;
  durationSec: number;
  accentColor: string;
  secondaryColor: string;
  bgDark: string;
  motionStyle: VideoMotionStyle;
  visualKeyword: string;
  backdropImageUrl?: string;
}

export interface MotionVideoProject {
  title: string;
  aspectRatio: VideoAspectRatio;
  fps: number;
  narrationFullScript: string;
  scenes: MotionVideoScene[];
  createdAt: number;
}

export interface VideoTemplatePreset {
  id: string;
  label: string;
  aspectRatio: VideoAspectRatio;
  prompt: string;
}

export const VIDEO_TEMPLATES: VideoTemplatePreset[] = [
  {
    id: 'reels_ai_future',
    label: 'ريلز تقنية ومستقبل (9:16)',
    aspectRatio: '9:16',
    prompt: 'فيديو ريلز قصير مشوّق عن ثورة الذكاء الاصطناعي والوكلاء المستقلين في 2026',
  },
  {
    id: 'yt_product_launch',
    label: 'إعلان إطلاق منتج (16:9)',
    aspectRatio: '16:9',
    prompt: 'فيديو إعلاني سينمائي لإطلاق تطبيق عربي ذكي جديد مع عرض أبرز 3 مميزات وخاتمة تحفيزية',
  },
  {
    id: 'reels_space_facts',
    label: 'وثائقي فضاء سريع (9:16)',
    aspectRatio: '9:16',
    prompt: 'فيديو وثائقي بصري سريع عن أعظم 4 أسرار في الثقوب السوداء والمجرات العميقة',
  },
  {
    id: 'yt_game_trailer',
    label: 'تريلر لعبة إندي (16:9)',
    aspectRatio: '16:9',
    prompt: 'عرض تشويقي حماسي للعبة مغامرات عربية خيالية في صحراء الكريستال بعنوان "حارس الرمال"',
  },
  {
    id: 'reels_motivation',
    label: 'فيديو ملهم وسريع (9:16)',
    aspectRatio: '9:16',
    prompt: 'فيديو ملهم قصير من 4 مشاهد عن الانضباط اليومي وبناء العادات الاستثنائية',
  },
];

const SAFE_HEX = /^#[0-9a-fA-F]{6}$/;

const VALID_STYLES: VideoMotionStyle[] = [
  'orbit_particles',
  'aurora_waves',
  'geometric_grid',
  'starfield_warp',
  'golden_embers',
];

const DEFAULT_PALETTES: Array<{ accent: string; secondary: string; bg: string }> = [
  { accent: '#60A5FA', secondary: '#818CF8', bg: '#090D16' },
  { accent: '#F59E0B', secondary: '#F97316', bg: '#110D08' },
  { accent: '#34D399', secondary: '#2DD4BF', bg: '#081210' },
  { accent: '#F472B6', secondary: '#A78BFA', bg: '#120A14' },
  { accent: '#38BDF8', secondary: '#C084FC', bg: '#0A0F1A' },
];

export function getVideoCanvasDimensions(aspectRatio: VideoAspectRatio): {
  width: number;
  height: number;
} {
  return aspectRatio === '9:16'
    ? { width: 720, height: 1280 }
    : { width: 1280, height: 720 };
}

export function getTotalVideoDurationSec(project: MotionVideoProject): number {
  return project.scenes.reduce((acc, s) => acc + Math.max(2, s.durationSec), 0);
}

export function normalizeMotionVideoProject(
  raw: Record<string, unknown>,
  fallbackAspect: VideoAspectRatio = '16:9',
  fallbackTitle = 'فيديو إبداعي من VALDRION MIND'
): MotionVideoProject {
  const aspectRatio: VideoAspectRatio =
    raw.aspectRatio === '9:16' || raw.aspectRatio === '16:9'
      ? raw.aspectRatio
      : fallbackAspect;

  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim().slice(0, 120)
      : fallbackTitle;

  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes : [];
  const scenes: MotionVideoScene[] = rawScenes
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
    .slice(0, 8)
    .map((s, idx) => {
      const palette = DEFAULT_PALETTES[idx % DEFAULT_PALETTES.length];
      const accent =
        typeof s.accentColor === 'string' && SAFE_HEX.test(s.accentColor.trim())
          ? s.accentColor.trim()
          : palette.accent;
      const secondary =
        typeof s.secondaryColor === 'string' && SAFE_HEX.test(s.secondaryColor.trim())
          ? s.secondaryColor.trim()
          : palette.secondary;
      const bgDark =
        typeof s.bgDark === 'string' && SAFE_HEX.test(s.bgDark.trim())
          ? s.bgDark.trim()
          : palette.bg;
      const style = VALID_STYLES.includes(s.motionStyle as VideoMotionStyle)
        ? (s.motionStyle as VideoMotionStyle)
        : VALID_STYLES[idx % VALID_STYLES.length];
      const durationRaw = Number(s.durationSec);
      const durationSec = Number.isFinite(durationRaw)
        ? Math.min(9, Math.max(3, Math.round(durationRaw)))
        : 4;

      const backdrop =
        typeof s.backdropImageUrl === 'string' && /^https?:\/\//i.test(s.backdropImageUrl.trim())
          ? s.backdropImageUrl.trim()
          : undefined;

      return {
        id: `scene_${idx + 1}`,
        headline:
          typeof s.headline === 'string' && s.headline.trim()
            ? s.headline.trim().slice(0, 90)
            : `المشهد ${idx + 1}`,
        subtitle:
          typeof s.subtitle === 'string' && s.subtitle.trim()
            ? s.subtitle.trim().slice(0, 180)
            : '',
        narration:
          typeof s.narration === 'string' && s.narration.trim()
            ? s.narration.trim().slice(0, 260)
            : typeof s.subtitle === 'string'
            ? s.subtitle.trim().slice(0, 200)
            : '',
        durationSec,
        accentColor: accent,
        secondaryColor: secondary,
        bgDark,
        motionStyle: style,
        visualKeyword:
          typeof s.visualKeyword === 'string' && s.visualKeyword.trim()
            ? s.visualKeyword.trim().slice(0, 60)
            : 'abstract space nebula',
        backdropImageUrl: backdrop,
      };
    });

  if (scenes.length === 0) {
    scenes.push({
      id: 'scene_1',
      headline: title,
      subtitle: 'إنتاج بصري متحرك بدقة عالية عبر عقل فالدريون',
      narration: title,
      durationSec: 4,
      accentColor: '#60A5FA',
      secondaryColor: '#818CF8',
      bgDark: '#090D16',
      motionStyle: 'aurora_waves',
      visualKeyword: 'futuristic architecture light',
    });
  }

  const narrationFullScript =
    typeof raw.narrationFullScript === 'string' && raw.narrationFullScript.trim()
      ? raw.narrationFullScript.trim().slice(0, 1400)
      : scenes
          .map((s) => s.narration || s.headline)
          .filter(Boolean)
          .join('. ');

  return {
    title,
    aspectRatio,
    fps: 30,
    narrationFullScript,
    scenes,
    createdAt: Date.now(),
  };
}
