import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, query, where, onSnapshot, addDoc,
  deleteDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FolderGrid from './components/FolderGrid';
import LinkGrid from './components/LinkGrid';
import { DeleteConfirmModal, FolderModal, LinkModal } from './components/Modals';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core Data States
  const [folders, setFolders] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [parentFolderId, setParentFolderId] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Folder Navigation & Actions
  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
    setIsMobileSidebarOpen(false);

    if (folderId && folderId !== 'favorites') {
      const toExpand = {};
      let curr = folders.find(f => f.id === folderId);
      while (curr && curr.parentId) {
        toExpand[curr.parentId] = true;
        curr = folders.find(f => f.id === curr.parentId);
      }
      setExpandedFolders(prev => ({ ...prev, ...toExpand, [folderId]: true }));
    }
  };

  const openCreateFolderModal = (parentId = null) => {
    setEditingFolder(null);
    setParentFolderId(parentId === 'favorites' ? null : parentId);
    setIsFolderModalOpen(true);
  };

  const openRenameFolderModal = (folder, e) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setParentFolderId(folder.parentId);
    setIsFolderModalOpen(true);
  };

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

  // Link Actions
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

  const handleToggleStar = async (link) => {
    await updateDoc(doc(db, 'links', link.id), { isStarred: !link.isStarred });
  };

  // Filtered Views
  const currentSubfolders = useMemo(() => {
    if (selectedFolderId === null || selectedFolderId === 'favorites') return [];
    return folders.filter(f =>
      f.parentId === selectedFolderId &&
      (searchQuery === '' || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [folders, selectedFolderId, searchQuery]);

  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const matchesView = selectedFolderId === 'favorites'
        ? Boolean(link.isStarred)
        : selectedFolderId === null
          ? !link.folderId
          : link.folderId === selectedFolderId;

      const matchesSearch = searchQuery === '' ||
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (link.tags && link.tags.some(t => t.includes(searchQuery.toLowerCase())));

      return matchesView && matchesSearch;
    });
  }, [links, selectedFolderId, searchQuery]);

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
        onClose={() => setIsMobileSidebarOpen(false)}
        folders={folders}
        links={links}
        selectedFolderId={selectedFolderId}
        onSelectFolder={handleSelectFolder}
        expandedFolders={expandedFolders}
        onToggleExpand={(id, e) => {
          e.stopPropagation();
          setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
        }}
        onOpenCreateFolder={openCreateFolderModal}
        onOpenRenameFolder={openRenameFolderModal}
        onPromptDeleteFolder={(folder, e) => {
          e.stopPropagation();
          setDeleteTarget({ type: 'folder', item: folder });
        }}
        onLogout={() => signOut(auth)}
      />

      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header
          selectedFolderId={selectedFolderId}
          breadcrumbs={breadcrumbs}
          onSelectFolder={handleSelectFolder}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateFolder={openCreateFolderModal}
          onOpenAddLink={() => {
            setEditingLink(null);
            setIsLinkModalOpen(true);
          }}
        />

        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-6">
          <FolderGrid
            subfolders={currentSubfolders}
            allFolders={folders}
            allLinks={links}
            onSelectFolder={handleSelectFolder}
            onRenameFolder={openRenameFolderModal}
            onDeleteFolder={(folder, e) => {
              e.stopPropagation();
              setDeleteTarget({ type: 'folder', item: folder });
            }}
          />

          <LinkGrid
            links={filteredLinks}
            subfoldersCount={currentSubfolders.length}
            allFolders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onToggleStar={handleToggleStar}
            onEditLink={(link) => {
              setEditingLink(link);
              setIsLinkModalOpen(true);
            }}
            onDeleteLink={(link, e) => {
              if (e) e.stopPropagation();
              setDeleteTarget({ type: 'link', item: link });
            }}
            onOpenAddLink={() => {
              setEditingLink(null);
              setIsLinkModalOpen(true);
            }}
            onOpenCreateFolder={openCreateFolderModal}
          />
        </div>
      </main>

      <DeleteConfirmModal
        deleteTarget={deleteTarget}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

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
    </div>
  );
}