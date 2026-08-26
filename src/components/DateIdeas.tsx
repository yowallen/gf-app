import { useMemo, useState } from 'react'
import { BookmarkSimpleIcon, CheckCircleIcon, MapPinIcon } from '@phosphor-icons/react'
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

type DateIdeasProps = Readonly<{
  addedBy: string
}>

type FilterGroupProps = Readonly<{
  label: string
  hint?: string
  value: string
  options: string[]
  onChange: (value: string) => void
}>

type IdeaChoicesProps = Readonly<{
  choices: DateIdea[]
  selectedIdeaId: string | null | undefined
  onSelect: (idea: DateIdea) => void
}>

type IdeaResultProps = Readonly<{
  idea: DateIdea
  iconSize: number
  isLiked: boolean
  isTried: boolean
  bucketNote: string
  onGenerate: () => void
  onAddToBucket: () => void
  onToggleLiked: () => void
  onToggleTried: () => void
  onSelectSavedIdea: (idea: DateIdea) => void
  alreadyInBucket: boolean
}>

type SavedIdeasListProps = Readonly<{
  ideas: DateIdea[]
  onSelect: (idea: DateIdea) => void
}>

function matchesFilters(
  idea: DateIdea,
  mood: Mood | 'Any',
  season: Season | 'Any',
  budget: Budget | 'Any',
): boolean {
  if (mood !== 'Any' && idea.mood !== mood) return false
  if (season !== 'Any' && idea.season !== season && idea.season !== 'Anytime') {
    return false
  }
  if (budget !== 'Any' && idea.budget !== budget) return false
  return true
}

function FilterGroup({ label, hint, value, options, onChange }: FilterGroupProps) {
  return (
    <div>
      <p className="filter-group__label">
        {label}
        {hint ? <span className="filter-group__hint">{hint}</span> : null}
      </p>
      <div className="chip-row">
        <button
          type="button"
          className={`chip${value === 'Any' ? ' is-active' : ''}`}
          onClick={() => onChange('Any')}
        >
          Any
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip${value === option ? ' is-active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function IdeaChoices({ choices, selectedIdeaId, onSelect }: IdeaChoicesProps) {
  if (choices.length <= 1) return null

  return (
    <div className="idea-choices">
      <p className="idea-choices__label">Pick one</p>
      <div className="idea-choices__grid">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className={`idea-choice${selectedIdeaId === choice.id ? ' is-active' : ''}`}
            onClick={() => onSelect(choice)}
          >
            <span className="idea-choice__title">{choice.title}</span>
            <span className="idea-choice__meta">
              {choice.mood} · {choice.budget}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function IdeaResult({
  idea,
  iconSize,
  isLiked,
  isTried,
  bucketNote,
  onGenerate,
  onAddToBucket,
  onToggleLiked,
  onToggleTried,
  alreadyInBucket,
}: IdeaResultProps) {
  return (
    <div className="idea-result">
      <h3 className="idea-result__title">{idea.title}</h3>
      <p className="idea-result__desc">{idea.description}</p>
      <div className="idea-result__meta">
        <span className="idea-tag">{idea.mood}</span>
        <span className="idea-tag">{idea.season}</span>
        <span className="idea-tag">{idea.budget}</span>
        <span className="idea-tag">{idea.timeOfDay}</span>
        <span className="idea-tag">{idea.duration}</span>
        <span className="idea-tag">{idea.locationHint}</span>
        {isTried ? <span className="idea-tag idea-tag--tried">Tried</span> : null}
        {isLiked ? <span className="idea-tag idea-tag--liked">Saved</span> : null}
      </div>

      <div className="idea-result__actions">
        <button type="button" className="btn" onClick={onGenerate}>
          Another one
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onAddToBucket}
          disabled={alreadyInBucket}
        >
          {alreadyInBucket ? 'On bucket list' : 'Add to bucket list'}
        </button>
      </div>
      <div className="idea-result__CTB">
        <button
          type="button"
          className="idea-result__action"
          onClick={onToggleLiked}
          aria-label={isLiked ? 'Remove from saved ideas' : 'Save this idea'}
        >
          <BookmarkSimpleIcon
            size={iconSize}
            weight={isLiked ? 'fill' : 'regular'}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className="idea-result__action"
          onClick={onToggleTried}
          aria-label={isTried ? 'Mark as not tried' : 'Mark as tried'}
        >
          <CheckCircleIcon
            size={iconSize}
            weight={isTried ? 'fill' : 'regular'}
            aria-hidden
          />
        </button>
        <a
          className="idea-result__action"
          href={mapsSearchUrl(idea.locationHint)}
          target="_blank"
          rel="noreferrer"
          aria-label={`See location on Google Maps: ${idea.locationHint}`}
        >
          <MapPinIcon size={iconSize} aria-hidden />
        </a>
      </div>
      {bucketNote ? <p className="idea-result__note">{bucketNote}</p> : null}
    </div>
  )
}

function SavedIdeasList({ ideas, onSelect }: SavedIdeasListProps) {
  if (ideas.length === 0) return null

  return (
    <div className="idea-saved">
      <p className="idea-saved__title">Saved ideas</p>
      <ul className="idea-saved__list">
        {ideas.map((saved) => (
          <li key={saved.id}>
            <button
              type="button"
              className="idea-saved__item"
              onClick={() => onSelect(saved)}
            >
              {saved.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DateIdeas({ addedBy }: DateIdeasProps) {
  const guessedSeason = detectPhilippineSeason()
  const [mood, setMood] = useState<Mood | 'Any'>('Any')
  const [season, setSeason] = useState<Season | 'Any'>(guessedSeason)
  const [budget, setBudget] = useState<Budget | 'Any'>('Any')
  const [idea, setIdea] = useState<DateIdea | null>(null)
  const [choices, setChoices] = useState<DateIdea[]>([])
  const [bucketNote, setBucketNote] = useState('')
  const ideaResultIconSize = 30

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
    return dateIdeas.filter((entry) =>
      matchesFilters(entry, mood, season, budget),
    )
  }, [mood, season, budget])

  const likedIdeas = useMemo(
    () => dateIdeas.filter((entry) => likedIds.includes(entry.id)),
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

  function selectChoice(choice: DateIdea) {
    setIdea(choice)
    setBucketNote('')
  }

  function selectSavedIdea(saved: DateIdea) {
    setIdea(saved)
    setChoices([])
    setBucketNote('')
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
        <FilterGroup
          label="Mood"
          value={mood}
          options={moods}
          onChange={(value) => setMood(value as Mood | 'Any')}
        />
        <FilterGroup
          label="Season"
          hint={season === guessedSeason ? ' · now-ish' : undefined}
          value={season}
          options={seasons}
          onChange={(value) => setSeason(value as Season | 'Any')}
        />
        <FilterGroup
          label="Budget"
          value={budget}
          options={budgets}
          onChange={(value) => setBudget(value as Budget | 'Any')}
        />
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

      <IdeaChoices choices={choices} selectedIdeaId={idea?.id} onSelect={selectChoice} />

      {idea ? (
        <IdeaResult
          idea={idea}
          iconSize={ideaResultIconSize}
          isLiked={isLiked(idea.id)}
          isTried={isTried(idea.id)}
          bucketNote={bucketNote}
          onGenerate={generate}
          onAddToBucket={() => addIdeaToBucket(idea)}
          onToggleLiked={() => toggleLiked(idea.id)}
          onToggleTried={() => toggleTried(idea.id)}
          onSelectSavedIdea={selectSavedIdea}
          alreadyInBucket={alreadyInBucket(idea.title)}
        />
      ) : (
        <div className="idea-empty">
          {filtered.length === 0
            ? 'No ideas match those filters — loosen one and try again.'
            : 'Hit generate when you are ready.'}
        </div>
      )}

      <SavedIdeasList ideas={likedIdeas} onSelect={selectSavedIdea} />
    </section>
  )
}
