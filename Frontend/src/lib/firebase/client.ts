import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type UserCredential } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseIsConfigured() {
  return Object.values(firebaseConfig).every(Boolean);
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  if (!firebaseIsConfigured()) return null;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

/** Used by the RTK Query baseQuery to attach `Authorization: Bearer <token>`. */
export async function getIdToken(): Promise<string | null> {
  if (!firebaseIsConfigured()) return null;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const user = getAuth(app).currentUser;
  return user ? user.getIdToken() : null;
}
