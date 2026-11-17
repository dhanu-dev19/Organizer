import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export function DeleteConfirmModal({ deleteTarget, isDeleting, onClose, onConfirm }) {
  if (!deleteTarget) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-100">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm">
              {deleteTarget.type === 'folder' ? 'Delete Folder' : 'Delete Link'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 break-words">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-700">
                "{deleteTarget.type === 'folder' ? deleteTarget.item.name : deleteTarget.item.title}"
              </span>
              ?
            </p>

            {deleteTarget.type === 'folder' ? (
              <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                This action cannot be undone and will permanently delete all subfolders and links inside it.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1.5 truncate bg-slate-50 px-2 py-1 rounded border border-slate-100">
                {deleteTarget.item.url}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition flex items-center space-x-1.5"
          >
            {isDeleting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{deleteTarget.type === 'folder' ? 'Delete Folder' : 'Delete Link'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FolderModal({ isOpen, editingFolder, parentFolderId, onClose, onSave }) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(editingFolder ? editingFolder.name : '');
    setIsSaving(false);
  }, [editingFolder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    await onSave(name.trim());
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-5 border border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">
          {editingFolder
            ? 'Rename Folder'
            : parentFolderId
              ? 'Create Subfolder'
              : 'Create Folder'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            disabled={isSaving}
            placeholder="Folder name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
            autoFocus
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow-xs flex items-center space-x-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingFolder ? 'Save' : 'Create'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LinkModal({ isOpen, editingLink, isFavoritesView, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingLink) {
      setTitle(editingLink.title || '');
      setUrl(editingLink.url || '');
      setTags(editingLink.tags ? editingLink.tags.join(', ') : '');
    } else {
      setTitle('');
      setUrl('');
      setTags('');
    }
    setIsSaving(false);
  }, [editingLink, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || isSaving) return;
    setIsSaving(true);
    await onSave({ title, url, tags });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-5 border border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">
          {editingLink
            ? 'Edit Bookmark'
            : isFavoritesView
              ? 'Add Favorite Bookmark'
              : 'Add New Bookmark'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              type="text"
              required
              disabled={isSaving}
              placeholder="e.g., GitHub, React Documentation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
            <input
              type="text"
              required
              disabled={isSaving}
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              disabled={isSaving}
              placeholder="dev, video, tutorial"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow-xs flex items-center space-x-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{editingLink ? 'Saving...' : 'Adding...'}</span>
                </>
              ) : (
                <span>{editingLink ? 'Save Changes' : 'Add Link'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}