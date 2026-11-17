import React from 'react';
import {
  Bookmark, FolderPlus, X, Zap, Star, User, LogOut,
  ChevronDown, ChevronRight, Video, FolderOpen, Folder,
  Plus, Pencil, Trash2
} from 'lucide-react';

const Sidebar = React.memo( function Sidebar({
  currentUser,
  isOpen,
  onClose,
  folders,
  links,
  selectedFolderId,
  onSelectFolder,
  expandedFolders,
  onToggleExpand,
  onOpenCreateFolder,
  onOpenRenameFolder,
  onPromptDeleteFolder,
  onLogout
}) {
  const starredCount = links.filter(l => l.isStarred).length;
  const instantCount = links.filter(l => !l.folderId).length;

  const renderFolderTree = (parentId = null, depth = 0) => {
    const currentLevelFolders = folders.filter(f => f.parentId === parentId);
    if (currentLevelFolders.length === 0) return null;

    return (
      <div className={`space-y-0.5 ${depth > 0 ? 'ml-3 border-l border-slate-200/80 pl-2 mt-0.5' : ''}`}>
        {currentLevelFolders.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isExpanded = !!expandedFolders[folder.id];
          const isSelected = selectedFolderId === folder.id;

          return (
            <div key={folder.id} className="group flex flex-col">
              <div
                onClick={() => onSelectFolder(folder.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate flex-1 min-w-0 pr-1">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => onToggleExpand(folder.id, e)}
                      className="p-0.5 hover:bg-slate-200/80 rounded shrink-0 transition-transform"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  {folder.name.toLowerCase().includes('youtube') || folder.name.toLowerCase().includes('video') ? (
                    <Video className="w-4 h-4 text-red-500 shrink-0" />
                  ) : isSelected ? (
                    <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>

                <div className="flex items-center space-x-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    title="Add Subfolder"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreateFolder(folder.id);
                    }}
                    className="p-1 hover:text-blue-600 hover:bg-blue-100/70 active:scale-95 rounded text-slate-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Rename Folder"
                    onClick={(e) => onOpenRenameFolder(folder, e)}
                    className="p-1 hover:text-slate-700 hover:bg-slate-200/70 active:scale-95 rounded text-slate-400 transition"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Delete Folder"
                    onClick={(e) => onPromptDeleteFolder(folder, e)}
                    className="p-1 hover:text-red-600 hover:bg-red-100/70 active:scale-95 rounded text-slate-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {hasChildren && isExpanded && renderFolderTree(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

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
          {/* Brand header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Bookmark className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-wide">Organizer</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                title="New Root Folder"
                onClick={() => onOpenCreateFolder(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation & Folders list */}
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1">
              <button
                onClick={() => onSelectFolder(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  selectedFolderId === null
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Zap className={`w-4 h-4 ${selectedFolderId === null ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                  <span>Instant Links</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{instantCount}</span>
              </button>

              <button
                onClick={() => onSelectFolder('favorites')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  selectedFolderId === 'favorites'
                    ? 'bg-amber-50 text-amber-800 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Star className={`w-4 h-4 ${selectedFolderId === 'favorites' ? 'text-amber-500 fill-amber-500' : 'text-amber-400'}`} />
                  <span>Favorites</span>
                </div>
                <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                  selectedFolderId === 'favorites' ? 'bg-amber-100 text-amber-800' : 'text-slate-400'
                }`}>
                  {starredCount}
                </span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Folders</span>
                <button
                  onClick={() => onOpenCreateFolder(null)}
                  className="text-[11px] text-blue-600 hover:underline font-medium"
                >
                  + New
                </button>
              </div>
              {renderFolderTree(null)}
            </div>
          </div>
        </div>

        {/* User bar & Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{currentUser.email || 'User'}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Synced</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;