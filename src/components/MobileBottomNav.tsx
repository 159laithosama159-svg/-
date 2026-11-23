import { BookOpen, Film, Home, Server, Sparkles, Tv } from 'lucide-react';
import type { NavTab } from '../types/cinema';

interface MobileBottomNavProps {
  activeApp?: 'cinema' | 'novels' | 'ai' | 'private-ai';
  activeTab: NavTab;
  favoritesCount: number;
  /** When user selects Phone Mode explicitly, force the bottom mobile bar visible even on wide viewports */
  forceShow?: boolean;
  onSelectTab: (tab: NavTab) => void;
  onSwitchToNovels?: () => void;
  onSwitchToAi: () => void;
  onOpenServers?: () => void;
}

export function MobileBottomNav({
  activeApp = 'cinema',
  activeTab,
  forceShow = false,
  onSelectTab,
  onSwitchToNovels,
  onSwitchToAi,
  onOpenServers,
}: MobileBottomNavProps) {
  const items = [
    {
      id: 'home',
      label: 'السينما',
      icon: Home,
      isActive: activeApp === 'cinema' && activeTab === 'home',
      accentClass: 'text-[#F5C76B]',
      onClick: () => onSelectTab('home'),
    },
    {
      id: 'movies',
      label: 'أفلام',
      icon: Film,
      isActive: activeApp === 'cinema' && activeTab === 'movies',
      accentClass: 'text-[#F5C76B]',
      onClick: () => onSelectTab('movies'),
    },
    {
      id: 'series',
      label: 'مسلسلات',
      icon: Tv,
      isActive: activeApp === 'cinema' && activeTab === 'series',
      accentClass: 'text-[#F5C76B]',
      onClick: () => onSelectTab('series'),
    },
    {
      id: 'novels',
      label: 'الروايات',
      icon: BookOpen,
      isActive: activeApp === 'novels',
      accentClass: 'text-emerald-400',
      onClick: () => onSwitchToNovels?.(),
    },
    {
      id: 'ai',
      label: 'الذكاء AI',
      icon: Sparkles,
      isActive: activeApp === 'ai',
      accentClass: 'text-[#60A5FA]',
      onClick: () => onSwitchToAi(),
    },
    {
      id: 'servers',
      label: 'السيرفرات',
      icon: Server,
      isActive: false,
      accentClass: 'text-amber-400',
      onClick: () => (onOpenServers ? onOpenServers() : onSelectTab('live')),
    },
  ];

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="التنقل السريع للجوال"
      className={`safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--accent-gold)]/30 bg-[#0E0B08]/96 backdrop-blur-xl ${
        forceShow ? 'block' : 'md:hidden'
      }`}
    >
      <div className="mx-auto grid max-w-[480px] grid-cols-6 px-1 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`mobile-nav-${item.id}`}
              onClick={() => {
                item.onClick();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-current={item.isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-extrabold transition-all active:scale-95 ${
                item.isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#A89A82] hover:text-[#F6ECDA]'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${item.isActive ? item.accentClass : ''}`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
