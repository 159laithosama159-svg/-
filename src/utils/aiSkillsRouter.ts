import { isGodotGameIntent } from './godotEngineUtils';
import { isGodotLiveControlIntent } from './godotAgentCommands';
import { isCouncilDebateIntent, isMindMapIntent } from './aiPowerTools';

export type AiAutoSkillIntent =
  | 'godot_control'
  | 'godot_build'
  | 'council'
  | 'mindmap'
  | 'video_gen'
  | 'image_gen'
  | 'web_research'
  | 'code_game'
  | 'general';

export interface AiSkillRouteDecision {
  intent: AiAutoSkillIntent;
  labelAr: string;
  autoWebSearch: boolean;
  recommendedDepth?: 'fast' | 'deep' | 'ultra';
}

export function isVideoGenerationIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /(اعمل|اصنع|سوي|سوّي|ولّد|ولد|انشئ|أنشئ|أخرج|اخرج|صمم|صمّم|create|make|generate|render)\s+(لي\s+)?(فيديو|مقطع\s*فيديو|ريلز|reels?|شورتس|shorts|موشن\s*جرافيك|motion\s*video|trailer|إعلان\s*فيديو|اعلان\s*فيديو)/i.test(
      t
    ) ||
    /^(فيديو|ريلز|مقطع فيديو|video|reel)\s+(عن|حول|لـ|about|for)\b/i.test(t) ||
    /^\/(فيديو|video)(?:\s|$)/i.test(t)
  );
}

export function isImageGenerationIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  if (isVideoGenerationIntent(t) || isMindMapIntent(t)) return false;
  return (
    /(ارسم|أرسم|اصنع|اعمل|سوي|سوّي|ولّد|ولد|صمم|صمّم|انشئ|أنشئ|جيبلي|جيب\s*لي|هات|أعطني|اعطني|ابحث\s*عن|create|draw|generate|design|make)\s+(لي\s+)?(صورة|صور|بوستر|ملصق|شعار|لوجو|لوغو|غلاف|خلفية|أفاتار|افاتار|إنفوجرافيك|انفوجرافيك|رسمة|لوحة|بطاقة|image|images|photo|photos|poster|logo|wallpaper|illustration|artwork|banner|thumbnail)/i.test(
      t
    ) ||
    /^(صورة|صور|بوستر|شعار|لوجو|غلاف|خلفية|رسمة)\s+(ل|لـ|عن|حول|من)?/i.test(t) ||
    /^\/(صورة|image)(?:\s|$)/i.test(t)
  );
}

export function isWebResearchIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(بحث|search)(?:\s|$)/i.test(t) ||
    /(ابحث|إبحث|بحث\s*(حي|في|عن|عميق)|أحدث|احدث|آخر\s*أخبار|اخر\s*اخبار|أخبار|اخبار|اليوم|الآن|الان|حالياً|حاليا|سعر|أسعار|اسعار|طقس|الطقس|نتيجة\s*مباراة|معلومات\s*عن|من\s*هو|ما\s*هو|تاريخ|مقارنة\s*بين|أفضل\s*.*202[4-9]|latest|news|price|weather|search\s+for|find\s+out|current|today|compare)/i.test(
      t
    )
  );
}

export function isCodeOrGameBuildIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(لعبة|game)(?:\s|$)/i.test(t) ||
    /(برمج|اكتب\s*كود|اعمل\s*لعبة|اصنع\s*لعبة|سوي\s*لعبة|بناء\s*تطبيق|اصنع\s*تطبيق|اعمل\s*موقع|صمم\s*موقع|لعبة\s*(html|2d|3d|سباق|أكشن|مغامرة|قتال|ذكاء)|تطبيق\s*(ويب|حاسبة|مهام|تفاعلي)|build\s+(a\s+)?(game|app|website|tool|dashboard)|code\s+a|html5|canvas\s+game)/i.test(
      t
    )
  );
}

export function detectAiSkillIntent(
  prompt: string,
  explicitMode?: string
): AiSkillRouteDecision {
  const t = (prompt || '').trim();

  if (isCouncilDebateIntent(t)) {
    return {
      intent: 'council',
      labelAr: 'مجلس الخبراء الثلاثي (مناظرة 3 عقول + قرار تنفيذي)',
      autoWebSearch: false,
      recommendedDepth: 'ultra',
    };
  }

  if (isMindMapIntent(t)) {
    return {
      intent: 'mindmap',
      labelAr: 'رسم خريطة ذهنية ومخطط تفاعلي عالي الدقة',
      autoWebSearch: false,
      recommendedDepth: 'deep',
    };
  }

  if (/^\/(جودوت|godot)(?:\s|$)/i.test(t) || isGodotLiveControlIntent(t)) {
    return {
      intent: 'godot_control',
      labelAr: 'التحكم المباشر بمحرك Godot 4 (بإذنك)',
      autoWebSearch: false,
      recommendedDepth: 'deep',
    };
  }

  if (explicitMode === 'godot' || isGodotGameIntent(t)) {
    return {
      intent: 'godot_build',
      labelAr: 'هندسة مشروع لعبة Godot 4.3+ كامل',
      autoWebSearch: false,
      recommendedDepth: 'deep',
    };
  }

  if (explicitMode === 'video' || isVideoGenerationIntent(t)) {
    return {
      intent: 'video_gen',
      labelAr: 'إخراج فيديو موشن جرافيك (.webm) حي',
      autoWebSearch: false,
      recommendedDepth: 'deep',
    };
  }

  if (explicitMode === 'poster' || isImageGenerationIntent(t)) {
    return {
      intent: 'image_gen',
      labelAr: 'توليد وتصميم الصور والفن البصري HD',
      autoWebSearch: false,
      recommendedDepth: 'deep',
    };
  }

  if (explicitMode === 'create' || isCodeOrGameBuildIntent(t)) {
    return {
      intent: 'code_game',
      labelAr: 'هندسة البرمجيات والألعاب التفاعلية الحية',
      autoWebSearch: false,
      recommendedDepth: 'ultra',
    };
  }

  if (explicitMode === 'research' || isWebResearchIntent(t)) {
    return {
      intent: 'web_research',
      labelAr: 'البحث الحي في الويب والموسوعات العالمية',
      autoWebSearch: true,
      recommendedDepth: 'deep',
    };
  }

  return {
    intent: 'general',
    labelAr: 'التحليل الذكي والإجابة المتعمقة',
    autoWebSearch: false,
  };
}

export function buildProxyImageUrl(rawUrl: string): string {
  const clean = (rawUrl || '').trim();
  if (!clean) return '';
  if (clean.startsWith('/') || clean.startsWith('data:') || clean.startsWith('blob:')) {
    return clean;
  }
  return `/api/media/proxy-image?url=${encodeURIComponent(clean)}`;
}

export function extractAutoMemoryCandidate(prompt: string): string | null {
  const t = (prompt || '').trim();
  if (t.length < 10 || t.length > 260) return null;
  const match = t.match(
    /(?:تذكر\s*(?:أن|ان|أنني|انني|اني)?|احفظ\s*(?:عندك|في الذاكرة)?\s*(?:أن|ان)?|اسمي\s+هو|انا\s+اسمي|أنا\s+اسمي|مشروعي\s+هو|remember\s+that|my\s+name\s+is)\s+(.+)/i
  );
  if (!match?.[1]) return null;
  const cleaned = match[1].trim().replace(/[.،!؟]+$/, '');
  return cleaned.length >= 4 ? cleaned.slice(0, 200) : null;
}

export function extractEnglishSearchKeywordHint(prompt: string): string {
  const asciiWords = (prompt || '')
    .replace(/https?:\/\/\S+/g, '')
    .match(/[a-zA-Z0-9]{3,}/g);
  if (asciiWords && asciiWords.length > 0) {
    return asciiWords.slice(0, 5).join(' ');
  }
  return (prompt || '').trim().slice(0, 60);
}
