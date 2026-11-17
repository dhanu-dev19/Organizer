import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  Trash2,
  Edit3,
  Search,
  Plus,
  LogOut,
  ChevronRight,
  ChevronDown,
  Bookmark,
  Copy,
  Check,
  Video,
  FolderOpen,
  Lock,
  Mail,
  User,
  Tag,
  Star,
  Zap,
  Menu,
  X,
  AlertTriangle,
  Pencil,
  ArrowUpRight
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

// 1. Firebase Initialization
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAVgASm8uwkTsry8UY6UIv3ZxR-r1wBulg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "organizer-65170.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "organizer-65170",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "organizer-65170.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "695008460380",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:695008460380:web:7d3140ea3103535267b099",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth form states
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core App states
  const [folders, setFolders] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Folder Create / Rename Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);

  // Link Create / Edit Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTags, setLinkTags] = useState('');

  // Unified Custom Confirmation Modal State: { type: 'folder' | 'link', item: Object }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track authentication state
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

  // Listen to User Folders
  useEffect(() => {
    if (!currentUser) return;

    const foldersQuery = query(
      collection(db, 'folders'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
      const fetchedFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFolders(fetchedFolders);

      if (fetchedFolders.length === 0) {
        seedDefaultFolders(currentUser.uid);
      }
    }, (err) => {
      console.error("Folders fetch error:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to User Links
  useEffect(() => {
    if (!currentUser) return;

    const linksQuery = query(
      collection(db, 'links'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(linksQuery, (snapshot) => {
      const fetchedLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLinks(fetchedLinks);
    }, (err) => {
      console.error("Links fetch error:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const seedDefaultFolders = async (uid) => {
    const defaults = [
      { name: 'YouTube & Video', parentId: null, userId: uid },
      { name: 'Work & Projects', parentId: null, userId: uid }
    ];
    for (const folder of defaults) {
      await addDoc(collection(db, 'folders'), {
        ...folder,
        createdAt: serverTimestamp()
      });
    }
  };

  // Auth Handlers
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Build Breadcrumb Trail for current folder
  const breadcrumbs = useMemo(() => {
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

  // Select folder & auto-expand its parents in sidebar
  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId);
    setIsMobileSidebarOpen(false);

    if (folderId) {
      const toExpand = {};
      let curr = folders.find(f => f.id === folderId);
      while (curr && curr.parentId) {
        toExpand[curr.parentId] = true;
        curr = folders.find(f => f.id === curr.parentId);
      }
      setExpandedFolders(prev => ({ ...prev, ...toExpand, [folderId]: true }));
    }
  };

  // Open Create or Rename Folder Modal
  const openCreateFolderModal = (parentId = null) => {
    setEditingFolder(null);
    setParentFolderId(parentId);
    setFolderNameInput('');
    setIsFolderModalOpen(true);
  };

  const openRenameFolderModal = (folder, e) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setParentFolderId(folder.parentId);
    setFolderNameInput(folder.name);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = async (e) => {
    e.preventDefault();
    if (!folderNameInput.trim() || !currentUser) return;

    if (editingFolder) {
      await updateDoc(doc(db, 'folders', editingFolder.id), {
        name: folderNameInput.trim(),
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'folders'), {
        name: folderNameInput.trim(),
        parentId: parentFolderId,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });

      if (parentFolderId) {
        setExpandedFolders(prev => ({ ...prev, [parentFolderId]: true }));
      }
    }

    setFolderNameInput('');
    setEditingFolder(null);
    setIsFolderModalOpen(false);
  };

  // Recursive folder deletion helper
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

  // Prompt confirmation popup for folders
  const promptDeleteFolder = (folder, e) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'folder', item: folder });
  };

  // Prompt confirmation popup for links
  const promptDeleteLink = (link, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget({ type: 'link', item: link });
  };

  // Execute confirmed deletion for either folder or link
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'folder') {
        await deleteFolderRecursive(deleteTarget.item.id);
        if (selectedFolderId === deleteTarget.item.id) {
          setSelectedFolderId(deleteTarget.item.parentId || null);
        }
      } else if (deleteTarget.type === 'link') {
        await deleteDoc(doc(db, 'links', deleteTarget.item.id));
      }
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Link Operations
  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim() || !currentUser) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const tagsArray = linkTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    if (editingLink) {
      await updateDoc(doc(db, 'links', editingLink.id), {
        title: linkTitle.trim(),
        url: formattedUrl,
        tags: tagsArray,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'links'), {
        title: linkTitle.trim(),
        url: formattedUrl,
        tags: tagsArray,
        folderId: selectedFolderId,
        userId: currentUser.uid,
        isStarred: false,
        createdAt: serverTimestamp()
      });
    }

    setLinkTitle('');
    setLinkUrl('');
    setLinkTags('');
    setEditingLink(null);
    setIsLinkModalOpen(false);
  };

  const handleToggleStar = async (link) => {
    await updateDoc(doc(db, 'links', link.id), {
      isStarred: !link.isStarred
    });
  };

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleFolderExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Subfolders inside the currently selected folder
  const currentSubfolders = useMemo(() => {
    if (selectedFolderId === null) return [];
    return folders.filter(f => {
      const matchesParent = f.parentId === selectedFolderId;
      const matchesSearch = searchQuery === '' || f.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesParent && matchesSearch;
    });
  }, [folders, selectedFolderId, searchQuery]);

  // Links inside the currently selected folder
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      const matchesFolder = selectedFolderId === null
        ? (!link.folderId || link.folderId === null)
        : link.folderId === selectedFolderId;

      const matchesSearch = searchQuery === '' ||
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (link.tags && link.tags.some(t => t.includes(searchQuery.toLowerCase())));

      return matchesFolder && matchesSearch;
    });
  }, [links, selectedFolderId, searchQuery]);

  // Sidebar Recursive Tree Renderer
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
                onClick={() => handleSelectFolder(folder.id)}
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
                      onClick={(e) => toggleFolderExpand(folder.id, e)}
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

                {/* Action buttons: visible on mobile, reveal smoothly on desktop hover */}
                <div className="flex items-center space-x-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    title="Add Subfolder"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateFolderModal(folder.id);
                    }}
                    className="p-1 hover:text-blue-600 hover:bg-blue-100/70 active:scale-95 rounded text-slate-400 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Rename Folder"
                    onClick={(e) => openRenameFolderModal(folder, e)}
                    className="p-1 hover:text-slate-700 hover:bg-slate-200/70 active:scale-95 rounded text-slate-400 transition"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Delete Folder"
                    onClick={(e) => promptDeleteFolder(folder, e)}
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Auth Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 border border-slate-100">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 text-blue-600 rounded-2xl mb-3">
              <Bookmark className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Link Organizer</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Please sign in to access and manage your bookmarks
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition shadow-md shadow-blue-500/20"
            >
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="my-4 flex items-center">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-3 text-xs text-slate-400 font-medium">OR</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-xs text-slate-500 mt-5">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden relative">

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar (Drawer on Mobile, Fixed Sidebar on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
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
                onClick={() => openCreateFolderModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation & Folders list */}
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            <button
              onClick={() => handleSelectFolder(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                selectedFolderId === null
                  ? 'bg-amber-50 text-amber-800 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Zap className={`w-4 h-4 ${selectedFolderId === null ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>Instant Links</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {links.filter(l => !l.folderId).length}
              </span>
            </button>

            <div>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Folders</span>
                <button
                  onClick={() => openCreateFolderModal(null)}
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
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header Bar with Breadcrumbs */}
        <header className="border-b border-slate-200 bg-white px-3 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden shrink-0"
                aria-label="Open folder navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Root Breadcrumb */}
              <button
                onClick={() => handleSelectFolder(null)}
                className={`flex items-center space-x-1.5 text-xs sm:text-sm px-2 py-1 rounded-md transition shrink-0 ${
                  selectedFolderId === null
                    ? 'font-semibold text-slate-800 bg-slate-100/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Instant Links</span>
              </button>

              {/* Dynamic Folder Path Breadcrumbs */}
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <button
                      onClick={() => handleSelectFolder(crumb.id)}
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
            </div>

            {/* Mobile Quick Action Button */}
            <button
              onClick={() => {
                setEditingLink(null);
                setLinkTitle('');
                setLinkUrl('');
                setLinkTags('');
                setIsLinkModalOpen(true);
              }}
              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition shadow-xs shrink-0 sm:hidden ml-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          {/* Search & Desktop Action Buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56 lg:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Search in view..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* New Subfolder Button (when inside any folder) */}
            {selectedFolderId !== null && (
              <button
                onClick={() => openCreateFolderModal(selectedFolderId)}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium px-3 py-1.5 sm:py-2 rounded-lg transition shrink-0"
                title="Create Subfolder Here"
              >
                <FolderPlus className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">Subfolder</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingLink(null);
                setLinkTitle('');
                setLinkUrl('');
                setLinkTags('');
                setIsLinkModalOpen(true);
              }}
              className="hidden sm:flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Link</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Body: Subfolders + Links */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-6">

          {/* SECTION 1: SUBFOLDERS IN THIS DIRECTORY */}
          {currentSubfolders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Folders ({currentSubfolders.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {currentSubfolders.map(sub => {
                  const childFolderCount = folders.filter(f => f.parentId === sub.id).length;
                  const childLinkCount = links.filter(l => l.folderId === sub.id).length;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectFolder(sub.id)}
                      className="group bg-white border border-slate-200/90 hover:border-blue-300 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all duration-150"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                          {sub.name.toLowerCase().includes('youtube') || sub.name.toLowerCase().includes('video') ? (
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
                            {childFolderCount > 0 ? `${childFolderCount} folders · ` : ''}
                            {childLinkCount} {childLinkCount === 1 ? 'link' : 'links'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5 shrink-0 ml-2">
                        <button
                          title="Rename Folder"
                          onClick={(e) => openRenameFolderModal(sub, e)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Folder"
                          onClick={(e) => promptDeleteFolder(sub, e)}
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
          )}

          {/* SECTION 2: BOOKMARKS / LINKS */}
          <div>
            {(currentSubfolders.length > 0 || filteredLinks.length > 0) && (
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Links ({filteredLinks.length})
                </h3>
              </div>
            )}

            {filteredLinks.length === 0 && currentSubfolders.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center p-4 bg-white border border-dashed border-slate-200 rounded-2xl">
                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3">
                  <Bookmark className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">This space is empty</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                  {selectedFolderId === null
                    ? 'Save your frequently used instant links here for single-click access.'
                    : 'Organize this folder by adding links or creating nested subfolders.'}
                </p>
                <div className="flex items-center space-x-2">
                  {selectedFolderId !== null && (
                    <button
                      onClick={() => openCreateFolderModal(selectedFolderId)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition flex items-center space-x-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Subfolder</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingLink(null);
                      setLinkTitle('');
                      setLinkUrl('');
                      setLinkTags('');
                      setIsLinkModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition flex items-center space-x-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="py-8 text-center bg-white/60 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400">No direct links in this folder yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredLinks.map(link => {
                  let domain = '';
                  try {
                    domain = new URL(link.url).hostname;
                  } catch {
                    domain = link.url;
                  }
                  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

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
                              onError={(e) => { e.target.style.display = 'none'; }}
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded shrink-0"
                            />
                            <h4 className="font-semibold text-xs sm:text-sm text-slate-800 group-hover/title:text-blue-600 truncate transition-colors" title={link.title}>
                              {link.title}
                            </h4>
                          </a>
                          <button
                            onClick={() => handleToggleStar(link)}
                            className={`p-1 rounded shrink-0 transition ${link.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
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
                        <span className="text-[10px] sm:text-[11px] truncate max-w-[130px]">{domain}</span>
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
                            onClick={() => {
                              setEditingLink(link);
                              setLinkTitle(link.title);
                              setLinkUrl(link.url);
                              setLinkTags(link.tags ? link.tags.join(', ') : '');
                              setIsLinkModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete Link"
                            onClick={(e) => promptDeleteLink(link, e)}
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
            )}
          </div>
        </div>
      </main>

      {/* UNIFIED CUSTOM CONFIRMATION MODAL FOR FOLDERS & LINKS */}
      {deleteTarget && (
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
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
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
      )}

      {/* MODAL: CREATE / RENAME FOLDER */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">
              {editingFolder
                ? 'Rename Folder'
                : parentFolderId
                  ? 'Create Subfolder'
                  : 'Create Folder'}
            </h3>
            <form onSubmit={handleSaveFolder} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Folder name..."
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFolderModalOpen(false);
                    setEditingFolder(null);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {editingFolder ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT LINK */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">
              {editingLink ? 'Edit Bookmark' : 'Add New Bookmark'}
            </h3>
            <form onSubmit={handleSaveLink} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., GitHub, React Documentation"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="dev, video, tutorial"
                  value={linkTags}
                  onChange={(e) => setLinkTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {editingLink ? 'Save Changes' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}