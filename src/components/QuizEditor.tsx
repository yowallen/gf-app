import { useState } from 'react'
import {
  OPTIONS_PER_QUESTION,
  QUESTIONS_PER_QUIZ,
  countCompleteQuestions,
  createBlankQuestionnaire,
  isQuestionComplete,
  type QuizAuthor,
  type QuizQuestion,
} from '../data/quiz'

type QuizEditorProps = {
  author: QuizAuthor
  authorLabel: string
  initialQuestions: QuizQuestion[]
  onCancel: () => void
  onSave: (questions: QuizQuestion[]) => Promise<void> | void
}

export function QuizEditor({
  author,
  authorLabel,
  initialQuestions,
  onCancel,
  onSave,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(() =>
    initialQuestions.length === QUESTIONS_PER_QUIZ
      ? initialQuestions
      : createBlankQuestionnaire(author),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const completeCount = countCompleteQuestions(questions)

  function updateQuestion(
    index: number,
    patch: Partial<QuizQuestion> | ((current: QuizQuestion) => QuizQuestion),
  ) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== index) return question
        return typeof patch === 'function'
          ? patch(question)
          : { ...question, ...patch }
      }),
    )
    if (error) setError('')
  }

  async function handleSave() {
    const incomplete = questions.findIndex((q) => !isQuestionComplete(q))
    if (incomplete !== -1) {
      setError(
        `Finish question ${incomplete + 1}: prompt, all ${OPTIONS_PER_QUESTION} options, and pick the right answer.`,
      )
      return
    }

    setSaving(true)
    try {
      await onSave(questions)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="quiz-editor">
      <div className="quiz-editor__head">
        <div>
          <p className="quiz-editor__eyebrow">Build your quiz</p>
          <h3 className="quiz-editor__title">{authorLabel}</h3>
          <p className="quiz-editor__lead">
            Write {QUESTIONS_PER_QUIZ} questions, fill {OPTIONS_PER_QUESTION}{' '}
            choices each, then mark the correct answer. The other person won’t
            see the answer key while playing.
          </p>
        </div>
        <p className="quiz-editor__progress">
          {completeCount}/{QUESTIONS_PER_QUIZ} ready
        </p>
      </div>

      <div className="quiz-editor__list">
        {questions.map((question, index) => (
          <article key={question.id} className="quiz-editor__card">
            <label
              className="quiz-editor__label"
              htmlFor={`q-prompt-${question.id}`}
            >
              Question {index + 1}
            </label>
            <input
              id={`q-prompt-${question.id}`}
              className="quiz-editor__input"
              type="text"
              value={question.prompt}
              placeholder="e.g. What’s my go-to comfort food?"
              onChange={(e) =>
                updateQuestion(index, { prompt: e.target.value })
              }
            />

            <p className="quiz-editor__options-label">
              Choices · tap ★ for the right answer
            </p>
            <div className="quiz-editor__options">
              {question.options.map((option, optionIndex) => {
                const optionId = `${question.id}-opt-${optionIndex}`
                const isCorrect =
                  option.trim() !== '' &&
                  option.trim() === question.correctAnswer.trim()

                return (
                  <div key={optionId} className="quiz-editor__option-row">
                    <button
                      type="button"
                      className={`quiz-editor__correct${isCorrect ? ' is-active' : ''}`}
                      aria-label={`Mark choice ${optionIndex + 1} as correct`}
                      aria-pressed={isCorrect}
                      onClick={() => {
                        if (!option.trim()) {
                          setError(
                            `Add text for choice ${optionIndex + 1} before marking it correct.`,
                          )
                          return
                        }
                        updateQuestion(index, {
                          correctAnswer: option.trim(),
                        })
                      }}
                    >
                      ★
                    </button>
                    <input
                      className="quiz-editor__input"
                      type="text"
                      value={option}
                      placeholder={`Choice ${optionIndex + 1}`}
                      aria-label={`Question ${index + 1} choice ${optionIndex + 1}`}
                      onChange={(e) => {
                        const nextValue = e.target.value
                        updateQuestion(index, (current) => {
                          const options = current.options.map((item, i) =>
                            i === optionIndex ? nextValue : item,
                          )
                          const wasCorrect =
                            current.correctAnswer.trim() !== '' &&
                            current.options[optionIndex].trim() ===
                              current.correctAnswer.trim()
                          return {
                            ...current,
                            options,
                            correctAnswer: wasCorrect
                              ? nextValue.trim()
                              : current.correctAnswer,
                          }
                        })
                      }}
                    />
                  </div>
                )
              })}
            </div>
            {question.correctAnswer.trim() ? (
              <p className="quiz-editor__answer">
                Right answer: <strong>{question.correctAnswer}</strong>
              </p>
            ) : (
              <p className="quiz-editor__answer is-missing">
                Pick a right answer with ★
              </p>
            )}
          </article>
        ))}
      </div>

      {error ? <p className="quiz-editor__error">{error}</p> : null}

      <div className="quiz-editor__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save questionnaire'}
        </button>
      </div>
    </div>
  )
}
