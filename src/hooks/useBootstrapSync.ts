import { useEffect, useState } from 'react'
import type { GateRole } from '../data/auth'
import { isFirebaseConfigured } from '../lib/firebase'
import { useBucketList, type SyncState } from './useBucketList'
import { useMeetLog } from './useMeetLog'
import { useQuizBank } from './useQuizBank'
import { useQuizScores } from './useQuizScores'

const BOOTSTRAP_TIMEOUT_MS = 12_000

function isSettled(state: SyncState): boolean {
  return state !== 'connecting'
}

/**
 * Warms meet log, bucket list, quiz bank, and scores while the intro plays.
 * Ready when every source has left `connecting`, or after a safety timeout.
 */
export function useBootstrapSync(role: GateRole, username: string) {
  const meet = useMeetLog(username)
  const bucket = useBucketList(username)
  const quizBank = useQuizBank()
  const quizScores = useQuizScores(role, username)
  const [timedOut, setTimedOut] = useState(!isFirebaseConfigured())

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    const timer = window.setTimeout(() => setTimedOut(true), BOOTSTRAP_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const settled =
    isSettled(meet.syncState) &&
    isSettled(bucket.syncState) &&
    isSettled(quizBank.syncState) &&
    isSettled(quizScores.syncState)

  return {
    ready: settled || timedOut,
    settled,
    timedOut,
  }
}
