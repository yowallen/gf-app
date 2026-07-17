export type QuizAuthor = 'him' | 'her'

export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** The correct answer — must match one of `options` */
  correctAnswer: string
}

export type QuizPackMeta = {
  author: QuizAuthor
  authorLabel: string
  forLabel: string
  title: string
  subtitle: string
}

export type QuizPack = QuizPackMeta & {
  questions: QuizQuestion[]
}

export const quizSectionTitle = 'How well do you know me?'
export const quizSectionLead =
  'Weekly challenge: both of you write ten questions first. The quiz opens only when both sets are ready — one try each, then next week resets.'

export const SECONDS_PER_QUESTION = 60
export const QUESTIONS_PER_QUIZ = 10
export const OPTIONS_PER_QUESTION = 4

export const quizMetas: QuizPackMeta[] = [
  {
    author: 'him',
    authorLabel: 'His quiz',
    forLabel: 'For her',
    title: 'Do you know him?',
    subtitle:
      'Questions he wrote about himself. Take the quiz once his ten are ready.',
  },
  {
    author: 'her',
    authorLabel: 'Her quiz',
    forLabel: 'For him',
    title: 'Do you know her?',
    subtitle:
      'Questions she wrote about herself. Take the quiz once her ten are ready.',
  },
]

export function getQuizMeta(author: QuizAuthor): QuizPackMeta {
  return author === 'him' ? quizMetas[0] : quizMetas[1]
}

export function newQuestionId(author: QuizAuthor): string {
  return `${author}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createBlankQuestion(author: QuizAuthor): QuizQuestion {
  return {
    id: newQuestionId(author),
    prompt: '',
    options: Array.from({ length: OPTIONS_PER_QUESTION }, () => ''),
    correctAnswer: '',
  }
}

export function createBlankQuestionnaire(author: QuizAuthor): QuizQuestion[] {
  return Array.from({ length: QUESTIONS_PER_QUIZ }, () =>
    createBlankQuestion(author),
  )
}

export function isQuestionComplete(question: QuizQuestion): boolean {
  if (!question.prompt.trim()) return false
  if (question.options.length !== OPTIONS_PER_QUESTION) return false
  if (question.options.some((option) => !option.trim())) return false
  if (!question.correctAnswer.trim()) return false
  return question.options.some(
    (option) => option.trim() === question.correctAnswer.trim(),
  )
}

export function countCompleteQuestions(questions: QuizQuestion[]): number {
  return questions.filter(isQuestionComplete).length
}

export function normalizeQuestion(question: QuizQuestion): QuizQuestion {
  const options = question.options
    .slice(0, OPTIONS_PER_QUESTION)
    .map((option) => option.trim())
  while (options.length < OPTIONS_PER_QUESTION) options.push('')

  const correctAnswer = question.correctAnswer.trim()
  return {
    id: question.id,
    prompt: question.prompt.trim(),
    options,
    correctAnswer,
  }
}

export function normalizeQuestionnaire(
  questions: QuizQuestion[],
  author: QuizAuthor,
): QuizQuestion[] {
  const normalized = questions
    .slice(0, QUESTIONS_PER_QUIZ)
    .map(normalizeQuestion)

  while (normalized.length < QUESTIONS_PER_QUIZ) {
    normalized.push(createBlankQuestion(author))
  }

  return normalized
}

export function playableQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions
    .map(normalizeQuestion)
    .filter(isQuestionComplete)
    .slice(0, QUESTIONS_PER_QUIZ)
}
