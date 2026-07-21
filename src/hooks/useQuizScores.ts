import { useCallback, useEffect, useRef, useState } from 'react'
import {
  arrayUnion,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import type { QuizAuthor } from '../data/quiz'
import type { GateRole } from '../data/auth'
import { getFirebase, isFirebaseConfigured, quizBankId } from '../lib/firebase'
import { formatWeekLabel, getWeekId } from '../lib/quizWeek'

export type SyncState = 'local' | 'connecting' | 'synced' | 'error'

export type QuizAttemptRecord = {
  id: string
  score: number
  total: number
  playedAt: number
}

export type PlayerScoreSnap = {
  score: number
  total: number
}

export type CoupleHistoryEntry = {
  id: string
  weekId: string
  playedAt: number
  him: PlayerScoreSnap | null
  her: PlayerScoreSnap | null
}

export type PlayerQuizRecord = {
  role: GateRole
  username: string
  quizAuthor: QuizAuthor
  weekId: string
  best: number
  last: number
  questionTotal: number
  finished: boolean
  attempts: QuizAttemptRecord[]
}

export type QuizScoreBoard = {
  weekId: string
  /** Bump to force a one-time wipe of scores/history for everyone */
  version: number
  him: PlayerQuizRecord | null
  her: PlayerQuizRecord | null
  history: CoupleHistoryEntry[]
}

const STORAGE_KEY = `antangoy-quiz-scores-${quizBankId}-v2`
const LEGACY_STORAGE_KEY = `antangoy-quiz-scores-${quizBankId}`
/** Increment to wipe all tallied points + history once across devices */
const SCOREBOARD_RESET_VERSION = 2
const MAX_HISTORY = 40

function emptyBoard(weekId: string = getWeekId()): QuizScoreBoard {
  return {
    weekId,
    version: SCOREBOARD_RESET_VERSION,
    him: null,
    her: null,
    history: [],
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isAttempt(value: unknown): value is QuizAttemptRecord {
  if (typeof value !== 'object' || value === null) return false
  const a = value as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    typeof a.score === 'number' &&
    typeof a.total === 'number' &&
    typeof a.playedAt === 'number'
  )
}

function isPlayerScoreSnap(value: unknown): value is PlayerScoreSnap {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return typeof s.score === 'number' && typeof s.total === 'number'
}

function isHistoryEntry(value: unknown): value is CoupleHistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const h = value as Record<string, unknown>
  return (
    typeof h.id === 'string' &&
    typeof h.playedAt === 'number' &&
    (typeof h.weekId === 'string' || h.weekId === undefined) &&
    (h.him === null || isPlayerScoreSnap(h.him)) &&
    (h.her === null || isPlayerScoreSnap(h.her))
  )
}

function isPlayerRecord(value: unknown): value is PlayerQuizRecord {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    (p.role === 'him' || p.role === 'her') &&
    typeof p.username === 'string' &&
    (p.quizAuthor === 'him' || p.quizAuthor === 'her') &&
    typeof p.best === 'number' &&
    typeof p.last === 'number' &&
    typeof p.questionTotal === 'number' &&
    typeof p.finished === 'boolean' &&
    Array.isArray(p.attempts) &&
    p.attempts.every(isAttempt)
  )
}

function snapFromRecord(record: PlayerQuizRecord | null): PlayerScoreSnap | null {
  if (!record?.finished) return null
  return { score: record.last, total: record.questionTotal }
}

function normalizeHistoryEntry(entry: CoupleHistoryEntry): CoupleHistoryEntry {
  return {
    ...entry,
    weekId: entry.weekId || 'legacy',
  }
}

function parseBoard(raw: unknown): QuizScoreBoard | null {
  if (typeof raw !== 'object' || raw === null) return null
  const data = raw as Record<string, unknown>
  const history = Array.isArray(data.history)
    ? data.history.filter(isHistoryEntry).map(normalizeHistoryEntry)
    : []

  return {
    weekId:
      typeof data.weekId === 'string' && data.weekId.length > 0
        ? data.weekId
        : '',
    version: typeof data.version === 'number' ? data.version : 1,
    him: isPlayerRecord(data.him) ? data.him : null,
    her: isPlayerRecord(data.her) ? data.her : null,
    history: history.sort((a, b) => b.playedAt - a.playedAt),
  }
}

function alignBoard(board: QuizScoreBoard): {
  board: QuizScoreBoard
  needsPersist: boolean
} {
  if ((board.version ?? 1) < SCOREBOARD_RESET_VERSION) {
    return { board: emptyBoard(), needsPersist: true }
  }

  const currentWeek = getWeekId()
  if (board.weekId === currentWeek) {
    return { board, needsPersist: false }
  }

  return {
    board: {
      weekId: currentWeek,
      version: SCOREBOARD_RESET_VERSION,
      him: null,
      her: null,
      history: board.history ?? [],
    },
    needsPersist: true,
  }
}

function preferPlayer(
  local: PlayerQuizRecord | null,
  remote: PlayerQuizRecord | null,
): PlayerQuizRecord | null {
  if (local?.finished && !remote?.finished) return local
  if (remote?.finished && !local?.finished) return remote
  if (local?.finished && remote?.finished) {
    const localAt = local.attempts[0]?.playedAt ?? 0
    const remoteAt = remote.attempts[0]?.playedAt ?? 0
    return remoteAt >= localAt ? remote : local
  }
  return remote ?? local
}

function mergeHistory(
  local: CoupleHistoryEntry[],
  remote: CoupleHistoryEntry[],
): CoupleHistoryEntry[] {
  const byId = new Map<string, CoupleHistoryEntry>()
  for (const entry of [...local, ...remote]) {
    const existing = byId.get(entry.id)
    if (!existing || entry.playedAt >= existing.playedAt) {
      byId.set(entry.id, entry)
    }
  }
  return [...byId.values()]
    .sort((a, b) => b.playedAt - a.playedAt)
    .slice(0, MAX_HISTORY)
}

/** Keep finished weekly scores when remote is empty/stale. */
function mergeBoards(
  local: QuizScoreBoard,
  remote: QuizScoreBoard,
): QuizScoreBoard {
  return {
    weekId: remote.weekId || local.weekId || getWeekId(),
    version: Math.max(local.version ?? 1, remote.version ?? 1),
    him: preferPlayer(local.him, remote.him),
    her: preferPlayer(local.her, remote.her),
    history: mergeHistory(local.history ?? [], remote.history ?? []),
  }
}

function boardHasProgress(board: QuizScoreBoard): boolean {
  return Boolean(
    board.him || board.her || (board.history && board.history.length > 0),
  )
}

function loadLocal(): QuizScoreBoard {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyBoard()
    const parsed = parseBoard(JSON.parse(raw))
    if (!parsed) return emptyBoard()
    return alignBoard(parsed).board
  } catch {
    return emptyBoard()
  }
}

function saveLocal(board: QuizScoreBoard): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
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

export function getVisiblePartnerRecord(
  board: QuizScoreBoard,
  myRole: GateRole,
): PlayerQuizRecord | null {
  const partner = myRole === 'him' ? board.her : board.him
  if (!partner?.finished) return null
  return partner
}

export function getCareerTally(board: QuizScoreBoard): {
  himPoints: number
  herPoints: number
  himPossible: number
  herPossible: number
  himGames: number
  herGames: number
  totalPoints: number
  maxPoints: number
} {
  const history = board.history ?? []
  const byWeek = new Map<string, CoupleHistoryEntry>()
  const chronological = [...history].sort((a, b) => a.playedAt - b.playedAt)

  for (const entry of chronological) {
    byWeek.set(entry.weekId || entry.id, entry)
  }

  let himPoints = 0
  let herPoints = 0
  let himPossible = 0
  let herPossible = 0
  let himGames = 0
  let herGames = 0

  for (const entry of byWeek.values()) {
    if (entry.him) {
      himPoints += entry.him.score
      himPossible += entry.him.total
      himGames += 1
    }
    if (entry.her) {
      herPoints += entry.her.score
      herPossible += entry.her.total
      herGames += 1
    }
  }

  return {
    himPoints,
    herPoints,
    himPossible,
    herPossible,
    himGames,
    herGames,
    totalPoints: himPoints + herPoints,
    maxPoints: himPossible + herPossible,
  }
}

/** @deprecated use getCareerTally — kept for any older imports */
export function getCombinedTally(board: QuizScoreBoard) {
  const career = getCareerTally(board)
  return {
    ready: true,
    himPoints: career.himPoints,
    herPoints: career.herPoints,
    totalPoints: career.totalPoints,
    maxPoints: career.maxPoints,
  }
}

export function useQuizScores(role: GateRole, username: string) {
  const [board, setBoard] = useState<QuizScoreBoard>(() => loadLocal())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    isFirebaseConfigured() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const authReadyRef = useRef(false)
  const boardRef = useRef(board)
  const pendingScoreRef = useRef<{
    nextRecord: PlayerQuizRecord
    entry: CoupleHistoryEntry
    weekId: string
  } | null>(null)

  useEffect(() => {
    boardRef.current = board
  }, [board])

  const persistWeekReset = useCallback(async (next: QuizScoreBoard) => {
    saveLocal(next)
    setBoard(next)
    boardRef.current = next

    const fb = getFirebase()
    if (!fb || !authReadyRef.current) return

    try {
      await setDoc(doc(fb.db, 'quizScoreboards', quizBankId), {
        weekId: next.weekId,
        version: next.version,
        him: next.him,
        her: next.her,
        history: next.history,
        updatedAt: Date.now(),
      })
      setSyncError(null)
      setSyncState('synced')
    } catch (err) {
      console.error('Quiz scoreboard week reset failed', err)
      setSyncError(formatSyncError(err))
      setSyncState('error')
    }
  }, [])

  const ensureCurrentWeek = useCallback(async () => {
    const aligned = alignBoard(boardRef.current)
    if (!aligned.needsPersist) return
    await persistWeekReset(aligned.board)
  }, [persistWeekReset])

  const persistScoreUpdate = useCallback(
    async (
      nextRecord: PlayerQuizRecord,
      entry: CoupleHistoryEntry,
      weekId: string,
    ) => {
      const fb = getFirebase()
      if (!fb) return
      if (!authReadyRef.current) {
        pendingScoreRef.current = { nextRecord, entry, weekId }
        return
      }

      try {
        await setDoc(
          doc(fb.db, 'quizScoreboards', quizBankId),
          {
            weekId,
            version: SCOREBOARD_RESET_VERSION,
            [nextRecord.role]: nextRecord,
            history: arrayUnion(entry),
            updatedAt: Date.now(),
          },
          { merge: true },
        )
        pendingScoreRef.current = null
        setSyncError(null)
        setSyncState('synced')
      } catch (err) {
        console.error('Quiz scoreboard sync write failed', err)
        pendingScoreRef.current = { nextRecord, entry, weekId }
        setSyncError(formatSyncError(err))
        setSyncState('error')
      }
    },
    [],
  )

  const recordScore = useCallback(
    async (quizAuthor: QuizAuthor, score: number, total: number) => {
      await ensureCurrentWeek()
      const weekId = getWeekId()
      const prev = boardRef.current
      if (prev[role]?.finished) return

      const playedAt = Date.now()
      const attempt: QuizAttemptRecord = {
        id: newId(),
        score,
        total,
        playedAt,
      }

      const nextRecord: PlayerQuizRecord = {
        role,
        username,
        quizAuthor,
        weekId,
        best: score,
        last: score,
        questionTotal: total,
        finished: true,
        attempts: [attempt],
      }

      const nextBoard: QuizScoreBoard = {
        ...prev,
        weekId,
        version: SCOREBOARD_RESET_VERSION,
        [role]: nextRecord,
        history: prev.history ?? [],
      }

      const historyEntry: CoupleHistoryEntry = {
        id: newId(),
        weekId,
        playedAt,
        him: snapFromRecord(nextBoard.him),
        her: snapFromRecord(nextBoard.her),
      }

      nextBoard.history = [historyEntry, ...(nextBoard.history ?? [])].slice(
        0,
        MAX_HISTORY,
      )

      boardRef.current = nextBoard
      saveLocal(nextBoard)
      setBoard(nextBoard)
      await persistScoreUpdate(nextRecord, historyEntry, weekId)
    },
    [ensureCurrentWeek, persistScoreUpdate, role, username],
  )

  useEffect(() => {
    void ensureCurrentWeek()
  }, [ensureCurrentWeek])

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
      setSyncState('synced')
      setSyncError(null)

      const pending = pendingScoreRef.current
      if (pending) {
        void persistScoreUpdate(
          pending.nextRecord,
          pending.entry,
          pending.weekId,
        )
      }

      unsubSnap?.()
      unsubSnap = onSnapshot(
        doc(fb.db, 'quizScoreboards', quizBankId),
        (snap) => {
          const local = boardRef.current

          if (!snap.exists()) {
            // Seed remote from local finished scores — never wipe them
            void persistWeekReset(
              boardHasProgress(local) ? local : emptyBoard(),
            )
            return
          }

          const parsed = parseBoard(snap.data())
          if (!parsed) return

          const aligned = alignBoard(parsed)
          if (aligned.needsPersist) {
            // Week rolled — keep local history, clear weekly slots via align
            const mergedHistory = mergeHistory(
              local.history ?? [],
              aligned.board.history ?? [],
            )
            void persistWeekReset({
              ...aligned.board,
              history: mergedHistory,
            })
            return
          }

          const merged = mergeBoards(local, aligned.board)
          setBoard(merged)
          boardRef.current = merged
          saveLocal(merged)

          // Push local-only finished scores up if remote was missing them
          const needsPush =
            (merged.him?.finished && !aligned.board.him?.finished) ||
            (merged.her?.finished && !aligned.board.her?.finished)
          if (needsPush) {
            void setDoc(
              doc(fb.db, 'quizScoreboards', quizBankId),
              {
                weekId: merged.weekId,
                version: SCOREBOARD_RESET_VERSION,
                him: merged.him,
                her: merged.her,
                history: merged.history,
                updatedAt: Date.now(),
              },
              { merge: true },
            ).catch((err: unknown) => {
              console.error('Quiz scoreboard heal write failed', err)
            })
          }

          setSyncState('synced')
          setSyncError(null)
        },
        (err) => {
          console.error('Quiz scoreboard sync listen failed', err)
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
  }, [persistScoreUpdate, persistWeekReset])

  return {
    board,
    weekId: board.weekId,
    weekLabel: formatWeekLabel(board.weekId || getWeekId()),
    syncState,
    syncError,
    myRecord: board[role],
    partnerRecord: getVisiblePartnerRecord(board, role),
    partnerFinished: (role === 'him' ? board.her : board.him)?.finished ?? false,
    tally: getCareerTally(board),
    history: board.history ?? [],
    recordScore,
  }
}
