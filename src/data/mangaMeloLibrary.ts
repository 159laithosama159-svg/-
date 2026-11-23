import shadowAwakeningImg from '../assets/images/manhwa_shadow_awakening_1795366075579.jpg';
import shadowArmyImg from '../assets/images/manhwa_shadow_army_1795366051142.jpg';
import bossDuelImg from '../assets/images/manhwa_boss_duel_1795367283194.jpg';
import murimSwordImg from '../assets/images/manhwa_murim_sword_1795366027136.jpg';
import kyotoSakuraImg from '../assets/images/manhwa_kyoto_sakura_1795366629591.jpg';
import jadeEmperorImg from '../assets/images/manhwa_jade_emperor_1795367293728.jpg';

export interface MangaMeloBubble {
  speaker: string;
  text: string;
  style: 'speech' | 'shout' | 'thought' | 'system';
  position: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';
}

export interface MangaMeloPanel {
  id: string;
  imageUrl: string;
  caption?: string;
  sfx?: string;
  bubbles: MangaMeloBubble[];
}

export interface MangaMeloChapter {
  id: string;
  number: number;
  title: string;
  panels: MangaMeloPanel[];
}

export interface MangaMeloSeries {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  country: 'كوري' | 'ياباني' | 'صيني';
  rating: number;
  status: 'مستمرة' | 'مكتملة';
  coverUrl: string;
  accentColor: string;
  synopsis: string;
  chapters: MangaMeloChapter[];
}

export const MANGAMELO_ART_POOL = [
  shadowAwakeningImg,
  bossDuelImg,
  shadowArmyImg,
  murimSwordImg,
  kyotoSakuraImg,
  jadeEmperorImg,
] as const;

export const MANGAMELO_SERIES_CATALOG: MangaMeloSeries[] = [
  {
    id: 'mm_shadow_monarch',
    title: 'صحوة صيّاد الظلال: النظام الأعلى',
    subtitle: 'Solo Shadow System · مانهوا كورية كاملة',
    genre: 'أكشن · صيادون · نظام',
    country: 'كوري',
    rating: 4.9,
    status: 'مكتملة',
    coverUrl: shadowAwakeningImg,
    accentColor: '#38BDF8',
    synopsis:
      'أضعف صيّاد من الرتبة E ينجو من المعبد المزدوج فيستيقظ على «النظام» السري الذي يمنحه قوة رفع المستوى اللانهائية وقيادة جيش الظلال.',
    chapters: [
      {
        id: 'mm_sm_ch1',
        number: 1,
        title: 'الفصل 1: بوابة النظام وصحوة الخنجرين',
        panels: [
          {
            id: 'sm_p1',
            imageUrl: shadowAwakeningImg,
            caption: 'في أعماق المعبد المزدوج… حين ظنّ الجميع أنها النهاية، فُتحت نافذة «النظام» الزرقاء أمام سيف الدين وحده.',
            sfx: 'وميييض!',
            bubbles: [
              {
                speaker: 'النظام',
                text: '[تهانينا! لقد أصبحت «لاعباً». تم فتح مهارة: استدعاء الظلال — المستوى 1]',
                style: 'system',
                position: 'top_right',
              },
              {
                speaker: 'سيف الدين',
                text: 'هذه المرة… لن أكون الصيّاد الضعيف الذي يختبئ خلف الآخرين!',
                style: 'speech',
                position: 'bottom_left',
              },
            ],
          },
          {
            id: 'sm_p2',
            imageUrl: bossDuelImg,
            caption: 'أمام بوابة الغرفة الحمراء، نهض الفارس القرمزي الحارس للعرش بسيفه العملاق المشتعل!',
            sfx: 'كلاااانغ!!',
            bubbles: [
              {
                speaker: 'الفارس القرمزي',
                text: 'لا يعبر هذا العرش إلا من يستحق تاج الظلال… أرني حدّ نصلك!',
                style: 'shout',
                position: 'top_left',
              },
              {
                speaker: 'سيف الدين',
                text: 'توقّعت سرعتك! خطوة الظلّ — الضربة المزدوجة!',
                style: 'shout',
                position: 'bottom_right',
              },
            ],
          },
          {
            id: 'sm_p3',
            imageUrl: shadowArmyImg,
            caption: 'بعد سقوط حارس الزنزانة واشتعال وحش الجحيم خلفه، نطق سيف الدين بالكلمة التي غيّرت تاريخ الصيادين إلى الأبد.',
            sfx: 'بووووم!!',
            bubbles: [
              {
                speaker: 'سيف الدين',
                text: 'انهضوا… يا فرسان الظلّ! المعركة الحقيقية بدأت للتو!',
                style: 'shout',
                position: 'top_right',
              },
              {
                speaker: 'النظام',
                text: '[تم استخراج 42 فارس ظلّ بنجاح — الرتبة الجديدة: ملك الظلال S+]',
                style: 'system',
                position: 'bottom_left',
              },
            ],
          },
        ],
      },
      {
        id: 'mm_sm_ch2',
        number: 2,
        title: 'الفصل 2: عرش اللهب وجيش الليل',
        panels: [
          {
            id: 'sm_p4',
            imageUrl: shadowArmyImg,
            caption: 'اهتزّت كهوف السبج البركانية تحت زئير التنين القرمزي، بينما اصطفّ جيش الظلال البنفسجي بثباتٍ أسطوري.',
            sfx: 'زئيييير!',
            bubbles: [
              {
                speaker: 'سيف الدين',
                text: 'كلما سقط أحد فرساني، يعود أقوى طالما لديّ طاقة مانا… لن تهزمنا أبداً!',
                style: 'speech',
                position: 'top_right',
              },
            ],
          },
          {
            id: 'sm_p5',
            imageUrl: bossDuelImg,
            caption: 'بضربةٍ واحدة شقّت سماء الكهف بشرارات زرقاء وبرتقالية، انكسر درع الزعيم وأُغلقت البوابة الحمراء إلى الأبد.',
            sfx: 'سلااااش!!',
            bubbles: [
              {
                speaker: 'النظام',
                text: '[اكتملت المهمة السرية بنجاح! تم فتح بوابة العاصمة الكبرى]',
                style: 'system',
                position: 'bottom_left',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mm_murim_saint',
    title: 'عودة قدّيس سيف زهر البرقوق',
    subtitle: 'Return of the Plum Blossom Saint · موريم',
    genre: 'موريم · فنون قتالية · عودة بالزمن',
    country: 'كوري',
    rating: 4.9,
    status: 'مكتملة',
    coverUrl: murimSwordImg,
    accentColor: '#FB7185',
    synopsis:
      'أعظم سيّاف في عالم الموريم يعود بالزمن مئة عام ليجد طائفته على حافة الانهيار، فيستلّ سيف زهر البرقوق الذهبي لاستعادة المجد المفقود.',
    chapters: [
      {
        id: 'mm_ms_ch1',
        number: 1,
        title: 'الفصل 1: ضربة السيف الذهبي فوق القمة الثلجية',
        panels: [
          {
            id: 'ms_p1',
            imageUrl: murimSwordImg,
            caption: 'فوق قمة الجبل المكسو بالثلج، تفتّحت بتلات البرقوق الوردية وسط عاصفةٍ جليدية حين أطلق تشونغ ميونغ طاقة السيف الذهبي.',
            sfx: 'شووووش!!',
            bubbles: [
              {
                speaker: 'قدّيس السيف',
                text: 'ظننتم أن طائفة جبل البرقوق قد ماتت؟ انظروا جيداً… هذه هي التقنية السابعة للسيف السماوي!',
                style: 'shout',
                position: 'top_right',
              },
              {
                speaker: 'أحد شيوخ التحالف',
                text: 'مستحيل! كيف يمتلك تلميذٌ شاب هالة سيفٍ تقسم الغيوم نصفين؟!',
                style: 'thought',
                position: 'bottom_left',
              },
            ],
          },
          {
            id: 'ms_p2',
            imageUrl: bossDuelImg,
            caption: 'اصطدم نصل البرقوق بدرع قائد طائفة الحديد القرمزي، فارتدّت موجة الصدمة محطّمة الصخور من حولهما!',
            sfx: 'بوووم!!',
            bubbles: [
              {
                speaker: 'قدّيس السيف',
                text: 'دفاعك بطيء وثقيل… سأعلّمكم اليوم معنى السرعة الحقيقية في عالم الموريم!',
                style: 'speech',
                position: 'top_left',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mm_kyoto_blade',
    title: 'سيف الساكورا: حارس كيوتو الخفي',
    subtitle: 'Kyoto Midnight Torii · مانجا ملونة يابانية',
    genre: 'ساموراي · فانتازيا · أكشن',
    country: 'ياباني',
    rating: 4.8,
    status: 'مكتملة',
    coverUrl: kyotoSakuraImg,
    accentColor: '#38BDF8',
    synopsis:
      'عند منتصف الليل تحت بوابات التوري الحمراء في كيوتو، يستيقظ النصل الروحي الأزرق في يد هاروتو لمواجهة شبح الساموراي القادم من عصر إيدو.',
    chapters: [
      {
        id: 'mm_kb_ch1',
        number: 1,
        title: 'الفصل 1: مبارزة الجسر الحجري تحت المطر',
        panels: [
          {
            id: 'kb_p1',
            imageUrl: kyotoSakuraImg,
            caption: 'تحت هلالٍ أزرق متوهج وألف بوابة حمراء في أعالي كيوتو، توقف المطر لحظة اشتعال الكاتانا الروحية.',
            sfx: 'بررررق!',
            bubbles: [
              {
                speaker: 'هاروتو',
                text: 'لن أدعك تعبر هذا الجسر نحو المدينة! سأحمي عهد جدي مهما كان الثمن!',
                style: 'shout',
                position: 'top_right',
              },
              {
                speaker: 'الساموراي الطيفي',
                text: 'نصلٌ أزرق نقيّ… أخيراً وجدتُ خصماً جديراً بسيفي بعد ثلاثمئة عام.',
                style: 'speech',
                position: 'bottom_left',
              },
            ],
          },
          {
            id: 'kb_p2',
            imageUrl: shadowAwakeningImg,
            caption: 'ومع توهّج الهالة السماوية حوله، أدرك هاروتو أن النصل لم يكن خشبياً يوماً… بل مفتاح عالم الأرواح.',
            sfx: 'وميض أزرق!',
            bubbles: [
              {
                speaker: 'هاروتو',
                text: 'الآن فهمت… السيف لا يقطع بالحديد، بل بإرادة الحارس!',
                style: 'thought',
                position: 'top_left',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mm_jade_emperor',
    title: 'إمبراطور اليشم: صعود السماوات التسع',
    subtitle: 'Jade Dragon Immortal · مانهاوا صينية',
    genre: 'شيانشيا · تنانين · طاقة روحية',
    country: 'صيني',
    rating: 4.9,
    status: 'مكتملة',
    coverUrl: jadeEmperorImg,
    accentColor: '#34D399',
    synopsis:
      'فوق قصور الغيوم العائمة، يوقظ التلميذ لين تشن قلادة اليشم الزمردي ليحرر التنين الذهبي الأسطوري ويبدأ صعوده نحو السماوات التسع.',
    chapters: [
      {
        id: 'mm_je_ch1',
        number: 1,
        title: 'الفصل 1: صحوة التنين الذهبي فوق بحر الغيوم',
        panels: [
          {
            id: 'je_p1',
            imageUrl: jadeEmperorImg,
            caption: 'مع غروب الشمس الذهبي فوق قصر السحاب، انفجر ضوء الزمرد من قلادة اليشم وتجسّد التنين الذهبي في السماء!',
            sfx: 'رعد سماوي!!',
            bubbles: [
              {
                speaker: 'لين تشن',
                text: 'هذه هي طاقة التشي السماوية التي سخروا مني لأنني أبحث عنها… اشهدوا صعودي اليوم!',
                style: 'shout',
                position: 'top_right',
              },
              {
                speaker: 'التنين الذهبي',
                text: 'يا وريث اليشم، السماوات التسع بانتظارك… فلنحطّم قيود القدر معاً!',
                style: 'speech',
                position: 'bottom_left',
              },
            ],
          },
          {
            id: 'je_p2',
            imageUrl: murimSwordImg,
            caption: 'وفي امتحان القمة السابعة، لم يصمد أمام سرعة سيفه المشتعل بطاقة اليشم أيّ خصم.',
            sfx: 'سلااااش!',
            bubbles: [
              {
                speaker: 'الشيخ باي يون',
                text: 'لم أشهد موهبة بهذا الوهج منذ ألف عام… لقد وُلد إمبراطور اليشم الجديد!',
                style: 'thought',
                position: 'top_left',
              },
            ],
          },
        ],
      },
    ],
  },
];
