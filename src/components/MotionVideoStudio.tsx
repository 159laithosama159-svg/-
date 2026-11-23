import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import {
  VIDEO_TEMPLATES,
  getTotalVideoDurationSec,
  getVideoCanvasDimensions,
  type MotionVideoProject,
  type MotionVideoScene,
  type VideoAspectRatio,
} from '../utils/motionVideoUtils';
import { generateAiAudioBrief, generateMotionVideoProject } from '../services/xtreamApi';
import { buildProxyImageUrl } from '../utils/aiSkillsRouter';

interface MotionVideoStudioProps {
  initialProject?: MotionVideoProject | null;
  brainContext: string;
  onProjectCreated?: (project: MotionVideoProject) => void;
  onClose?: () => void;
  onToast: (msg: string) => void;
}

function drawWrappedArabicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((ln, i) => {
    ctx.fillText(ln, x, startY + i * lineHeight);
  });
}

function renderMotionSceneFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: MotionVideoScene,
  sceneIndex: number,
  totalScenes: number,
  localProgress: number,
  globalTime: number,
  backdropImg?: HTMLImageElement | null
) {
  // Base cinematic gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, scene.bgDark);
  grad.addColorStop(1, '#070A12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Optional real internet photography backdrop with smooth Ken Burns zoom + measured dark scrim
  if (backdropImg && backdropImg.complete && backdropImg.naturalWidth > 0) {
    const zoom = 1.04 + localProgress * 0.08;
    const drawW = w * zoom;
    const drawH = h * zoom;
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(backdropImg, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
    ctx.restore();

    const scrim = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.85);
    scrim.addColorStop(0, 'rgba(9, 13, 22, 0.45)');
    scrim.addColorStop(1, 'rgba(6, 9, 16, 0.92)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
  }

  // Animated motion-graphics motifs
  ctx.save();
  if (scene.motionStyle === 'aurora_waves') {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 28) {
        const y =
          h * (0.46 + i * 0.1) +
          Math.sin(x * 0.006 + globalTime * (1.2 + i * 0.4) + i) * 58;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? `${scene.accentColor}22` : `${scene.secondaryColor}1e`;
      ctx.fill();
    }
  } else if (scene.motionStyle === 'geometric_grid') {
    ctx.strokeStyle = `${scene.accentColor}26`;
    ctx.lineWidth = 1.5;
    const step = 64;
    const offset = (globalTime * 42) % step;
    for (let x = -step; x < w + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset, h);
      ctx.stroke();
    }
    for (let y = -step; y < h + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.lineTo(w, y + offset);
      ctx.stroke();
    }
  } else if (scene.motionStyle === 'starfield_warp') {
    for (let i = 0; i < 65; i++) {
      const ang = (i * 137.5 * Math.PI) / 180;
      const dist = ((i * 23 + globalTime * 190) % (Math.max(w, h) * 0.65));
      const sx = w / 2 + Math.cos(ang) * dist;
      const sy = h / 2 + Math.sin(ang) * dist;
      const r = 1.2 + (dist / Math.max(w, h)) * 4;
      ctx.fillStyle = i % 3 === 0 ? scene.accentColor : '#E2E8F0';
      ctx.globalAlpha = Math.min(0.95, dist / 240);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // orbit_particles / golden_embers
    for (let i = 0; i < 36; i++) {
      const t = globalTime * (0.5 + (i % 5) * 0.15) + i * 1.1;
      const px = w * 0.5 + Math.cos(t) * (w * 0.38) * Math.sin(i * 0.7);
      const py = h * 0.5 + Math.sin(t * 1.15) * (h * 0.34);
      const rad = 2.5 + (i % 5) * 2.2;
      ctx.fillStyle = i % 2 === 0 ? scene.accentColor : scene.secondaryColor;
      ctx.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t));
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Luminous top accent bar + scene counter
  const barW = w * 0.16;
  ctx.fillStyle = scene.accentColor;
  ctx.fillRect((w - barW) / 2, h * 0.24, barW, 5);

  // Smooth fade-in / slide-up kinetic typography
  const enterAlpha = Math.min(1, localProgress * 4.2);
  const exitAlpha = localProgress > 0.85 ? Math.max(0, (1 - localProgress) / 0.15) : 1;
  const alpha = enterAlpha * exitAlpha;
  const slideY = (1 - Math.min(1, localProgress * 3.8)) * 26;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  const isPortrait = h > w;
  const headlineSize = isPortrait ? 56 : 64;
  const subSize = isPortrait ? 28 : 30;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#F8FAFC';
  ctx.font = `800 ${headlineSize}px "Segoe UI", Tahoma, Arial, sans-serif`;
  drawWrappedArabicText(ctx, scene.headline, w / 2, h * 0.44 + slideY, w * 0.82, headlineSize * 1.32);

  if (scene.subtitle) {
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#CBD5E1';
    ctx.font = `500 ${subSize}px "Segoe UI", Tahoma, Arial, sans-serif`;
    drawWrappedArabicText(ctx, scene.subtitle, w / 2, h * 0.62 + slideY, w * 0.78, subSize * 1.48);
  }
  ctx.restore();

  // Bottom progress track & subtle brand tag
  const progressRatio = (sceneIndex + localProgress) / Math.max(1, totalScenes);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(w * 0.08, h - 42, w * 0.84, 5);
  ctx.fillStyle = scene.accentColor;
  ctx.fillRect(w * 0.08, h - 42, w * 0.84 * progressRatio, 5);

  ctx.fillStyle = 'rgba(226,232,240,0.65)';
  ctx.font = '600 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`AETHERMIND AI · ${sceneIndex + 1}/${totalScenes}`, w * 0.08, h - 56);
}

export function MotionVideoStudio({
  initialProject,
  brainContext,
  onProjectCreated,
  onClose,
  onToast,
}: MotionVideoStudioProps) {
  const [prompt, setPrompt] = useState(VIDEO_TEMPLATES[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>(
    initialProject?.aspectRatio || '9:16'
  );
  const [includePhotos, setIncludePhotos] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<MotionVideoProject | null>(initialProject || null);

  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
      setAspectRatio(initialProject.aspectRatio);
      setElapsedSec(0);
      elapsedRef.current = 0;
    }
  }, [initialProject]);

  // Preload optional internet backdrop images safely via our same-origin CORS-safe proxy
  useEffect(() => {
    if (!project) return;
    imagesRef.current.clear();
    project.scenes.forEach((s) => {
      if (!s.backdropImageUrl) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Trigger clean repaint as soon as proxied photo arrives
        const canvas = canvasRef.current;
        if (!canvas || !project) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const idx = project.scenes.findIndex((x) => x.id === s.id);
        if (idx === 0 && elapsedRef.current < 0.2) {
          renderMotionSceneFrame(
            ctx,
            canvas.width,
            canvas.height,
            project.scenes[0],
            0,
            project.scenes.length,
            0.25,
            0.4,
            img
          );
        }
      };
      img.src = buildProxyImageUrl(s.backdropImageUrl);
      imagesRef.current.set(s.id, img);
    });
  }, [project]);

  const drawAtTime = useCallback(
    (tSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !project) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const total = getTotalVideoDurationSec(project);
      const clamped = Math.min(total, Math.max(0, tSec));
      let acc = 0;
      let activeScene = project.scenes[0];
      let activeIdx = 0;
      let localProg = 0;

      for (let i = 0; i < project.scenes.length; i++) {
        const sc = project.scenes[i];
        const dur = Math.max(2, sc.durationSec);
        if (clamped <= acc + dur || i === project.scenes.length - 1) {
          activeScene = sc;
          activeIdx = i;
          localProg = Math.min(1, Math.max(0, (clamped - acc) / dur));
          break;
        }
        acc += dur;
      }

      renderMotionSceneFrame(
        ctx,
        canvas.width,
        canvas.height,
        activeScene,
        activeIdx,
        project.scenes.length,
        localProg,
        clamped,
        imagesRef.current.get(activeScene.id) || null
      );
    },
    [project]
  );

  // Draw initial frame whenever project changes
  useEffect(() => {
    if (!project) return;
    drawAtTime(elapsedRef.current);
  }, [project, drawAtTime]);

  // Playback loop
  useEffect(() => {
    if (!playing || !project) return;
    const total = getTotalVideoDurationSec(project);
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      elapsedRef.current += dt;
      if (elapsedRef.current >= total) {
        elapsedRef.current = 0;
        setElapsedSec(0);
        setPlaying(false);
        drawAtTime(0);
        return;
      }
      setElapsedSec(elapsedRef.current);
      drawAtTime(elapsedRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, project, drawAtTime]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setPlaying(false);
    setVoiceAudioUrl(null);
    try {
      const next = await generateMotionVideoProject({
        prompt: prompt.trim(),
        aspectRatio,
        sceneCount: 4,
        includeInternetPhotos: includePhotos,
        brainContext,
      });
      setProject(next);
      elapsedRef.current = 0;
      setElapsedSec(0);
      onProjectCreated?.(next);
      onToast(`تم إخراج فيديو «${next.title}» (${next.scenes.length} مشاهد) — اضغط تشغيل أو تحميل .webm!`);
      setPlaying(true);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر توليد مشاهد الفيديو حالياً.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!project || voiceLoading) return;
    setVoiceLoading(true);
    try {
      const res = await generateAiAudioBrief({
        text: project.narrationFullScript,
        format: 'single',
        voice: 'Kore',
      });
      setVoiceAudioUrl(res.audioDataUrl);
      onToast('تم توليد التعليق الصوتي العصبي بنجاح! سيعمل بالتزامن مع تشغيل الفيديو.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'تعذّر توليد التعليق الصوتي.');
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleTogglePlay = () => {
    if (!project) return;
    if (playing) {
      setPlaying(false);
      audioElRef.current?.pause();
    } else {
      if (elapsedRef.current >= getTotalVideoDurationSec(project) - 0.1) {
        elapsedRef.current = 0;
        setElapsedSec(0);
      }
      setPlaying(true);
      if (voiceAudioUrl) {
        if (!audioElRef.current || audioElRef.current.src !== voiceAudioUrl) {
          audioElRef.current = new Audio(voiceAudioUrl);
        }
        audioElRef.current.currentTime = elapsedRef.current;
        void audioElRef.current.play().catch(() => {});
      }
    }
  };

  const handleExportWebm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !project || recording) return;
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      onToast('متصفحك لا يدعم تسجيل WebM المباشر — جرّب متصفح Chrome أو Edge.');
      return;
    }

    setRecording(true);
    setPlaying(false);
    elapsedRef.current = 0;
    setElapsedSec(0);

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_500_000 });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const donePromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      recorder.start();
      const total = getTotalVideoDurationSec(project);
      const startTs = performance.now();

      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const sec = (now - startTs) / 1000;
          elapsedRef.current = sec;
          setElapsedSec(Math.min(total, sec));
          drawAtTime(sec);
          if (sec >= total) {
            resolve();
          } else {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      });

      recorder.stop();
      const blob = await donePromise;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valdrion-video-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      onToast('تم تسجيل وتنزيل ملف الفيديو الحقيقي (.webm) بنجاح!');
    } catch {
      onToast('حدث خلل أثناء تصدير ملف الفيديو — حاول مرة أخرى.');
    } finally {
      setRecording(false);
    }
  };

  const dims = getVideoCanvasDimensions(project?.aspectRatio || aspectRatio);
  const totalSec = project ? getTotalVideoDurationSec(project) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#141824] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#60A5FA]/15 text-[#60A5FA]">
            <Film className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">استوديو إخراج الفيديو والريلز (.webm)</h3>
            <p className="text-xs text-[#94A3B8]">
              توليد مشاهد متحركة 60FPS + صور حقيقية من الإنترنت + تعليق صوتي + تنزيل ملف فيديو مجاناً 100%
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-[#1C2233] p-1.5 text-[#94A3B8] hover:text-white"
            aria-label="إغلاق استوديو الفيديو"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Templates */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {VIDEO_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => {
              setPrompt(tpl.prompt);
              setAspectRatio(tpl.aspectRatio);
            }}
            className="whitespace-nowrap rounded-lg border border-white/10 bg-[#0F131D] px-3 py-1.5 text-xs font-medium text-[#CBD5E1] transition-colors hover:border-[#60A5FA]/50 hover:text-white"
          >
            {tpl.label}
          </button>
        ))}
      </div>

      {/* Prompt + Controls */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="اكتب فكرة الفيديو أو الريلز الذي تريد إخراجه..."
          className="flex-1 rounded-xl border border-white/10 bg-[#0C0F17] px-4 py-2.5 text-sm text-white placeholder:text-[#64748B] focus:border-[#60A5FA] focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          {(['9:16', '16:9'] as VideoAspectRatio[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setAspectRatio(r)}
              className={`whitespace-nowrap rounded-xl border px-3 py-2.5 font-mono text-xs font-bold ${
                aspectRatio === r
                  ? 'border-[#60A5FA] bg-[#60A5FA]/15 text-white'
                  : 'border-white/10 bg-[#0C0F17] text-[#94A3B8]'
              }`}
            >
              {r === '9:16' ? 'ريلز 9:16' : 'يوتيوب 16:9'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIncludePhotos((v) => !v)}
            className={`whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-semibold ${
              includePhotos
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-[#0C0F17] text-[#94A3B8]'
            }`}
          >
            صور حية: {includePhotos ? 'نعم' : 'لا'}
          </button>
          <button
            type="button"
            disabled={generating || !prompt.trim()}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{generating ? 'جاري الإخراج...' : 'أخرج الفيديو'}</span>
          </button>
        </div>
      </div>

      {/* Live Canvas Stage & Export Controls */}
      {project && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3 lg:col-span-7">
            <canvas
              ref={canvasRef}
              width={dims.width}
              height={dims.height}
              className={`rounded-lg border border-white/10 shadow-xl ${
                project.aspectRatio === '9:16' ? 'h-[360px] w-auto' : 'w-full max-h-[340px]'
              }`}
            />

            <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  disabled={recording}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#1D4ED8]"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{playing ? 'إيقاف مؤقت' : 'تشغيل المعاينة'}</span>
                </button>
                <span className="font-mono text-xs tabular-nums text-[#94A3B8]">
                  {elapsedSec.toFixed(1)}s / {totalSec}s
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleGenerateVoiceover()}
                  disabled={voiceLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171C2A] px-3 py-2 text-xs font-semibold text-[#CBD5E1] hover:border-[#60A5FA]/50 hover:text-white"
                >
                  {voiceLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-[#60A5FA]" />
                  )}
                  <span>{voiceAudioUrl ? 'تم تجهيز الصوت' : 'تعليق صوتي AI'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportWebm()}
                  disabled={recording}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {recording ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>{recording ? 'جاري التسجيل...' : 'تحميل الفيديو .webm'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Storyboard Timeline */}
          <div className="space-y-2 overflow-y-auto lg:col-span-5 lg:max-h-[420px]">
            <div className="flex items-center justify-between text-xs font-bold text-[#CBD5E1]">
              <span className="inline-flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-[#60A5FA]" />
                <span>{project.title}</span>
              </span>
              <span className="font-mono text-[#94A3B8]">{project.scenes.length} مشاهد</span>
            </div>
            {project.scenes.map((sc, idx) => (
              <div
                key={sc.id}
                className="rounded-xl border border-white/[0.08] bg-[#0E121C] p-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {idx + 1}. {sc.headline}
                  </span>
                  <span className="font-mono text-[11px] text-[#60A5FA]">{sc.durationSec}s</span>
                </div>
                <p className="mt-1 text-xs text-[#94A3B8]">{sc.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
