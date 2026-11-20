import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Star, Zap, ChevronRight, ChevronLeft, ChevronDown, Plus, Search,
  FolderPlus, ArrowUpDown, Calendar, Sun, Moon, Check
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const BRAND_LETTERS = ['L', 'i', 'n', 'k', 'S', 't', 'a', 'c', 'k'];
const THEME_STORAGE_KEY = 'linkstack_theme';

const DATE_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'modified', label: 'Modified' }
];

function AnimatedBrandName() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= BRAND_LETTERS.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 85);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center font-extrabold text-xl sm:text-2xl tracking-tight leading-none select-none">
      {BRAND_LETTERS.map((char, index) => {
        const isVisible = index < visibleCount;
        const isStackPart = index >= 4;
        return (
          <span
            key={index}
            className={`inline-block transition-all duration-300 ease-out ${
              isStackPart ? 'text-blue-600' : 'text-slate-900'
            } ${
              isVisible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-2 scale-90'
            }`}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

function FilterDropdown({ icon: Icon, value, options, onChange, ariaLabel, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto sm:shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 pl-2.5 pr-2 py-2 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border rounded-xl sm:rounded-lg text-xs text-slate-700 font-medium transition cursor-pointer focus:outline-none ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
            : 'border-slate-200'
        }`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{selectedOption.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-full sm:w-44 min-w-[155px] bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 overflow-hidden`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Header = React.memo(function Header({
  selectedFolderId,
  breadcrumbs,
  onSelectFolder,
  onOpenMobileSidebar,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  dateFilter,
  onDateFilterChange,
  onOpenCreateFolder,
  onOpenAddLink
}) {
  // Persistent Light / Dark Theme State (defaults to 'light', persists until toggled)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage restrictions
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  const isFolderView =
    selectedFolderId !== null &&
    selectedFolderId !== 'favorites' &&
    selectedFolderId !== 'ai-search';

  const currentCrumb = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;
  const parentCrumb = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <header className="relative z-30 border-b border-slate-200 bg-white px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0 transition-colors">
      {/* Top Row: Fixed Menu Button + Brand / Breadcrumbs + Mobile Actions */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full lg:w-auto">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Pinned Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden shrink-0 active:scale-95 transition"
            aria-label="Open folder navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {selectedFolderId === null ? (
            /* MAIN PAGE NAVBAR: Brand Logo + Letter-by-Letter Animated Brand Name */
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              className="flex items-center space-x-2.5 py-0.5 rounded-xl focus:outline-none group shrink-0"
            >
              <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105" />
              <AnimatedBrandName />
            </button>
          ) : selectedFolderId === 'favorites' ? (
            <div className="flex items-center space-x-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-semibold text-amber-800 bg-amber-50/90 shrink-0">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Favorites</span>
            </div>
          ) : selectedFolderId === 'ai-search' ? (
            <div className="flex items-center space-x-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-semibold text-blue-700 bg-blue-50/90 shrink-0">
              <Search className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Instant Search</span>
            </div>
          ) : (
            <>
              {/* MOBILE FOLDER VIEW (< sm): Clean Back Button + Current Folder Name */}
              <div className="flex sm:hidden items-center gap-1 min-w-0 flex-1">
                {currentCrumb && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectFolder(parentCrumb ? parentCrumb.id : null)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg shrink-0 flex items-center"
                      title={parentCrumb ? `Back to ${parentCrumb.name}` : 'Back to Home'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold bg-blue-50/80 text-blue-700 px-2.5 py-1.5 rounded-lg truncate">
                      {currentCrumb.name}
                    </span>
                  </>
                )}
              </div>

              {/* DESKTOP / TABLET FOLDER VIEW (>= sm): Full Interactive Breadcrumb Trail */}
              <nav
                aria-label="Breadcrumb"
                className="hidden sm:flex items-center space-x-1.5 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5"
              >
                <button
                  type="button"
                  onClick={() => onSelectFolder(null)}
                  className="flex items-center space-x-1.5 text-sm px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
                  <span>Home</span>
                </button>

                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <button
                        type="button"
                        onClick={() => onSelectFolder(crumb.id)}
                        title={crumb.name}
                        className={`text-sm px-2.5 py-1 rounded-lg truncate max-w-[160px] shrink-0 transition ${
                          isLast
                            ? 'font-semibold bg-blue-50/80 text-blue-700'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        {/* Mobile Quick Actions: Theme Toggle + Subfolder + Add Link */}
        <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition active:scale-95"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {isFolderView && (
            <button
              type="button"
              onClick={() => onOpenCreateFolder(selectedFolderId)}
              className="p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition active:scale-95"
              title="Create Subfolder Here"
              aria-label="Create Subfolder Here"
            >
              <FolderPlus className="w-4 h-4 text-slate-600" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddLink}
            className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Controls Row: Search, Custom Dropdowns, Actions & Desktop Theme Toggle */}
      <div className="flex items-center justify-end gap-2 w-full lg:w-auto">
        {selectedFolderId !== 'ai-search' && (
          <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center gap-2 flex-1 lg:flex-initial">
            {/* Search Input (Spans both columns on mobile) */}
            <div className="relative col-span-2 sm:flex-1 sm:w-48 xl:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-2" />
              <input
                type="text"
                placeholder="Search links, tags..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-3 py-2 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Custom Date Range Dropdown */}
            <FilterDropdown
              icon={Calendar}
              value={dateFilter}
              options={DATE_OPTIONS}
              onChange={onDateFilterChange}
              ariaLabel="Filter by date"
              align="left"
            />

            {/* Custom Sort Order Dropdown */}
            <FilterDropdown
              icon={ArrowUpDown}
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={onSortChange}
              ariaLabel="Sort items"
              align="right"
            />

            {/* Desktop Subfolder & Add Link Buttons */}
            {isFolderView && (
              <button
                type="button"
                onClick={() => onOpenCreateFolder(selectedFolderId)}
                className="hidden sm:flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium px-2.5 py-2 rounded-lg transition shrink-0"
                title="Create Subfolder Here"
              >
                <FolderPlus className="w-4 h-4 text-slate-500" />
                <span className="hidden xl:inline">Subfolder</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAddLink}
              className="hidden sm:flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Link</span>
            </button>
          </div>
        )}

        {/* Desktop / Tablet Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="hidden sm:flex items-center justify-center p-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition shrink-0 active:scale-95"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
});

export default Header;