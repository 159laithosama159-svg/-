import type { User } from 'firebase/auth';
import {
  BookOpen,
  Command,
  Crown,
  Monitor,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  UserRound,
} from 'lucide-react';
import type { NavTab } from '../types/cinema';
import { BRAND_ASSETS } from '../data/showcaseCatalog';
import { PWAInstallButton } from './DevicePlatformModal';
import type { DeviceModeCapabilities, DevicePlatformMode } from '../utils/deviceModeUtils';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToAi: () => void;
  onSwitchToNovels?: () => void;
  onSwitchToPrivateAi?: () => void;
  onOpenServers: () => void;
  onOpenAuth: () => void;
  onOpenDevices: () => void;
  onOpenDevicePicker?: () => void;
  deviceMode?: DevicePlatformMode;
  deviceCaps?: DeviceModeCapabilities;
  isSuperAdmin?: boolean;
  onOpenAdminModal?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSecurityShield?: () => void;
  hasAppLock?: boolean;
  onToggleTvMode?: () => void;
  tvMode: boolean;
  user: User | null;
  favoritesCount: number;
  onToast: (msg: string) => void;
}

const NAV_LINKS: Array<{ id: NavTab; label: string }> = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'movies', label: 'الأفلام' },
  { id: 'series', label: 'المسلسلات' },
  { id: 'live', label: 'البث المباشر' },
  { id: 'mylist', label: 'قائمتي' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onSwitchToAi,
  onSwitchToNovels,
  onSwitchToPrivateAi,
  onOpenServers,
  onOpenAuth,
  onOpenDevices,
  onOpenDevicePicker,
  deviceMode = 'desktop',
  deviceCaps,
  isSuperAdmin = false,
  onOpenAdminModal,
  onOpenCommandPalette,
  onOpenSecurityShield,
  hasAppLock,
  onToggleTvMode,
  tvMode,
  user,
  favoritesCount,
  onToast,
}: TopBarProps) {
  const shortName = user?.displayName
    ? user.displayName.split(' ')[0].slice(0, 14)
    : 'حسابي';

  const showAi = deviceCaps ? deviceCaps.showAiStudio : true;
  const showNovels = deviceCaps ? deviceCaps.showNovels : true;
  const showVault = deviceCaps ? deviceCaps.showPrivateVault : true;
  const showSecurity = deviceCaps ? !deviceCaps.isCinemaOnly : true;

  const DeviceModeIcon =
    deviceMode === 'tv' ? Tv : deviceMode === 'mobile' ? Smartphone : Monitor;
  const deviceLabel =
    deviceMode === 'tv' ? 'تلفزيون' : deviceMode === 'mobile' ? 'هاتف' : 'كمبيوتر';

  const isMobileMode = deviceMode === 'mobile';
  const isTvMode = deviceMode === 'tv';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--accent-gold)]/30 bg-[#0B0907]/95 backdrop-blur-xl">
      <div
        className={`mx-auto flex items-center justify-between gap-1.5 px-2.5 ${
          isMobileMode
            ? 'h-14 max-w-full'
            : isTvMode
            ? 'h-20 max-w-[1600px] px-6'
            : 'h-16 max-w-[1440px] sm:gap-3 sm:px-6 lg:gap-4 lg:px-8'
        }`}
      >
        {/* Zone 1: VALDRION CINEMA Brand */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="group flex shrink-0 items-center gap-2 whitespace-nowrap text-right transition-opacity hover:opacity-95"
          aria-label="العودة إلى الرئيسية — فالدريون سينما"
        >
          <span
            className={`relative shrink-0 overflow-hidden rounded-full border border-[var(--accent-gold)]/75 bg-[#120E0A] shadow-[0_0_20px_rgba(217,164,65,0.22)] ${
              isMobileMode ? 'h-8 w-8' : isTvMode ? 'h-12 w-12' : 'h-9 w-9 sm:h-10 sm:w-10'
            }`}
          >
            <img
              src={BRAND_ASSETS.emblem}
              alt="شعار فالدريون سينما"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className={`font-imperial font-bold tracking-[0.12em] text-[#F6ECDA] ${
                isMobileMode ? 'text-sm' : isTvMode ? 'text-2xl' : 'text-sm sm:text-xl'
              }`}
            >
              VALDRION
            </span>
            <span className="text-[10px] font-semibold text-[var(--accent-gold)]">
              {isTvMode
                ? 'تلفزيون سينما TV'
                : isMobileMode
                ? 'وضع الهاتف المحمول'
                : 'فالدريون · السينما والبث'}
            </span>
          </span>
        </button>

        {/* Zone 2: Desktop & TV Navigation Links (Hidden in Mobile Mode since MobileBottomNav handles tabs!) */}
        {!isMobileMode && (
          <nav
            aria-label="التنقل الرئيسي للسينما"
            className={`hidden items-center md:flex ${isTvMode ? 'gap-6' : 'gap-4 lg:gap-5'}`}
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onSelectTab(link.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap py-2 font-bold transition-colors ${
                    isTvMode ? 'text-base px-2 rounded-lg focus:ring-2 focus:ring-[#F5C76B]' : 'text-sm'
                  } ${
                    isActive
                      ? 'text-[#F8F0DC]'
                      : 'text-[#B5A78F] hover:text-[#F6ECDA]'
                  }`}
                >
                  <span>
                    {link.label}
                    {link.id === 'mylist' && favoritesCount > 0
                      ? ` (${favoritesCount})`
                      : ''}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[15px] h-[2px] bg-gradient-to-l from-[#B8243A] via-[var(--accent-gold)] to-[#B8243A]"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Always-Visible Prominent Servers + App Switchers + Device Picker */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {!isMobileMode && onOpenCommandPalette && !isTvMode && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              data-testid="topbar-command-palette-btn"
              aria-label="لوحة الأوامر والانتقال السريع"
              title="لوحة الانتقال السريع (Ctrl+K)"
              className="hidden h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-2 text-xs font-bold text-slate-300 transition-colors hover:border-[var(--accent-gold)]/60 hover:text-white xl:inline-flex"
            >
              <Command className="h-3.5 w-3.5 text-[var(--accent-gold)]" aria-hidden="true" />
              <span className="font-mono text-[10px]">⌘K</span>
            </button>
          )}

          {showAi && !isMobileMode && (
            <button
              type="button"
              onClick={onSwitchToAi}
              data-testid="topbar-ai-btn"
              aria-label="الانتقال إلى فالدريون AI"
              title="فالدريون — الذكاء والقائد الشامل"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#93C5FD]/65 bg-gradient-to-l from-[#2563EB] via-[#3B82F6] to-[#4F46E5] px-2.5 text-xs font-extrabold text-white shadow-[0_0_18px_rgba(59,130,246,0.35)] transition-all hover:brightness-110 active:scale-95 sm:px-3"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FDE68A]" aria-hidden="true" />
              <span>الذكاء AI</span>
            </button>
          )}

          {showNovels && onSwitchToNovels && !isMobileMode && (
            <button
              type="button"
              onClick={onSwitchToNovels}
              data-testid="topbar-novels-btn"
              aria-label="الانتقال إلى فالدريون روايات"
              title="فالدريون — الروايات والمانهوا 4D"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-400/55 bg-[#10241E] px-2.5 text-xs font-extrabold text-emerald-200 transition-colors hover:border-emerald-300 hover:bg-emerald-600 hover:text-white sm:px-3"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>الروايات</span>
            </button>
          )}

          {showVault && onSwitchToPrivateAi && !isMobileMode && (
            <button
              type="button"
              onClick={onSwitchToPrivateAi}
              data-testid="topbar-vault-btn"
              aria-label="الانتقال إلى فالدريون الخزنة"
              title="فالدريون — الخزنة الخاصة"
              className="hidden h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-amber-400/50 hover:text-white lg:inline-flex"
            >
              <span>الخزنة</span>
            </button>
          )}

          {isSuperAdmin && onOpenAdminModal && (
            <button
              type="button"
              onClick={onOpenAdminModal}
              data-testid="topbar-admin-btn"
              aria-label="لوحة إدارة الأدمن العليا"
              title="لوحة الأدمن العليا"
              className="inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[#F5C76B]/70 bg-[#F5C76B]/18 px-2 text-xs font-black text-[#F5C76B] transition-colors hover:bg-[#F5C76B] hover:text-[#120D08] sm:px-2.5"
            >
              <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {!isMobileMode && <span className="hidden sm:inline">الأدمن</span>}
            </button>
          )}

          {onOpenDevicePicker && (
            <button
              type="button"
              onClick={onOpenDevicePicker}
              data-testid="topbar-device-picker"
              aria-label="تغيير نوع الجهاز (تلفزيون أو هاتف أو كمبيوتر)"
              title="تغيير نوع الجهاز في أي وقت"
              className={`inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2 text-xs font-extrabold transition-colors sm:px-2.5 ${
                isTvMode
                  ? 'border-[#F5C76B] bg-[#F5C76B] text-[#0B0907]'
                  : isMobileMode
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/15 bg-white/5 text-[#E5DEC9] hover:border-[var(--accent-gold)]/60 hover:text-white'
              }`}
            >
              <DeviceModeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{deviceLabel}</span>
            </button>
          )}

          {!isTvMode && !isMobileMode && (
            <PWAInstallButton
              compact
              onOpenPlatformHub={onOpenDevices}
              onInstalled={() => onToast('تم تثبيت تطبيق فالدريون على جهازك بنجاح!')}
            />
          )}

          {showSecurity && onOpenSecurityShield && !isMobileMode && (
            <button
              type="button"
              onClick={onOpenSecurityShield}
              aria-label="درع الأمان الفائق وقفل التطبيق"
              title="درع الأمان الفائق"
              className={`hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-xs font-extrabold transition-colors lg:inline-flex ${
                hasAppLock
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                  : 'border-white/15 bg-white/5 text-emerald-300 hover:border-emerald-400/50 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>
          )}

          {onToggleTvMode && !isTvMode && !isMobileMode && (
            <button
              type="button"
              onClick={onToggleTvMode}
              aria-pressed={tvMode}
              aria-label="تفعيل أو إيقاف وضع التلفاز الخفيف"
              title="وضع التلفاز الخفيف"
              className={`hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 text-xs font-extrabold transition-colors 2xl:inline-flex ${
                tvMode
                  ? 'border-[#F5C76B] bg-[#F5C76B] text-[#0B0907]'
                  : 'border-white/15 bg-white/5 text-[#D6D5CE] hover:border-[#F5C76B]/60 hover:text-white'
              }`}
            >
              <Tv className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{tvMode ? 'TV خفيف' : 'خفيف'}</span>
            </button>
          )}

          {!isMobileMode && (
            <button
              type="button"
              onClick={onOpenAuth}
              aria-label={user ? `حساب ${shortName}` : 'تسجيل الدخول أو ضيف'}
              title={user ? `حساب ${shortName}` : 'تسجيل الدخول أو ضيف'}
              className="sketch-btn-ink inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-2 text-xs font-bold sm:px-3"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={shortName}
                  referrerPolicy="no-referrer"
                  className="h-5 w-5 rounded-full border border-[var(--accent-gold)]/70 object-cover"
                />
              ) : (
                <UserRound
                  className="h-4 w-4 shrink-0 text-[var(--accent-gold)]"
                  aria-hidden="true"
                />
              )}
              <span className="hidden lg:inline">{user ? shortName : 'دخول / ضيف'}</span>
            </button>
          )}

          {/* ALWAYS VISIBLE & PROMINENT SERVERS BUTTON */}
          <button
            type="button"
            onClick={onOpenServers}
            data-testid="topbar-servers-btn"
            aria-label="إدارة وإضافة السيرفرات"
            title="إدارة وإضافة سيرفرات IPTV / Xtream"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#F5C76B] bg-gradient-to-l from-[#B8243A] via-[#C93045] to-[#D9A441] px-2.5 text-xs font-black text-white shadow-[0_0_18px_rgba(217,164,65,0.4)] transition-all hover:brightness-110 active:scale-95 sm:px-3.5"
          >
            <Server className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>السيرفرات</span>
          </button>
        </div>
      </div>
    </header>
  );
}
