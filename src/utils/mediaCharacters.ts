import type { MediaItem } from '../types/cinema';
import type { NovelBook } from './novelsUtils';

export interface CharacterProfileBio {
  name: string;
  role: string;
  bio: string;
}

const KNOWN_MEDIA_CHARACTERS: Record<string, CharacterProfileBio[]> = {
  sintel: [
    {
      name: 'سينتل (Sintel)',
      role: 'البطلة الرئيسية',
      bio: 'محاربة شابة شجاعة تجوب الجبال والصحاري بحثاً عن التنين الصغير الذي أنقذته.',
    },
    {
      name: 'سكيلز (Scales)',
      role: 'التنين الصغير',
      bio: 'تنين جريح تنشأ بينه وبين سينتل رابطة وفاء استثنائية تغيّر مصير القصة.',
    },
    {
      name: 'الشامان الحكيم',
      role: 'المرشد',
      bio: 'حكيم المعبد الذي يرشد سينتل إلى أرض التنانين ويحذّرها من ثمن الرحلة.',
    },
  ],
  'tears of steel': [
    {
      name: 'ثوم (Thom)',
      role: 'البطل ومهندس الروبوتات',
      bio: 'شاب يحاول تصحيح خطأ قديم تسبب في حرب بين البشر والآلات في أمستردام.',
    },
    {
      name: 'سيليا (Celia)',
      role: 'قائدة الآلات الذكية',
      bio: 'شريكة ثوم السابقة التي تقود جيش السايبورغ وتواجه صراعاً بين المشاعر والمنطق.',
    },
    {
      name: 'كابتن بارلي',
      role: 'قائد المقاومة',
      bio: 'مقاتل مخضرم يحمي الفريق داخل مختبر إعادة محاكاة الذاكرة.',
    },
  ],
  'big buck bunny': [
    {
      name: 'باك باني',
      role: 'البطل المسالم',
      bio: 'أرنب ضخم طيب القلب يعشق الطبيعة لكنه لا يتهاون عند الدفاع عن أصدقائه.',
    },
    {
      name: 'فرانك ورفاقه',
      role: 'ثلاثي المشاغبين',
      bio: 'سنجاب مشاكس وعصابته الصغيرة الذين يختبرون صبر باك بمقالبهم المستمرة.',
    },
  ],
};

/**
 * Returns clean, concise character profiles for any Movie or Series item.
 * Combines explicit catalog cast/characters with smart localized summaries so
 * every item always displays helpful character intros underneath its details.
 */
export function buildMediaCharacterProfiles(item: MediaItem): CharacterProfileBio[] {
  const lowerTitle = (item.title || '').toLowerCase();
  for (const key of Object.keys(KNOWN_MEDIA_CHARACTERS)) {
    if (lowerTitle.includes(key)) {
      return KNOWN_MEDIA_CHARACTERS[key];
    }
  }

  const genreLabel = (item.genres && item.genres[0]) || (item.kind === 'series' ? 'دراما ومسلسلات' : 'سينما');
  const results: CharacterProfileBio[] = [];

  if (item.cast && item.cast.length > 0) {
    const roles = ['البطولة الرئيسية', 'شخصية محورية', 'دور رئيسي مساعد', 'شخصية مؤثرة في الأحداث'];
    item.cast.slice(0, 4).forEach((actor, idx) => {
      const cleanName = actor.trim();
      if (!cleanName) return;
      results.push({
        name: cleanName,
        role: roles[idx] || 'ضمن الطاقم الرئيسي',
        bio:
          idx === 0
            ? `يقود الخط الدرامي الرئيسي في «${item.title}» ضمن أجواء ${genreLabel}.`
            : `يؤدي دوراً محورياً يؤثر في تصاعد أحداث «${item.title}» وعلاقات الشخصيات.`,
      });
    });
  }

  if (results.length === 0) {
    if (item.kind === 'live') {
      return [
        {
          name: 'فريق البث المباشر',
          role: 'تقديم وتغطية حيّة',
          bio: `بث متواصل على قناة «${item.title}» بجودة ${item.quality || 'HD'}.`,
        },
      ];
    }
    return [
      {
        name: `بطل «${item.title.slice(0, 26)}»`,
        role: 'الشخصية المحورية',
        bio: `يواجه التحدي الرئيسي في أحداث هذا ${item.kind === 'series' ? 'المسلسل' : 'الفيلم'} في إطار ${genreLabel}.`,
      },
      {
        name: 'الحليف والمرشد',
        role: 'شخصية مساندة',
        bio: 'يدعم البطل في اللحظات الفارقة ويكشف أسرار العالم المحيط به.',
      },
      {
        name: 'الخصم / التحدي الرئيسي',
        role: 'محرّك الصراع',
        bio: 'يمثل العقبة الكبرى التي تصنع التشويق والتحولات المفصلية في القصة.',
      },
    ];
  }

  return results;
}

/**
 * Returns clean character profiles for any NovelBook (from explicit characters,
 * worldBible entries, or a concise derived character sheet).
 */
export function buildNovelCharacterProfiles(novel: NovelBook): CharacterProfileBio[] {
  if (novel.characters && novel.characters.length > 0) {
    return novel.characters;
  }

  const fromBible = (novel.worldBible || [])
    .filter((entry) => entry.category === 'character')
    .map((entry, idx) => ({
      name: entry.name,
      role: idx === 0 ? 'بطل الرواية' : 'شخصية رئيسية',
      bio: entry.description,
    }));

  if (fromBible.length > 0) {
    return fromBible;
  }

  return [
    {
      name: `بطل «${novel.title.slice(0, 24)}»`,
      role: 'الشخصية الرئيسية',
      bio: `قلب أحداث هذه الرواية في عالم ${novel.genre}، يخوض رحلة حاسمة تتكشف تفاصيلها عبر الفصول.`,
    },
    {
      name: 'رفيق الرحلة',
      role: 'شخصية مساندة',
      bio: 'يوازن قرارات البطل ويضيف عمقاً إنسانياً وحوارات مؤثرة للقصة.',
    },
  ];
}
