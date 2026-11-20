import React, { useState, useEffect } from 'react';
import {
  Menu, Star, Zap, ChevronRight, ChevronLeft, Plus, Search,
  FolderPlus, ArrowUpDown, Calendar, Sun, Moon
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const BRAND_LETTERS = ['L', 'i', 'n', 'k', 'S', 't', 'a', 'c', 'k'];
const THEME_STORAGE_KEY = 'linkstack_theme';

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
    <header className="border-b border-slate-200 bg-white px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0 transition-colors">
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

      {/* Controls Row: Search, Filters, Actions & Desktop Theme Toggle */}
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

            {/* Date Range Filter (50% width on mobile) */}
            <div className="relative w-full sm:w-auto sm:shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 sm:top-2 pointer-events-none" />
              <select
                aria-label="Filter by date"
                value={dateFilter}
                onChange={(e) => onDateFilterChange(e.target.value)}
                className="w-full pl-8 pr-6 py-2 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            {/* Sort Order Selector (50% width on mobile) */}
            <div className="relative w-full sm:w-auto sm:shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 sm:top-2 pointer-events-none" />
              <select
                aria-label="Sort items"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full pl-8 pr-6 py-2 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl sm:rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="newest">Newest (Desc)</option>
                <option value="oldest">Oldest (Asc)</option>
                <option value="modified">Modified</option>
              </select>
            </div>

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