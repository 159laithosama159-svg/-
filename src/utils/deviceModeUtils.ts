export type DevicePlatformMode = 'desktop' | 'mobile' | 'tv';

export interface DeviceModeCapabilities {
  mode: DevicePlatformMode;
  labelAr: string;
  shortLabelAr: string;
  descriptionAr: string;
  /** Smart TV focuses strictly on Cinema (movies, series, live TV) for maximum speed */
  isCinemaOnly: boolean;
  showNovels: boolean;
  showAiStudio: boolean;
  showPrivateVault: boolean;
  showFloatingDock: boolean;
  lightweightTvMode: boolean;
  useBottomNav: boolean;
}

const STORAGE_KEY = 'valdrion_device_mode_v1';

export const DEVICE_CAPABILITIES: Record<DevicePlatformMode, DeviceModeCapabilities> = {
  desktop: {
    mode: 'desktop',
    labelAr: 'كمبيوتر / لابتوب',
    shortLabelAr: 'كمبيوتر',
    descriptionAr: 'النسخة الكاملة: سينما + روايات 4D + القائد الذكي الشامل + الخزنة + درع الأمان',
    isCinemaOnly: false,
    showNovels: true,
    showAiStudio: true,
    showPrivateVault: true,
    showFloatingDock: true,
    lightweightTvMode: false,
    useBottomNav: false,
  },
  mobile: {
    mode: 'mobile',
    labelAr: 'هاتف / تابلت',
    shortLabelAr: 'هاتف',
    descriptionAr: 'واجهة لمسية سريعة مع شريط تنقل سفلي مريح للسينما والروايات 4D والذكاء',
    isCinemaOnly: false,
    showNovels: true,
    showAiStudio: true,
    showPrivateVault: true,
    showFloatingDock: true,
    lightweightTvMode: false,
    useBottomNav: true,
  },
  tv: {
    mode: 'tv',
    labelAr: 'تلفزيون (Smart TV)',
    shortLabelAr: 'تلفزيون',
    descriptionAr: 'وضع السينما الخفيف فقط: أفلام ومسلسلات وبث مباشر بلا تقطيع مع دعم أسهم الريموت (يخفي الروايات والأدوات الثقيلة)',
    isCinemaOnly: true,
    showNovels: false,
    showAiStudio: false,
    showPrivateVault: false,
    showFloatingDock: false,
    lightweightTvMode: true,
    useBottomNav: false,
  },
};

export function getDeviceCapabilities(mode: DevicePlatformMode): DeviceModeCapabilities {
  return DEVICE_CAPABILITIES[mode] || DEVICE_CAPABILITIES.desktop;
}

export function loadSavedDeviceMode(): DevicePlatformMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'desktop' || raw === 'mobile' || raw === 'tv') return raw;
  } catch {
    // ignore storage failures
  }
  return null;
}

export function saveDeviceMode(mode: DevicePlatformMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore storage failures
  }
}

export function suggestDeviceModeFromEnvironment(
  userAgent: string,
  viewportWidth: number
): DevicePlatformMode {
  const ua = (userAgent || '').toLowerCase();
  if (
    /(smart-tv|smarttv|googletv|android tv|appletv|tizen|web0s|webos|tv bro|jiosphere|firetv|aftb|aftm|afts|bravia|netcast)/i.test(
      ua
    )
  ) {
    return 'tv';
  }
  if (viewportWidth > 0 && viewportWidth <= 768) {
    return 'mobile';
  }
  if (/(iphone|ipad|ipod|android.*mobile|mobile)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export interface FloatingPos {
  x: number;
  y: number;
}

/**
 * Clamps any draggable floating panel cleanly inside the visible viewport bounds.
 */
export function clampFloatingPosition(
  pos: FloatingPos,
  panelWidth: number,
  panelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 12
): FloatingPos {
  const maxX = Math.max(margin, viewportWidth - panelWidth - margin);
  const maxY = Math.max(margin, viewportHeight - panelHeight - margin);
  return {
    x: Math.round(Math.min(maxX, Math.max(margin, pos.x))),
    y: Math.round(Math.min(maxY, Math.max(margin, pos.y))),
  };
}
