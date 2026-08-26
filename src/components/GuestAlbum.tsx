import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChatCircleTextIcon, EyeIcon, HeartIcon } from '@phosphor-icons/react'
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

/**
 * Bottom-sheet modal built on the native <dialog> element so focus is
 * trapped, Esc closes, and focus returns to the trigger for free.
 */
function GuestSheetDialog({
  open,
  onClose,
  label,
  children,
}: Readonly<{
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="guest-sheet"
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close()
      }}
    >
      <div className="guest-sheet__panel guest-sheet__panel--album">{children}</div>
    </dialog>
  )
}

export function GuestAlbum({ guestName }: Readonly<{ guestName: string }>) {
  const { items, syncState, syncError } = useMeetLog('guest')
  const { items: interactions, recordInteraction, deleteInteraction } =
    useAlbumInteractions(guestName)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [currentDeviceId] = useState(() => getOrCreateDeviceId())
  const [viewersModalPhotoId, setViewersModalPhotoId] = useState<string | null>(null)
  const [likersModalPhotoId, setLikersModalPhotoId] = useState<string | null>(null)
  const [poppingLikeId, setPoppingLikeId] = useState<string | null>(null)

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
    return getLikers(photoId).length
  }

  const getLikers = (photoId: string) => {
    const likes = getPhotoInteractions(photoId).filter((i) => i.type === 'like')
    // Deduplicate by deviceId - one like per device, not per username
    const uniqueByDevice = new Map<string, string>()
    for (const l of likes) {
      if (!uniqueByDevice.has(l.deviceId)) {
        uniqueByDevice.set(l.deviceId, l.guestName)
      }
    }
    return Array.from(uniqueByDevice.values())
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
      (i) => i.type === 'like' && i.deviceId === currentDeviceId,
    )
  }

  const toggleLike = async (photoId: string) => {
    const existingLike = interactions.find(
      (i) => i.photoId === photoId && i.type === 'like' && i.deviceId === currentDeviceId,
    )
    if (existingLike) {
      await deleteInteraction(existingLike.id)
      return
    }
    await recordInteraction(photoId, 'like')
    setPoppingLikeId(photoId)
    window.setTimeout(() => setPoppingLikeId(null), 260)
  }

  const handleAddComment = async (photoId: string) => {
    if (!commentDraft.trim() || busy) return
    setBusy(true)
    await recordInteraction(photoId, 'comment', commentDraft)
    setBusy(false)
    setCommentDraft('')
  }

  const selectedPhoto =
    selectedPhotoId != null ? photos.find((p) => p.id === selectedPhotoId) : undefined
  const viewersPhoto =
    viewersModalPhotoId != null ? photos.find((p) => p.id === viewersModalPhotoId) : undefined
  const likersPhoto =
    likersModalPhotoId != null ? photos.find((p) => p.id === likersModalPhotoId) : undefined

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
                    {/* Heart toggles; the count opens the likers list */}
                    <button
                      type="button"
                      className={`guest-album__like-btn${liked ? ' is-liked' : ''}${
                        poppingLikeId === meet.id ? ' is-popping' : ''
                      }`}
                      onClick={() => void toggleLike(meet.id)}
                      aria-pressed={liked}
                      title={liked ? 'Unlike' : 'Like'}
                      aria-label={liked ? 'Unlike this photo' : 'Like this photo'}
                    >
                      <HeartIcon
                        size={16}
                        weight={liked ? 'fill' : 'regular'}
                        aria-hidden
                      />
                    </button>
                    {likeCount > 0 ? (
                      <button
                        type="button"
                        className="guest-album__count-btn"
                        onClick={() => setLikersModalPhotoId(meet.id)}
                        title="See who liked this"
                        aria-label={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'} — see who liked this`}
                      >
                        {likeCount}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="guest-album__comment-btn"
                      onClick={() => setSelectedPhotoId(meet.id)}
                      title="View comments"
                      aria-label={`${comments.length} ${comments.length === 1 ? 'comment' : 'comments'} — view`}
                    >
                      <ChatCircleTextIcon size={16} aria-hidden />
                      {comments.length}
                    </button>
                    {viewers.length > 0 ? (
                      <button
                        type="button"
                        className="guest-album__viewers-btn"
                        onClick={() => setViewersModalPhotoId(meet.id)}
                        title="See who viewed"
                        aria-label={`${viewers.length} ${viewers.length === 1 ? 'guest has' : 'guests have'} viewed this`}
                      >
                        <EyeIcon size={16} aria-hidden />
                        {viewers.length}
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>

          <GuestSheetDialog
            open={selectedPhoto !== undefined}
            onClose={() => setSelectedPhotoId(null)}
            label={
              selectedPhoto
                ? `${selectedPhoto.title} — guests and comments`
                : 'Photo details'
            }
          >
            {selectedPhoto ? (
              <>
                <h3 className="guest-sheet__title">{selectedPhoto.title}</h3>
                <div className="guest-sheet__date">
                  {formatMeetDate(selectedPhoto.date)}
                </div>

                <p className="guest-sheet__privacy-note">
                  Opening a photo adds your guest name to its viewer list.
                </p>

                {getViewers(selectedPhoto.id).length > 0 ? (
                  <div className="guest-album__viewers-list">
                    <p className="guest-album__section-label">Guests who viewed:</p>
                    <ul className="guest-album__viewer-names">
                      {getViewers(selectedPhoto.id).map(([name]) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="guest-album__comments-section">
                  {(() => {
                    const photoComments = getComments(selectedPhoto.id)
                    return (
                      <>
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
                            void handleAddComment(selectedPhoto.id)
                          }}
                        >
                          <input
                            type="text"
                            className="guest-album__comment-input"
                            placeholder="Add a comment…"
                            aria-label="Add a comment"
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
                      </>
                    )
                  })()}
                </div>

                <button
                  type="button"
                  className="btn btn--ghost guest-album__close-btn"
                  onClick={() => setSelectedPhotoId(null)}
                >
                  Close
                </button>
              </>
            ) : null}
          </GuestSheetDialog>

          <GuestSheetDialog
            open={viewersPhoto !== undefined}
            onClose={() => setViewersModalPhotoId(null)}
            label={
              viewersPhoto ? `Guests who viewed ${viewersPhoto.title}` : 'Viewers'
            }
          >
            {viewersPhoto ? (
              <>
                <h3 className="guest-sheet__title">{viewersPhoto.title}</h3>
                <div className="guest-sheet__date">
                  {formatMeetDate(viewersPhoto.date)}
                </div>

                <div className="guest-album__viewers-list">
                  {(() => {
                    const photoViewers = getViewers(viewersPhoto.id)
                    return (
                      <>
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
                      </>
                    )
                  })()}
                </div>

                <button
                  type="button"
                  className="btn btn--ghost guest-album__close-btn"
                  onClick={() => setViewersModalPhotoId(null)}
                >
                  Close
                </button>
              </>
            ) : null}
          </GuestSheetDialog>

          <GuestSheetDialog
            open={likersPhoto !== undefined}
            onClose={() => setLikersModalPhotoId(null)}
            label={
              likersPhoto ? `Guests who liked ${likersPhoto.title}` : 'Likes'
            }
          >
            {likersPhoto ? (
              <>
                <h3 className="guest-sheet__title">{likersPhoto.title}</h3>
                <div className="guest-sheet__date">
                  {formatMeetDate(likersPhoto.date)}
                </div>

                <div className="guest-album__viewers-list">
                  {(() => {
                    const photoLikers = getLikers(likersPhoto.id)
                    return (
                      <>
                        <p className="guest-album__section-label">
                          Guests who liked ({photoLikers.length}):
                        </p>
                        {photoLikers.length > 0 ? (
                          <ul className="guest-album__viewer-names">
                            {photoLikers.map((name) => (
                              <li key={name}>{name}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="guest-album__no-comments">No likes yet</p>
                        )}
                      </>
                    )
                  })()}
                </div>

                <button
                  type="button"
                  className="btn btn--ghost guest-album__close-btn"
                  onClick={() => setLikersModalPhotoId(null)}
                >
                  Close
                </button>
              </>
            ) : null}
          </GuestSheetDialog>
        </>
      )}
    </section>
  )
}
