import { useState, type FormEvent } from 'react'
import {
  useBucketList,
  type BucketCategory,
  type SyncState,
} from '../hooks/useBucketList'

function statusLabel(state: SyncState): string {
  switch (state) {
    case 'synced':
      return 'Live sync on — both of you see the same list.'
    case 'connecting':
      return 'Connecting to shared list…'
    case 'error':
      return 'Sync failed — see details below. Local list still works.'
    default:
      return 'Local mode — add Firebase env vars to sync across phones.'
  }
}

type BucketListProps = {
  addedBy: string
}

export function BucketList({ addedBy }: BucketListProps) {
  const { items, syncState, syncError, addItem, toggleItem, deleteItem } =
    useBucketList(addedBy)
  const [text, setText] = useState('')
  const [category, setCategory] = useState<BucketCategory>('date')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    addItem(text, category)
    setText('')
  }

  return (
    <section className="section" id="bucket">
      <p className="section__eyebrow">Things to grow</p>
      <h2 className="section__title">Our bucket list</h2>
      <p className="section__lead">
        Dreams to plant — dates, trips, and experiences. Add something wild or
        tiny, then check them off as they bloom.
      </p>
      <p className="bucket-status" data-state={syncState}>
        {statusLabel(syncState)}
      </p>
      {syncError ? <p className="bucket-sync-error">{syncError}</p> : null}

      <form className="bucket-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Watch sunrise in Batangas"
          aria-label="New bucket list item"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as BucketCategory)}
          aria-label="Category"
        >
          <option value="date">Date</option>
          <option value="trip">Trip</option>
          <option value="experience">Experience</option>
        </select>
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="bucket-empty">Nothing here yet — add your first dream.</p>
      ) : (
        <ul className="bucket-list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`bucket-item${item.done ? ' is-done' : ''}`}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleItem(item.id)}
                aria-label={`Mark ${item.text} as ${item.done ? 'not done' : 'done'}`}
              />
              <div className="bucket-item__meta">
                <p className="bucket-item__text">{item.text}</p>
                <p className="bucket-item__by">by {item.addedBy}</p>
              </div>
              <span className="bucket-item__cat">{item.category}</span>
              <button
                type="button"
                className="bucket-item__delete"
                onClick={() => deleteItem(item.id)}
                aria-label={`Delete ${item.text}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
