import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
    | string
    | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as
    | string
    | undefined,
}

export const bucketListId =
  (import.meta.env.VITE_BUCKET_LIST_ID as string | undefined) ?? 'antangoy-shared'

export const meetLogId =
  (import.meta.env.VITE_MEET_LOG_ID as string | undefined) ?? 'antangoy-meets'

export const quizBankId =
  (import.meta.env.VITE_QUIZ_BANK_ID as string | undefined) ?? 'antangoy-quizzes'

function isUsableEnvValue(value: string | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed !== '...'
}

export function isFirebaseConfigured(): boolean {
  return (
    isUsableEnvValue(config.apiKey) &&
    isUsableEnvValue(config.projectId) &&
    isUsableEnvValue(config.appId)
  )
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function getFirebase(): {
  app: FirebaseApp
  auth: Auth
  db: Firestore
} | null {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    app = initializeApp(config)
    auth = getAuth(app)
    db = getFirestore(app)
  }
  return { app, auth: auth!, db: db! }
}
