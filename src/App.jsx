import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, query, where, onSnapshot, addDoc,
  deleteDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FolderGrid from './components/FolderGrid';
import LinkGrid from './components/LinkGrid';

// Lazy-load AuthScreen and Modals so they don't bloat the initial JS bundle
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const DeleteConfirmModal = lazy(() => import('./components/Modals').then(m => ({ default: m.DeleteConfirmModal })));
const FolderModal = lazy(() => import('./components/Modals').then(m => ({ default: m.FolderModal })));
const LinkModal = lazy(() => import('./components/Modals').then(m => ({ default: m.LinkModal })));

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [folders, setFolders] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  // Instant input state + debounced search filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal States
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [parentFolderId, setParentFolderId] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query by 200ms
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
      }
    });
    return () => unsubscribe();
  }, []);

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

  // Stable Callbacks for Memoized Children
  const handleSelectFolder = useCallback((folderId) => {
    setSelectedFolderId(folderId);
    setIsMobileSidebarOpen(false);

    if (folderId && folderId !== 'favorites') {
      setFolders(currentFolders => {
        const toExpand = {};
        let curr = currentFolders.find(f => f.id === folderId);
        while (curr && curr.parentId) {
          toExpand[curr.parentId] = true;
          curr = currentFolders.find(f => f.id === curr.parentId);
        }
        setExpandedFolders(prev => ({ ...prev, ...toExpand, [folderId]: true }));
        return currentFolders;
      });
    }
  }, []);

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
    await updateDoc(doc(db, 'links', link.id), { isStarred: !link.isStarred });
  }, []);

  const handleLogout = useCallback(() => signOut(auth), []);
  const handleOpenMobileSidebar = useCallback(() => setIsMobileSidebarOpen(true), []);
  const handleCloseMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  const handleSaveFolder = async (name) => {
    if (!currentUser) return;
    if (editingFolder) {
      await updateDoc(doc(db, 'folders', editingFolder.id), {
        name,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'folders'), {
        name,
        parentId: parentFolderId,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      if (parentFolderId) {
        setExpandedFolders(prev => ({ ...prev, [parentFolderId]: true }));
      }
    }
    setIsFolderModalOpen(false);
    setEditingFolder(null);
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

    if (editingLink) {
      await updateDoc(doc(db, 'links', editingLink.id), {
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
    setEditingLink(null);
    setIsLinkModalOpen(false);
  };

  // Memoized Filtered Views using debouncedSearch
  const currentSubfolders = useMemo(() => {
    if (selectedFolderId === null || selectedFolderId === 'favorites') return [];
    return folders.filter(f =>
      f.parentId === selectedFolderId &&
      (debouncedSearch === '' || f.name.toLowerCase().includes(debouncedSearch))
    );
  }, [folders, selectedFolderId, debouncedSearch]);

  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const matchesView = selectedFolderId === 'favorites'
        ? Boolean(link.isStarred)
        : selectedFolderId === null
          ? !link.folderId
          : link.folderId === selectedFolderId;

      const matchesSearch = debouncedSearch === '' ||
        link.title.toLowerCase().includes(debouncedSearch) ||
        link.url.toLowerCase().includes(debouncedSearch) ||
        (link.tags && link.tags.some(t => t.includes(debouncedSearch)));

      return matchesView && matchesSearch;
    });
  }, [links, selectedFolderId, debouncedSearch]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <AuthScreen />
      </Suspense>
    );
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
          onOpenCreateFolder={openCreateFolderModal}
          onOpenAddLink={openAddLinkModal}
        />

        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-6">
          <FolderGrid
            subfolders={currentSubfolders}
            allFolders={folders}
            allLinks={links}
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
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleConfirmDelete}
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
      </Suspense>
    </div>
  );
}