import React from 'react';
import {
  Menu, Star, Zap, ChevronRight, Plus, Search,
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

  return (
    <header className="border-b border-slate-200 bg-white px-3 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
      {/* Top Row: Breadcrumbs & Mobile Add Button */}
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden shrink-0"
            aria-label="Open folder navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {selectedFolderId === 'favorites' ? (
            <div className="flex items-center space-x-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-md font-semibold text-amber-800 bg-amber-50/90 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Favorites</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => onSelectFolder(null)}
                className={`flex items-center space-x-1.5 text-xs sm:text-sm px-2 py-1 rounded-md transition shrink-0 ${
                  selectedFolderId === null
                    ? 'font-semibold text-blue-700 bg-blue-50/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                <span>Instant Links</span>
              </button>

              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <button
                      onClick={() => onSelectFolder(crumb.id)}
                      className={`text-xs sm:text-sm px-2 py-1 rounded-md truncate max-w-[120px] sm:max-w-[180px] transition ${
                        isLast
                          ? 'font-semibold bg-blue-50/70 text-blue-700'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Mobile Quick Add Link Button */}
        <button
          onClick={onOpenAddLink}
          className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition shadow-xs shrink-0 sm:hidden ml-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Controls Row: Search, Date Filter, Sort Order & Actions */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
        {/* Search Input */}
        <div className="relative flex-1 sm:w-48 xl:w-60 min-w-[140px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          <input
            type="text"
            placeholder="Search links, tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        {/* Date Range Filter */}
        <div className="relative shrink-0">
          <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          <select
            aria-label="Filter by date"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="pl-8 pr-6 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        {/* Sort Order Selector */}
        <div className="relative shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          <select
            aria-label="Sort items"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="pl-8 pr-6 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="newest">Newest (Desc)</option>
            <option value="oldest">Oldest (Asc)</option>
            <option value="modified">Modified</option>
          </select>
        </div>

        {isFolderView && (
          <button
            onClick={() => onOpenCreateFolder(selectedFolderId)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium px-3 py-1.5 sm:py-2 rounded-lg transition shrink-0"
            title="Create Subfolder Here"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span className="hidden xl:inline">Subfolder</span>
          </button>
        )}

        <button
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