import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  Check,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  Menu,
  MessageSquarePlus,
  PlugZap,
  Plus,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  Unlock,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import {
  decryptVaultPayload,
  encryptVaultPayload,
  isEncryptedVaultEnvelope,
  type EncryptedVaultEnvelope,
} from '../utils/privateVaultCrypto';
import {
  compileSovereignSystemInstruction,
  createDefaultVaultData,
  makeSovereignId,
  normalizeVaultData,
  QUICK_USER_RULE_PRESETS,
  runOfflineLocalMind,
  TONE_OPTIONS,
  validateLocalEndpointUrl,
  type CustomSovereignModel,
  type SovereignChatMessage,
  type SovereignConversation,
  type SovereignDepth,
  type SovereignEngineMode,
  type SovereignVaultData,
} from '../utils/sovereignAiEngine';
import {
  streamDirectLocalEndpointAi,
  streamZeroLogSovereignAi,
} from '../services/sovereignAiApi';
import { RichMarkdown } from './RichMarkdown';
import { BRAND_ASSETS } from '../data/showcaseCatalog';

const ENCRYPTED_VAULT_STORAGE_KEY = 'sovereign_private_vault_v1';

interface PrivateSovereignAiProps {
  onExitToHub: () => void;
  onSwitchToCinema?: () => void;
  onSwitchToNovels?: () => void;
  onToast: (msg: string) => void;
}

type WorkspaceView = 'chat' | 'architect';

function readStoredEnvelope(): EncryptedVaultEnvelope | null {
  try {
    const raw = localStorage.getItem(ENCRYPTED_VAULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isEncryptedVaultEnvelope(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function PrivateSovereignAi({
  onExitToHub,
  onSwitchToCinema,
  onSwitchToNovels,
  onToast,
}: PrivateSovereignAiProps) {
  const initialHasEncryptedVault = useMemo(() => Boolean(readStoredEnvelope()), []);

  // Cryptographic lock state
  const [vaultLocked, setVaultLocked] = useState<boolean>(initialHasEncryptedVault);
  const [hasEncryptedVault, setHasEncryptedVault] = useState<boolean>(initialHasEncryptedVault);
  const [activePassphrase, setActivePassphrase] = useState<string | null>(null);
  const [ghostMode, setGhostMode] = useState<boolean>(!initialHasEncryptedVault);

  // Lock screen / Passphrase setup form state
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [newPass1, setNewPass1] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [passSetupError, setPassSetupError] = useState('');
  const [showPassChars, setShowPassChars] = useState(false);
  const [confirmWipeStep, setConfirmWipeStep] = useState(false);

  // Vault Data (kept strictly in RAM; persisted ONLY when encrypted with user passphrase & ghostMode is OFF)
  const [vault, setVault] = useState<SovereignVaultData>(() => createDefaultVaultData());

  // Workspace UI State
  const [view, setView] = useState<WorkspaceView>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draftInput, setDraftInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom Rule, Training Studio & New Model state
  const [newRuleText, setNewRuleText] = useState('');
  const [trainPromptInput, setTrainPromptInput] = useState('');
  const [trainResponseInput, setTrainResponseInput] = useState('');
  const [newFactInput, setNewFactInput] = useState('');
  const [externalRequestCount, setExternalRequestCount] = useState(0);
  const [localPingState, setLocalPingState] = useState<{
    busy: boolean;
    status: 'idle' | 'ok' | 'error';
    message: string;
  }>({ busy: false, status: 'idle', message: '' });
  const [creatingNewModel, setCreatingNewModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelSubtitle, setNewModelSubtitle] = useState('');
  const [newModelPersona, setNewModelPersona] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeModel = useMemo<CustomSovereignModel>(() => {
    return (
      vault.models.find((m) => m.id === vault.activeModelId) ??
      vault.models[0] ??
      createDefaultVaultData().models[0]
    );
  }, [vault.models, vault.activeModelId]);

  const modelConversations = useMemo<SovereignConversation[]>(() => {
    return vault.conversations
      .filter((c) => c.modelId === activeModel.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [vault.conversations, activeModel.id]);

  const activeConversation = useMemo<SovereignConversation | null>(() => {
    return (
      modelConversations.find((c) => c.id === vault.activeConversationId) ??
      modelConversations[0] ??
      null
    );
  }, [modelConversations, vault.activeConversationId]);

  const activeRulesCount = useMemo(
    () => activeModel.rules.filter((r) => r.enabled && r.text.trim()).length,
    [activeModel.rules]
  );

  // Persist encrypted vault automatically ONLY when unlocked with a passphrase and Ghost Mode is OFF
  useEffect(() => {
    if (vaultLocked || ghostMode || !activePassphrase) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      encryptVaultPayload(vault, activePassphrase)
        .then((envelope) => {
          if (cancelled) return;
          localStorage.setItem(ENCRYPTED_VAULT_STORAGE_KEY, JSON.stringify(envelope));
          setHasEncryptedVault(true);
        })
        .catch(() => {
          // ignore transient write errors
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [vault, vaultLocked, ghostMode, activePassphrase]);

  // Auto-scroll chat
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeConversation?.messages.length, isStreaming, view]);

  // Keyboard shortcut Ctrl+Shift+L for instant lock
  const handleLockNow = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    if (!hasEncryptedVault && !activePassphrase) {
      setShowPassphraseModal(true);
      return;
    }
    setActivePassphrase(null);
    setVault(createDefaultVaultData());
    setDraftInput('');
    setUnlockInput('');
    setUnlockError('');
    setVaultLocked(true);
    onToast('تم قفل الخزنة ومسح البيانات المكشوفة من الذاكرة فوراً.');
  }, [hasEncryptedVault, activePassphrase, onToast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLockNow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleLockNow]);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const envelope = readStoredEnvelope();
    if (!envelope) {
      setVaultLocked(false);
      setHasEncryptedVault(false);
      return;
    }
    setUnlockBusy(true);
    try {
      const decrypted = await decryptVaultPayload<SovereignVaultData>(envelope, unlockInput);
      setVault(normalizeVaultData(decrypted));
      setActivePassphrase(unlockInput.trim());
      setGhostMode(false);
      setVaultLocked(false);
      setUnlockInput('');
      onToast('تم فك تشفير خزنتك السرية بنجاح.');
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'كلمة السر غير صحيحة.');
    } finally {
      setUnlockBusy(false);
    }
  };

  const handleSetupPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSetupError('');
    const p1 = newPass1.trim();
    const p2 = newPass2.trim();
    if (p1.length < 4) {
      setPassSetupError('يجب أن تتكون كلمة السر من 4 أحرف أو أرقام على الأقل.');
      return;
    }
    if (p1 !== p2) {
      setPassSetupError('كلمتا السر غير متطابقتين.');
      return;
    }
    try {
      const envelope = await encryptVaultPayload(vault, p1);
      localStorage.setItem(ENCRYPTED_VAULT_STORAGE_KEY, JSON.stringify(envelope));
      setActivePassphrase(p1);
      setHasEncryptedVault(true);
      setGhostMode(false);
      setShowPassphraseModal(false);
      setNewPass1('');
      setNewPass2('');
      onToast('تم تشفير خزنتك بـ AES-256-GCM بنجاح! لن يستطيع أحد قراءتها بدون كلمة سرك.');
    } catch (err) {
      setPassSetupError(err instanceof Error ? err.message : 'تعذّر إنشاء القفل المشفّر.');
    }
  };

  const handlePanicWipe = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    try {
      localStorage.removeItem(ENCRYPTED_VAULT_STORAGE_KEY);
    } catch {
      // ignore
    }
    setActivePassphrase(null);
    setHasEncryptedVault(false);
    setVaultLocked(false);
    setGhostMode(true);
    setVault(createDefaultVaultData());
    setDraftInput('');
    setChatError('');
    setConfirmWipeStep(false);
    onToast('تم مسح جميع النماذج والمحادثات والمفاتيح نهائياً من الجهاز.');
  };

  const updateActiveModel = (updater: (m: CustomSovereignModel) => CustomSovereignModel) => {
    setVault((prev) => ({
      ...prev,
      models: prev.models.map((m) => (m.id === activeModel.id ? updater(m) : m)),
    }));
  };

  const handleCreateCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newModelName.trim();
    if (!cleanName) return;

    const modelId = makeSovereignId('sov_model');
    const convId = makeSovereignId('sov_conv');
    const now = Date.now();

    const createdModel: CustomSovereignModel = {
      id: modelId,
      name: cleanName,
      subtitle: newModelSubtitle.trim() || 'نموذج خاص مخترع بقواعدي',
      personaPrompt:
        newModelPersona.trim() ||
        `أنت ${cleanName}، نموذج ذكاء اصطناعي شخصي مستقل تماماً بناه المستخدم لنفسه، تلتزم بقواعده وقيوده فقط.`,
      tone: 'direct',
      rules: [
        {
          id: makeSovereignId('rule'),
          text: 'أجب مباشرة في صلب الموضوع بدون مقدمات.',
          enabled: true,
        },
      ],
      knowledgeDocs: [],
      trainingPairs: [],
      learnedFacts: [],
      depth: 'balanced',
      createdAt: now,
    };

    const createdConv: SovereignConversation = {
      id: convId,
      modelId,
      title: `جلسة ${cleanName}`,
      messages: [],
      updatedAt: now,
    };

    setVault((prev) => ({
      ...prev,
      models: [createdModel, ...prev.models],
      conversations: [createdConv, ...prev.conversations],
      activeModelId: modelId,
      activeConversationId: convId,
    }));

    setNewModelName('');
    setNewModelSubtitle('');
    setNewModelPersona('');
    setCreatingNewModel(false);
    setView('architect');
    setSidebarOpen(false);
    onToast(`تم اختراع نموذجك الجديد «${cleanName}» — يمكنك الآن إضافة قواعدك الخاصة.`);
  };

  const handleDeleteModel = (modelId: string) => {
    if (vault.models.length <= 1) {
      onToast('يجب إبقاء نموذج واحد على الأقل داخل الخزنة.');
      return;
    }
    setVault((prev) => {
      const remainingModels = prev.models.filter((m) => m.id !== modelId);
      const remainingConvs = prev.conversations.filter((c) => c.modelId !== modelId);
      const nextModel = remainingModels[0];
      const nextConv =
        remainingConvs.find((c) => c.modelId === nextModel.id) ??
        ({
          id: makeSovereignId('sov_conv'),
          modelId: nextModel.id,
          title: 'جلسة خاصة جديدة',
          messages: [],
          updatedAt: Date.now(),
        } as SovereignConversation);
      return {
        ...prev,
        models: remainingModels,
        conversations: remainingConvs.some((c) => c.id === nextConv.id)
          ? remainingConvs
          : [nextConv, ...remainingConvs],
        activeModelId: nextModel.id,
        activeConversationId: nextConv.id,
      };
    });
  };

  const handleNewConversation = () => {
    const convId = makeSovereignId('sov_conv');
    const newConv: SovereignConversation = {
      id: convId,
      modelId: activeModel.id,
      title: 'جلسة خاصة جديدة',
      messages: [],
      updatedAt: Date.now(),
    };
    setVault((prev) => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
      activeConversationId: convId,
    }));
    setView('chat');
    setChatError('');
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (convId: string) => {
    setVault((prev) => {
      const remaining = prev.conversations.filter((c) => c.id !== convId);
      const forModel = remaining.filter((c) => c.modelId === activeModel.id);
      if (forModel.length === 0) {
        const fresh: SovereignConversation = {
          id: makeSovereignId('sov_conv'),
          modelId: activeModel.id,
          title: 'جلسة خاصة جديدة',
          messages: [],
          updatedAt: Date.now(),
        };
        return {
          ...prev,
          conversations: [fresh, ...remaining],
          activeConversationId: fresh.id,
        };
      }
      return {
        ...prev,
        conversations: remaining,
        activeConversationId:
          prev.activeConversationId === convId ? forModel[0].id : prev.activeConversationId,
      };
    });
  };

  const handleAddRule = (ruleText: string) => {
    const clean = ruleText.trim();
    if (!clean) return;
    if (activeModel.rules.some((r) => r.text.trim() === clean)) {
      onToast('هذه القاعدة موجودة بالفعل في نموذجك.');
      return;
    }
    updateActiveModel((m) => ({
      ...m,
      rules: [...m.rules, { id: makeSovereignId('rule'), text: clean, enabled: true }],
    }));
    setNewRuleText('');
  };

  const handleAddTrainingPair = (e: React.FormEvent) => {
    e.preventDefault();
    const p = trainPromptInput.trim();
    const r = trainResponseInput.trim();
    if (!p || !r) return;
    updateActiveModel((m) => ({
      ...m,
      trainingPairs: [
        { id: makeSovereignId('tp'), prompt: p, response: r, createdAt: Date.now() },
        ...m.trainingPairs,
      ],
    }));
    setTrainPromptInput('');
    setTrainResponseInput('');
    onToast('تم تدريب نموذجك المحلي وحفظ المثال داخل جهازك فقط.');
  };

  const handleAddLearnedFact = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFactInput.trim();
    if (!clean) return;
    updateActiveModel((m) => ({
      ...m,
      learnedFacts: [
        { id: makeSovereignId('fact'), fact: clean, createdAt: Date.now() },
        ...m.learnedFacts,
      ],
    }));
    setNewFactInput('');
    onToast('تم حفظ المعلومة في الذاكرة المحلية المشفّرة.');
  };

  const handleTestLocalEndpoint = async () => {
    const check = validateLocalEndpointUrl(vault.localEndpoint.url);
    if (!check.valid || !check.normalized) {
      setLocalPingState({
        busy: false,
        status: 'error',
        message: check.error || 'رابط الخادم المحلي غير صالح.',
      });
      return;
    }

    setLocalPingState({ busy: true, status: 'idle', message: 'جارٍ فحص الخادم على جهازك...' });
    try {
      const parsed = new URL(check.normalized);
      const probeUrl =
        vault.localEndpoint.format === 'ollama'
          ? `${parsed.origin}/api/tags`
          : `${parsed.origin}/v1/models`;
      const res = await fetch(probeUrl, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        models?: Array<{ name?: string }>;
        data?: Array<{ id?: string }>;
      };
      const detected =
        data.models?.map((m) => m.name).filter(Boolean) ??
        data.data?.map((m) => m.id).filter(Boolean) ??
        [];
      if (detected.length > 0 && detected[0]) {
        const firstModel = detected[0];
        setVault((prev) => ({
          ...prev,
          localEndpoint: { ...prev.localEndpoint, modelName: firstModel },
        }));
      }
      setLocalPingState({
        busy: false,
        status: 'ok',
        message:
          detected.length > 0
            ? `متصل بجهازك بنجاح! النماذج المتاحة محلياً: ${detected.slice(0, 4).join(' ، ')}`
            : 'تم الاتصال بخادمك المحلي بنجاح!',
      });
    } catch {
      setLocalPingState({
        busy: false,
        status: 'error',
        message:
          'لم يُعثر على Ollama أو LM Studio يعمل حالياً على جهازك. شغّل الأمر OLLAMA_ORIGINS=* ollama serve على حاسوبك ثم أعد الفحص.',
      });
    }
  };

  const handleUploadKnowledgeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 512_000) {
      onToast('الحد الأقصى لملف المعرفة المحلي 500 كيلوبايت للحفاظ على سرعة التشفير.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content.trim()) {
        onToast('الملف فارغ أو غير نصي.');
        return;
      }
      updateActiveModel((m) => ({
        ...m,
        knowledgeDocs: [
          ...m.knowledgeDocs,
          {
            id: makeSovereignId('doc'),
            name: file.name,
            content: content.slice(0, 60_000),
            addedAt: Date.now(),
          },
        ],
      }));
      onToast(`تمت إضافة «${file.name}» إلى ذاكرة النموذج المحلية المشفّرة فقط.`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSendMessage = async () => {
    const text = draftInput.trim();
    if (!text || isStreaming) return;

    setChatError('');
    setDraftInput('');

    let targetConvId = activeConversation?.id;
    let baseHistory: SovereignChatMessage[] = activeConversation?.messages ?? [];

    if (!targetConvId) {
      targetConvId = makeSovereignId('sov_conv');
      const freshConv: SovereignConversation = {
        id: targetConvId,
        modelId: activeModel.id,
        title: text.slice(0, 44),
        messages: [],
        updatedAt: Date.now(),
      };
      setVault((prev) => ({
        ...prev,
        conversations: [freshConv, ...prev.conversations],
        activeConversationId: targetConvId!,
      }));
      baseHistory = [];
    }

    const userMsg: SovereignChatMessage = {
      id: makeSovereignId('msg'),
      role: 'user',
      text,
      createdAt: Date.now(),
      engineUsed: vault.engineMode,
    };

    const assistantMsgId = makeSovereignId('msg');
    const assistantStub: SovereignChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      createdAt: Date.now(),
      engineUsed: vault.engineMode,
    };

    const convId = targetConvId;
    setVault((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => {
        if (c.id !== convId) return c;
        const nextTitle = c.messages.length === 0 ? text.slice(0, 46) : c.title;
        return {
          ...c,
          title: nextTitle,
          updatedAt: Date.now(),
          messages: [...c.messages, userMsg, assistantStub],
        };
      }),
    }));

    // Engine 1 (DEFAULT): 100% Built-From-Scratch Local In-Browser Mind (ZERO network traffic!)
    if (vault.engineMode === 'offline-browser') {
      const result = runOfflineLocalMind(activeModel, text, baseHistory);
      setVault((prev) => ({
        ...prev,
        models: prev.models.map((m) => {
          if (m.id !== activeModel.id) return m;
          let nextModel = m;
          if (result.newlyLearnedFact) {
            nextModel = {
              ...nextModel,
              learnedFacts: [
                {
                  id: makeSovereignId('fact'),
                  fact: result.newlyLearnedFact,
                  createdAt: Date.now(),
                },
                ...nextModel.learnedFacts,
              ],
            };
          }
          if (result.newlyTrainedPair) {
            nextModel = {
              ...nextModel,
              trainingPairs: [
                {
                  id: makeSovereignId('tp'),
                  prompt: result.newlyTrainedPair.prompt,
                  response: result.newlyTrainedPair.response,
                  createdAt: Date.now(),
                },
                ...nextModel.trainingPairs,
              ],
            };
          }
          return nextModel;
        }),
        conversations: prev.conversations.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, text: result.reply } : m
                ),
              }
        ),
      }));
      return;
    }

    const systemInstruction = compileSovereignSystemInstruction(activeModel);
    const historyForApi = [...baseHistory, userMsg].slice(-24).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    const appendDelta = (delta: string) => {
      setVault((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, text: m.text + delta } : m
                ),
              }
        ),
      }));
    };

    try {
      if (vault.engineMode === 'local-endpoint') {
        await streamDirectLocalEndpointAi(
          {
            endpoint: vault.localEndpoint,
            systemInstruction,
            messages: historyForApi,
          },
          { onDelta: appendDelta, signal: controller.signal }
        );
      } else {
        setExternalRequestCount((c) => c + 1);
        await streamZeroLogSovereignAi(
          {
            systemInstruction,
            messages: historyForApi,
            depth: activeModel.depth,
          },
          { onDelta: appendDelta, signal: controller.signal }
        );
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : 'تعذّر إكمال الاستجابة.';
        setChatError(msg);
        setVault((prev) => ({
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  messages: c.messages.filter(
                    (m) => !(m.id === assistantMsgId && !m.text.trim())
                  ),
                }
          ),
        }));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1600);
    } catch {
      onToast('تعذّر النسخ التلقائي.');
    }
  };

  const endpointCheck = useMemo(
    () => validateLocalEndpointUrl(vault.localEndpoint.url),
    [vault.localEndpoint.url]
  );

  // =========================================================================
  // SCREEN 1: ZERO-KNOWLEDGE LOCK SCREEN (Zero chat/model leakage until unlocked)
  // =========================================================================
  if (vaultLocked) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-[#090D16] px-4 py-10 text-slate-100"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار فالدريون"
              className="h-11 w-11 shrink-0 rounded-xl border border-[#F5C76B]/45 object-cover"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                VALDRION · خزنة الذكاء الخاص
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                تشفير محلي AES-256-GCM · لا أحد يستطيع قراءة محادثاتك بدون كلمة سرك
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlockVault} className="space-y-4">
            <div>
              <label
                htmlFor="vault-unlock-pass"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                كلمة سر الخزنة
              </label>
              <div className="relative">
                <input
                  id="vault-unlock-pass"
                  type={showPassChars ? 'text' : 'password'}
                  value={unlockInput}
                  onChange={(e) => setUnlockInput(e.target.value)}
                  placeholder="أدخل كلمة سرك لفك التشفير..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassChars((s) => !s)}
                  aria-label={showPassChars ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  {showPassChars ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {unlockError && (
                <p role="alert" className="mt-2 text-xs font-semibold text-red-400">
                  {unlockError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={unlockBusy || !unlockInput.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" aria-hidden="true" />
              <span>{unlockBusy ? 'جارٍ فك التشفير...' : 'فتح الخزنة السرية'}</span>
            </button>
          </form>

          <div className="mt-6 space-y-2.5 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={() => {
                setVault(createDefaultVaultData());
                setGhostMode(true);
                setActivePassphrase(null);
                setVaultLocked(false);
                onToast('دخلت بوضع الشبح المؤقت — لن يُحفظ أي حرف على الجهاز.');
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-amber-500/50 hover:text-amber-300"
            >
              دخول بجلسة شبح مؤقتة (بدون المساس بالخزنة المقفلة)
            </button>

            {!confirmWipeStep ? (
              <button
                type="button"
                onClick={() => setConfirmWipeStep(true)}
                className="w-full py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-red-400"
              >
                نسيت كلمة السر؟ مسح الخزنة والبدء من الصفر
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/40 bg-red-950/30 p-3">
                <span className="text-xs text-red-200">سيتم حذف الخزنة المشفّرة نهائياً</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePanicWipe}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-500"
                  >
                    تأكيد المسح
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWipeStep(false)}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: SOVEREIGN PRIVATE AI WORKSPACE (2-Panel Decoupled Layout)
  // =========================================================================
  const engineOptions: Array<{
    id: SovereignEngineMode;
    label: string;
    shortLabel: string;
    desc: string;
  }> = [
    {
      id: 'offline-browser',
      label: 'محلي من الصفر (0 إنترنت)',
      shortLabel: 'محلي 0 إنترنت',
      desc: 'مبني داخل جهازك 100% · لا OpenAI ولا Google · أنت تدرّبه وتضع قيوده',
    },
    {
      id: 'local-endpoint',
      label: 'جهازك المحلي (Ollama)',
      shortLabel: 'جهازك Ollama',
      desc: 'نموذج عصبي ضخم 100% على حاسوبك (0 بايت لأي شركة خارجية)',
    },
    {
      id: 'zero-log-cloud',
      label: 'سحابي خارجي (Google Gemini)',
      shortLabel: 'سحابي خارجي',
      desc: 'اختياري: يرسل الرسالة لخادم Google Gemini ويخضع لسياساتهم',
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0C1220]">
      {/* Sidebar Brand */}
      <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={BRAND_ASSETS.emblem}
            alt="شعار فالدريون"
            className="h-9 w-9 shrink-0 rounded-xl border border-[#F5C76B]/50 object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-imperial text-xs font-bold tracking-[0.14em] text-white">
              VALDRION
            </p>
            <p className="truncate text-[11px] text-[#F5C76B]">
              {ghostMode ? 'فالدريون · الخزنة (شبح)' : 'فالدريون · الخزنة المشفّرة'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق القائمة الجانبية"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Custom Invented AI Models */}
      <div className="border-b border-slate-800/80 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-400">
            نماذجي المخترعة ({vault.models.length})
          </span>
          <button
            type="button"
            onClick={() => {
              setCreatingNewModel(true);
              setView('architect');
              setSidebarOpen(false);
            }}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>اخترع ذكاءً</span>
          </button>
        </div>

        <div className="max-h-44 space-y-1 overflow-y-auto">
          {vault.models.map((m) => {
            const selected = m.id === activeModel.id;
            const rulesOn = m.rules.filter((r) => r.enabled).length;
            return (
              <div
                key={m.id}
                className={`group flex items-center justify-between rounded-xl border px-2.5 py-2 transition-colors ${
                  selected
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                    : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    const firstConv = vault.conversations.find((c) => c.modelId === m.id);
                    setVault((prev) => ({
                      ...prev,
                      activeModelId: m.id,
                      activeConversationId: firstConv?.id ?? prev.activeConversationId,
                    }));
                    setCreatingNewModel(false);
                    setSidebarOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-right"
                >
                  <Bot
                    className={`h-4 w-4 shrink-0 ${
                      selected ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{m.name}</p>
                    <p className="truncate text-[11px] text-slate-400 tabular-nums">
                      {rulesOn} قواعد · {m.knowledgeDocs.length} ملفات
                    </p>
                  </div>
                </button>
                {vault.models.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteModel(m.id)}
                    aria-label={`حذف النموذج ${m.name}`}
                    className="rounded-md p-1 text-slate-500 opacity-70 hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Private Conversations List */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-400">
            محادثات «{activeModel.name}»
          </span>
          <button
            type="button"
            onClick={handleNewConversation}
            aria-label="محادثة خاصة جديدة"
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>جديدة</span>
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {modelConversations.map((c) => {
            const isCurrent = activeConversation?.id === c.id && view === 'chat';
            return (
              <div
                key={c.id}
                className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors ${
                  isCurrent
                    ? 'bg-slate-800 font-bold text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setVault((prev) => ({ ...prev, activeConversationId: c.id }));
                    setView('chat');
                    setSidebarOpen(false);
                  }}
                  className="min-w-0 flex-1 truncate text-right"
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(c.id)}
                  aria-label={`حذف المحادثة ${c.title}`}
                  className="mr-1 rounded p-1 text-slate-500 opacity-60 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy Vault Controls Footer */}
      <div className="space-y-2 border-t border-slate-800/90 p-3">
        <button
          type="button"
          onClick={() => {
            if (activePassphrase) {
              handleLockNow();
            } else {
              setShowPassphraseModal(true);
            }
          }}
          className="flex w-full items-center justify-between rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
        >
          <span className="inline-flex items-center gap-2">
            {activePassphrase ? (
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{activePassphrase ? 'قفل الخزنة فوراً' : 'قفل وتشفير بكلمة سر'}</span>
          </span>
          <span className="font-mono text-[10px] text-emerald-400/80">AES-256</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setGhostMode((prev) => {
              const next = !prev;
              if (next) {
                onToast('وضع الشبح مفعّل: محادثاتك في الذاكرة المؤقتة فقط ولا يُحفظ شيء.');
              } else if (!activePassphrase) {
                setShowPassphraseModal(true);
              } else {
                onToast('تم تفعيل الحفظ المحلي المشفّر داخل جهازك.');
              }
              return next;
            });
          }}
          aria-pressed={ghostMode}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            ghostMode
              ? 'border-amber-500/45 bg-amber-500/10 text-amber-300'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            <span>وضع الشبح (بلا حفظ)</span>
          </span>
          <span>{ghostMode ? 'مفعّل' : 'متوقف'}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setVault((prev) => {
              const nextIso = !prev.isolatedMode;
              onToast(
                nextIso
                  ? 'تم العزل الكامل — هذا التطبيق مستقل تماماً الآن.'
                  : 'يمكنك الآن الرجوع للمنصة الرئيسية متى شئت.'
              );
              return { ...prev, isolatedMode: nextIso };
            })
          }
          aria-pressed={vault.isolatedMode}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
            vault.isolatedMode
              ? 'border-sky-500/45 bg-sky-500/10 text-sky-300'
              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>عزل تام (بدون أي روابط)</span>
          </span>
          <span>{vault.isolatedMode ? 'معزول' : 'مرن'}</span>
        </button>

        {!confirmWipeStep ? (
          <button
            type="button"
            onClick={() => setConfirmWipeStep(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>مسح فوري لكل شيء</span>
          </button>
        ) : (
          <div className="rounded-xl border border-red-500/45 bg-red-950/30 p-2.5 text-center">
            <p className="mb-2 text-[11px] font-semibold text-red-200">
              تأكيد مسح كل النماذج والمحادثات؟
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handlePanicWipe}
                className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-500"
              >
                امسح الآن
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipeStep(false)}
                className="flex-1 rounded-lg border border-slate-700 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden bg-[#090D16] text-slate-100">
      {/* Desktop Fixed Sidebar */}
      <aside
        aria-label="قائمة خزنة الذكاء الخاص"
        className="hidden w-72 shrink-0 border-l border-slate-800/90 lg:block"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="relative z-10 w-72 max-w-[85vw] border-l border-slate-800 bg-[#0C1220] shadow-2xl">
            {sidebarContent}
          </div>
          <button
            type="button"
            aria-label="إغلاق الخلفية"
            onClick={() => setSidebarOpen(false)}
            className="flex-1 bg-black/65 backdrop-blur-xs"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean Single-Line Top Bar (Zero Overflow on 390px) */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800/90 bg-[#0B101C] px-3 sm:px-5">
          {/* Left/Right-Start: Menu + Active Model */}
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="فتح قائمة النماذج والخصوصية"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={BRAND_ASSETS.emblem}
                alt="شعار فالدريون"
                className="h-7 w-7 shrink-0 rounded-lg border border-[#F5C76B]/45 object-cover lg:hidden"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-bold text-white sm:text-base">
                    {activeModel.name}
                  </h1>
                  <span className="hidden text-xs text-slate-500 sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="hidden truncate text-xs text-slate-400 sm:inline tabular-nums">
                    قيودك النشطة: {activeRulesCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Workspace Switch (Chat vs Architect/Rules) */}
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-800 bg-[#090D16] p-0.5">
            <button
              type="button"
              onClick={() => {
                setView('chat');
                setCreatingNewModel(false);
              }}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                view === 'chat'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              المحادثة
            </button>
            <button
              type="button"
              onClick={() => {
                setView('architect');
                setCreatingNewModel(false);
              }}
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                view === 'architect'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">قواعدي والتدريب</span>
              <span className="sm:hidden">التدريب</span>
            </button>
          </div>

          {/* End: Lock + Optional Exit */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleLockNow}
              aria-label={activePassphrase ? 'قفل الخزنة فوراً' : 'إنشاء قفل سري للخزنة'}
              title={activePassphrase ? 'قفل الخزنة (Ctrl+Shift+L)' : 'تشفير الخزنة بكلمة سر'}
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">
                {activePassphrase ? 'قفل الآن' : 'تشفير الخزنة'}
              </span>
            </button>

            {!vault.isolatedMode && (
              <>
                {onSwitchToCinema && (
                  <button
                    type="button"
                    onClick={onSwitchToCinema}
                    className="hidden h-9 items-center whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-400/50 hover:text-white lg:inline-flex"
                  >
                    السينما
                  </button>
                )}
                {onSwitchToNovels && (
                  <button
                    type="button"
                    onClick={onSwitchToNovels}
                    className="hidden h-9 items-center whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-400/50 hover:text-white lg:inline-flex"
                  >
                    الروايات
                  </button>
                )}
                <button
                  type="button"
                  onClick={onExitToHub}
                  aria-label="العودة إلى فالدريون AI"
                  title="فالدريون — الذكاء والقائد الشامل"
                  className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">الذكاء AI</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* Sub-bar: Engine Selector (3 Honest Execution Modes) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 bg-[#0A0F1B] px-3 py-2 sm:px-5">
          <div
            role="radiogroup"
            aria-label="اختيار محرك التشغيل"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {engineOptions.map((eng) => {
              const active = vault.engineMode === eng.id;
              return (
                <button
                  key={eng.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() =>
                    setVault((prev) => ({
                      ...prev,
                      engineMode: eng.id,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? eng.id === 'zero-log-cloud'
                        ? 'border-amber-500/55 bg-amber-500/15 text-amber-200'
                        : 'border-emerald-500/55 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-800 bg-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {eng.id === 'offline-browser' ? (
                    <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : eng.id === 'local-endpoint' ? (
                    <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="sm:hidden">{eng.shortLabel}</span>
                  <span className="hidden sm:inline">{eng.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
            <span>{engineOptions.find((e) => e.id === vault.engineMode)?.desc}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400">
              طلبات خارجية: {externalRequestCount}
            </span>
          </div>
        </div>

        {/* Transparent Warning Banner ONLY when user explicitly opts into External Cloud */}
        {vault.engineMode === 'zero-log-cloud' && (
          <div
            role="note"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-950/30 px-4 py-2 text-xs text-amber-200"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>
                تنبيه شفاف: هذا الوضع الاختياري يتصل بخادم Google Gemini الخارجي (وليس OpenAI) ويخضع لسياساتهم. للسرية المطلقة 100% بدون أي خادم خارجي، عُد إلى «محلي من الصفر» أو «جهازك المحلي Ollama».
              </span>
            </span>
            <button
              type="button"
              onClick={() => setVault((prev) => ({ ...prev, engineMode: 'offline-browser' }))}
              className="whitespace-nowrap rounded-lg border border-emerald-500/50 bg-emerald-600/20 px-2.5 py-1 font-bold text-emerald-200 hover:bg-emerald-600 hover:text-white"
            >
              العودة للمحلي (0 إنترنت)
            </button>
          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW A: MODEL ARCHITECT & CUSTOM USER RULES STUDIO              */}
        {/* =============================================================== */}
        {view === 'architect' ? (
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-4xl space-y-8">
              {/* Create Brand-New Custom AI Form */}
              {creatingNewModel ? (
                <section className="rounded-2xl border border-emerald-500/35 bg-[#111827] p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">اخترع نموذج ذكاء جديداً لك</h2>
                      <p className="mt-1 text-xs text-slate-400">
                        سمّه كما تريد، حدّد شخصيته، وضع قيودك وقواعدك الخاصة بك وحدك.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreatingNewModel(false)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>

                  <form onSubmit={handleCreateCustomModel} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="new-ai-name"
                          className="mb-1.5 block text-xs font-semibold text-slate-300"
                        >
                          اسم الذكاء الجديد
                        </label>
                        <input
                          id="new-ai-name"
                          type="text"
                          required
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                          placeholder="مثال: عقل ليث، شبح البرمجة، المستشار الخاص..."
                          className="w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new-ai-subtitle"
                          className="mb-1.5 block text-xs font-semibold text-slate-300"
                        >
                          وصف قصير (اختياري)
                        </label>
                        <input
                          id="new-ai-subtitle"
                          type="text"
                          value={newModelSubtitle}
                          onChange={(e) => setNewModelSubtitle(e.target.value)}
                          placeholder="مثال: مساعدي السري للأفكار والبرمجة"
                          className="w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="new-ai-persona"
                        className="mb-1.5 block text-xs font-semibold text-slate-300"
                      >
                        هوية الذكاء وتعليماته الأساسية (بأسلوبك أنت)
                      </label>
                      <textarea
                        id="new-ai-persona"
                        rows={4}
                        value={newModelPersona}
                        onChange={(e) => setNewModelPersona(e.target.value)}
                        placeholder="اشرح له كيف تريد أن يفكر ويتكلم ويتصرف معك..."
                        className="w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>إنشاء النموذج والبدء فوراً</span>
                    </button>
                  </form>
                </section>
              ) : (
                <>
                  {/* Header + Create Button */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        هندسة «{activeModel.name}» وقواعدك الخاصة
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">
                        هذا النموذج ملكك وحدك · صفر ارتباط بالسينما أو الروايات · التعديلات تُطبَّق فوراً
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCreatingNewModel(true)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500/60 hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>اخترع نموذجاً آخر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setView('chat')}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                      >
                        <span>العودة للمحادثة</span>
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Identity & Persona */}
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-200">
                      01. هوية النموذج وأسلوبه
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="edit-ai-name"
                          className="mb-1.5 block text-xs font-semibold text-slate-400"
                        >
                          اسم النموذج
                        </label>
                        <input
                          id="edit-ai-name"
                          type="text"
                          value={activeModel.name}
                          onChange={(e) =>
                            updateActiveModel((m) => ({ ...m, name: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edit-ai-depth"
                          className="mb-1.5 block text-xs font-semibold text-slate-400"
                        >
                          عمق التفكير
                        </label>
                        <select
                          id="edit-ai-depth"
                          value={activeModel.depth}
                          onChange={(e) =>
                            updateActiveModel((m) => ({
                              ...m,
                              depth: e.target.value as SovereignDepth,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                        >
                          <option value="fast">سريع وفوري</option>
                          <option value="balanced">متوازن</option>
                          <option value="deep">تحليل عميق</option>
                          <option value="max">أقصى عمق (XHIGH)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className="mb-2 block text-xs font-semibold text-slate-400">
                        نبرة الرد
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {TONE_OPTIONS.map((t) => {
                          const selected = activeModel.tone === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateActiveModel((m) => ({ ...m, tone: t.id }))}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                selected
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                                  : 'border-slate-800 bg-[#111827] text-slate-400 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="edit-ai-persona"
                        className="mb-1.5 block text-xs font-semibold text-slate-400"
                      >
                        الدستور الأساسي للنموذج (System Blueprint)
                      </label>
                      <textarea
                        id="edit-ai-persona"
                        rows={4}
                        value={activeModel.personaPrompt}
                        onChange={(e) =>
                          updateActiveModel((m) => ({ ...m, personaPrompt: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </section>

                  {/* Section 2: User's Own Custom Rules ("قيودك وقواعدك أنت فقط") */}
                  <section className="space-y-4 border-t border-slate-800 pt-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        02. قيودك وقواعدك الخاصة بك أنت فقط
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        أنت من تضع القواعد هنا وتتحكم بتفعيل أو إيقاف كل قيد بحرية تامة.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddRule(newRuleText);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        aria-label="أضف قاعدة أو قيداً جديداً"
                        value={newRuleText}
                        onChange={(e) => setNewRuleText(e.target.value)}
                        placeholder="اكتب أي قاعدة أو قيد تريده... مثلاً: لا تطيل الإجابة، تكلم بالعامية الأردنية..."
                        className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!newRuleText.trim()}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-45"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>أضف القاعدة</span>
                      </button>
                    </form>

                    {/* Quick User Rule Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_USER_RULE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddRule(preset)}
                          className="rounded-lg border border-slate-800 bg-[#0E1525] px-2.5 py-1.5 text-right text-xs text-slate-300 transition-colors hover:border-emerald-500/45 hover:text-white"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    {/* Active Rules List */}
                    <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#111827]">
                      {activeModel.rules.length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-500">
                          لم تُضف أي قيود بعد — النموذج مفتوح تماماً وفق هويته الأساسية.
                        </p>
                      ) : (
                        activeModel.rules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={rule.enabled}
                              onClick={() =>
                                updateActiveModel((m) => ({
                                  ...m,
                                  rules: m.rules.map((r) =>
                                    r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                                  ),
                                }))
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-right"
                            >
                              <span
                                className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                                  rule.enabled ? 'bg-emerald-600 justify-start' : 'bg-slate-700 justify-end'
                                }`}
                              >
                                <span className="h-4 w-4 rounded-full bg-white" />
                              </span>
                              <span
                                className={`text-sm ${
                                  rule.enabled
                                    ? 'text-slate-100'
                                    : 'text-slate-500 line-through'
                                }`}
                              >
                                {rule.text}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateActiveModel((m) => ({
                                  ...m,
                                  rules: m.rules.filter((r) => r.id !== rule.id),
                                }))
                              }
                              aria-label={`حذف القاعدة: ${rule.text}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Section 3: Private Encrypted Knowledge Docs */}
                  <section className="space-y-4 border-t border-slate-800 pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-200">
                          03. ملفات المعرفة السرية المحلية
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          تُحفظ مشفّرة على جهازك فقط — لا تُرفع لأي قاعدة بيانات سحابية.
                        </p>
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md,.json,.csv"
                          onChange={handleUploadKnowledgeFile}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-emerald-500/60 hover:text-white"
                        >
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>إرفاق ملف سري (.txt / .md)</span>
                        </button>
                      </div>
                    </div>

                    {activeModel.knowledgeDocs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 bg-[#0D1322] p-5 text-center text-xs text-slate-500">
                        لا توجد ملفات معرفة مرفقة بعد. ارفع ملاحظاتك أو مستنداتك الخاصة ليستخدمها
                        نموذجك في الإجابات (حتى في وضع الأوفلاين الكامل).
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#111827]">
                        {activeModel.knowledgeDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-100">
                                  {doc.name}
                                </p>
                                <p className="text-[11px] text-slate-500 tabular-nums">
                                  {doc.content.length.toLocaleString('ar-EG')} حرف · محلي مشفّر
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateActiveModel((m) => ({
                                  ...m,
                                  knowledgeDocs: m.knowledgeDocs.filter((d) => d.id !== doc.id),
                                }))
                              }
                              aria-label={`حذف الملف ${doc.name}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Section 4: Local 100% Own Server (Ollama / LM Studio) */}
                  <section className="space-y-4 border-t border-slate-800 pt-6 pb-8">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        04. ربط نموذج محلي على حاسوبك 100% (Ollama / LM Studio)
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        للخصوصية المطلقة دون إرسال أي حرف عبر الإنترنت — المتصفح يتصل مباشرة
                        بجهازك المحلي فقط.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-800 bg-[#111827] p-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="local-endpoint-url"
                          className="mb-1.5 block text-xs font-semibold text-slate-400"
                        >
                          رابط الخادم المحلي
                        </label>
                        <input
                          id="local-endpoint-url"
                          type="url"
                          dir="ltr"
                          value={vault.localEndpoint.url}
                          onChange={(e) =>
                            setVault((prev) => ({
                              ...prev,
                              localEndpoint: { ...prev.localEndpoint, url: e.target.value },
                            }))
                          }
                          placeholder="http://127.0.0.1:11434/api/chat"
                          className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500"
                        />
                        {!endpointCheck.valid && (
                          <p className="mt-1.5 text-xs text-red-400">{endpointCheck.error}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="local-model-name"
                          className="mb-1.5 block text-xs font-semibold text-slate-400"
                        >
                          اسم النموذج المحلي
                        </label>
                        <input
                          id="local-model-name"
                          type="text"
                          dir="ltr"
                          value={vault.localEndpoint.modelName}
                          onChange={(e) =>
                            setVault((prev) => ({
                              ...prev,
                              localEndpoint: { ...prev.localEndpoint, modelName: e.target.value },
                            }))
                          }
                          placeholder="llama3.2 / qwen2.5"
                          className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setVault((prev) => ({
                                ...prev,
                                localEndpoint: {
                                  ...prev.localEndpoint,
                                  format: 'ollama',
                                  url: 'http://127.0.0.1:11434/api/chat',
                                },
                              }))
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              vault.localEndpoint.format === 'ollama'
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                                : 'border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            صيغة Ollama
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVault((prev) => ({
                                ...prev,
                                localEndpoint: {
                                  ...prev.localEndpoint,
                                  format: 'openai',
                                  url: 'http://127.0.0.1:1234/v1/chat/completions',
                                },
                              }))
                            }
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              vault.localEndpoint.format === 'openai'
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                                : 'border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            صيغة LM Studio (محلي)
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleTestLocalEndpoint()}
                            disabled={localPingState.busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {localPingState.busy ? 'جارٍ الفحص...' : 'فحص الاتصال بجهازك الآن'}
                            </span>
                          </button>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400" dir="ltr">
                          OLLAMA_ORIGINS=* ollama serve
                        </span>
                      </div>

                      {localPingState.message && (
                        <p
                          role="status"
                          className={`sm:col-span-3 text-xs font-semibold ${
                            localPingState.status === 'ok'
                              ? 'text-emerald-400'
                              : localPingState.status === 'error'
                              ? 'text-amber-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {localPingState.message}
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Section 5: Train Your Own Local Brain (Custom Q&A Pairs + Learned Facts) */}
                  <section className="space-y-4 border-t border-slate-800 pt-6 pb-8">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
                        <Brain className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        <span>05. مختبر تدريب ذكائك الخاص بيدك (محلي 100% — 0 إنترنت)</span>
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        درّب نموذجك على أسئلة وأجوبة مخصّصة وحقائق شخصية؛ تُحفظ مشفّرة على جهازك فقط ويستخدمها فوراً بلا أي شركة خارجية.
                      </p>
                    </div>

                    {/* Train Q&A Form */}
                    <form
                      onSubmit={handleAddTrainingPair}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-[#111827] p-4 sm:grid-cols-2"
                    >
                      <div>
                        <label
                          htmlFor="train-q-input"
                          className="mb-1 block text-xs font-semibold text-slate-400"
                        >
                          عندما أسأل أو أكتب:
                        </label>
                        <input
                          id="train-q-input"
                          type="text"
                          value={trainPromptInput}
                          onChange={(e) => setTrainPromptInput(e.target.value)}
                          placeholder="مثال: شو خطة اليوم؟"
                          className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="train-a-input"
                          className="mb-1 block text-xs font-semibold text-slate-400"
                        >
                          أجبني بهذا الرد المعتمد:
                        </label>
                        <input
                          id="train-a-input"
                          type="text"
                          value={trainResponseInput}
                          onChange={(e) => setTrainResponseInput(e.target.value)}
                          placeholder="مثال: التركيز الكامل على مشروعي السري بدون تشتيت"
                          className="w-full rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={!trainPromptInput.trim() || !trainResponseInput.trim()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-45"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>حفظ مثال التدريب محلياً</span>
                        </button>
                      </div>
                    </form>

                    {activeModel.trainingPairs.length > 0 && (
                      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#111827]">
                        {activeModel.trainingPairs.map((pair) => (
                          <div
                            key={pair.id}
                            className="flex items-start justify-between gap-3 px-4 py-3 text-xs"
                          >
                            <div className="min-w-0 space-y-1">
                              <p className="font-bold text-emerald-300">س: {pair.prompt}</p>
                              <p className="text-slate-200">ج: {pair.response}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateActiveModel((m) => ({
                                  ...m,
                                  trainingPairs: m.trainingPairs.filter((t) => t.id !== pair.id),
                                }))
                              }
                              aria-label={`حذف التدريب ${pair.prompt}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Learned Facts Quick Add */}
                    <form onSubmit={handleAddLearnedFact} className="flex gap-2">
                      <input
                        type="text"
                        aria-label="أضف حقيقة أو ذكرى محلية"
                        value={newFactInput}
                        onChange={(e) => setNewFactInput(e.target.value)}
                        placeholder="علّمه حقيقة جديدة... مثلاً: اسم مشروعي السري فجر، ميزانيته 5000..."
                        className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!newFactInput.trim()}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-500/45 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-600 hover:text-white disabled:opacity-45"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>احفظ للذاكرة</span>
                      </button>
                    </form>

                    {activeModel.learnedFacts.length > 0 && (
                      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#111827]">
                        {activeModel.learnedFacts.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
                          >
                            <span className="text-slate-200">{f.fact}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateActiveModel((m) => ({
                                  ...m,
                                  learnedFacts: m.learnedFacts.filter((x) => x.id !== f.id),
                                }))
                              }
                              aria-label={`حذف الحقيقة ${f.fact}`}
                              className="rounded p-1 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </main>
        ) : (
          /* =============================================================== */
          /* VIEW B: SOVEREIGN PRIVATE CHAT ROOM                             */
          /* =============================================================== */
          <main className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
              <div className="mx-auto max-w-3xl space-y-6">
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <div className="py-10 text-center sm:py-16">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-400">
                      <Shield className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {activeModel.name}
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                      {activeModel.subtitle}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                      <span>
                        {vault.engineMode === 'offline-browser'
                          ? 'محلي 100% من الصفر · 0 بايت إنترنت'
                          : vault.engineMode === 'local-endpoint'
                          ? 'جهازك المحلي Ollama · بدون شركات خارجية'
                          : 'سحابي خارجي (Google Gemini)'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {ghostMode ? 'وضع الشبح · بدون حفظ' : 'مشفر محلياً AES-256'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {activeModel.trainingPairs.length} تدريب · {activeModel.learnedFacts.length} حقيقة
                      </span>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingNewModel(true);
                          setView('architect');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>اخترع نموذج ذكاء جديد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingNewModel(false);
                          setView('architect');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#111827] px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-white"
                      >
                        <Settings2 className="h-4 w-4" aria-hidden="true" />
                        <span>قواعدي وتدريب ذكائي</span>
                      </button>
                      {!activePassphrase && (
                        <button
                          type="button"
                          onClick={() => setShowPassphraseModal(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                          <span>أنشئ كلمة سر للخزنة</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  activeConversation.messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <article
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-start' : 'items-stretch'}`}
                      >
                        <div
                          className={`max-w-full rounded-2xl border px-4 py-3.5 text-sm leading-relaxed ${
                            isUser
                              ? 'border-emerald-500/35 bg-emerald-950/35 text-slate-100 sm:max-w-[85%]'
                              : 'border-slate-800 bg-[#111827] text-slate-100'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <span className="font-bold text-slate-300">
                              {isUser ? 'أنت' : activeModel.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              aria-label="نسخ النص"
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-200"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">نُسخ</span>
                                </>
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          ) : msg.text ? (
                            <RichMarkdown content={msg.text} />
                          ) : (
                            <span className="text-xs text-slate-400">جارٍ التفكير بصمت...</span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}

                {chatError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs font-semibold text-red-200"
                  >
                    {chatError}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-slate-800/90 bg-[#0B101C] px-3 py-3 sm:px-6">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-2xl border border-slate-800 bg-[#111827] p-2 focus-within:border-emerald-500/60">
                  <textarea
                    rows={1}
                    aria-label="اكتب رسالتك السرية هنا"
                    value={draftInput}
                    onChange={(e) => setDraftInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    placeholder={`اكتب رسالتك لـ «${activeModel.name}»...`}
                    className="max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-6 text-white placeholder-slate-500 outline-none"
                  />
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={() => abortRef.current?.abort()}
                      aria-label="إيقاف التوليد"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-500"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!draftInput.trim()}
                      onClick={() => void handleSendMessage()}
                      aria-label="إرسال الرسالة"
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: SET VAULT ENCRYPTION PASSPHRASE (AES-256-GCM)              */}
      {/* ================================================================= */}
      {showPassphraseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-pass-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#111827] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="setup-pass-title" className="text-base font-bold text-white">
                تشفير وقفل الخزنة بكلمة سر
              </h2>
              <button
                type="button"
                onClick={() => setShowPassphraseModal(false)}
                aria-label="إغلاق النافذة"
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-400">
              ستُشفَّر جميع نماذجك ومحادثاتك وملفاتك محلياً بتشفير AES-256-GCM داخل جهازك فقط. لا
              تُرسل كلمة السر لأي خادم ولا يمكن لأي شخص فتح المحادثة بدونها.
            </p>
            <form onSubmit={handleSetupPassphrase} className="space-y-3">
              <div>
                <label
                  htmlFor="setup-pass-1"
                  className="mb-1 block text-xs font-semibold text-slate-300"
                >
                  كلمة السر الجديدة (4 أحرف أو أرقام على الأقل)
                </label>
                <input
                  id="setup-pass-1"
                  type="password"
                  value={newPass1}
                  onChange={(e) => setNewPass1(e.target.value)}
                  placeholder="أدخل كلمة سر قوية..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="setup-pass-2"
                  className="mb-1 block text-xs font-semibold text-slate-300"
                >
                  تأكيد كلمة السر
                </label>
                <input
                  id="setup-pass-2"
                  type="password"
                  value={newPass2}
                  onChange={(e) => setNewPass2(e.target.value)}
                  placeholder="أعد إدخال كلمة السر..."
                  className="w-full rounded-xl border border-slate-700 bg-[#090D16] px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                />
              </div>
              {passSetupError && (
                <p role="alert" className="text-xs font-semibold text-red-400">
                  {passSetupError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPassphraseModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>حفظ وتشفير الآن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
