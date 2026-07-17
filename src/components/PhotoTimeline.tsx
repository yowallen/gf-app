import { useRef, useState, type FormEvent } from 'react'
import type { MeetDay } from '../data/timeline'
import { useMeetLog } from '../hooks/useMeetLog'
import type { SyncState } from '../hooks/useBucketList'
import { GrowingFlower } from './GrowingFlower'

function MeetPhoto({ meet }: { meet: MeetDay }) {
  const [failed, setFailed] = useState(false)

  if (!meet.image || failed) return null

  return (
    <img
      className="stem-log__photo"
      src={meet.image}
      alt={meet.title}
      onError={() => setFailed(true)}
    />
  )
}

function statusLabel(state: SyncState): string {
  switch (state) {
    case 'synced':
      return 'Live sync on — both of you see the same meet log.'
    case 'connecting':
      return 'Connecting to shared meet log…'
    case 'error':
      return 'Sync failed — see details below. Local log still works.'
    default:
      return 'Local mode — add Firebase env vars to sync across phones.'
  }
}

type PhotoTimelineProps = {
  addedBy: string
}

export function PhotoTimeline({ addedBy }: PhotoTimelineProps) {
  const { items, syncState, syncError, uploading, addMeet, updateMeet } =
    useMeetLog(addedBy)
  const [date, setDate] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoLabel, setPhotoLabel] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await addMeet({ date, title, description, photoFile })
    if (!ok) return
    setDate('')
    setTitle('')
    setDescription('')
    setPhotoFile(null)
    setPhotoLabel('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <section className="section section--wide" id="timeline">
      <p className="section__eyebrow">Days we met</p>
      <h2 className="section__title">Long Time, No See</h2>
      <p className="section__lead">
        Newest hangs sit near the flower — each meet adds another petal.
      </p>
      <p className="bucket-status" data-state={syncState}>
        {uploading ? 'Uploading photo…' : statusLabel(syncState)}
      </p>
      {syncError ? <p className="bucket-sync-error">{syncError}</p> : null}

      <form className="meet-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="meet-form__date">
          <span className="meet-form__date-label">Meet date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Meet date"
            required
          />
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title · e.g. Café hop"
          aria-label="Meet title"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened / how it felt…"
          aria-label="Meet description"
          rows={3}
          required
        />
        <label className="meet-form__file">
          <span className="meet-form__file-label">
            {photoLabel || 'Photo (optional)'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Optional meet photo"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setPhotoFile(file)
              setPhotoLabel(file ? file.name : '')
            }}
          />
        </label>
        <button type="submit" className="btn" disabled={uploading}>
          {uploading ? 'Saving…' : 'Add meet'}
        </button>
      </form>

      <GrowingFlower
        items={items}
        uploading={uploading}
        onUpdate={updateMeet}
        renderPhoto={(meet) => <MeetPhoto meet={meet} />}
      />
    </section>
  )
}
