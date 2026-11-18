import React from 'react';
import { Video, Folder, Pencil, Trash2, Lock, Unlock } from 'lucide-react';

const FolderGrid = React.memo(function FolderGrid({
  subfolders,
  allFolders,
  allLinks,
  unlockedFolderIds,
  onOpenLockModal,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder
}) {
  if (subfolders.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Folders ({subfolders.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {subfolders.map(sub => {
          const isLocked = Boolean(sub.isLocked);
          const isUnlocked = Boolean(unlockedFolderIds[sub.id]);
          const isProtected = isLocked && !isUnlocked;

          const childFolderCount = allFolders.filter(f => f.parentId === sub.id).length;
          const childLinkCount = allLinks.filter(l => l.folderId === sub.id).length;

          return (
            <div
              key={sub.id}
              onClick={() => onSelectFolder(sub.id)}
              className={`group bg-white border rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all duration-150 ${
                isProtected
                  ? 'border-amber-200/80 hover:border-amber-400'
                  : 'border-slate-200/90 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                  isProtected
                    ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white'
                    : isLocked && isUnlocked
                      ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                      : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  {isProtected ? (
                    <Lock className="w-4 h-4" />
                  ) : isLocked && isUnlocked ? (
                    <Unlock className="w-4 h-4" />
                  ) : sub.name.toLowerCase().includes('youtube') || sub.name.toLowerCase().includes('video') ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Folder className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                    {sub.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {isProtected ? (
                      <span className="text-amber-600 font-medium">Locked · PIN required</span>
                    ) : (
                      <>
                        {childFolderCount > 0 ? `${childFolderCount} folders · ` : ''}
                        {childLinkCount} {childLinkCount === 1 ? 'link' : 'links'}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-0.5 shrink-0 ml-2">
                <button
                  title={isLocked ? 'Remove 6-Digit Lock' : 'Set 6-Digit Lock'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLockModal(isLocked ? 'remove' : 'set', sub);
                  }}
                  className={`p-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition ${
                    isLocked
                      ? 'text-amber-500 hover:bg-amber-50'
                      : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>

                {!isProtected && (
                  <button
                    title="Rename Folder"
                    onClick={(e) => onRenameFolder(sub, e)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  title="Delete Folder"
                  onClick={(e) => onDeleteFolder(sub, e)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default FolderGrid;