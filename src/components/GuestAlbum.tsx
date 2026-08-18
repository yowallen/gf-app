import { useEffect, useState } from 'react'
import type { MeetDay } from '../data/timeline'
import { formatMeetDate } from '../data/timeline'
import { useMeetLog } from '../hooks/useMeetLog'
import { useAlbumInteractions } from '../hooks/useAlbumInteractions'
import { getOrCreateDeviceId } from '../lib/deviceId'

type PhotoCardProps = {
  meet: MeetDay
  guestName: string
  onInteract: (photoId: string, type: 'view' | 'like' | 'comment', content?: string) => void
  interactions: ReturnType<typeof useAlbumInteractions>['items']
}

function AlbumPhoto({ meet }: PhotoCardProps & { meet: MeetDay }) {
  const [failed, setFailed] = useState(false)
  if (!meet.image || failed) return null

  return (
    <img
      className="guest-album__photo"
      src={meet.image}
      alt={meet.title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function GuestAlbum({ guestName }: { guestName: string }) {
  const { items, syncState, syncError } = useMeetLog('guest')
  const { items: interactions, recordInteraction } = useAlbumInteractions(guestName)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [currentDeviceId] = useState(() => getOrCreateDeviceId())
  const [viewersModalPhotoId, setViewersModalPhotoId] = useState<string | null>(null)

  // Record view when modal opens (once per device)
  useEffect(() => {
    if (!selectedPhotoId) return
    
    // Check if this device has already viewed this photo
    const hasViewedFromDevice = interactions.some(
      (i) => i.photoId === selectedPhotoId && i.type === 'view' && i.deviceId === currentDeviceId,
    )
    
    if (!hasViewedFromDevice) {
      void recordInteraction(selectedPhotoId, 'view')
    }
  }, [selectedPhotoId, currentDeviceId, interactions, recordInteraction])

  const photos = items.filter((meet) => Boolean(meet.image))

  const getPhotoInteractions = (photoId: string) => {
    return interactions.filter((i) => i.photoId === photoId)
  }

  const getLikeCount = (photoId: string) => {
    return getPhotoInteractions(photoId).filter((i) => i.type === 'like').length
  }

  const getComments = (photoId: string) => {
    return getPhotoInteractions(photoId).filter((i) => i.type === 'comment')
  }

  const getViewers = (photoId: string) => {
    const views = getPhotoInteractions(photoId).filter((i) => i.type === 'view')
    // Deduplicate by deviceId - one view per device, not per username
    const uniqueByDevice = new Map<string, string>()
    for (const v of views) {
      if (!uniqueByDevice.has(v.deviceId)) {
        uniqueByDevice.set(v.deviceId, v.guestName)
      }
    }
    return Array.from(uniqueByDevice.values())
  }

  const hasLiked = (photoId: string) => {
    return getPhotoInteractions(photoId).some(
      (i) => i.type === 'like' && i.guestName === guestName,
    )
  }

  const handleLike = async (photoId: string) => {
    if (hasLiked(photoId)) return
    await recordInteraction(photoId, 'like')
  }

  const handleAddComment = async (photoId: string) => {
    if (!commentDraft.trim() || busy) return
    setBusy(true)
    await recordInteraction(photoId, 'comment', commentDraft)
    setBusy(false)
    setCommentDraft('')
  }

  return (
    <section className="guest-panel" id="guest-album">
      <p className="guest-panel__eyebrow">Shared album</p>
      <h2 className="guest-panel__title">Days they met</h2>
      <p className="guest-panel__lead">
        A quiet gallery of moments from their garden.
      </p>

      {syncState === 'connecting' ? (
        <p className="guest-panel__status">Loading album…</p>
      ) : null}
      {syncError ? <p className="guest-panel__error">{syncError}</p> : null}

      {photos.length === 0 ? (
        <p className="guest-panel__empty">
          No photos planted yet — check back after their next meet.
        </p>
      ) : (
        <>
          <ul className="guest-album__grid">
            {photos.map((meet) => {
              const likeCount = getLikeCount(meet.id)
              const liked = hasLiked(meet.id)
              const comments = getComments(meet.id)
              const viewers = getViewers(meet.id)

              return (
                <li key={meet.id} className="guest-album__card">
                  <button
                    type="button"
                    className="guest-album__photo-btn"
                    onClick={() => setSelectedPhotoId(meet.id)}
                  >
                    <AlbumPhoto
                      meet={meet}
                      guestName={guestName}
                      onInteract={recordInteraction}
                      interactions={interactions}
                    />
                  </button>
                  <div className="guest-album__meta">
                    <h3 className="guest-album__name">{meet.title}</h3>
                    <time dateTime={meet.date}>{formatMeetDate(meet.date)}</time>
                  </div>
                  <div className="guest-album__interactions">
                    <button
                      type="button"
                      className={`guest-album__like-btn${liked ? ' is-liked' : ''}`}
                      onClick={() => handleLike(meet.id)}
                      disabled={liked}
                      title={liked ? 'You already liked this' : 'Like'}
                    >
                      ♡ {likeCount}
                    </button>
                    <button
                      type="button"
                      className="guest-album__comment-btn"
                      onClick={() => setSelectedPhotoId(meet.id)}
                      title="View comments"
                    >
                      💬 {comments.length}
                    </button>
                    {viewers.length > 0 ? (
                      <button
                        type="button"
                        className="guest-album__viewers-btn"
                        onClick={() => setViewersModalPhotoId(meet.id)}
                        title="See who viewed"
                      >
                        👁 {viewers.length}
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>

          {selectedPhotoId ? (
            <div
              className="guest-sheet"
              role="dialog"
              aria-modal="true"
              onClick={() => setSelectedPhotoId(null)}
            >
              <div
                className="guest-sheet__panel guest-sheet__panel--album"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const photo = photos.find((p) => p.id === selectedPhotoId)
                  if (!photo) return null

                  const photoComments = getComments(selectedPhotoId)
                  const photoViewers = getViewers(selectedPhotoId)

                  return (
                    <>
                      <h3 className="guest-sheet__title">{photo.title}</h3>
                      <div className="guest-sheet__date">
                        {formatMeetDate(photo.date)}
                      </div>

                      {photoViewers.length > 0 ? (
                        <div className="guest-album__viewers-list">
                          <p className="guest-album__section-label">Guests who viewed:</p>
                          <ul className="guest-album__viewer-names">
                            {photoViewers.map(([name]) => (
                              <li key={name}>{name}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="guest-album__comments-section">
                        <p className="guest-album__section-label">
                          Comments ({photoComments.length})
                        </p>
                        {photoComments.length > 0 ? (
                          <ul className="guest-album__comments-list">
                            {photoComments.map((c) => (
                              <li key={c.id} className="guest-album__comment">
                                <strong>{c.guestName}:</strong> {c.content}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="guest-album__no-comments">
                            No comments yet. Be the first!
                          </p>
                        )}

                        <form
                          className="guest-album__comment-form"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void handleAddComment(selectedPhotoId)
                          }}
                        >
                          <input
                            type="text"
                            className="guest-album__comment-input"
                            placeholder="Add a comment…"
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            maxLength={200}
                          />
                          <button
                            type="submit"
                            className="btn btn--small"
                            disabled={!commentDraft.trim() || busy}
                          >
                            {busy ? 'Posting…' : 'Post'}
                          </button>
                        </form>
                      </div>

                      <button
                        type="button"
                        className="btn btn--ghost guest-album__close-btn"
                        onClick={() => setSelectedPhotoId(null)}
                      >
                        Close
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : null}

          {viewersModalPhotoId ? (
            <div
              className="guest-sheet"
              role="dialog"
              aria-modal="true"
              onClick={() => setViewersModalPhotoId(null)}
            >
              <div
                className="guest-sheet__panel guest-sheet__panel--album"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const photo = photos.find((p) => p.id === viewersModalPhotoId)
                  if (!photo) return null

                  const photoViewers = getViewers(viewersModalPhotoId)

                  return (
                    <>
                      <h3 className="guest-sheet__title">{photo.title}</h3>
                      <div className="guest-sheet__date">
                        {formatMeetDate(photo.date)}
                      </div>

                      <div className="guest-album__viewers-list">
                        <p className="guest-album__section-label">
                          Guests who viewed ({photoViewers.length}):
                        </p>
                        {photoViewers.length > 0 ? (
                          <ul className="guest-album__viewer-names">
                            {photoViewers.map((name) => (
                              <li key={name}>{name}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="guest-album__no-comments">No views yet</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn--ghost guest-album__close-btn"
                        onClick={() => setViewersModalPhotoId(null)}
                      >
                        Close
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

