/**
 * Firebase is initialized in `src/lib/firebase.ts` from Vite env vars (.env).
 * Bucket list sync uses getFirebase() from there — do not init a second app here.
 */
export { getFirebase, isFirebaseConfigured, bucketListId } from '../lib/firebase'
