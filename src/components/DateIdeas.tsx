import { useMemo, useState } from 'react'
import {
  budgets,
  dateIdeas,
  detectPhilippineSeason,
  mapsSearchUrl,
  moods,
  pickDateIdea,
  pickDateIdeaTrio,
  seasons,
  type Budget,
  type DateIdea,
  type Mood,
  type Season,
} from '../data/dateIdeas'
import { useBucketList } from '../hooks/useBucketList'
import { useDateIdeaMemory } from '../hooks/useDateIdeaMemory'
import { BookmarkSimpleIcon, CheckIcon, MapPinLineIcon } from '@phosphor-icons/react'

type DateIdeasProps = {
  addedBy: string
}

export function DateIdeas({ addedBy }: DateIdeasProps) {
  const guessedSeason = detectPhilippineSeason()
  const [mood, setMood] = useState<Mood | 'Any'>('Any')
  const [season, setSeason] = useState<Season | 'Any'>(guessedSeason)
  const [budget, setBudget] = useState<Budget | 'Any'>('Any')
  const [idea, setIdea] = useState<DateIdea | null>(null)
  const [choices, setChoices] = useState<DateIdea[]>([])
  const [spinKey, setSpinKey] = useState(0)
  const [bucketNote, setBucketNote] = useState('')
  const ideaResult_IconSize = 30

  const { items, addItem } = useBucketList(addedBy)
  const {
    recentIds,
    triedIds,
    likedIds,
    rememberRecent,
    toggleTried,
    toggleLiked,
    isTried,
    isLiked,
  } = useDateIdeaMemory()

  const filtered = useMemo(() => {
    return dateIdeas.filter((d) => {
      if (mood !== 'Any' && d.mood !== mood) return false
      if (season !== 'Any' && d.season !== season && d.season !== 'Anytime') {
        return false
      }
      if (budget !== 'Any' && d.budget !== budget) return false
      return true
    })
  }, [mood, season, budget])

  const likedIdeas = useMemo(
    () => dateIdeas.filter((d) => likedIds.includes(d.id)),
    [likedIds],
  )

  function alreadyInBucket(title: string): boolean {
    const needle = title.trim().toLowerCase()
    return items.some((item) => item.text.trim().toLowerCase() === needle)
  }

  function applyPick(next: DateIdea | null, nextChoices: DateIdea[] = []) {
    setIdea(next)
    setChoices(nextChoices)
    setBucketNote('')
    setSpinKey((k) => k + 1)
    if (next) rememberRecent(next.id)
    for (const choice of nextChoices) rememberRecent(choice.id)
  }

  function generate() {
    const next = pickDateIdea(filtered, recentIds, triedIds)
    applyPick(next)
  }

  function surprise() {
    const next = pickDateIdea(dateIdeas, recentIds, triedIds)
    setMood('Any')
    setSeason('Any')
    setBudget('Any')
    applyPick(next)
  }

  function generateTrio() {
    const trio = pickDateIdeaTrio(filtered, recentIds, triedIds)
    applyPick(trio[0] ?? null, trio)
  }

  function addIdeaToBucket(target: DateIdea) {
    if (alreadyInBucket(target.title)) {
      setBucketNote('Already on your bucket list.')
      return
    }
    addItem(target.title, 'date')
    setBucketNote('Added to bucket list.')
  }

  return (
    <section className="section" id="dates">
      <p className="section__eyebrow">Field trips for two</p>
      <h2 className="section__title">Date ideas generator</h2>
      <p className="section__lead">
        Pick a mood, season, and budget (in pesos). We’ll avoid recent repeats,
        prefer ideas you haven’t tried, and let you save keepers to the bucket
        list.
      </p>

      <div className="filters">
        <div>
          <p className="filter-group__label">Mood</p>
          <div className="chip-row">
            <button
              type="button"
              className={`chip${mood === 'Any' ? ' is-active' : ''}`}
              onClick={() => setMood('Any')}
            >
              Any
            </button>
            {moods.map((m) => (
              <button
                key={m}
                type="button"
                className={`chip${mood === m ? ' is-active' : ''}`}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="filter-group__label">
            Season
            {season === guessedSeason ? (
              <span className="filter-group__hint"> · now-ish</span>
            ) : null}
          </p>
          <div className="chip-row">
            <button
              type="button"
              className={`chip${season === 'Any' ? ' is-active' : ''}`}
              onClick={() => setSeason('Any')}
            >
              Any
            </button>
            {seasons.map((s) => (
              <button
                key={s}
                type="button"
                className={`chip${season === s ? ' is-active' : ''}`}
                onClick={() => setSeason(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="filter-group__label">Budget</p>
          <div className="chip-row">
            <button
              type="button"
              className={`chip${budget === 'Any' ? ' is-active' : ''}`}
              onClick={() => setBudget('Any')}
            >
              Any
            </button>
            {budgets.map((b) => (
              <button
                key={b}
                type="button"
                className={`chip${budget === b ? ' is-active' : ''}`}
                onClick={() => setBudget(b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="idea-toolbar">
        <button type="button" className="btn" onClick={generate}>
          Generate a date idea
        </button>
        <button type="button" className="btn btn--ghost" onClick={generateTrio}>
          Show 3 options
        </button>
        <button type="button" className="btn btn--ghost" onClick={surprise}>
          Surprise me
        </button>
        <span className="idea-toolbar__count">
          {filtered.length} match{filtered.length === 1 ? '' : 'es'}
        </span>
      </div>

      {choices.length > 1 ? (
        <div className="idea-choices" key={`choices-${spinKey}`}>
          <p className="idea-choices__label">Pick one</p>
          <div className="idea-choices__grid">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`idea-choice${idea?.id === choice.id ? ' is-active' : ''}`}
                onClick={() => {
                  setIdea(choice)
                  setBucketNote('')
                }}
              >
                <span className="idea-choice__title">{choice.title}</span>
                <span className="idea-choice__meta">
                  {choice.mood} · {choice.budget}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {idea ? (
        <div className="idea-result" key={spinKey}>
          <h3 className="idea-result__title">{idea.title}</h3>
          <p className="idea-result__desc">{idea.description}</p>
          <div className="idea-result__meta">
            <span className="idea-tag">{idea.mood}</span>
            <span className="idea-tag">{idea.season}</span>
            <span className="idea-tag">{idea.budget}</span>
            <span className="idea-tag">{idea.timeOfDay}</span>
            <span className="idea-tag">{idea.duration}</span>
            <span className="idea-tag">{idea.locationHint}</span>
            {isTried(idea.id) ? (
              <span className="idea-tag idea-tag--tried">Tried</span>
            ) : null}
            {isLiked(idea.id) ? (
              <span className="idea-tag idea-tag--liked">Saved</span>
            ) : null}
          </div>

          <div className="idea-result__actions">
            <button type="button" className="btn" onClick={generate}>
              Another one
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => addIdeaToBucket(idea)}
              disabled={alreadyInBucket(idea.title)}
            >
              {alreadyInBucket(idea.title)
                ? 'On bucket list'
                : 'Add to bucket list'}
            </button>
          </div>
          <div className="idea-result__CTB">
            <button
              type="button"
              className="idea-result__action"
              onClick={() => toggleLiked(idea.id)}
            >
              {isLiked(idea.id) ? 
                <BookmarkSimpleIcon size={ideaResult_IconSize} weight="fill" />
                : 
                <BookmarkSimpleIcon size={ideaResult_IconSize} />
              }
            </button>
            <button
              type="button"
              className="idea-result__action"
              onClick={() => toggleTried(idea.id)}
            >
              {isTried(idea.id) ? 
                <CheckIcon size={ideaResult_IconSize} weight="fill" />
                : 
                <CheckIcon size={ideaResult_IconSize} />
              }
            </button>
            <a
              className="idea-result__action"
              href={mapsSearchUrl(idea.locationHint)}
              target="_blank"
              rel="noreferrer"
            >
              <MapPinLineIcon size={ideaResult_IconSize} />
            </a>
          </div>
          {bucketNote ? <p className="idea-result__note">{bucketNote}</p> : null}
        </div>
      ) : (
        <div className="idea-empty">
          {filtered.length === 0
            ? 'No ideas match those filters — loosen one and try again.'
            : 'Hit generate when you are ready.'}
        </div>
      )}

      {likedIdeas.length > 0 ? (
        <div className="idea-saved">
          <p className="idea-saved__title">Saved ideas</p>
          <ul className="idea-saved__list">
            {likedIdeas.map((saved) => (
              <li key={saved.id}>
                <button
                  type="button"
                  className="idea-saved__item"
                  onClick={() => {
                    setIdea(saved)
                    setChoices([])
                    setBucketNote('')
                    setSpinKey((k) => k + 1)
                  }}
                >
                  {saved.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
