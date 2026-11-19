import React from 'react';
import {
  Menu, Star, Zap, ChevronRight, ChevronLeft, Plus, Search,
  FolderPlus, ArrowUpDown, Calendar
} from 'lucide-react';

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
  const isFolderView = selectedFolderId !== null && selectedFolderId !== 'favorites';
  const currentCrumb = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;
  const parentCrumb = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <header className="border-b border-slate-200 bg-white px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
      {/* Top Row: Fixed Menu Button + Aligned Breadcrumbs + Mobile Add Button */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full lg:w-auto">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Pinned Mobile Drawer Toggle */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden shrink-0 active:scale-95 transition"
            aria-label="Open folder navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {selectedFolderId === 'favorites' ? (
            <div className="flex items-center space-x-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-semibold text-amber-800 bg-amber-50/90 shrink-0">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Favorites</span>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW (< sm): Clean Back Button + Current Folder Name */}
              <div className="flex sm:hidden items-center gap-1 min-w-0 flex-1">
                {currentCrumb ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectFolder(parentCrumb ? parentCrumb.id : null)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg shrink-0 flex items-center"
                      title={parentCrumb ? `Back to ${parentCrumb.name}` : 'Back to Instant Links'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold bg-blue-50/80 text-blue-700 px-2.5 py-1.5 rounded-lg truncate">
                      {currentCrumb.name}
                    </span>
                  </>
                ) : (
                  <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-blue-700 bg-blue-50/80">
                    <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
                    <span>Instant Links</span>
                  </div>
                )}
              </div>

              {/* DESKTOP / TABLET VIEW (>= sm): Full Interactive Breadcrumb Trail */}
              <nav
                aria-label="Breadcrumb"
                className="hidden sm:flex items-center space-x-1.5 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5"
              >
                <button
                  type="button"
                  onClick={() => onSelectFolder(null)}
                  className={`flex items-center space-x-1.5 text-sm px-2.5 py-1 rounded-lg transition shrink-0 ${
                    selectedFolderId === null
                      ? 'font-semibold text-blue-700 bg-blue-50/80'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600 shrink-0" />
                  <span>Instant Links</span>
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

        {/* Mobile Quick Subfolder & Add Link Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 sm:hidden">
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

      {/* Controls Row: 2-Column Grid on Mobile, Single Flex Row on Tablet/Desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
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
    </header>
  );
});

export default Header;