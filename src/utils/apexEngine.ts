export interface ApexVerificationReport {
  critiquePoints: string[];
  improvementsApplied: string[];
  verificationStatus: 'verified' | 'refined';
  followUpPrompts: string[];
  sourcesCount: number;
}

export interface SlidesDeckItem {
  heading: string;
  kicker?: string;
  bulletPoints: string[];
  highlightMetric?: string;
  highlightLabel?: string;
  speakerNotes?: string;
}

export interface SlidesDeckData {
  title: string;
  subtitle: string;
  accentHex: string;
  slides: SlidesDeckItem[];
}

export interface QuizQuestionItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface InteractiveQuizData {
  title: string;
  subtitle: string;
  questions: QuizQuestionItem[];
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isApexDeepIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(ابكس|أبكس|apex|تدقيق|critique|بحث_عميق)(?:\s|$)/i.test(t) ||
    /(وضع\s*(ابكس|أبكس|apex)|بحث\s*عميق\s*جداً|تحليل\s*شامل\s*ومدقق|دقق\s*وتحقق|فحص\s*نقدي\s*شامل|deep\s+research\s+report)/i.test(
      t
    )
  );
}

export function isSlidesIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(شرائح|عرض|slides|deck|ppt)(?:\s|$)/i.test(t) ||
    /(اعمل|أنشئ|انشئ|صمم|سوّي|سوي|جهّز|جهز)\s+(عرض\s*تقديمي|بوربوينت|باوربوينت|شرائح\s*عرض|برزينتيشن|presentation|slide\s*deck)/i.test(
      t
    )
  );
}

export function isInteractiveAppIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(تطبيق|app|website|موقع)(?:\s|$)/i.test(t) ||
    /(ابني|ابنِ|برمج|صمم|اعمل|سوّي|سوي)\s+(تطبيق\s*ويب|تطبيق\s*تفاعلي|لوحة\s*تحكم\s*تفاعلية|آلة\s*حاسبة\s*تفاعلية|موقع\s*كامل|web\s*app|interactive\s+dashboard)/i.test(
      t
    )
  );
}

export function isQuizIntent(prompt: string): boolean {
  const t = (prompt || '').trim();
  if (!t) return false;
  return (
    /^\/(اختبار|كويز|quiz|exam)(?:\s|$)/i.test(t) ||
    /(اعمل|أنشئ|انشئ|سوّي|سوي)\s+(اختبار\s*تفاعلي|كويز|امتحان\s*تجريبي|أسئلة\s*تفاعلية|interactive\s+quiz)/i.test(
      t
    )
  );
}

/**
 * Deterministic safe scientific math evaluator (zero eval/Function!)
 * Supports + - * / ^ % ( ), pi, e, sqrt, abs, sin, cos, tan, log, ln, round, floor, ceil.
 */
export function evaluateSafeMathExpression(
  rawExpr: string
): { ok: true; value: number; formatted: string } | { ok: false; error: string } {
  const cleaned = (rawExpr || '')
    .replace(/^\/(حساب|calc)\s*/i, '')
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/،/g, ',')
    .replace(/\s+/g, '')
    .trim();

  if (!cleaned || cleaned.length > 160) {
    return { ok: false, error: 'أدخل عملية حسابية صالحة مثل: (125 * 4.5) + sqrt(144)' };
  }

  type Tok =
    | { type: 'num'; v: number }
    | { type: 'op'; v: string }
    | { type: 'id'; v: string }
    | { type: 'lparen' }
    | { type: 'rparen' };

  const tokens: Tok[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        numStr += cleaned[i++];
      }
      const num = Number(numStr);
      if (!Number.isFinite(num)) return { ok: false, error: `رقم غير صالح: ${numStr}` };
      tokens.push({ type: 'num', v: num });
    } else if (/[a-zA-Z]/.test(ch)) {
      let id = '';
      while (i < cleaned.length && /[a-zA-Z]/.test(cleaned[i])) {
        id += cleaned[i++];
      }
      const low = id.toLowerCase();
      if (low === 'pi') tokens.push({ type: 'num', v: Math.PI });
      else if (low === 'e') tokens.push({ type: 'num', v: Math.E });
      else tokens.push({ type: 'id', v: low });
    } else if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: 'op', v: ch });
      i++;
    } else if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
    } else {
      return { ok: false, error: `رمز غير مدعوم في العملية الحسابية: "${ch}"` };
    }
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpr = (): number => {
    let left = parseTerm();
    while (peek()?.type === 'op' && ((peek() as { v: string }).v === '+' || (peek() as { v: string }).v === '-')) {
      const op = (consume() as { v: string }).v;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parsePower();
    while (
      peek()?.type === 'op' &&
      ['*', '/', '%'].includes((peek() as { v: string }).v)
    ) {
      const op = (consume() as { v: string }).v;
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) {
        throw new Error('لا يمكن القسمة على صفر.');
      }
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  };

  const parsePower = (): number => {
    const base = parseUnary();
    if (peek()?.type === 'op' && (peek() as { v: string }).v === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  };

  const parseUnary = (): number => {
    if (peek()?.type === 'op' && (peek() as { v: string }).v === '-') {
      consume();
      return -parseUnary();
    }
    if (peek()?.type === 'op' && (peek() as { v: string }).v === '+') {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  };

  const parsePrimary = (): number => {
    const t = peek();
    if (!t) throw new Error('تعبير حسابي ناقص.');
    if (t.type === 'num') {
      consume();
      return t.v;
    }
    if (t.type === 'id') {
      consume();
      if (peek()?.type !== 'lparen') {
        throw new Error(`دالة غير معروفة أو ناقصة الأقواس: ${t.v}`);
      }
      consume(); // '('
      const arg = parseExpr();
      if (peek()?.type !== 'rparen') throw new Error('قوس إغلاق ناقص.');
      consume();
      switch (t.v) {
        case 'sqrt':
          if (arg < 0) throw new Error('لا يوجد جذر تربيعي حقيقي لعدد سالب.');
          return Math.sqrt(arg);
        case 'abs':
          return Math.abs(arg);
        case 'sin':
          return Math.sin(arg);
        case 'cos':
          return Math.cos(arg);
        case 'tan':
          return Math.tan(arg);
        case 'log':
          return Math.log10(arg);
        case 'ln':
          return Math.log(arg);
        case 'round':
          return Math.round(arg);
        case 'floor':
          return Math.floor(arg);
        case 'ceil':
          return Math.ceil(arg);
        default:
          throw new Error(`دالة غير مدعومة: ${t.v}`);
      }
    }
    if (t.type === 'lparen') {
      consume();
      const v = parseExpr();
      if (peek()?.type !== 'rparen') throw new Error('قوس إغلاق ناقص.');
      consume();
      return v;
    }
    throw new Error('صيغة رياضية غير صالحة.');
  };

  try {
    const result = parseExpr();
    if (pos !== tokens.length) {
      return { ok: false, error: 'صيغة حسابية غير مكتملة أو تحتوي رموزاً زائدة.' };
    }
    if (!Number.isFinite(result)) {
      return { ok: false, error: 'النتيجة خارج النطاق العددي المسموح.' };
    }
    const rounded = Number(result.toPrecision(12));
    return {
      ok: true,
      value: rounded,
      formatted: rounded.toLocaleString('en-US', { maximumFractionDigits: 8 }),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'تعذّر حساب التعبير الرياضي.',
    };
  }
}

export function normalizeSlidesDeck(
  raw: Partial<SlidesDeckData>,
  fallbackTopic: string
): SlidesDeckData {
  const accent =
    typeof raw.accentHex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(raw.accentHex.trim())
      ? raw.accentHex.trim()
      : '#38BDF8';
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
  const slides: SlidesDeckItem[] = rawSlides
    .slice(0, 12)
    .map((s, idx) => ({
      heading: String(s?.heading || `الشريحة ${idx + 1}`).trim().slice(0, 90),
      kicker: s?.kicker ? String(s.kicker).trim().slice(0, 48) : `0${idx + 1}`,
      bulletPoints: Array.isArray(s?.bulletPoints)
        ? s.bulletPoints.map((b) => String(b || '').trim()).filter(Boolean).slice(0, 5)
        : [],
      highlightMetric: s?.highlightMetric ? String(s.highlightMetric).trim().slice(0, 32) : undefined,
      highlightLabel: s?.highlightLabel ? String(s.highlightLabel).trim().slice(0, 56) : undefined,
      speakerNotes: s?.speakerNotes ? String(s.speakerNotes).trim().slice(0, 360) : undefined,
    }))
    .filter((s) => s.heading.length > 0);

  return {
    title: String(raw.title || fallbackTopic || 'عرض تقديمي ذكي').trim().slice(0, 90),
    subtitle: String(raw.subtitle || 'إعداد وتصميم AETHERMIND APEX AI').trim().slice(0, 140),
    accentHex: accent,
    slides:
      slides.length > 0
        ? slides
        : [
            {
              heading: fallbackTopic || 'مقدمة العرض',
              kicker: '01',
              bulletPoints: ['نظرة عامة شاملة على الموضوع', 'الأهداف الرئيسية والنتائج المتوقعة'],
              speakerNotes: 'ابدأ بترحيب موجز وتوضيح أهمية الموضوع للجمهور.',
            },
          ],
  };
}

/**
 * Builds a complete, self-contained, interactive RTL HTML5 Presentation Slide Deck
 * with keyboard navigation, progress bar, presenter notes, and print-to-PDF support.
 */
export function buildInteractiveSlidesHtml(deck: SlidesDeckData): string {
  const safeDeckJson = JSON.stringify(deck).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(deck.title)} — عرض AETHERMIND</title>
  <style>
    :root { --accent: ${escapeHtml(deck.accentHex)}; --bg: #0B101B; --surface: #131B2D; --text: #F8FAFC; --muted: #94A3B8; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Cairo', 'Tajawal', system-ui, sans-serif; background: radial-gradient(circle at top right, #18233C, var(--bg) 60%); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(11,16,27,0.88); backdrop-filter: blur(12px); }
    .brand { font-size: 13px; font-weight: 800; color: var(--accent); letter-spacing: 0.04em; }
    .controls { display: flex; gap: 8px; flex-wrap: wrap; }
    button { cursor: pointer; font-family: inherit; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #fff; padding: 7px 14px; font-size: 12px; font-weight: 700; transition: all 0.2s; }
    button:hover { border-color: var(--accent); background: rgba(56,189,248,0.18); transform: translateY(-1px); }
    button.primary { background: var(--accent); color: #08101A; border-color: transparent; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 18px; }
    .stage { width: 100%; max-width: 960px; min-height: 500px; background: linear-gradient(155deg, rgba(22,31,52,0.96), rgba(13,18,31,0.98)); border: 1px solid rgba(255,255,255,0.11); border-radius: 24px; padding: 40px 44px; box-shadow: 0 30px 80px rgba(0,0,0,0.55); display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
    .kicker { font-size: 12px; font-weight: 800; color: var(--accent); margin-bottom: 10px; }
    h1 { margin: 0 0 18px; font-size: clamp(26px, 3.4vw, 40px); line-height: 1.25; font-weight: 900; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 22px; align-items: start; }
    @media (min-width: 720px) { .grid.has-metric { grid-template-columns: 1.55fr 0.85fr; } }
    ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 13px; }
    li { position: relative; padding-right: 22px; font-size: 17px; line-height: 1.65; color: #E2E8F0; }
    li::before { content: ""; position: absolute; right: 0; top: 11px; width: 9px; height: 9px; border-radius: 50%; background: var(--accent); }
    .metric { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 24px; text-align: center; }
    .metric-val { font-size: 36px; font-weight: 900; color: var(--accent); font-variant-numeric: tabular-nums; }
    .metric-lbl { margin-top: 8px; font-size: 13px; color: var(--muted); font-weight: 700; }
    .notes { margin-top: 22px; padding: 14px 18px; border-radius: 14px; background: rgba(245,199,107,0.1); border: 1px solid rgba(245,199,107,0.3); font-size: 13px; color: #FDE68A; line-height: 1.7; display: none; }
    .notes.show { display: block; }
    .footer-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 28px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: var(--muted); }
    .progress { height: 4px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; margin-top: 10px; }
    .progress > div { height: 100%; background: var(--accent); transition: width 0.28s ease; }
  </style>
</head>
<body>
  <header>
    <div class="brand">${escapeHtml(deck.title)} · AETHERMIND SLIDES</div>
    <div class="controls">
      <button type="button" id="btnPrev">→ السابقة</button>
      <button type="button" id="btnNext" class="primary">التالية ←</button>
      <button type="button" id="btnNotes">ملاحظات المتحدث</button>
      <button type="button" id="btnPrint">طباعة / PDF</button>
    </div>
  </header>
  <main>
    <section class="stage">
      <div>
        <div class="kicker" id="kicker"></div>
        <h1 id="heading"></h1>
        <div class="grid" id="bodyGrid">
          <ul id="bullets"></ul>
          <div class="metric" id="metricBox" style="display:none">
            <div class="metric-val" id="metricVal"></div>
            <div class="metric-lbl" id="metricLbl"></div>
          </div>
        </div>
        <div class="notes" id="notesBox"></div>
      </div>
      <div>
        <div class="footer-bar">
          <span id="deckSub">${escapeHtml(deck.subtitle)}</span>
          <span id="counter" style="font-variant-numeric:tabular-nums;font-weight:800;color:#fff"></span>
        </div>
        <div class="progress"><div id="progFill"></div></div>
      </div>
    </section>
  </main>
  <script>
    const DECK = ${safeDeckJson};
    let idx = 0;
    let showNotes = false;
    function render() {
      const s = DECK.slides[idx] || DECK.slides[0];
      document.getElementById('kicker').textContent = s.kicker || ('شريحة ' + (idx + 1));
      document.getElementById('heading').textContent = s.heading;
      const ul = document.getElementById('bullets');
      ul.innerHTML = (s.bulletPoints || []).map(b => '<li>' + b.replace(/</g,'&lt;') + '</li>').join('');
      const metricBox = document.getElementById('metricBox');
      const grid = document.getElementById('bodyGrid');
      if (s.highlightMetric) {
        metricBox.style.display = 'block';
        grid.classList.add('has-metric');
        document.getElementById('metricVal').textContent = s.highlightMetric;
        document.getElementById('metricLbl').textContent = s.highlightLabel || '';
      } else {
        metricBox.style.display = 'none';
        grid.classList.remove('has-metric');
      }
      const notesBox = document.getElementById('notesBox');
      notesBox.textContent = s.speakerNotes ? 'ملاحظات المتحدث: ' + s.speakerNotes : '';
      notesBox.className = 'notes' + (showNotes && s.speakerNotes ? ' show' : '');
      document.getElementById('counter').textContent = (idx + 1) + ' / ' + DECK.slides.length;
      document.getElementById('progFill').style.width = (((idx + 1) / DECK.slides.length) * 100) + '%';
    }
    document.getElementById('btnPrev').onclick = () => { idx = Math.max(0, idx - 1); render(); };
    document.getElementById('btnNext').onclick = () => { idx = Math.min(DECK.slides.length - 1, idx + 1); render(); };
    document.getElementById('btnNotes').onclick = () => { showNotes = !showNotes; render(); };
    document.getElementById('btnPrint').onclick = () => window.print();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === ' ') { idx = Math.min(DECK.slides.length - 1, idx + 1); render(); }
      if (e.key === 'ArrowRight') { idx = Math.max(0, idx - 1); render(); }
    });
    render();
  </script>
</body>
</html>`;
}

export function normalizeQuizData(
  raw: Partial<InteractiveQuizData>,
  fallbackTopic: string
): InteractiveQuizData {
  const qs: QuizQuestionItem[] = (Array.isArray(raw.questions) ? raw.questions : [])
    .slice(0, 10)
    .map((q) => {
      const options = Array.isArray(q?.options)
        ? q.options.map((o) => String(o || '').trim()).filter(Boolean).slice(0, 4)
        : [];
      const safeIdx = Math.min(
        Math.max(0, Number(q?.correctIndex) || 0),
        Math.max(0, options.length - 1)
      );
      return {
        question: String(q?.question || '').trim(),
        options,
        correctIndex: safeIdx,
        explanation: String(q?.explanation || 'إجابة صحيحة ومدعومة بالشرح العلمي.').trim(),
      };
    })
    .filter((q) => q.question.length > 4 && q.options.length >= 2);

  return {
    title: String(raw.title || `اختبار ذكي: ${fallbackTopic}`).trim().slice(0, 90),
    subtitle: String(raw.subtitle || 'اختبار تفاعلي فوري مع التصحيح والشرح').trim().slice(0, 140),
    questions: qs,
  };
}

export function buildInteractiveQuizHtml(quiz: InteractiveQuizData): string {
  const safeJson = JSON.stringify(quiz).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(quiz.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Cairo', 'Tajawal', system-ui, sans-serif; background: #0B101B; color: #F8FAFC; padding: 24px 16px; }
    .wrap { max-width: 760px; margin: 0 auto; }
    .card { background: #131B2D; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 26px; margin-bottom: 18px; }
    h1 { margin: 0 0 6px; font-size: 24px; color: #93C5FD; }
    .sub { margin: 0; color: #94A3B8; font-size: 13px; }
    .q-title { font-size: 18px; font-weight: 800; margin: 0 0 16px; line-height: 1.6; }
    .opt { display: block; width: 100%; text-align: right; margin-bottom: 10px; padding: 13px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #F1F5F9; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .opt:hover:not(:disabled) { border-color: #60A5FA; background: rgba(96,165,250,0.14); }
    .opt.correct { border-color: #22C55E; background: rgba(34,197,94,0.2); color: #BBF7D0; }
    .opt.wrong { border-color: #EF4444; background: rgba(239,68,68,0.2); color: #FECACA; }
    .exp { margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); font-size: 13px; color: #E0F2FE; line-height: 1.65; }
    .bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 13px; font-weight: 800; color: #F5C76B; font-variant-numeric: tabular-nums; }
    .btn { cursor: pointer; font-family: inherit; background: #2563EB; color: #fff; border: none; border-radius: 12px; padding: 11px 22px; font-size: 13px; font-weight: 800; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${escapeHtml(quiz.title)}</h1>
      <p class="sub">${escapeHtml(quiz.subtitle)}</p>
    </div>
    <div id="app"></div>
  </div>
  <script>
    const QUIZ = ${safeJson};
    let idx = 0, score = 0, answered = false;
    function render() {
      const root = document.getElementById('app');
      if (idx >= QUIZ.questions.length) {
        const pct = Math.round((score / Math.max(1, QUIZ.questions.length)) * 100);
        root.innerHTML = '<div class="card" style="text-align:center"><h2>النتيجة النهائية: ' + score + ' / ' + QUIZ.questions.length + ' (' + pct + '%)</h2><p class="sub" style="margin-bottom:18px">أحسنت! يمكنك إعادة الاختبار لتثبيت المعلومة.</p><button class="btn" id="retryBtn">إعادة الاختبار</button></div>';
        document.getElementById('retryBtn').onclick = () => { idx = 0; score = 0; answered = false; render(); };
        return;
      }
      const q = QUIZ.questions[idx];
      root.innerHTML = '<div class="card"><div class="bar"><span>السؤال ' + (idx + 1) + ' من ' + QUIZ.questions.length + '</span><span>النقاط: ' + score + '</span></div><div class="q-title">' + q.question.replace(/</g,'&lt;') + '</div><div id="opts"></div><div id="feedback"></div></div>';
      const optsEl = document.getElementById('opts');
      q.options.forEach((opt, oIdx) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.textContent = (oIdx + 1) + '. ' + opt;
        b.onclick = () => {
          if (answered) return;
          answered = true;
          const all = optsEl.querySelectorAll('button');
          all.forEach((btn, i) => {
            btn.disabled = true;
            if (i === q.correctIndex) btn.classList.add('correct');
            else if (i === oIdx) btn.classList.add('wrong');
          });
          if (oIdx === q.correctIndex) score++;
          const fb = document.getElementById('feedback');
          fb.innerHTML = '<div class="exp"><strong>التوضيح:</strong> ' + q.explanation.replace(/</g,'&lt;') + '</div><div style="margin-top:14px"><button class="btn" id="nextBtn">' + (idx + 1 < QUIZ.questions.length ? 'السؤال التالي ←' : 'عرض النتيجة النهائية') + '</button></div>';
          document.getElementById('nextBtn').onclick = () => { idx++; answered = false; render(); };
        };
        optsEl.appendChild(b);
      });
    }
    render();
  </script>
</body>
</html>`;
}
