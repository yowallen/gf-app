/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_BUCKET_LIST_ID?: string
  readonly VITE_MEET_LOG_ID?: string
  readonly VITE_QUIZ_BANK_ID?: string
  readonly VITE_GARDEN_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
