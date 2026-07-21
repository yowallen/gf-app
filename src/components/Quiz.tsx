import { useEffect, useRef, useState } from 'react'
import {
  QUESTIONS_PER_QUIZ,
  SECONDS_PER_QUESTION,
  countCompleteQuestions,
  getQuizMeta,
  playableQuestions,
  quizSectionLead,
  quizSectionTitle,
  type QuizAuthor,
  type QuizPack,
  type QuizQuestion,
} from '../data/quiz'
import { gateAuth } from '../data/auth'
import { type GateActor } from '../hooks/useGateAuth'
import { useQuizBank } from '../hooks/useQuizBank'
import { useQuizScores } from '../hooks/useQuizScores'
import { daysUntilNextWeek, formatWeekLabel, getWeekId } from '../lib/quizWeek'
import { QuizEditor } from './QuizEditor'

type Phase = 'hub' | 'editing' | 'playing' | 'results'

type AnswerRecord = {
  chosen: string | null
  timedOut: boolean
}

type QuizProgress = {
  weekId: string
  author: QuizAuthor
  index: number
  answers: Record<string, AnswerRecord>
  deadlineAt: number | null
}

type QuizProps = {
  actor: GateActor
}

function progressStorageKey(role: string): string {
  return `antangoy-quiz-progress-${role}`
}

function loadProgress(role: string): QuizProgress | null {
  try {
    const raw = sessionStorage.getItem(progressStorageKey(role))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const data = parsed as Record<string, unknown>
    if (
      typeof data.weekId !== 'string' ||
      (data.author !== 'him' && data.author !== 'her') ||
      typeof data.index !== 'number' ||
      typeof data.answers !== 'object' ||
      data.answers === null
    ) {
      return null
    }
    return {
      weekId: data.weekId,
      author: data.author,
      index: data.index,
      answers: data.answers as Record<string, AnswerRecord>,
      deadlineAt:
        typeof data.deadlineAt === 'number' ? data.deadlineAt : null,
    }
  } catch {
    return null
  }
}

function saveProgress(role: string, progress: QuizProgress): void {
  sessionStorage.setItem(progressStorageKey(role), JSON.stringify(progress))
}

function clearProgress(role: string): void {
  sessionStorage.removeItem(progressStorageKey(role))
}

function createQuestionDeadline(): number {
  return Date.now() + SECONDS_PER_QUESTION * 1000
}

function displayName(role: 'him' | 'her'): string {
  return role === 'her' ? gateAuth.her.username : gateAuth.him.username
}

function formatHistoryDate(playedAt: number): string {
  return new Date(playedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatScoreSnap(
  snap: { score: number; total: number } | null | undefined,
): string {
  if (!snap) return '—'
  return `${snap.score}/${snap.total}`
}

export function Quiz({ actor }: QuizProps) {
  const { bank, syncState, syncError, saveQuestionnaire } = useQuizBank()
  const {
    board,
    myRecord,
    tally,
    history,
    recordScore,
    weekLabel,
    syncState: scoreSyncState,
    syncError: scoreSyncError,
  } = useQuizScores(actor.role, actor.username)
  const [phase, setPhase] = useState<Phase>('hub')
  const [pack, setPack] = useState<QuizPack | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION)
  const [locked, setLocked] = useState(false)
  const historyDialogRef = useRef<HTMLDialogElement>(null)

  const answersRef = useRef(answers)
  const packRef = useRef(pack)
  const indexRef = useRef(index)
  const lockedRef = useRef(locked)
  const deadlineAtRef = useRef(deadlineAt)
  const restoredRef = useRef(false)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    packRef.current = pack
  }, [pack])

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    lockedRef.current = locked
  }, [locked])

  useEffect(() => {
    deadlineAtRef.current = deadlineAt
  }, [deadlineAt])

  function persistPlayingProgress(
    activePack: QuizPack,
    activeIndex: number,
    activeAnswers: Record<string, AnswerRecord>,
    activeDeadline: number | null,
  ) {
    saveProgress(actor.role, {
      weekId: getWeekId(),
      author: activePack.author,
      index: activeIndex,
      answers: activeAnswers,
      deadlineAt: activeDeadline,
    })
  }

  function clearQuestionTimer() {
    setDeadlineAt(null)
    deadlineAtRef.current = null
    setSecondsLeft(SECONDS_PER_QUESTION)
  }

  const myAuthor: QuizAuthor = actor.role
  const myQuestions = bank[myAuthor]
  const current = pack?.questions[index]
  const total = pack?.questions.length ?? 0

  function buildPack(author: QuizAuthor, questions: QuizQuestion[]): QuizPack {
    return {
      ...getQuizMeta(author),
      questions: playableQuestions(questions),
    }
  }

  function computeScore(
    activePack: QuizPack,
    records: Record<string, AnswerRecord>,
  ): number {
    let score = 0
    for (const q of activePack.questions) {
      const record = records[q.id]
      if (record && !record.timedOut && record.chosen === q.correctAnswer) {
        score += 1
      }
    }
    return score
  }

  function finishQuiz(
    nextAnswers: Record<string, AnswerRecord>,
    activePack: QuizPack,
  ) {
    const bothQuestionnairesReady =
      countCompleteQuestions(bank.him) === QUESTIONS_PER_QUIZ &&
      countCompleteQuestions(bank.her) === QUESTIONS_PER_QUIZ

    if (bothQuestionnairesReady) {
      const nextScore = computeScore(activePack, nextAnswers)
      void recordScore(activePack.author, nextScore, activePack.questions.length)
    }

    clearProgress(actor.role)
    setAnswers(nextAnswers)
    setLocked(false)
    clearQuestionTimer()
    setPhase('results')
  }

  function advance(
    nextAnswers: Record<string, AnswerRecord>,
    activePack: QuizPack,
    fromIndex: number,
  ) {
    if (lockedRef.current) return
    setLocked(true)
    lockedRef.current = true
    setAnswers(nextAnswers)
    answersRef.current = nextAnswers

    if (fromIndex < activePack.questions.length - 1) {
      window.setTimeout(() => {
        const nextIndex = fromIndex + 1
        setIndex(nextIndex)
        indexRef.current = nextIndex
        const nextDeadline = createQuestionDeadline()
        setDeadlineAt(nextDeadline)
        deadlineAtRef.current = nextDeadline
        setSecondsLeft(SECONDS_PER_QUESTION)
        persistPlayingProgress(
          activePack,
          nextIndex,
          nextAnswers,
          nextDeadline,
        )
        setLocked(false)
        lockedRef.current = false
      }, 200)
    } else {
      window.setTimeout(() => {
        finishQuiz(nextAnswers, activePack)
      }, 220)
    }
  }

  function startQuiz(author: QuizAuthor) {
    if (myRecord?.finished) return
    const himReady =
      countCompleteQuestions(bank.him) === QUESTIONS_PER_QUIZ
    const herReady =
      countCompleteQuestions(bank.her) === QUESTIONS_PER_QUIZ
    if (!himReady || !herReady) return

    const nextPack = buildPack(author, bank[author])
    if (nextPack.questions.length !== QUESTIONS_PER_QUIZ) return

    setPack(nextPack)
    packRef.current = nextPack
    setIndex(0)
    indexRef.current = 0
    setAnswers({})
    answersRef.current = {}
    const nextDeadline = createQuestionDeadline()
    setDeadlineAt(nextDeadline)
    deadlineAtRef.current = nextDeadline
    setSecondsLeft(SECONDS_PER_QUESTION)
    setLocked(false)
    lockedRef.current = false
    persistPlayingProgress(nextPack, 0, {}, nextDeadline)
    setPhase('playing')
  }

  function selectOption(option: string) {
    const activePack = packRef.current
    const activeIndex = indexRef.current
    const question = activePack?.questions[activeIndex]
    if (!activePack || !question || lockedRef.current) return

    const next = {
      ...answersRef.current,
      [question.id]: { chosen: option, timedOut: false },
    }
    advance(next, activePack, activeIndex)
  }

  // Resume an unfinished attempt after reload (same week, not already finished)
  useEffect(() => {
    if (restoredRef.current || myRecord?.finished || phase !== 'hub') return

    const saved = loadProgress(actor.role)
    if (!saved || saved.weekId !== getWeekId()) {
      if (saved) clearProgress(actor.role)
      restoredRef.current = true
      return
    }

    const himReady = countCompleteQuestions(bank.him) === QUESTIONS_PER_QUIZ
    const herReady = countCompleteQuestions(bank.her) === QUESTIONS_PER_QUIZ
    if (!himReady || !herReady) return

    const nextPack = buildPack(saved.author, bank[saved.author])
    if (nextPack.questions.length !== QUESTIONS_PER_QUIZ) {
      clearProgress(actor.role)
      restoredRef.current = true
      return
    }

    const safeIndex = Math.min(
      Math.max(saved.index, 0),
      nextPack.questions.length - 1,
    )
    const deadline =
      saved.deadlineAt != null && saved.deadlineAt > Date.now()
        ? saved.deadlineAt
        : createQuestionDeadline()

    setPack(nextPack)
    packRef.current = nextPack
    setIndex(safeIndex)
    indexRef.current = safeIndex
    setAnswers(saved.answers)
    answersRef.current = saved.answers
    setDeadlineAt(deadline)
    deadlineAtRef.current = deadline
    setSecondsLeft(
      Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
    )
    setLocked(false)
    lockedRef.current = false
    persistPlayingProgress(nextPack, safeIndex, saved.answers, deadline)
    setPhase('playing')
    restoredRef.current = true
  }, [actor.role, bank, myRecord?.finished, phase])

  useEffect(() => {
    if (phase !== 'playing' || deadlineAt == null) return

    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000))
      setSecondsLeft(left)

      if (left > 0 || lockedRef.current) return

      window.clearInterval(tick)
      const activePack = packRef.current
      const activeIndex = indexRef.current
      const activeQuestion = activePack?.questions[activeIndex]
      if (!activePack || !activeQuestion) return
      if (answersRef.current[activeQuestion.id]) return

      const next = {
        ...answersRef.current,
        [activeQuestion.id]: { chosen: null, timedOut: true },
      }
      advance(next, activePack, activeIndex)
    }, 250)

    return () => window.clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deadlineAt])

  function backToHub() {
    clearProgress(actor.role)
    setPhase('hub')
    setPack(null)
    packRef.current = null
    setIndex(0)
    indexRef.current = 0
    setAnswers({})
    answersRef.current = {}
    clearQuestionTimer()
    setLocked(false)
    lockedRef.current = false
  }

  async function handleSave(questions: QuizQuestion[]) {
    await saveQuestionnaire(myAuthor, questions)
    setPhase('hub')
  }

  const score = pack ? computeScore(pack, answers) : 0
  const timerUrgent = secondsLeft <= 10
  const myReady = countCompleteQuestions(myQuestions)
  const theirAuthor: QuizAuthor = myAuthor === 'him' ? 'her' : 'him'
  const theirMeta = getQuizMeta(theirAuthor)
  const theirReady = countCompleteQuestions(bank[theirAuthor])
  const bothReady =
    myReady === QUESTIONS_PER_QUIZ && theirReady === QUESTIONS_PER_QUIZ
  const theirPlayable = playableQuestions(bank[theirAuthor])
  const canPlayTheirs =
    bothReady &&
    theirPlayable.length === QUESTIONS_PER_QUIZ &&
    !myRecord?.finished
  const waitingOnThem = myReady === QUESTIONS_PER_QUIZ && theirReady < QUESTIONS_PER_QUIZ
  const waitingOnMe = myReady < QUESTIONS_PER_QUIZ
  const daysLeft = daysUntilNextWeek()
  const currentWeekLabel = weekLabel || formatWeekLabel()
  const combinedSyncError = syncError ?? scoreSyncError
  const combinedSyncState =
    syncState === 'error' || scoreSyncState === 'error'
      ? 'error'
      : syncState === 'connecting' || scoreSyncState === 'connecting'
        ? 'connecting'
        : syncState === 'local' || scoreSyncState === 'local'
          ? 'local'
          : 'synced'

  return (
    <section className="section" id="quiz">
      <p className="section__eyebrow">Soft psych</p>
      <h2 className="section__title">{quizSectionTitle}</h2>
      <p className="section__lead">{quizSectionLead}</p>

      <p className="quiz-status" data-state={combinedSyncState}>
        {syncLabel(combinedSyncState)}
      </p>
      {combinedSyncError ? (
        <p className="quiz-sync-error">{combinedSyncError}</p>
      ) : null}

      <div className="quiz-scoreboard">
        <p className="quiz-scoreboard__eyebrow">Tallied points</p>
        <div className="quiz-scoreboard__players">
          {(['him', 'her'] as const).map((role) => {
            const isMe = role === actor.role
            const points = role === 'him' ? tally.himPoints : tally.herPoints

            return (
              <div
                key={role}
                className={`quiz-scoreboard__player${isMe ? ' is-you' : ''}`}
              >
                <p className="quiz-scoreboard__label">
                  {displayName(role)}
                  {isMe ? ' · you' : ''}
                </p>
                <p className="quiz-scoreboard__points">
                  {points}
                </p>
              </div>
            )
          })}
        </div>

        <div className="quiz-week">
          <p className="quiz-week__eyebrow">This week’s round</p>
          <p className="quiz-week__range">{currentWeekLabel}</p>
          <p className="quiz-week__note">
            Both questionnaires must be ready before anyone can play. One try each
            · resets in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="quiz-scoreboard__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => historyDialogRef.current?.showModal()}
          >
            Score history{history.length > 0 ? ` (${history.length})` : ''}
          </button>
        </div>
      </div>

      <dialog ref={historyDialogRef} className="quiz-history-dialog">
        <div className="quiz-history-dialog__panel">
          <div className="quiz-history-dialog__head">
            <div>
              <p className="quiz-history-dialog__eyebrow">Scoreboard</p>
              <h3 className="quiz-history-dialog__title">Score history</h3>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => historyDialogRef.current?.close()}
            >
              Close
            </button>
          </div>

          {history.length > 0 ? (
            <ul className="quiz-history__list">
              {history.map((entry) => (
                <li key={entry.id} className="quiz-history__item">
                  <p className="quiz-history__when">
                    {entry.weekId && entry.weekId !== 'legacy'
                      ? `Week of ${formatWeekLabel(entry.weekId)}`
                      : formatHistoryDate(entry.playedAt)}
                  </p>
                  <div className="quiz-history__scores">
                    <span>
                      {displayName('him')}{' '}
                      <strong>{formatScoreSnap(entry.him)}</strong>
                    </span>
                    <span>
                      {displayName('her')}{' '}
                      <strong>{formatScoreSnap(entry.her)}</strong>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiz-history-dialog__empty">
              No rounds yet — finish a quiz to start the record.
            </p>
          )}
        </div>
      </dialog>

      {phase === 'hub' && (
        <>
          <div className="quiz-mine">
            <div>
              <p className="quiz-mine__eyebrow">Your questionnaire</p>
              <p className="quiz-mine__copy">
                {myReady === QUESTIONS_PER_QUIZ
                  ? `Your ${QUESTIONS_PER_QUIZ} questions are set for this week.`
                  : `${myReady}/${QUESTIONS_PER_QUIZ} ready — write a fresh set for this week.`}
              </p>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setPhase('editing')}
            >
              {myReady === 0 ? 'Make my quiz' : 'Edit my quiz'}
            </button>
          </div>

          <div className="quiz-hub">
            {myRecord?.finished ? (
              <article className="quiz-pick quiz-pick--results is-recommended">
                <p className="quiz-pick__eyebrow">{theirMeta.title} · this week</p>
                <h3 className="quiz-pick__title">You’re done for this week</h3>
                <p className="quiz-pick__sub">
                  Scores stay up until next week — then you’ll both write ten new
                  questions and play again.
                </p>

                <div className="quiz-pick__duel">
                  <div className="quiz-pick__duel-side">
                    <p className="quiz-pick__duel-label">You</p>
                    <p className="quiz-pick__duel-score">
                      {myRecord.last}
                      <span>/{myRecord.questionTotal}</span>
                    </p>
                    <p className="quiz-pick__duel-meta">This week’s score</p>
                  </div>
                  <div className="quiz-pick__duel-vs" aria-hidden="true">
                    vs
                  </div>
                  <div className="quiz-pick__duel-side">
                    <p className="quiz-pick__duel-label">
                      {displayName(theirAuthor)}
                    </p>
                    {board[theirAuthor]?.finished ? (
                      <>
                        <p className="quiz-pick__duel-score">
                          {board[theirAuthor]!.last}
                          <span>/{board[theirAuthor]!.questionTotal}</span>
                        </p>
                        <p className="quiz-pick__duel-meta">This week’s score</p>
                      </>
                    ) : (
                      <>
                        <p className="quiz-pick__duel-score is-locked">?</p>
                        <p className="quiz-pick__duel-meta">Waiting on them</p>
                      </>
                    )}
                  </div>
                </div>

                <p className="quiz-pick__score">
                  Next round in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                </p>
              </article>
            ) : (
              <article className="quiz-pick is-recommended">
                <p className="quiz-pick__eyebrow">{theirMeta.forLabel}</p>
                <h3 className="quiz-pick__title">{theirMeta.title}</h3>
                <p className="quiz-pick__sub">{theirMeta.subtitle}</p>
                <p className="quiz-pick__meta">
                  You {myReady}/{QUESTIONS_PER_QUIZ} · Them {theirReady}/
                  {QUESTIONS_PER_QUIZ} · {SECONDS_PER_QUESTION}s each
                </p>
                <p className="quiz-pick__score">
                  {waitingOnMe
                    ? 'Finish your questionnaire first'
                    : waitingOnThem
                      ? 'Waiting for them to finish their questionnaire'
                      : bothReady
                        ? 'Both ready — one try this week'
                        : 'Questionnaires incomplete'}
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => startQuiz(theirAuthor)}
                  disabled={!canPlayTheirs}
                >
                  {canPlayTheirs
                    ? `Start ${theirMeta.authorLabel.toLowerCase()}`
                    : waitingOnMe
                      ? 'Lock your quiz first'
                      : waitingOnThem
                        ? 'Waiting on them'
                        : 'Not ready yet'}
                </button>
              </article>
            )}
          </div>
        </>
      )}

      {phase === 'editing' && (
        <QuizEditor
          key={myAuthor}
          author={myAuthor}
          authorLabel={getQuizMeta(myAuthor).authorLabel}
          initialQuestions={myQuestions}
          onCancel={backToHub}
          onSave={handleSave}
        />
      )}

      {phase === 'playing' && pack && current && (
        <div className="quiz-card">
          <div className="quiz-playing-head">
            <p className="quiz-progress">
              {pack.authorLabel} · Question {index + 1} of {total}
            </p>
            <p
              className={`quiz-timer${timerUrgent ? ' is-urgent' : ''}`}
              aria-live="polite"
            >
              {formatTimer(secondsLeft)}
            </p>
          </div>
          <div
            className="quiz-timer-bar"
            aria-hidden="true"
            style={{
              ['--timer-pct' as string]: `${(secondsLeft / SECONDS_PER_QUESTION) * 100}%`,
            }}
          />
          <h3 className="quiz-prompt">{current.prompt}</h3>
          <div className="quiz-options">
            {current.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`quiz-option${answers[current.id]?.chosen === option ? ' is-selected' : ''}`}
                onClick={() => selectOption(option)}
                disabled={locked}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'results' && pack && (
        <div className="quiz-card quiz-results">
          <p className="quiz-score">
            {score}/{total}
          </p>
          <p className="quiz-score-label">
            {scoreLabel(score, total)} · {pack.title}
          </p>
          <ul className="compare-list">
            {pack.questions.map((q) => {
              const record = answers[q.id]
              const chosen = record?.chosen
              const timedOut = record?.timedOut ?? false
              const match = !timedOut && chosen === q.correctAnswer
              return (
                <li
                  key={q.id}
                  className={`compare-item${match ? ' is-match' : ' is-miss'}`}
                >
                  <p className="compare-item__q">{q.prompt}</p>
                  <div className="compare-item__answers">
                    <span>
                      You: {timedOut ? 'Timed out' : (chosen ?? '—')}
                    </span>
                    <span>Answer: {q.correctAnswer}</span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="quiz-results__actions">
            <button type="button" className="btn" onClick={backToHub}>
              Back to scores
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function scoreLabel(score: number, total: number): string {
  const pct = total === 0 ? 0 : score / total
  if (pct === 1) return 'Perfect — you know them cold'
  if (pct >= 0.8) return 'Strong — almost telepathic'
  if (pct >= 0.5) return 'Solid — still some mysteries'
  return 'Cute chaos — rematch unlocked'
}

function syncLabel(state: string): string {
  switch (state) {
    case 'synced':
      return 'Live sync on — quizzes and scores stay shared.'
    case 'connecting':
      return 'Connecting quiz sync…'
    case 'error':
      return 'Sync failed — local quizzes and scores still work on this phone.'
    default:
      return 'Local mode — add Firebase env vars to sync across phones.'
  }
}
