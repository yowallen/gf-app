import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  isIsoDate,
  sortMeetDays,
  type MeetDay,
} from '../data/timeline'
import { compressMeetImage } from '../lib/compressMeetImage'
import { getFirebase, isFirebaseConfigured, meetLogId } from '../lib/firebase'
import type { SyncState } from './useBucketList'

const STORAGE_KEY = `antangoy-meets-${meetLogId}`

function loadLocal(): MeetDay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return sortMeetDays(parsed as MeetDay[])
  } catch {
    return []
  }
}

function saveLocal(items: MeetDay[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota — Firestore remains source of truth when online */
  }
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
    return 'Firestore blocked the write — allow meetLogs and meetLogs/{id}/entries'
  }
  if (code === 'failed-precondition' || message.includes('index')) {
    return 'Firestore needs an index for date sorting — open the link in the browser console error'
  }
  return message
}

function entriesCollection(db: NonNullable<ReturnType<typeof getFirebase>>['db']) {
  return collection(db, 'meetLogs', meetLogId, 'entries')
}

export type MeetDayInput = {
  /** ISO calendar date `YYYY-MM-DD` from `<input type="date">` */
  date: string
  title: string
  description: string
  /** Optional image — compressed in-browser, stored in Firestore (free) */
  photoFile?: File | null
}

export function useMeetLog(addedBy = 'us') {
  const [items, setItems] = useState<MeetDay[]>(() => loadLocal())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    isFirebaseConfigured() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const authReadyRef = useRef(false)

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

      const q = query(entriesCollection(fb.db), orderBy('date', 'desc'))
      unsubSnap = onSnapshot(
        q,
        (snap) => {
          const remote: MeetDay[] = snap.docs.map((d) => {
            const data = d.data() as Omit<MeetDay, 'id'>
            return { id: d.id, ...data }
          })
          const sorted = sortMeetDays(remote)
          setItems(sorted)
          saveLocal(sorted)
          setSyncError(null)
          setSyncState('synced')
        },
        (err) => {
          console.error('Meet log snapshot failed', err)
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

  const addMeet = useCallback(
    async (input: MeetDayInput) => {
      const date = input.date.trim()
      const title = input.title.trim()
      const description = input.description.trim()
      if (!date || !title || !description) return false
      if (!isIsoDate(date)) {
        setSyncError('Pick a valid date from the date picker')
        setSyncState('error')
        return false
      }

      let image: string | undefined
      if (input.photoFile) {
        setUploading(true)
        try {
          image = await compressMeetImage(input.photoFile)
        } catch (err) {
          console.error('Meet photo compress failed', err)
          setSyncError(formatSyncError(err))
          setSyncState('error')
          setUploading(false)
          return false
        }
        setUploading(false)
      }

      const entry: MeetDay = {
        id: newId(),
        date,
        title,
        description,
        ...(image ? { image } : {}),
        addedBy,
        createdAt: Date.now(),
      }

      const next = sortMeetDays([entry, ...items])
      setItems(next)
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
        await setDoc(doc(entriesCollection(fb.db), id), fields)
        setSyncError(null)
        setSyncState('synced')
        return true
      } catch (err) {
        console.error('Meet log write failed', err)
        setSyncError(formatSyncError(err))
        setSyncState('error')
        return false
      }
    },
    [addedBy, items],
  )

  const updateMeet = useCallback(
    async (id: string, input: MeetDayInput) => {
      const existing = items.find((item) => item.id === id)
      if (!existing) return false

      const date = input.date.trim()
      const title = input.title.trim()
      const description = input.description.trim()
      if (!date || !title || !description) return false
      if (!isIsoDate(date)) {
        setSyncError('Pick a valid date from the date picker')
        setSyncState('error')
        return false
      }

      let image = existing.image
      if (input.photoFile) {
        setUploading(true)
        try {
          image = await compressMeetImage(input.photoFile)
        } catch (err) {
          console.error('Meet photo compress failed', err)
          setSyncError(formatSyncError(err))
          setSyncState('error')
          setUploading(false)
          return false
        }
        setUploading(false)
      }

      const updated: MeetDay = {
        ...existing,
        date,
        title,
        description,
        ...(image ? { image } : {}),
      }

      const next = sortMeetDays(
        items.map((item) => (item.id === id ? updated : item)),
      )
      setItems(next)
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
        const { id: entryId, ...fields } = updated
        await setDoc(doc(entriesCollection(fb.db), entryId), fields)
        setSyncError(null)
        setSyncState('synced')
        return true
      } catch (err) {
        console.error('Meet log update failed', err)
        setSyncError(formatSyncError(err))
        setSyncState('error')
        return false
      }
    },
    [items],
  )

  return { items, syncState, syncError, uploading, addMeet, updateMeet }
}
