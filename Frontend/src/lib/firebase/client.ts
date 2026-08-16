import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseIsConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseIsConfigured() || typeof window === "undefined") return null;

  return getApps().find((app) => app.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export interface FirebaseUserProfile {
  name: string;
  email: string | null;
  photoUrl: string | null;
}

export function getFirebaseUserProfile(user: User): FirebaseUserProfile {
  return {
    name: user.displayName?.trim() || user.email?.split("@", 1)[0] || "Candidate",
    email: user.email,
    photoUrl: user.photoURL,
  };
}

let persistencePromise: Promise<void> | null = null;

export async function ensureLocalAuthPersistence(auth: Auth) {
  persistencePromise ??= setPersistence(auth, browserLocalPersistence);
  await persistencePromise;
}

export async function signInWithGoogle(withCalendarScope = true): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  await ensureLocalAuthPersistence(auth);
  const provider = new GoogleAuthProvider();
  if (withCalendarScope) {
    provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
    provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");
  }
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

/** Used by the RTK Query baseQuery to attach `Authorization: Bearer <token>`. */
export async function getIdToken(): Promise<string | null> {
  const user = getFirebaseAuth()?.currentUser;
  return user ? user.getIdToken() : null;
}

export function subscribeToFirebaseAuth(onUserChanged: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return auth ? onAuthStateChanged(auth, onUserChanged) : () => undefined;
}

export async function signInWithEmailPassword(email: string, pass: string): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  await ensureLocalAuthPersistence(auth);
  return firebaseSignInWithEmailAndPassword(auth, email, pass);
}

export async function signUpWithEmailPassword(name: string, email: string, pass: string): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  await ensureLocalAuthPersistence(auth);
  const credential = await firebaseCreateUserWithEmailAndPassword(auth, email, pass);
  if (credential.user && name) {
    await updateProfile(credential.user, { displayName: name });
  }
  return credential;
}

export async function signOutFromGoogle() {
  const auth = getFirebaseAuth();
  if (auth) await firebaseSignOut(auth);
}
