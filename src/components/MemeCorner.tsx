import { useMemo, useState } from 'react'
import { memeTags, memes, type MemeTag } from '../data/memes'

export function MemeCorner() {
  const [tag, setTag] = useState<MemeTag | 'All'>('All')

  const filtered = useMemo(() => {
    if (tag === 'All') return memes
    return memes.filter((m) => m.tag === tag)
  }, [tag])

  return (
    <section className="section" id="memes">
      <p className="section__eyebrow">Brain garden</p>
      <h2 className="section__title">Meme corner</h2>
      <p className="section__lead">
        A little plot of unserious soil — swap in your real inside jokes and
        images when you are ready.
      </p>

      <div className="filters">
        <div>
          <p className="filter-group__label">Filter</p>
          <div className="chip-row">
            {memeTags.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip${tag === t ? ' is-active' : ''}`}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="meme-grid">
        {filtered.map((meme) => (
          <article key={meme.id} className="meme-card">
            <div className="meme-card__media">
              {meme.image ? (
                <img src={meme.image} alt={meme.alt ?? meme.caption} />
              ) : (
                <span>{meme.placeholder ?? 'meme TBD'}</span>
              )}
            </div>
            <div className="meme-card__body">
              <p className="meme-card__tag">{meme.tag}</p>
              <p className="meme-card__caption">{meme.caption}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
