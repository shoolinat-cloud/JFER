import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

import {
  getStorage,
  type Storage,
} from "firebase-admin/storage";

/**
 * Initialize Firebase Admin only when it is actually used.
 *
 * This prevents Next.js from trying to initialize Firebase Admin
 * while collecting page data during the production build.
 */
function getFirebaseAdminApp(): App {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return getApp();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID;

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL;

  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY;

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET;

  if (
    !projectId ||
    !clientEmail ||
    !privateKey ||
    !storageBucket
  ) {
    throw new Error(
      "Missing Firebase Admin environment variables."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(
        /\\n/g,
        "\n"
      ),
    }),
    storageBucket,
  });
}

/**
 * Get Firebase Admin Auth.
 */
function getAdminAuth(): Auth {
  return getAuth(
    getFirebaseAdminApp()
  );
}

/**
 * Get Firebase Admin Firestore.
 */
function getAdminFirestore(): Firestore {
  return getFirestore(
    getFirebaseAdminApp()
  );
}

/**
 * Get Firebase Admin Storage.
 */
function getAdminStorage(): Storage {
  return getStorage(
    getFirebaseAdminApp()
  );
}

/**
 * Lazy Firebase Admin Auth proxy.
 *
 * Keeps the existing API:
 *
 * adminAuth.verifyIdToken(...)
 * adminAuth.getUserByEmail(...)
 * adminAuth.createUser(...)
 */
export const adminAuth =
  new Proxy({} as Auth, {
    get(
      _target,
      property,
      _receiver
    ) {
      const auth = getAdminAuth();

      const value = Reflect.get(
        auth,
        property,
        auth
      );

      if (
        typeof value === "function"
      ) {
        return value.bind(auth);
      }

      return value;
    },
  });

/**
 * Lazy Firebase Admin Firestore proxy.
 *
 * Keeps the existing API:
 *
 * adminFirestore
 *   .collection(...)
 *   .doc(...)
 *   .get()
 */
export const adminFirestore =
  new Proxy({} as Firestore, {
    get(
      _target,
      property,
      _receiver
    ) {
      const firestore =
        getAdminFirestore();

      const value = Reflect.get(
        firestore,
        property,
        firestore
      );

      if (
        typeof value === "function"
      ) {
        return value.bind(firestore);
      }

      return value;
    },
  });

/**
 * Lazy Firebase Admin Storage proxy.
 *
 * Keeps the existing API:
 *
 * adminStorage.bucket().file(...)
 */
export const adminStorage =
  new Proxy({} as Storage, {
    get(
      _target,
      property,
      _receiver
    ) {
      const storage =
        getAdminStorage();

      const value = Reflect.get(
        storage,
        property,
        storage
      );

      if (
        typeof value === "function"
      ) {
        return value.bind(storage);
      }

      return value;
    },
  });
