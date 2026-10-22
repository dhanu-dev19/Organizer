import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  ExternalLink,
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
  Globe,
  Menu,
  X
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
  apiKey: "AIzaSyAVgASm8uwkTsry8UY6UIv3ZxR-r1wBulg",
  authDomain: "organizer-65170.firebaseapp.com",
  projectId: "organizer-65170",
  storageBucket: "organizer-65170.firebasestorage.app",
  messagingSenderId: "695008460380",
  appId: "1:695008460380:web:7d3140ea3103535267b099",
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

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTags, setLinkTags] = useState('');

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
      { name: 'Instant Links', parentId: null, userId: uid },
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

  // Folder Operations
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentUser) return;

    await addDoc(collection(db, 'folders'), {
      name: newFolderName.trim(),
      parentId: parentFolderId,
      userId: currentUser.uid,
      createdAt: serverTimestamp()
    });

    if (parentFolderId) {
      setExpandedFolders(prev => ({ ...prev, [parentFolderId]: true }));
    }

    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this folder and all its contents?")) return;

    const childFolders = folders.filter(f => f.parentId === folderId);
    for (const child of childFolders) {
      await handleDeleteFolder(child.id, e);
    }

    const folderLinks = links.filter(l => l.folderId === folderId);
    for (const l of folderLinks) {
      await deleteDoc(doc(db, 'links', l.id));
    }

    await deleteDoc(doc(db, 'folders', folderId));
    if (selectedFolderId === folderId) setSelectedFolderId(null);
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

  const handleDeleteLink = async (linkId) => {
    if (!window.confirm("Delete this bookmark?")) return;
    await deleteDoc(doc(db, 'links', linkId));
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

  const filteredLinks = links.filter(link => {
    const matchesFolder = selectedFolderId === null || link.folderId === selectedFolderId;
    const matchesSearch = searchQuery === '' ||
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.tags && link.tags.some(t => t.includes(searchQuery.toLowerCase())));
    return matchesFolder && matchesSearch;
  });

  const renderFolderTree = (parentId = null, depth = 0) => {
    const currentLevelFolders = folders.filter(f => f.parentId === parentId);
    if (currentLevelFolders.length === 0) return null;

    return (
      <div className={`space-y-1 ${depth > 0 ? 'ml-3 border-l border-slate-200 pl-2' : ''}`}>
        {currentLevelFolders.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isExpanded = !!expandedFolders[folder.id];
          const isSelected = selectedFolderId === folder.id;

          return (
            <div key={folder.id} className="group flex flex-col">
              <div
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  {hasChildren ? (
                    <button
                      onClick={(e) => toggleFolderExpand(folder.id, e)}
                      className="p-0.5 hover:bg-slate-200 rounded"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-3.5" />
                  )}
                  {folder.name.toLowerCase().includes('youtube') || folder.name.toLowerCase().includes('video') ? (
                    <Video className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <Folder className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'} shrink-0`} />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                  <button
                    title="Add Subfolder"
                    onClick={(e) => {
                      e.stopPropagation();
                      setParentFolderId(folder.id);
                      setIsFolderModalOpen(true);
                    }}
                    className="p-1 hover:text-blue-600 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Delete Folder"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    className="p-1 hover:text-red-600 rounded"
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar (Drawer on Mobile, Fixed Sidebar on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <Bookmark className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-wide">Organizer</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                title="Add Root Folder"
                onClick={() => {
                  setParentFolderId(null);
                  setIsFolderModalOpen(true);
                }}
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
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
            <button
              onClick={() => {
                setSelectedFolderId(null);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm transition ${
                selectedFolderId === null
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>All Bookmarks</span>
            </button>

            <div>
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Folders</span>
              </div>
              {renderFolderTree(null)}
            </div>
          </div>
        </div>

        {/* User bar & Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-medium text-slate-800 truncate">{currentUser.email || 'User'}</p>
              <p className="text-[10px] text-slate-400">Logged In</p>
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
        {/* Header Bar */}
        <header className="border-b border-slate-200 bg-white px-3 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden"
                aria-label="Open folder navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
              <h2 className="text-sm sm:text-base font-semibold text-slate-800 truncate max-w-[160px] sm:max-w-xs">
                {selectedFolderId
                  ? (folders.find(f => f.id === selectedFolderId)?.name || 'Folder')
                  : 'All Bookmarks'}
              </h2>
              <span className="text-[11px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full">
                {filteredLinks.length}
              </span>
            </div>

            <button
              onClick={() => {
                setEditingLink(null);
                setLinkTitle('');
                setLinkUrl('');
                setLinkTags('');
                setIsLinkModalOpen(true);
              }}
              className="flex items-center space-x-1 sm:space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg transition shadow-sm shrink-0 sm:hidden"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search links, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <button
              onClick={() => {
                setEditingLink(null);
                setLinkTitle('');
                setLinkUrl('');
                setLinkTags('');
                setIsLinkModalOpen(true);
              }}
              className="hidden sm:flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Link</span>
            </button>
          </div>
        </header>

        {/* Links Content */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
          {filteredLinks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No links in this view</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Save articles, videos, documentation, and tools by clicking Add Link above.
              </p>
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
                    className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 truncate">
                          <img
                            src={favicon}
                            alt=""
                            onError={(e) => { e.target.style.display = 'none'; }}
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded shrink-0"
                          />
                          <h4 className="font-semibold text-xs sm:text-sm text-slate-800 truncate" title={link.title}>
                            {link.title}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleToggleStar(link)}
                          className={`p-1 rounded shrink-0 ${link.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] sm:text-xs text-slate-400 hover:text-blue-600 flex items-center space-x-1 mt-1 truncate"
                      >
                        <span className="truncate">{link.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
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
                      <span className="text-[10px] sm:text-[11px] truncate max-w-[120px]">{domain}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          title="Copy Link"
                          onClick={() => handleCopy(link.url, link.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded transition"
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
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete Link"
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition"
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
      </main>

      {/* MODAL: ADD FOLDER */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">
              {parentFolderId ? 'Create Subfolder' : 'Create Folder'}
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Create
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="dev, video, tutorial"
                  value={linkTags}
                  onChange={(e) => setLinkTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
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
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
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