import React, { useState, useEffect, useRef } from 'react';
import {
  Bookmark, FolderPlus, X, Zap, Star, User, LogOut,
  ChevronDown, ChevronRight, Video, FolderOpen, Folder,
  Plus, Pencil, Trash2, Lock, Unlock, MoreVertical,KeyRound,Sparkles
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const Sidebar = React.memo(function Sidebar({
  currentUser,
  isOpen,
  onClose,
  folders,
  links,
  selectedFolderId,
  onSelectFolder,
  expandedFolders,
  onToggleExpand,
  unlockedFolderIds,
  hasMasterPin,
  onOpenMasterPinModal,
  onOpenLockModal,
  onLockNow,
  onOpenCreateFolder,
  onOpenRenameFolder,
  onPromptDeleteFolder,
  onLogout
}) {
  const [openMenuFolderId, setOpenMenuFolderId] = useState(null);
  const menuContainerRef = useRef(null);

  // Close 3-dot dropdown when clicking outside or closing sidebar
  useEffect(() => {
    if (!openMenuFolderId) return;
    const handleOutsideClick = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setOpenMenuFolderId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [openMenuFolderId]);

  useEffect(() => {
    if (!isOpen) setOpenMenuFolderId(null);
  }, [isOpen]);

  // Hide starred links that belong to currently locked folders
  const isFolderAccessible = (folderId) => {
    let currId = folderId;
    const visited = new Set();
    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const folder = folders.find(f => f.id === currId);
      if (!folder) break;
      if (folder.isLocked && !unlockedFolderIds[folder.id]) return false;
      currId = folder.parentId;
    }
    return true;
  };

  const starredCount = links.filter(l => l.isStarred && (!l.folderId || isFolderAccessible(l.folderId))).length;
  const instantCount = links.filter(l => !l.folderId).length;

  const renderFolderTree = (parentId = null, depth = 0) => {
    const currentLevelFolders = folders.filter(f => f.parentId === parentId);
    if (currentLevelFolders.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-3.5 border-l border-slate-200/80 pl-2 mt-1' : ''}`}>
        {currentLevelFolders.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isLocked = Boolean(folder.isLocked);
          const isUnlocked = Boolean(unlockedFolderIds[folder.id]);
          const isProtected = isLocked && !isUnlocked;
          const isExpanded = !isProtected && Boolean(expandedFolders[folder.id]);
          const isSelected = selectedFolderId === folder.id;
          const isMenuOpen = openMenuFolderId === folder.id;

          return (
            <div key={folder.id} className="group flex flex-col relative">
              <div
                onClick={() => {
                  setOpenMenuFolderId(null);
                  onSelectFolder(folder.id);
                }}
                className={`flex items-center justify-between px-2.5 py-2 md:py-1.5 rounded-xl md:rounded-lg text-sm cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {/* Left: Expand Chevron + Folder Icon + Full Readable Folder Name */}
                <div className="flex items-center space-x-2 truncate flex-1 min-w-0 pr-2">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuFolderId(null);
                        if (isProtected) {
                          onSelectFolder(folder.id);
                        } else {
                          onToggleExpand(folder.id, e);
                        }
                      }}
                      className="p-1 md:p-0.5 hover:bg-slate-200/80 rounded-md shrink-0 transition-transform"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 md:w-3.5 md:h-3.5" /> : <ChevronRight className="w-4 h-4 md:w-3.5 md:h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-6 md:w-4.5 shrink-0" />
                  )}

                  {isProtected ? (
                    <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : isLocked && isUnlocked ? (
                    <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : folder.name.toLowerCase().includes('youtube') || folder.name.toLowerCase().includes('video') ? (
                    <Video className="w-4 h-4 text-red-500 shrink-0" />
                  ) : isSelected ? (
                    <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>

                {/* Right: Single 3-Dot Action Trigger */}
                <div className="relative shrink-0" ref={isMenuOpen ? menuContainerRef : null}>
                  <button
                    type="button"
                    aria-label="Folder options"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuFolderId(prev => (prev === folder.id ? null : folder.id));
                    }}
                    className={`p-1.5 md:p-1 rounded-lg transition active:scale-95 ${
                      isMenuOpen
                        ? 'bg-slate-200/80 text-slate-800 opacity-100'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-100 md:opacity-0 md:group-hover:opacity-100'
                    }`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-50 text-xs font-medium text-slate-700"
                    >
                      {!isProtected && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuFolderId(null);
                            onOpenCreateFolder(folder.id);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 transition"
                        >
                          <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Add Subfolder</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuFolderId(null);
                          onOpenLockModal(isLocked ? 'remove' : 'set', folder);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 transition"
                      >
                        {isLocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Remove Lock</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Lock Folder</span>
                          </>
                        )}
                      </button>

                      {!isProtected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            setOpenMenuFolderId(null);
                            onOpenRenameFolder(folder, e);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center space-x-2.5 text-slate-700 transition"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Rename</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={(e) => {
                          setOpenMenuFolderId(null);
                          onPromptDeleteFolder(folder, e);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center space-x-2.5 text-red-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete Folder</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {hasChildren && isExpanded && renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const hasAnyUnlockedFolders = Object.keys(unlockedFolderIds).length > 0;

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
  <BrandLogo className="w-9 h-9 md:w-8 md:h-8 shrink-0 shadow-xs" />
  <span className="font-bold text-slate-900 text-base md:text-sm tracking-tight">
    Link<span className="text-blue-600">Stack</span>
  </span>
</div>
            <div className="flex items-center space-x-1.5">
              <button
                title="New Root Folder"
                onClick={() => onOpenCreateFolder(null)}
                className="p-2 md:p-1.5 hover:bg-slate-100 rounded-xl md:rounded-lg text-slate-500 hover:text-slate-800 transition"
              >
                <FolderPlus className="w-5 h-5 md:w-4 md:h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 md:hidden"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation & Folder Tree */}
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <button
                onClick={() => onSelectFolder(null)}
                className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm transition ${
                  selectedFolderId === null
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Zap className={`w-4 h-4 ${selectedFolderId === null ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                  <span>Instant Links</span>
                </div>
                <span className="text-xs md:text-[11px] text-slate-400 font-medium">{instantCount}</span>
              </button>

              <button
                onClick={() => onSelectFolder('favorites')}
                className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm transition ${
                  selectedFolderId === 'favorites'
                    ? 'bg-amber-50 text-amber-800 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Star className={`w-4 h-4 ${selectedFolderId === 'favorites' ? 'text-amber-500 fill-amber-500' : 'text-amber-400'}`} />
                  <span>Favorites</span>
                </div>
                <span className={`text-xs md:text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  selectedFolderId === 'favorites' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'
                }`}>
                  {starredCount}
                </span>
              </button>

              <button
                onClick={() => onSelectFolder('ai-search')}
                className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg text-sm transition ${
                  selectedFolderId === 'ai-search'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Sparkles className={`w-4 h-4 ${selectedFolderId === 'ai-search' ? 'text-indigo-600' : 'text-indigo-400'}`} />
                  <span>Instant Search</span>
                </div>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-100/80 text-indigo-700">
                  AI
                </span>
              </button>

            </div>

            <div>
              <div className="flex items-center justify-between px-3 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Folders</span>
                <div className="flex items-center space-x-3">
                  {hasAnyUnlockedFolders && (
                    <button
                      onClick={onLockNow}
                      title="Re-lock all unlocked folders"
                      className="text-xs md:text-[11px] text-amber-600 hover:underline font-medium flex items-center space-x-1"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Lock All</span>
                    </button>
                  )}
                  <button
                    onClick={() => onOpenCreateFolder(null)}
                    className="text-xs md:text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    + New
                  </button>
                </div>
              </div>
              {renderFolderTree(null)}
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-3.5 md:p-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0 gap-1.5">
          <div className="flex items-center space-x-2.5 truncate min-w-0">
            <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{currentUser.email || 'User'}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Synced</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={onOpenMasterPinModal}
              title={hasMasterPin ? 'Change Master 6-Digit Password' : 'Set Master 6-Digit Password'}
              className={`p-2 md:p-1.5 rounded-xl md:rounded-lg transition ${
                hasMasterPin
                  ? 'text-amber-600 hover:bg-amber-50'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Log Out"
              className="p-2 md:p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl md:rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;