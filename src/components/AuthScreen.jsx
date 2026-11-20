import React, { useState, useEffect } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import BrandLogo from './BrandLogo';

// Syncs user's email & displayName to Firestore (creates profile for new users, logs in existing users)
async function syncUserProfileToFirestore(user, isNewUserFlag = false) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  const existingSnap = await getDoc(userRef);

  const fallbackName =
    user.displayName ||
    (user.email ? user.email.split('@')[0] : 'LinkStack User');

  if (!existingSnap.exists() || isNewUserFlag) {
    // New user: store fetched email, name, and avatar
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: fallbackName,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      },
      { merge: true }
    );
  } else {
    // Existing user: treat as login and backfill name/email if missing without touching masterPinHash
    const data = existingSnap.data();
    await setDoc(
      userRef,
      {
        email: user.email || data.email || '',
        displayName: data.displayName || fallbackName,
        photoURL: user.photoURL || data.photoURL || null,
        lastLoginAt: serverTimestamp()
      },
      { merge: true }
    );
  }
}

export default function AuthScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);

  // Handle mobile/popup-blocked Google redirect sign-in completion on page reload
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const additionalInfo = getAdditionalUserInfo(result);
          await syncUserProfileToFirestore(result.user, Boolean(additionalInfo?.isNewUser));
        }
      })
      .catch((err) => {
        if (isMounted && err?.code !== 'auth/popup-closed-by-user') {
          setAuthError(formatFirebaseError(err));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatFirebaseError = (err) => {
    const code = err?.code || '';
    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized for Google Sign-In. Add your domain in Firebase Console → Authentication → Settings → Authorized domains.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Google Sign-In is disabled in Firebase Console. Enable Google under Authentication → Sign-in method.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return 'An account already exists with this email using a password. Sign in with your email & password first.';
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Google sign-in popup was closed before completing.';
    }
    return (err?.message || 'Authentication failed').replace('Firebase: ', '');
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (loadingAction) return;
    setAuthError('');
    setLoadingAction('email');
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const cleanName = fullName.trim() || authEmail.split('@')[0];
        await updateProfile(cred.user, { displayName: cleanName });
        await syncUserProfileToFirestore({ ...cred.user, displayName: cleanName }, true);
      } else {
        const cred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        await syncUserProfileToFirestore(cred.user, false);
      }
    } catch (err) {
      setAuthError(formatFirebaseError(err));
      setLoadingAction(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loadingAction) return;
    setAuthError('');
    setLoadingAction('google');

    // Always prompt account picker & request email + profile scopes
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      await syncUserProfileToFirestore(result.user, Boolean(additionalInfo?.isNewUser));
    } catch (err) {
      // Automatically fall back to redirect flow if popup is blocked by browser
      if (err?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setAuthError(formatFirebaseError(redirectErr));
        }
      } else {
        setAuthError(formatFirebaseError(err));
      }
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 border border-slate-100">
        <div className="text-center mb-6">
          <BrandLogo className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 drop-shadow-md" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Link<span className="text-blue-600">Stack</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isRegistering
              ? 'Create your account to organize & secure your links'
              : 'Please sign in to access and manage your bookmarks'}
          </p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl leading-relaxed">
            {authError}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  disabled={Boolean(loadingAction)}
                  placeholder="Dhanush"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                disabled={Boolean(loadingAction)}
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
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
                disabled={Boolean(loadingAction)}
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={Boolean(loadingAction)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
          >
            {loadingAction === 'email' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isRegistering ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="my-4 flex items-center">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-3 text-xs text-slate-400 font-medium">OR</span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={Boolean(loadingAction)}
          className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-medium rounded-xl text-sm transition flex items-center justify-center space-x-2"
        >
          {loadingAction === 'google' ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500 mt-5">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => {
              setIsRegistering(!isRegistering);
              setAuthError('');
            }}
            className="text-blue-600 font-semibold hover:underline disabled:opacity-60"
          >
            {isRegistering ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}