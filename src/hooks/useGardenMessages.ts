import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  GARDEN_SLOT_COUNT,
  isPlantType,
  type PlantType,
} from '../data/plants'
import { gardenId, getFirebase, isFirebaseConfigured } from '../lib/firebase'
import { getOrCreateDeviceId } from '../lib/deviceId'
import type { SyncState } from './useBucketList'

export type GardenMessage = {
  id: string
  plantType: PlantType
  message: string
  createdAt: number
  slot: number
  addedBy: string
  deviceId: string
}

const STORAGE_KEY = `antangoy-garden-${gardenId}`

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isGardenMessage(value: unknown): value is GardenMessage {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.plantType === 'string' &&
    isPlantType(m.plantType) &&
    typeof m.message === 'string' &&
    typeof m.createdAt === 'number' &&
    typeof m.slot === 'number' &&
    typeof m.addedBy === 'string' &&
    typeof m.deviceId === 'string'
  )
}

function loadLocal(): GardenMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isGardenMessage).sort((a, b) => a.slot - b.slot)
  } catch {
    return []
  }
}

function saveLocal(items: GardenMessage[]): void {
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
    return 'Anonymous Auth is off — Firebase Console → Authentication → Sign-in method → Anonymous → Enable'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Enable Anonymous sign-in in Firebase Console → Authentication → Sign-in method'
  }
  if (code === 'permission-denied' || message.includes('permission-denied')) {
    return 'Firestore blocked the write — Rules must allow gardenMessages when request.auth != null'
  }
  return message
}

function nextFreeSlot(items: GardenMessage[]): number {
  const used = new Set(items.map((item) => item.slot))
  for (let i = 0; i < GARDEN_SLOT_COUNT; i += 1) {
    if (!used.has(i)) return i
  }
  return items.length
}

function messagesCollection(
  db: NonNullable<ReturnType<typeof getFirebase>>['db'],
) {
  return collection(db, 'gardenMessages', gardenId, 'entries')
}

export function useGardenMessages(guestUsername: string = 'guest') {
  const [items, setItems] = useState<GardenMessage[]>(() => loadLocal())
  const deviceIdRef = useRef<string>(getOrCreateDeviceId())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    isFirebaseConfigured() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const authReadyRef = useRef(false)
  const itemsRef = useRef(items)

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

      const q = query(messagesCollection(fb.db), orderBy('createdAt', 'asc'))
      unsubSnap = onSnapshot(
        q,
        (snap) => {
          const remote = snap.docs
            .map((d) => {
              const data = d.data() as Omit<GardenMessage, 'id'>
              return { id: d.id, ...data }
            })
            .filter(isGardenMessage)
          setItems(remote)
          saveLocal(remote)
          setSyncError(null)
          setSyncState('synced')
        },
        (err) => {
          console.error('Garden messages snapshot failed', err)
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

  const plantMessage = useCallback(
    async (plantType: PlantType, message: string) => {
      const trimmed = message.trim()
      if (!trimmed) return false

      const entry: GardenMessage = {
        id: newId(),
        plantType,
        message: trimmed.slice(0, 280),
        createdAt: Date.now(),
        slot: nextFreeSlot(itemsRef.current),
        addedBy: guestUsername,
        deviceId: deviceIdRef.current,
      }

      const next = [...itemsRef.current, entry].sort((a, b) => a.slot - b.slot)
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
        await setDoc(doc(messagesCollection(fb.db), id), fields)
        setSyncError(null)
        setSyncState('synced')
        return true
      } catch (err) {
        console.error('Garden plant write failed', err)
        setSyncError(formatSyncError(err))
        setSyncState('error')
        return false
      }
    },
    [guestUsername],
  )

  const deleteMessage = useCallback(async (id: string) => {
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
      await deleteDoc(doc(messagesCollection(fb.db), id))
      setSyncError(null)
      setSyncState('synced')
    } catch (err) {
      console.error('Garden delete failed', err)
      setSyncError(formatSyncError(err))
      setSyncState('error')
    }
  }, [])

  return {
    items,
    syncState,
    syncError,
    plantMessage,
    deleteMessage,
  }
}
