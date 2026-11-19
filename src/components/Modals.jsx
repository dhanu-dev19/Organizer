import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, Unlock, ShieldCheck, KeyRound } from 'lucide-react';
import { hashPin } from '../utils/crypto';

// Helper to verify a 6-digit PIN against either the Master PIN or a Folder's Custom PIN
async function verifyFolderPin(enteredPin, folder, userId, masterPinHash) {
  if (folder.useMasterPin && masterPinHash) {
    const hash = await hashPin(enteredPin, userId);
    return hash === masterPinHash;
  }
  const customHash = await hashPin(enteredPin, folder.id);
  return customHash === folder.pinHash;
}

export function DeleteConfirmModal({
  deleteTarget,
  isDeleting,
  userId,
  masterPinHash,
  onClose,
  onConfirm
}) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setPinInput('');
    setPinError('');
    setVerifying(false);
  }, [deleteTarget]);

  if (!deleteTarget) return null;

  const isLockedFolder = deleteTarget.type === 'folder' && deleteTarget.item.isLocked;

  const handleConfirmClick = async () => {
    if (isLockedFolder) {
      if (!/^\d{6}$/.test(pinInput)) {
        setPinError('Enter the 6-digit password to confirm deletion.');
        return;
      }
      setVerifying(true);
      const isValid = await verifyFolderPin(pinInput, deleteTarget.item, userId, masterPinHash);
      setVerifying(false);
      if (!isValid) {
        setPinError('Incorrect 6-digit password.');
        return;
      }
    }
    onConfirm();
  };

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

            {isLockedFolder && (
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {deleteTarget.item.useMasterPin
                    ? 'Enter Master 6-Digit Password'
                    : 'Enter Custom 6-Digit Folder Password'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setPinError('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center tracking-[0.4em] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                {pinError && <p className="text-[11px] text-red-600 mt-1">{pinError}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-5">
          <button
            type="button"
            disabled={isDeleting || verifying}
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting || verifying}
            onClick={handleConfirmClick}
            className="px-4 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition flex items-center space-x-1.5"
          >
            {isDeleting || verifying ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{verifying ? 'Verifying...' : 'Deleting...'}</span>
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

export function FolderLockModal({
  lockModalState,
  userId,
  masterPinHash,
  onClose,
  onUnlockSuccess,
  onSaveMasterAndLock,
  onLockWithMaster,
  onLockWithCustom,
  onRemovePin
}) {
  // lockModalState: { mode: 'unlock' | 'set' | 'remove', folder: Object } | null
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [useCustomPin, setUseCustomPin] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const hasMasterPin = Boolean(masterPinHash);

  useEffect(() => {
    setPin('');
    setConfirmPin('');
    // If user has no master PIN yet, default to creating Master PIN (useCustomPin = false)
    // If user already has a Master PIN, default to applying Master PIN (useCustomPin = false)
    setUseCustomPin(false);
    setError('');
    setIsProcessing(false);
  }, [lockModalState]);

  if (!lockModalState || !lockModalState.folder) return null;

  const { mode, folder } = lockModalState;

  const handleDigitChange = (setter) => (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setter(cleaned);
    setError('');
  };

  // One-click lock using existing Master PIN
  const handleQuickMasterLock = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onLockWithMaster(folder.id);
      onClose();
    } catch (err) {
      console.error('Error locking folder with master PIN:', err);
      setError('Failed to lock folder. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    if (!/^\d{6}$/.test(pin)) {
      setError('Please enter a valid 6-digit numeric password.');
      return;
    }

    setIsProcessing(true);
    try {
      if (mode === 'set') {
        if (pin !== confirmPin) {
          setError('6-digit passwords do not match.');
          setIsProcessing(false);
          return;
        }

        if (!hasMasterPin && !useCustomPin) {
          // First-time setup: create Master PIN & apply to this folder
          const hashedMaster = await hashPin(pin, userId);
          await onSaveMasterAndLock(folder.id, hashedMaster);
        } else {
          // Set a custom folder-specific PIN
          const hashedCustom = await hashPin(pin, folder.id);
          await onLockWithCustom(folder.id, hashedCustom);
        }
        onClose();
      } else if (mode === 'unlock') {
        const isValid = await verifyFolderPin(pin, folder, userId, masterPinHash);
        if (!isValid) {
          setError('Incorrect 6-digit password. Try again.');
          setIsProcessing(false);
          return;
        }
        onUnlockSuccess(folder.id);
        onClose();
      } else if (mode === 'remove') {
        const isValid = await verifyFolderPin(pin, folder, userId, masterPinHash);
        if (!isValid) {
          setError('Incorrect 6-digit password.');
          setIsProcessing(false);
          return;
        }
        await onRemovePin(folder.id);
        onClose();
      }
    } catch (err) {
      console.error('Folder lock error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            mode === 'set' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {mode === 'set' ? <ShieldCheck className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm">
              {mode === 'set'
                ? 'Lock Folder'
                : mode === 'remove'
                  ? 'Remove Folder Lock'
                  : 'Folder Locked'}
            </h3>
            <p className="text-xs text-slate-500 truncate">"{folder.name}"</p>
          </div>
        </div>

        {/* CASE 1: Setting lock when Master PIN already exists & user hasn't toggled Custom PIN */}
        {mode === 'set' && hasMasterPin && !useCustomPin ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-blue-900">Use Your Master 6-Digit Password</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                This folder will be locked using your existing single locker password.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex flex-col space-y-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleQuickMasterLock}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Locking...' : 'Lock with Master Password'}</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setUseCustomPin(true)}
                className="w-full py-2 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition"
              >
                Use a custom 6-digit password instead
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: Creating Master PIN, Setting Custom PIN, Unlocking, or Removing Lock */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'set' && !hasMasterPin && (
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
                <span className="text-[11px] font-medium text-slate-600">
                  {useCustomPin ? 'Custom PIN (this folder only)' : 'Set as Master PIN (all folders)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomPin(!useCustomPin);
                    setError('');
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  {useCustomPin ? 'Use Master' : 'Custom only'}
                </button>
              </div>
            )}

            {mode === 'set' && hasMasterPin && useCustomPin && (
              <div className="flex items-center justify-between bg-amber-50/70 px-3 py-2 rounded-xl border border-amber-200/70">
                <span className="text-[11px] font-medium text-amber-800">
                  Custom PIN for this folder only
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomPin(false);
                    setError('');
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Use Master
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {mode === 'set'
                  ? useCustomPin
                    ? 'Create Custom 6-Digit Password'
                    : 'Create Master 6-Digit Password'
                  : folder.useMasterPin
                    ? 'Enter Master 6-Digit Password'
                    : 'Enter Custom 6-Digit Password'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                disabled={isProcessing}
                placeholder="••••••"
                value={pin}
                onChange={handleDigitChange(setPin)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                autoFocus
              />
            </div>

            {mode === 'set' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Confirm 6-Digit Password
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  disabled={isProcessing}
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={handleDigitChange(setConfirmPin)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || pin.length !== 6 || (mode === 'set' && confirmPin.length !== 6)}
                className={`px-4 py-1.5 text-xs font-medium text-white rounded-lg shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50 ${
                  mode === 'remove'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {mode === 'set' ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Set Lock</span>
                  </>
                ) : mode === 'remove' ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Remove Lock</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
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
              <span>{editingFolder ? 'Save' : 'Create'}</span>
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
              <span>{editingLink ? 'Save Changes' : 'Add Link'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export function MasterPinModal({
  isOpen,
  userId,
  masterPinHash,
  onClose,
  onUpdateMasterPin
}) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const hasExistingPin = Boolean(masterPinHash);

  useEffect(() => {
    setCurrentPin('');
    setNewPin('');
    setConfirmNewPin('');
    setError('');
    setIsSaving(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (setter) => (e) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setter(cleaned);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (hasExistingPin && !/^\d{6}$/.test(currentPin)) {
      setError('Enter your current 6-digit Master Password.');
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setError('New password must be exactly 6 digits.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setError('New 6-digit passwords do not match.');
      return;
    }

    if (hasExistingPin && currentPin === newPin) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsSaving(true);
    try {
      if (hasExistingPin) {
        const currentHash = await hashPin(currentPin, userId);
        if (currentHash !== masterPinHash) {
          setError('Current 6-digit Master Password is incorrect.');
          setIsSaving(false);
          return;
        }
      }

      const nextHash = await hashPin(newPin, userId);
      await onUpdateMasterPin(nextHash);
      onClose();
    } catch (err) {
      console.error('Master PIN update error:', err);
      setError('Failed to update Master Password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm">
              {hasExistingPin ? 'Change Master Password' : 'Set Master Password'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Applies to all folders using the single locker PIN
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {hasExistingPin && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Current 6-Digit Password
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                disabled={isSaving}
                placeholder="••••••"
                value={currentPin}
                onChange={handleDigitChange(setCurrentPin)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              New 6-Digit Password
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              disabled={isSaving}
              placeholder="••••••"
              value={newPin}
              onChange={handleDigitChange(setNewPin)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              autoFocus={!hasExistingPin}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Confirm New 6-Digit Password
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              disabled={isSaving}
              placeholder="••••••"
              value={confirmNewPin}
              onChange={handleDigitChange(setConfirmNewPin)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-[0.5em] font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSaving ||
                (hasExistingPin && currentPin.length !== 6) ||
                newPin.length !== 6 ||
                confirmNewPin.length !== 6
              }
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg shadow-xs transition flex items-center space-x-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>{hasExistingPin ? 'Update PIN' : 'Save PIN'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}