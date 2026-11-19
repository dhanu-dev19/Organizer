import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, query, where, onSnapshot, addDoc,
  deleteDoc, updateDoc, setDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FolderGrid from './components/FolderGrid';
import LinkGrid from './components/LinkGrid';

const DeleteConfirmModal = lazy(() => import('./components/Modals').then(m => ({ default: m.DeleteConfirmModal })));
const FolderModal = lazy(() => import('./components/Modals').then(m => ({ default: m.FolderModal })));
const LinkModal = lazy(() => import('./components/Modals').then(m => ({ default: m.LinkModal })));
const FolderLockModal = lazy(() => import('./components/Modals').then(m => ({ default: m.FolderLockModal })));
const MasterPinModal = lazy(() => import('./components/Modals').then(m => ({ default: m.MasterPinModal })));


const getTimestampMs = (ts) => {
  if (!ts) return Date.now();
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime() || 0;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [folders, setFolders] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  // Master & Folder Locker States
  const [masterPinHash, setMasterPinHash] = useState(null);
  const [isMasterPinModalOpen, setIsMasterPinModalOpen] = useState(false);
  const [unlockedFolderIds, setUnlockedFolderIds] = useState({});
  const [lockModalState, setLockModalState] = useState(null);
  const [pendingFolderIdAfterUnlock, setPendingFolderIdAfterUnlock] = useState(null);

  // Search, Sort & Date Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [dateFilter, setDateFilter] = useState('all');

  // Modal States
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [parentFolderId, setParentFolderId] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        setFolders([]);
        setLinks([]);
        setSelectedFolderId(null);
        setUnlockedFolderIds({});
        setMasterPinHash(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // User Settings Listener (Master PIN Hash)
  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);

    return onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setMasterPinHash(snapshot.data().masterPinHash || null);
      } else {
        setMasterPinHash(null);
      }
    }, (err) => console.error("User settings fetch error:", err));
  }, [currentUser]);

  // Folders Listener
  useEffect(() => {
    if (!currentUser) return;
    const foldersQuery = query(collection(db, 'folders'), where('userId', '==', currentUser.uid));

    return onSnapshot(foldersQuery, (snapshot) => {
      const fetchedFolders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFolders(fetchedFolders);
      if (fetchedFolders.length === 0) {
        seedDefaultFolders(currentUser.uid);
      }
    }, (err) => console.error("Folders fetch error:", err));
  }, [currentUser]);

  // Links Listener
  useEffect(() => {
    if (!currentUser) return;
    const linksQuery = query(collection(db, 'links'), where('userId', '==', currentUser.uid));

    return onSnapshot(linksQuery, (snapshot) => {
      setLinks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Links fetch error:", err));
  }, [currentUser]);

  const seedDefaultFolders = async (uid) => {
    const defaults = [
      { name: 'YouTube & Video', parentId: null, userId: uid },
      { name: 'Work & Projects', parentId: null, userId: uid }
    ];
    for (const folder of defaults) {
      await addDoc(collection(db, 'folders'), { ...folder, createdAt: serverTimestamp() });
    }
  };

  // Breadcrumb Trail
  const breadcrumbs = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === 'favorites') return [];
    const trail = [];
    let currentId = selectedFolderId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const found = folders.find(f => f.id === currentId);
      if (found) {
        trail.unshift(found);
        currentId = found.parentId;
      } else {
        break;
      }
    }
    return trail;
  }, [selectedFolderId, folders]);

  const navigateToFolder = useCallback((folderId, allFoldersList) => {
    setSelectedFolderId(folderId);
    setIsMobileSidebarOpen(false);

    if (folderId && folderId !== 'favorites') {
      const toExpand = {};
      let curr = allFoldersList.find(f => f.id === folderId);
      while (curr && curr.parentId) {
        toExpand[curr.parentId] = true;
        curr = allFoldersList.find(f => f.id === curr.parentId);
      }
      setExpandedFolders(prev => ({ ...prev, ...toExpand, [folderId]: true }));
    }
  }, []);

  const handleSelectFolder = useCallback((folderId) => {
    if (!folderId || folderId === 'favorites') {
      navigateToFolder(folderId, folders);
      return;
    }

    const chain = [];
    let curr = folders.find(f => f.id === folderId);
    const visited = new Set();
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      chain.unshift(curr);
      curr = curr.parentId ? folders.find(f => f.id === curr.parentId) : null;
    }

    const lockedBlocker = chain.find(f => f.isLocked && !unlockedFolderIds[f.id]);
    if (lockedBlocker) {
      setPendingFolderIdAfterUnlock(folderId);
      setLockModalState({ mode: 'unlock', folder: lockedBlocker });
      return;
    }

    navigateToFolder(folderId, folders);
  }, [folders, unlockedFolderIds, navigateToFolder]);

  // Locker Handlers
  const handleOpenLockModal = useCallback((mode, folder) => {
    setPendingFolderIdAfterUnlock(null);
    setLockModalState({ mode, folder });
  }, []);

  const handleUnlockSuccess = useCallback((unlockedId) => {
    setUnlockedFolderIds(prev => ({ ...prev, [unlockedId]: true }));
    const targetId = pendingFolderIdAfterUnlock || unlockedId;
    setPendingFolderIdAfterUnlock(null);
    navigateToFolder(targetId, folders);
  }, [pendingFolderIdAfterUnlock, folders, navigateToFolder]);

  const clearUnlockedAndRedirect = (folderId) => {
    setUnlockedFolderIds(prev => {
      const copy = { ...prev };
      delete copy[folderId];
      return copy;
    });
    setExpandedFolders(prev => ({ ...prev, [folderId]: false }));
    if (selectedFolderId === folderId) {
      const folder = folders.find(f => f.id === folderId);
      setSelectedFolderId(folder?.parentId || null);
    }
  };

  // First-time Master PIN creation + lock folder
  const handleSaveMasterAndLock = async (folderId, hashedMasterPin) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.uid), {
      masterPinHash: hashedMasterPin,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await updateDoc(doc(db, 'folders', folderId), {
      isLocked: true,
      useMasterPin: true,
      pinHash: null,
      updatedAt: serverTimestamp()
    });
    clearUnlockedAndRedirect(folderId);
  };

  // Lock folder using existing Master PIN
  const handleLockWithMaster = async (folderId) => {
    await updateDoc(doc(db, 'folders', folderId), {
      isLocked: true,
      useMasterPin: true,
      pinHash: null,
      updatedAt: serverTimestamp()
    });
    clearUnlockedAndRedirect(folderId);
  };

  // Lock folder using a folder-specific Custom PIN
  const handleLockWithCustom = async (folderId, customPinHash) => {
    await updateDoc(doc(db, 'folders', folderId), {
      isLocked: true,
      useMasterPin: false,
      pinHash: customPinHash,
      updatedAt: serverTimestamp()
    });
    clearUnlockedAndRedirect(folderId);
  };

  // Remove lock from folder
  const handleRemoveFolderPin = async (folderId) => {
    await updateDoc(doc(db, 'folders', folderId), {
      isLocked: false,
      useMasterPin: false,
      pinHash: null,
      updatedAt: serverTimestamp()
    });
    setUnlockedFolderIds(prev => {
      const copy = { ...prev };
      delete copy[folderId];
      return copy;
    });
  };

  const handleLockAllNow = useCallback(() => {
    setUnlockedFolderIds({});
    setExpandedFolders({});
    if (selectedFolderId && selectedFolderId !== 'favorites') {
      setSelectedFolderId(null);
    }
  }, [selectedFolderId]);

  const handleToggleExpand = useCallback((id, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openCreateFolderModal = useCallback((parentId = null) => {
    setEditingFolder(null);
    setParentFolderId(parentId === 'favorites' ? null : parentId);
    setIsFolderModalOpen(true);
  }, []);

  const openRenameFolderModal = useCallback((folder, e) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setParentFolderId(folder.parentId);
    setIsFolderModalOpen(true);
  }, []);

  const promptDeleteFolder = useCallback((folder, e) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'folder', item: folder });
  }, []);

  const promptDeleteLink = useCallback((link, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget({ type: 'link', item: link });
  }, []);

  const openAddLinkModal = useCallback(() => {
    setEditingLink(null);
    setIsLinkModalOpen(true);
  }, []);

  const openEditLinkModal = useCallback((link) => {
    setEditingLink(link);
    setIsLinkModalOpen(true);
  }, []);

  const handleToggleStar = useCallback(async (link) => {
    await updateDoc(doc(db, 'links', link.id), {
      isStarred: !link.isStarred,
      updatedAt: serverTimestamp()
    });
  }, []);

  const handleLogout = useCallback(() => {
    setUnlockedFolderIds({});
    signOut(auth);
  }, []);

  const handleOpenMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const handleCloseMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  const handleSaveFolder = async (name) => {
    if (!currentUser) return;
    const targetParent = parentFolderId;
    const targetEdit = editingFolder;

    setIsFolderModalOpen(false);
    setEditingFolder(null);

    if (targetEdit) {
      await updateDoc(doc(db, 'folders', targetEdit.id), {
        name,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'folders'), {
        name,
        parentId: targetParent,
        userId: currentUser.uid,
        isLocked: false,
        useMasterPin: false,
        pinHash: null,
        createdAt: serverTimestamp()
      });
      if (targetParent) {
        setExpandedFolders(prev => ({ ...prev, [targetParent]: true }));
      }
    }
  };

  const handleUpdateMasterPin = async (newMasterHash) => {
  if (!currentUser) return;
  await setDoc(doc(db, 'users', currentUser.uid), {
    masterPinHash: newMasterHash,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Re-lock active session folders so the new Master PIN takes effect immediately
  setUnlockedFolderIds({});
  setExpandedFolders({});
  if (selectedFolderId && selectedFolderId !== 'favorites') {
    setSelectedFolderId(null);
  }
};

  // Recursive Delete
  const deleteFolderRecursive = async (folderId) => {
    const childFolders = folders.filter(f => f.parentId === folderId);
    for (const child of childFolders) {
      await deleteFolderRecursive(child.id);
    }
    const folderLinks = links.filter(l => l.folderId === folderId);
    for (const l of folderLinks) {
      await deleteDoc(doc(db, 'links', l.id));
    }
    await deleteDoc(doc(db, 'folders', folderId));
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'folder') {
        await deleteFolderRecursive(deleteTarget.item.id);
        if (selectedFolderId === deleteTarget.item.id) {
          setSelectedFolderId(deleteTarget.item.parentId || null);
        }
      } else {
        await deleteDoc(doc(db, 'links', deleteTarget.item.id));
      }
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSaveLink = async ({ title, url, tags }) => {
    if (!currentUser) return;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    const tagsArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const targetEdit = editingLink;

    setEditingLink(null);
    setIsLinkModalOpen(false);

    if (targetEdit) {
      await updateDoc(doc(db, 'links', targetEdit.id), {
        title: title.trim(),
        url: formattedUrl,
        tags: tagsArray,
        updatedAt: serverTimestamp()
      });
    } else {
      const isFavoritesView = selectedFolderId === 'favorites';
      await addDoc(collection(db, 'links'), {
        title: title.trim(),
        url: formattedUrl,
        tags: tagsArray,
        folderId: isFavoritesView ? null : selectedFolderId,
        userId: currentUser.uid,
        isStarred: isFavoritesView,
        createdAt: serverTimestamp()
      });
    }
  };

  const matchesDateRange = useCallback((item) => {
    if (dateFilter === 'all') return true;
    const targetMs = sortBy === 'modified'
      ? getTimestampMs(item.updatedAt || item.createdAt)
      : getTimestampMs(item.createdAt);

    const now = new Date();
    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return targetMs >= startOfDay;
    }
    if (dateFilter === 'week') {
      return targetMs >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    if (dateFilter === 'month') {
      return targetMs >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  }, [dateFilter, sortBy]);

  const sortItems = useCallback((a, b) => {
    if (sortBy === 'oldest') {
      return getTimestampMs(a.createdAt) - getTimestampMs(b.createdAt);
    }
    if (sortBy === 'modified') {
      const aMod = getTimestampMs(a.updatedAt || a.createdAt);
      const bMod = getTimestampMs(b.updatedAt || b.createdAt);
      return bMod - aMod;
    }
    return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
  }, [sortBy]);

  const isFolderUnlockedInSession = useCallback((folderId) => {
    let currId = folderId;
    const visited = new Set();
    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const f = folders.find(item => item.id === currId);
      if (!f) break;
      if (f.isLocked && !unlockedFolderIds[f.id]) return false;
      currId = f.parentId;
    }
    return true;
  }, [folders, unlockedFolderIds]);

  const currentSubfolders = useMemo(() => {
    if (selectedFolderId === null || selectedFolderId === 'favorites') return [];
    return folders
      .filter(f =>
        f.parentId === selectedFolderId &&
        (debouncedSearch === '' || f.name.toLowerCase().includes(debouncedSearch)) &&
        matchesDateRange(f)
      )
      .sort(sortItems);
  }, [folders, selectedFolderId, debouncedSearch, matchesDateRange, sortItems]);

  const filteredLinks = useMemo(() => {
    return links
      .filter(link => {
        const matchesView = selectedFolderId === 'favorites'
          ? Boolean(link.isStarred) && (!link.folderId || isFolderUnlockedInSession(link.folderId))
          : selectedFolderId === null
            ? !link.folderId
            : link.folderId === selectedFolderId;

        const matchesSearch = debouncedSearch === '' ||
          link.title.toLowerCase().includes(debouncedSearch) ||
          link.url.toLowerCase().includes(debouncedSearch) ||
          (link.tags && link.tags.some(t => t.includes(debouncedSearch)));

        return matchesView && matchesSearch && matchesDateRange(link);
      })
      .sort(sortItems);
  }, [links, selectedFolderId, debouncedSearch, matchesDateRange, sortItems, isFolderUnlockedInSession]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden relative">
      <Sidebar
        currentUser={currentUser}
        isOpen={isMobileSidebarOpen}
        onClose={handleCloseMobileSidebar}
        folders={folders}
        links={links}
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        expandedFolders={expandedFolders}
        onToggleExpand={handleToggleExpand}
        unlockedFolderIds={unlockedFolderIds}
        hasMasterPin={Boolean(masterPinHash)}
        onOpenMasterPinModal={() => setIsMasterPinModalOpen(true)}
        onOpenLockModal={handleOpenLockModal}
        onLockNow={handleLockAllNow}
        onOpenCreateFolder={openCreateFolderModal}
        onOpenRenameFolder={openRenameFolderModal}
        onPromptDeleteFolder={promptDeleteFolder}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header
          selectedFolderId={selectedFolderId}
          breadcrumbs={breadcrumbs}
          onSelectFolder={handleSelectFolder}
          onOpenMobileSidebar={handleOpenMobileSidebar}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          onOpenCreateFolder={openCreateFolderModal}
          onOpenAddLink={openAddLinkModal}
        />

        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-6">
          <FolderGrid
            subfolders={currentSubfolders}
            allFolders={folders}
            allLinks={links}
            unlockedFolderIds={unlockedFolderIds}
            onOpenLockModal={handleOpenLockModal}
            onSelectFolder={handleSelectFolder}
            onRenameFolder={openRenameFolderModal}
            onDeleteFolder={promptDeleteFolder}
          />

          <LinkGrid
            links={filteredLinks}
            subfoldersCount={currentSubfolders.length}
            allFolders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onToggleStar={handleToggleStar}
            onEditLink={openEditLinkModal}
            onDeleteLink={promptDeleteLink}
            onOpenAddLink={openAddLinkModal}
            onOpenCreateFolder={openCreateFolderModal}
          />
        </div>
      </main>

      <Suspense fallback={null}>
        {deleteTarget && (
          <DeleteConfirmModal
            deleteTarget={deleteTarget}
            isDeleting={isDeleting}
            userId={currentUser.uid}
            masterPinHash={masterPinHash}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleConfirmDelete}
          />
        )}

        {lockModalState && (
          <FolderLockModal
            lockModalState={lockModalState}
            userId={currentUser.uid}
            masterPinHash={masterPinHash}
            onClose={() => {
              setLockModalState(null);
              setPendingFolderIdAfterUnlock(null);
            }}
            onUnlockSuccess={handleUnlockSuccess}
            onSaveMasterAndLock={handleSaveMasterAndLock}
            onLockWithMaster={handleLockWithMaster}
            onLockWithCustom={handleLockWithCustom}
            onRemovePin={handleRemoveFolderPin}
          />
        )}

        {isFolderModalOpen && (
          <FolderModal
            isOpen={isFolderModalOpen}
            editingFolder={editingFolder}
            parentFolderId={parentFolderId}
            onClose={() => {
              setIsFolderModalOpen(false);
              setEditingFolder(null);
            }}
            onSave={handleSaveFolder}
          />
        )}

        {isLinkModalOpen && (
          <LinkModal
            isOpen={isLinkModalOpen}
            editingLink={editingLink}
            isFavoritesView={selectedFolderId === 'favorites'}
            onClose={() => {
              setIsLinkModalOpen(false);
              setEditingLink(null);
            }}
            onSave={handleSaveLink}
          />
        )}

        {isMasterPinModalOpen && (
  <MasterPinModal
    isOpen={isMasterPinModalOpen}
    userId={currentUser.uid}
    masterPinHash={masterPinHash}
    onClose={() => setIsMasterPinModalOpen(false)}
    onUpdateMasterPin={handleUpdateMasterPin}
  />
   )}
      </Suspense>
    </div>
  );
}