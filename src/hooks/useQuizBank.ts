import { useCallback, useEffect, useRef, useState } from 'react'
import {
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import {
  createBlankQuestionnaire,
  normalizeQuestionnaire,
  type QuizAuthor,
  type QuizQuestion,
} from '../data/quiz'
import { getFirebase, isFirebaseConfigured, quizBankId } from '../lib/firebase'
import { getWeekId } from '../lib/quizWeek'

export type SyncState = 'local' | 'connecting' | 'synced' | 'error'

export type QuizBank = {
  weekId: string
  him: QuizQuestion[]
  her: QuizQuestion[]
}

const STORAGE_KEY = `antangoy-quiz-bank-${quizBankId}`

function emptyBank(weekId: string = getWeekId()): QuizBank {
  return {
    weekId,
    him: createBlankQuestionnaire('him'),
    her: createBlankQuestionnaire('her'),
  }
}

function isQuestionLike(value: unknown): value is QuizQuestion {
  if (typeof value !== 'object' || value === null) return false
  const q = value as Record<string, unknown>
  return (
    typeof q.id === 'string' &&
    typeof q.prompt === 'string' &&
    Array.isArray(q.options) &&
    q.options.every((option) => typeof option === 'string') &&
    typeof q.correctAnswer === 'string'
  )
}

function parseBank(raw: unknown): QuizBank | null {
  if (typeof raw !== 'object' || raw === null) return null
  const data = raw as Record<string, unknown>
  const him = Array.isArray(data.him) ? data.him.filter(isQuestionLike) : null
  const her = Array.isArray(data.her) ? data.her.filter(isQuestionLike) : null
  if (!him || !her) return null

  const weekId =
    typeof data.weekId === 'string' && data.weekId.length > 0
      ? data.weekId
      : ''

  return {
    weekId,
    him: normalizeQuestionnaire(him, 'him'),
    her: normalizeQuestionnaire(her, 'her'),
  }
}

function alignToCurrentWeek(bank: QuizBank): {
  bank: QuizBank
  rolled: boolean
} {
  const currentWeek = getWeekId()
  if (bank.weekId === currentWeek) {
    return { bank, rolled: false }
  }
  return { bank: emptyBank(currentWeek), rolled: true }
}

function loadLocal(): QuizBank {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyBank()
    const parsed = parseBank(JSON.parse(raw))
    if (!parsed) return emptyBank()
    return alignToCurrentWeek(parsed).bank
  } catch {
    return emptyBank()
  }
}

function saveLocal(bank: QuizBank): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bank))
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

export function useQuizBank() {
  const [bank, setBank] = useState<QuizBank>(() => loadLocal())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    isFirebaseConfigured() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const authReadyRef = useRef(false)
  const bankRef = useRef(bank)

  useEffect(() => {
    bankRef.current = bank
  }, [bank])

  const persistFullBank = useCallback(async (next: QuizBank) => {
    saveLocal(next)
    setBank(next)
    bankRef.current = next

    const fb = getFirebase()
    if (!fb) return
    if (!authReadyRef.current) {
      setSyncState('connecting')
      return
    }

    try {
      await setDoc(doc(fb.db, 'quizBanks', quizBankId), {
        ...next,
        updatedAt: Date.now(),
      })
      setSyncError(null)
      setSyncState('synced')
    } catch (err) {
      console.error('Quiz bank sync write failed', err)
      setSyncError(formatSyncError(err))
      setSyncState('error')
    }
  }, [])

  const ensureCurrentWeek = useCallback(async () => {
    const aligned = alignToCurrentWeek(bankRef.current)
    if (!aligned.rolled) return
    await persistFullBank(aligned.bank)
  }, [persistFullBank])

  const persistAuthor = useCallback(
    async (author: QuizAuthor, questions: QuizQuestion[]) => {
      await ensureCurrentWeek()
      const weekId = getWeekId()
      const normalized = normalizeQuestionnaire(questions, author)

      const next: QuizBank = {
        ...bankRef.current,
        weekId,
        [author]: normalized,
      }
      saveLocal(next)
      setBank(next)
      bankRef.current = next

      const fb = getFirebase()
      if (!fb) return
      if (!authReadyRef.current) {
        setSyncState('connecting')
        return
      }

      try {
        await setDoc(
          doc(fb.db, 'quizBanks', quizBankId),
          {
            weekId,
            [author]: normalized,
            updatedAt: Date.now(),
          },
          { merge: true },
        )
        setSyncError(null)
        setSyncState('synced')
      } catch (err) {
        console.error('Quiz bank sync write failed', err)
        setSyncError(formatSyncError(err))
        setSyncState('error')
      }
    },
    [ensureCurrentWeek],
  )

  useEffect(() => {
    void ensureCurrentWeek()
  }, [ensureCurrentWeek])

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
      setSyncState('synced')
      setSyncError(null)

      unsubSnap?.()
      unsubSnap = onSnapshot(
        doc(fb.db, 'quizBanks', quizBankId),
        (snap) => {
          if (!snap.exists()) {
            void persistFullBank(emptyBank())
            return
          }
          const parsed = parseBank(snap.data())
          if (!parsed) return

          const aligned = alignToCurrentWeek(parsed)
          if (aligned.rolled) {
            void persistFullBank(aligned.bank)
            return
          }

          setBank(aligned.bank)
          bankRef.current = aligned.bank
          saveLocal(aligned.bank)
          setSyncState('synced')
          setSyncError(null)
        },
        (err) => {
          console.error('Quiz bank sync listen failed', err)
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
  }, [persistFullBank])

  return {
    bank,
    weekId: bank.weekId,
    syncState,
    syncError,
    saveQuestionnaire: persistAuthor,
  }
}
