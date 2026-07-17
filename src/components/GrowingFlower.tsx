import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { formatMeetDate, type MeetDay } from '../data/timeline'
import type { MeetDayInput } from '../hooks/useMeetLog'

type GrowingFlowerProps = {
  items: MeetDay[]
  uploading: boolean
  onUpdate: (id: string, input: MeetDayInput) => Promise<boolean>
  renderPhoto: (meet: MeetDay) => ReactNode
}

/** Irregular spots along the stem (0–100%), side + tilt for a natural look */
const STEM_LEAF_SPOTS = [
  { y: 12, side: 'left' as const, tilt: -28, size: 1 },
  { y: 22, side: 'right' as const, tilt: 24, size: 0.85 },
  { y: 34, side: 'left' as const, tilt: -18, size: 1.1 },
  { y: 41, side: 'right' as const, tilt: 32, size: 0.75 },
  { y: 52, side: 'left' as const, tilt: -34, size: 0.95 },
  { y: 61, side: 'right' as const, tilt: 16, size: 1.05 },
  { y: 70, side: 'left' as const, tilt: -22, size: 0.8 },
  { y: 79, side: 'right' as const, tilt: 30, size: 1 },
  { y: 88, side: 'left' as const, tilt: -26, size: 0.9 },
  { y: 95, side: 'right' as const, tilt: 20, size: 0.7 },
]

function TopFlower({ petalCount }: { petalCount: number }) {
  const n = Math.max(petalCount, 0)
  const drawn = Math.min(Math.max(n, n === 0 ? 0 : 1), 12)
  const size = 88
  const cx = size / 2
  const cy = size / 2
  const petalLen = drawn <= 5 ? 28 : drawn <= 8 ? 24 : 20
  const petalW = drawn <= 5 ? 12 : drawn <= 8 ? 10 : 8

  if (n === 0) {
    return (
      <svg
        className="stem-flower stem-flower--seed"
        viewBox="0 0 40 52"
        width="40"
        height="52"
        aria-hidden="true"
      >
        <line className="stem-flower__neck" x1="20" y1="20" x2="20" y2="52" />
        <circle className="stem-flower__seed" cx="20" cy="18" r="7" />
      </svg>
    )
  }

  const svgH = size + 22

  return (
    <svg
      className="stem-flower"
      viewBox={`0 0 ${size} ${svgH}`}
      width={size}
      height={svgH}
      aria-hidden="true"
    >
      {/* Neck joins the vine below */}
      <line
        className="stem-flower__neck"
        x1={cx}
        y1={cy}
        x2={cx}
        y2={svgH}
      />
      {Array.from({ length: drawn }, (_, i) => {
        const angle = (i * 360) / drawn
        return (
          <ellipse
            key={i}
            className="stem-flower__petal"
            cx={cx}
            cy={cy - petalLen * 0.55}
            rx={petalW}
            ry={petalLen}
            transform={`rotate(${angle} ${cx} ${cy})`}
          />
        )
      })}
      <circle className="stem-flower__center" cx={cx} cy={cy} r="8" />
      <circle className="stem-flower__center-dot" cx={cx} cy={cy} r="3.5" />
    </svg>
  )
}

function MeetEditForm({
  meet,
  uploading,
  onCancel,
  onSave,
}: {
  meet: MeetDay
  uploading: boolean
  onCancel: () => void
  onSave: (input: MeetDayInput) => Promise<boolean>
}) {
  const [date, setDate] = useState(meet.date)
  const [title, setTitle] = useState(meet.title)
  const [description, setDescription] = useState(meet.description)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoLabel, setPhotoLabel] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await onSave({ date, title, description, photoFile })
    if (ok) onCancel()
  }

  return (
    <form className="stem-log__edit" onSubmit={(e) => void onSubmit(e)}>
      <label className="meet-form__date">
        <span className="meet-form__date-label">Meet date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        required
      />
      <label className="meet-form__file">
        <span className="meet-form__file-label">
          {photoLabel || 'Replace photo (optional)'}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            setPhotoFile(file)
            setPhotoLabel(file ? file.name : '')
          }}
        />
      </label>
      <div className="stem-log__edit-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={uploading}>
          {uploading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

/**
 * Flower on top; wavy stem with small leaves popping out as meets grow;
 * cards alternate sides with plain text + image under.
 */
export function GrowingFlower({
  items,
  uploading,
  onUpdate,
  renderPhoto,
}: GrowingFlowerProps) {
  const count = items.length
  const [editingId, setEditingId] = useState<string | null>(null)
  const leafCount = Math.min(count + Math.max(0, count - 1), STEM_LEAF_SPOTS.length)

  return (
    <div className="stem-log">
      <div className="stem-log__plant">
        <div className="stem-log__head">
          <TopFlower petalCount={count} />
        </div>

        {count === 0 ? null : (
          <div className="stem-log__body">
            {/* Vine + leaves share one center line so sprouts stay glued on */}
            <div className="stem-log__spine" aria-hidden="true">
              <div className="stem-log__vine" />
              <div className="stem-log__sprouts">
                {STEM_LEAF_SPOTS.slice(0, leafCount).map((spot, i) => (
                  <svg
                    key={`${spot.y}-${spot.side}`}
                    className={`stem-log__sprout stem-log__sprout--${spot.side}`}
                    viewBox="0 0 40 22"
                    style={
                      {
                        '--sprout-y': `${spot.y}%`,
                        '--sprout-tilt': `${spot.tilt}deg`,
                        '--sprout-size': String(spot.size),
                        '--sprout-i': i,
                      } as CSSProperties
                    }
                  >
                    <path
                      className="stem-log__sprout-blade"
                      d="M1.5 11 C5 11, 9 4.2, 19 3 C28 2, 35 5.2, 39 11 C35 16.8, 28 20, 19 19 C9 17.8, 5 11, 1.5 11 Z"
                    />
                    <path
                      className="stem-log__sprout-vein"
                      d="M2 11 H37"
                      fill="none"
                    />
                    <path
                      className="stem-log__sprout-vein stem-log__sprout-vein--side"
                      d="M13 11 C15.5 8, 19 6.8, 23 8"
                      fill="none"
                    />
                    <path
                      className="stem-log__sprout-vein stem-log__sprout-vein--side"
                      d="M13 11 C15.5 14, 19 15.2, 23 14"
                      fill="none"
                    />
                  </svg>
                ))}
              </div>
            </div>

          <ol className="stem-log__list">
            {items.map((meet, index) => {
              const side = index % 2 === 0 ? 'right' : 'left'
              const isEditing = editingId === meet.id
              return (
                <li
                  key={meet.id}
                  className={`stem-log__item stem-log__item--${side}`}
                  style={{ '--item-i': index } as CSSProperties}
                >
                  <span className="stem-log__node" aria-hidden="true" />
                  <article className="stem-log__card">
                    {isEditing ? (
                      <MeetEditForm
                        meet={meet}
                        uploading={uploading}
                        onCancel={() => setEditingId(null)}
                        onSave={(input) => onUpdate(meet.id, input)}
                      />
                    ) : (
                      <>
                        <p className="stem-log__date">
                          <time dateTime={meet.date}>
                            {formatMeetDate(meet.date)}
                          </time>
                          <button
                            type="button"
                            className="stem-log__edit-btn"
                            aria-label={`Edit ${meet.title}`}
                            onClick={() => setEditingId(meet.id)}
                          >
                            <span aria-hidden="true">✎</span>
                          </button>
                        </p>
                        <h3 className="stem-log__title">{meet.title}</h3>
                        <p className="stem-log__desc">{meet.description}</p>
                        {renderPhoto(meet)}
                      </>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
        </div>
        )}
      </div>
    </div>
  )
}
