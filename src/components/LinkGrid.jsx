

import React, { useState, useEffect } from 'react';
import {
  Star, Bookmark, FolderPlus, Plus, ArrowUpRight,
  Folder, Zap, Tag, Check, Copy, Edit3, Trash2, ChevronDown
} from 'lucide-react';

const getPageSize = () => {
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return 12; // Desktop (3 columns x 4 rows)
  }
  return 8; // Tablet (2 columns x 4 rows) & Mobile (1 column x 8 rows)
};

const formatShortDate = (ts) => {
  if (!ts) return 'Just now';
  const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const LinkGrid = React.memo(function LinkGrid({
  links,
  subfoldersCount,
  allFolders,
  selectedFolderId,
  onSelectFolder,
  onToggleStar,
  onEditLink,
  onDeleteLink,
  onOpenAddLink,
  onOpenCreateFolder
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [pageSize, setPageSize] = useState(getPageSize);
  const [visibleCount, setVisibleCount] = useState(getPageSize);

  const isFolderView = selectedFolderId !== null && selectedFolderId !== 'favorites';

  // Adjust page batch size dynamically if viewport crosses desktop breakpoint (1024px)
  useEffect(() => {
    const handleResize = () => {
      const nextSize = getPageSize();
      setPageSize(prevSize => {
        if (prevSize !== nextSize) {
          setVisibleCount(nextSize);
        }
        return nextSize;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset visible count whenever active folder or filtered results change
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [selectedFolderId, links.length, pageSize]);

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const visibleLinks = links.slice(0, visibleCount);
  const remainingCount = links.length - visibleCount;

  return (
    <div>
      {(subfoldersCount > 0 || links.length > 0) && (
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {selectedFolderId === 'favorites'
              ? `Starred Bookmarks (${links.length})`
              : `Links (${links.length})`}
          </h3>
          {links.length > pageSize && (
            <span className="text-[11px] text-slate-400">
              Showing {Math.min(visibleCount, links.length)} of {links.length}
            </span>
          )}
        </div>
      )}

      {links.length === 0 && subfoldersCount === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center p-4 bg-white border border-dashed border-slate-200 rounded-2xl">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
            selectedFolderId === 'favorites' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
          }`}>
            {selectedFolderId === 'favorites' ? <Star className="w-7 h-7" /> : <Bookmark className="w-7 h-7" />}
          </div>
          <h3 className="text-sm font-semibold text-slate-700">
            {selectedFolderId === 'favorites' ? 'No favorite links yet' : 'This space is empty'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
            {selectedFolderId === 'favorites'
              ? 'Click the star icon on any link across your folders to pin it here for quick access.'
              : selectedFolderId === null
                ? 'Save your frequently used instant links here for single-click access.'
                : 'Organize this folder by adding links or creating nested subfolders.'}
          </p>
          <div className="flex items-center space-x-2">
            {isFolderView && (
              <button
                onClick={() => onOpenCreateFolder(selectedFolderId)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition flex items-center space-x-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>New Subfolder</span>
              </button>
            )}
            <button
              onClick={onOpenAddLink}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{selectedFolderId === 'favorites' ? 'Add Favorite Link' : 'Add Link'}</span>
            </button>
          </div>
        </div>
      ) : links.length === 0 ? (
        <div className="py-8 text-center bg-white/60 border border-dashed border-slate-200 rounded-xl">
          <p className="text-xs text-slate-400">No direct links in this folder yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile: 1 col | Tablet: 2 cols | Desktop: 3 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleLinks.map(link => {
              let domain = '';
              try {
                domain = new URL(link.url).hostname;
              } catch {
                domain = link.url;
              }
              const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
              const sourceFolder = link.folderId ? allFolders.find(f => f.id === link.folderId) : null;

              return (
                <div
                  key={link.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-3.5 sm:p-4 hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2.5 truncate group/title"
                      >
                        <img
                          src={favicon}
                          alt=""
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded shrink-0"
                        />
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-800 group-hover/title:text-blue-600 truncate transition-colors" title={link.title}>
                          {link.title}
                        </h4>
                      </a>
                      <button
                        title={link.isStarred ? "Remove from Favorites" : "Add to Favorites"}
                        onClick={() => onToggleStar(link)}
                        className={`p-1 rounded shrink-0 transition active:scale-90 ${link.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] sm:text-xs text-slate-400 hover:text-blue-600 flex items-center space-x-1 mt-1.5 truncate transition-colors"
                    >
                      <span className="truncate">{link.url}</span>
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </a>

                    {selectedFolderId === 'favorites' && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => onSelectFolder(sourceFolder ? sourceFolder.id : null)}
                          className="inline-flex items-center space-x-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded transition"
                        >
                          {sourceFolder ? (
                            <>
                              <Folder className="w-2.5 h-2.5" />
                              <span>{sourceFolder.name}</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-2.5 h-2.5 text-blue-500" />
                              <span>Instant Links</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {link.tags && link.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {link.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[10px] sm:text-[11px] truncate">{domain}</span>
                      <span className="text-[9px] text-slate-400/80">
                        {link.updatedAt ? `Edited ${formatShortDate(link.updatedAt)}` : formatShortDate(link.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        title="Copy Link"
                        onClick={() => handleCopy(link.url, link.id)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                      >
                        {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        title="Edit Link"
                        onClick={() => onEditLink(link)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete Link"
                        onClick={(e) => onDeleteLink(link, e)}
                        className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {remainingCount > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => prev + pageSize)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-98"
              >
                <span>Show More ({remainingCount} remaining)</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default LinkGrid;