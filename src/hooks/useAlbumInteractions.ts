import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { getFirebase, isFirebaseConfigured, meetLogId } from '../lib/firebase'
import { getOrCreateDeviceId } from '../lib/deviceId'
import type { SyncState } from './useBucketList'

const STORAGE_KEY = `antangoy-album-interactions-${meetLogId}`

export type AlbumInteraction = {
  id: string
  photoId: string
  deviceId: string
  guestName: string
  type: 'view' | 'like' | 'comment'
  content?: string
  createdAt: number
}

function isAlbumInteraction(value: unknown): value is AlbumInteraction {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.photoId === 'string' &&
    typeof m.deviceId === 'string' &&
    typeof m.guestName === 'string' &&
    (m.type === 'view' || m.type === 'like' || m.type === 'comment') &&
    typeof m.createdAt === 'number' &&
    (m.type !== 'comment' || typeof m.content === 'string')
  )
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadLocal(): AlbumInteraction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAlbumInteraction)
  } catch {
    return []
  }
}

function saveLocal(items: AlbumInteraction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function formatSyncError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Unknown sync error'
  const code = 'code' in err ? String(err.code) : ''
  const message = 'message' in err ? String(err.message) : String(err)

  if (
    code === 'auth/configuration-not-found' ||
    message.includes('configuration-not-found')
  ) {
    return 'Anonymous Auth is off'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Enable Anonymous sign-in in Firebase'
  }
  if (code === 'permission-denied' || message.includes('permission-denied')) {
    return 'Firestore blocked the write'
  }
  return message
}

function interactionsCollection(
  db: NonNullable<ReturnType<typeof getFirebase>>['db'],
) {
  return collection(db, 'albumInteractions', meetLogId, 'entries')
}

export function useAlbumInteractions(guestName: string) {
  const [items, setItems] = useState<AlbumInteraction[]>(() => loadLocal())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    isFirebaseConfigured() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const authReadyRef = useRef(false)
  const itemsRef = useRef(items)
  const deviceIdRef = useRef<string>(getOrCreateDeviceId())

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    const fb = getFirebase()
    if (!fb) return

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

      const q = query(interactionsCollection(fb.db))
      unsubSnap = onSnapshot(
        q,
        (snap) => {
          const remote = snap.docs
            .map((d) => {
              const data = d.data() as Omit<AlbumInteraction, 'id'>
              return { id: d.id, ...data }
            })
            .filter(isAlbumInteraction)
          setItems(remote)
          saveLocal(remote)
          setSyncError(null)
          setSyncState('synced')
        },
        (err) => {
          console.error('Album interactions snapshot failed', err)
          setSyncError(formatSyncError(err))
          setSyncState('error')
        },
      )
    })

    return () => {
      cancelled = true
      authReadyRef.current = false
      unsubAuth()
      unsubSnap?.()
    }
  }, [])

  const recordInteraction = useCallback(
    async (
      photoId: string,
      type: 'view' | 'like' | 'comment',
      content?: string,
    ) => {
      const entry: AlbumInteraction = {
        id: newId(),
        photoId,
        deviceId: deviceIdRef.current,
        guestName,
        type,
        content: type === 'comment' ? content : undefined,
        createdAt: Date.now(),
      }

      const next = [...itemsRef.current, entry]
      setItems(next)
      itemsRef.current = next
      saveLocal(next)

      const fb = getFirebase()
      if (!fb) {
        setSyncState('local')
        return true
      }
      if (!authReadyRef.current) {
        setSyncState('connecting')
        return true
      }

      try {
        const { id, ...fields } = entry
        await setDoc(doc(interactionsCollection(fb.db), id), fields)
        setSyncError(null)
        setSyncState('synced')
        return true
      } catch (err) {
        console.error('Album interaction write failed', err)
        setSyncError(formatSyncError(err))
        setSyncState('error')
        return false
      }
    },
    [guestName],
  )

  const deleteInteraction = useCallback(async (id: string) => {
    const next = itemsRef.current.filter((item) => item.id !== id)
    setItems(next)
    itemsRef.current = next
    saveLocal(next)

    const fb = getFirebase()
    if (!fb) {
      setSyncState('local')
      return
    }
    if (!authReadyRef.current) {
      setSyncState('connecting')
      return
    }

    try {
      await deleteDoc(doc(interactionsCollection(fb.db), id))
      setSyncError(null)
      setSyncState('synced')
    } catch (err) {
      console.error('Album interaction delete failed', err)
      setSyncError(formatSyncError(err))
      setSyncState('error')
    }
  }, [])

  return {
    items,
    syncState,
    syncError,
    recordInteraction,
    deleteInteraction,
  }
}
