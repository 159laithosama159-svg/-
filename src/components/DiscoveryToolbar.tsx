import {
  Crown,
  Dices,
  KeyRound,
  ListVideo,
  Lock,
  Radio,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRound,
  Users,
} from 'lucide-react';
import type { ProfileId, SortOption } from '../types/cinema';
import { USER_PROFILES } from '../data/showcaseCatalog';

interface DiscoveryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  familyGuard: boolean;
  onToggleFamilyGuard: () => void;
  activeProfileId: ProfileId;
  onSelectProfile: (id: ProfileId) => void;
  pinEnabled: boolean;
  onOpenPinModal: () => void;
  showSort?: boolean;
  sort?: SortOption;
  onSortChange?: (value: SortOption) => void;
  activeServerName: string;
  watchQueueCount: number;
  remindersCount: number;
  activePartyCode?: string | null;
  onOpenAiConcierge: (prefillQuery?: string) => void;
  onOpenTonightPick: () => void;
  onOpenWatchParty: () => void;
  onOpenEpgGuide: () => void;
  onPlayWatchQueue: () => void;
}

export function DiscoveryToolbar({
  search,
  onSearchChange,
  familyGuard,
  onToggleFamilyGuard,
  activeProfileId,
  onSelectProfile,
  pinEnabled,
  onOpenPinModal,
  showSort = false,
  sort = 'featured',
  onSortChange,
  activeServerName,
  watchQueueCount,
  remindersCount,
  activePartyCode,
  onOpenAiConcierge,
  onOpenTonightPick,
  onOpenWatchParty,
  onOpenEpgGuide,
  onPlayWatchQueue,
}: DiscoveryToolbarProps) {
  return (
    <section
      aria-label="أدوات البحث الذكي والحماية العائلية"
      className="border-b border-[#D9A441]/18 bg-[#120E0A]/95"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-10">
        {/* Search Input + Editorial Utility Controls */}
        <div className="flex min-w-[260px] flex-1 max-w-2xl flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B5A78F]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث في الدار عن فيلم أو مسلسل، أو اسأل القائد الذكي..."
              aria-label="البحث في المكتبة"
              className="w-full rounded-lg border border-[#D9A441]/24 bg-[#0B0907] py-2 pr-10 pl-4 text-sm text-[#F6ECDA] placeholder:text-[#8E816C] transition-colors focus:border-[#D9A441]"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenAiConcierge(search.trim() || undefined)}
            className="sketch-btn-gold inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-extrabold"
          >
            <Crown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>القائد AI</span>
          </button>

          <button
            type="button"
            onClick={onOpenWatchParty}
            title="مشاهدة جماعية متزامنة مع الأصدقاء"
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-bold transition-colors ${
              activePartyCode
                ? 'rounded-lg border border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                : 'sketch-btn-ink'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-[#D9A441]" aria-hidden="true" />
            <span>{activePartyCode ? `غرفة ${activePartyCode}` : 'مشاهدة جماعية'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenEpgGuide}
            title="دليل البرامج والمباريات المباشرة مع التذكيرات"
            className="sketch-btn-ink inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-bold"
          >
            <Radio className="h-3.5 w-3.5 shrink-0 text-[#B8243A]" aria-hidden="true" />
            <span className="hidden sm:inline">دليل البرامج</span>
            {remindersCount > 0 && (
              <span className="font-mono-tabular text-[#D9A441]">({remindersCount})</span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenTonightPick}
            title="اختر لي عملاً عشوائياً ذكياً للسهرة"
            className="sketch-btn-ink inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-bold"
          >
            <Dices className="h-3.5 w-3.5 shrink-0 text-[#D9A441]" aria-hidden="true" />
            <span className="hidden xl:inline">حظ السهرة</span>
          </button>

          {watchQueueCount > 0 && (
            <button
              type="button"
              onClick={onPlayWatchQueue}
              title="تشغيل قائمة السهرة بالترتيب"
              className="sketch-btn-wax inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-extrabold"
            >
              <ListVideo className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>السهرة</span>
              <span className="font-mono-tabular">({watchQueueCount})</span>
            </button>
          )}
        </div>

        {/* Workspace Controls: Profile Selector + PIN Lock + Sort + Family Guard */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border border-[#D9A441]/20 bg-[#0D0A07] p-1"
            role="group"
            aria-label="اختيار ملف المشاهدة"
          >
            <span className="hidden items-center px-2 text-xs text-[#B5A78F] sm:inline-flex">
              <UserRound
                className="ml-1.5 h-3.5 w-3.5 text-[#D9A441]"
                aria-hidden="true"
              />
              الملف:
            </span>
            {USER_PROFILES.map((profile) => {
              const active = profile.id === activeProfileId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onSelectProfile(profile.id)}
                  aria-pressed={active}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-[#D9A441] text-[#0B0907]'
                      : 'text-[#B5A78F] hover:text-[#F6ECDA]'
                  }`}
                >
                  {profile.name}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenPinModal}
            aria-label={pinEnabled ? 'إدارة رمز قفل العائلة PIN' : 'تفعيل قفل PIN للعائلة'}
            title={pinEnabled ? 'رمز PIN مفعّل لحماية وضع الأطفال' : 'تعيين رمز قفل PIN (4 أرقام)'}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-2 text-xs font-bold transition-colors ${
              pinEnabled ? 'sketch-btn-gold' : 'sketch-btn-ink'
            }`}
          >
            {pinEnabled ? (
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-[#D9A441]" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{pinEnabled ? 'PIN مقفول' : 'قفل PIN'}</span>
          </button>

          {showSort && onSortChange && (
            <label className="flex items-center gap-2 text-xs text-[#B5A78F]">
              <span className="sr-only">ترتيب النتائج</span>
              <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                aria-label="ترتيب المحتوى"
                className="rounded-lg border border-[#D9A441]/24 bg-[#0D0A07] px-3 py-2 text-xs font-semibold text-[#F6ECDA] focus:border-[#D9A441]"
              >
                <option value="featured">الترتيب: المختارات</option>
                <option value="rating">الأعلى تقييماً</option>
                <option value="newest">الأحدث إصداراً</option>
                <option value="title">الترتيب الأبجدي</option>
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={onToggleFamilyGuard}
            aria-pressed={familyGuard}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
              familyGuard
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-[#D9A441]/20 bg-[#0D0A07] text-[#B5A78F] hover:text-[#F6ECDA]'
            }`}
          >
            {familyGuard ? (
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{familyGuard ? 'الحماية: مفعّلة' : 'الحماية: متوقفة'}</span>
          </button>

          <span className="hidden text-xs text-[#9E917B] 2xl:inline">
            المصدر:{' '}
            <strong className="font-semibold text-[#E6D9BE]">
              {activeServerName}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}
