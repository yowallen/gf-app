import { useCallback, useEffect, useRef, useState } from 'react'
import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { bucketListId, getFirebase, isFirebaseConfigured } from '../lib/firebase'

export type BucketCategory = 'date' | 'trip' | 'experience'

export type BucketItem = {
  id: string
  text: string
  category: BucketCategory
  done: boolean
  addedBy: string
  createdAt: number
}

export type SyncState = 'local' | 'connecting' | 'synced' | 'error'

const STORAGE_KEY = `antangoy-bucket-${bucketListId}`

function loadLocal(): BucketItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as BucketItem[]
  } catch {
    return []
  }
}

function saveLocal(items: BucketItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatSyncError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Unknown sync error'
  const code = 'code' in err ? String(err.code) : ''
  const message = 'message' in err ? String(err.message) : String(err)

  if (
    code === 'auth/configuration-not-found' ||
    message.includes('configuration-not-found')
  ) {
    return 'Anonymous Auth is off — Firebase Console → Authentication → Sign-in method → Anonymous → Enable'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method'
  }
  if (code === 'permission-denied' || message.includes('permission-denied')) {
    return 'Firestore blocked the write — Rules must allow read/write when request.auth != null'
  }
  return message
}

export function useBucketList(addedBy = 'us') {
  const [items, setItems] = useState<BucketItem[]>(() => loadLocal())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    isFirebaseConfigured() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const authReadyRef = useRef(false)

  const persist = useCallback(async (next: BucketItem[]) => {
    setItems(next)
    saveLocal(next)
    const fb = getFirebase()
    if (!fb) return
    if (!authReadyRef.current) {
      setSyncState('connecting')
      return
    }
    try {
      await setDoc(
        doc(fb.db, 'bucketLists', bucketListId),
        { items: next },
        { merge: true },
      )
      setSyncError(null)
      setSyncState('synced')
    } catch (err) {
      console.error('Bucket list sync write failed', err)
      setSyncError(formatSyncError(err))
      setSyncState('error')
    }
  }, [])

  useEffect(() => {
    const fb = getFirebase()
    if (!fb) {
      setSyncState('local')
      setSyncError(null)
      return
    }

    let unsubSnap: Unsubscribe | undefined
    let cancelled = false

    const unsubAuth = onAuthStateChanged(fb.auth, async (user) => {
      if (cancelled) return
      if (!user) {
        authReadyRef.current = false
        try {
          await signInAnonymously(fb.auth)
        } catch (err) {
          console.error('Anonymous sign-in failed', err)
          setSyncError(formatSyncError(err))
          setSyncState('error')
        }
        return
      }

      authReadyRef.current = true
      setSyncState('connecting')
      unsubSnap?.()
      unsubSnap = onSnapshot(
        doc(fb.db, 'bucketLists', bucketListId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as { items?: BucketItem[] }
            const remote = data.items ?? []
            setItems(remote)
            saveLocal(remote)
          } else {
            const local = loadLocal()
            void setDoc(doc(fb.db, 'bucketLists', bucketListId), {
              items: local,
            }).catch((err: unknown) => {
              console.error('Initial bucket list create failed', err)
              setSyncError(formatSyncError(err))
              setSyncState('error')
            })
          }
          setSyncError(null)
          setSyncState('synced')
        },
        (err) => {
          console.error('Bucket list snapshot failed', err)
          setSyncError(formatSyncError(err))
          setSyncState('error')
        },
      )

      const local = loadLocal()
      if (local.length > 0) {
        void setDoc(
          doc(fb.db, 'bucketLists', bucketListId),
          { items: local },
          { merge: true },
        ).catch((err: unknown) => {
          console.error('Bucket list flush failed', err)
          setSyncError(formatSyncError(err))
          setSyncState('error')
        })
      }
    })

    return () => {
      cancelled = true
      authReadyRef.current = false
      unsubAuth()
      unsubSnap?.()
    }
  }, [])

  const addItem = useCallback(
    (text: string, category: BucketCategory) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const next: BucketItem[] = [
        {
          id: newId(),
          text: trimmed,
          category,
          done: false,
          addedBy,
          createdAt: Date.now(),
        },
        ...items,
      ]
      void persist(next)
    },
    [addedBy, items, persist],
  )

  const toggleItem = useCallback(
    (id: string) => {
      const next = items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      )
      void persist(next)
    },
    [items, persist],
  )

  const deleteItem = useCallback(
    (id: string) => {
      void persist(items.filter((item) => item.id !== id))
    },
    [items, persist],
  )

  return { items, syncState, syncError, addItem, toggleItem, deleteItem }
}
