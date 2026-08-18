import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  emptyPotImage,
  GARDEN_MAT_SLOTS,
  GARDEN_SLOT_COUNT,
  getPlantMeta,
  plants,
  zenGardenBackdrop,
  type GardenMatSlot,
  type PlantType,
} from '../data/plants'
import {
  useGardenMessages,
  type GardenMessage,
} from '../hooks/useGardenMessages'
import { getOrCreateDeviceId } from '../lib/deviceId'

type GuestGardenProps = {
  canDelete: boolean
  canPlant: boolean
  guestUsername: string
}

type PlantStep = 'pick' | 'write' | null

function matStyle(mat: GardenMatSlot): CSSProperties {
  return {
    left: `${mat.x}%`,
    top: `${mat.y}%`,
    width: `${mat.size}%`,
  }
}

function ZenSlot({
  planted,
  mat,
  onOpen,
}: {
  planted: GardenMessage | undefined
  mat: GardenMatSlot
  onOpen: (msg: GardenMessage) => void
}) {
  if (!planted) {
    return (
      <div className="zen-slot is-empty" style={matStyle(mat)} aria-hidden="true">
        <div className="zen-slot__stack">
          <img className="zen-slot__pot-img" src={emptyPotImage} alt="" />
        </div>
      </div>
    )
  }

  const meta = getPlantMeta(planted.plantType)
  return (
    <button
      type="button"
      className="zen-slot is-planted"
      style={matStyle(mat)}
      onClick={() => onOpen(planted)}
      aria-label={`Read ${meta.label} message`}
    >
      <div className="zen-slot__stack">
        <img className="zen-slot__pot-img" src={emptyPotImage} alt="" />
        <img
          className="zen-slot__plant"
          src={meta.src}
          alt=""
          draggable={false}
        />
      </div>
    </button>
  )
}

export function GuestGarden({ canDelete, canPlant, guestUsername }: GuestGardenProps) {
  const { items, syncState, syncError, plantMessage, deleteMessage } =
    useGardenMessages(guestUsername)
  const [selected, setSelected] = useState<GardenMessage | null>(null)
  const [plantStep, setPlantStep] = useState<PlantStep>(null)
  const [plantType, setPlantType] = useState<PlantType>('daisy')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const bySlot = useMemo(() => {
    const map = new Map<number, GardenMessage>()
    for (const item of items) {
      if (item.slot >= 0 && item.slot < GARDEN_SLOT_COUNT) {
        map.set(item.slot, item)
      }
    }
    return map
  }, [items])

  const currentDeviceId = useMemo(() => getOrCreateDeviceId(), [])

  const guestMessageCount = useMemo(
    () => items.filter((item) => item.deviceId === currentDeviceId).length,
    [items, currentDeviceId],
  )

  const canPlantMore = guestMessageCount < 2

  async function onPlant(e: FormEvent) {
    e.preventDefault()
    if (!canPlant || !canPlantMore || !draft.trim() || busy) return
    setBusy(true)
    const ok = await plantMessage(plantType, draft)
    setBusy(false)
    if (ok) {
      setDraft('')
      setPlantStep(null)
      setNote('Your note took root.')
      window.setTimeout(() => setNote(''), 2400)
    }
  }

  return (
    <section className="guest-panel guest-panel--zen" id="guest-garden">
      <p className="guest-panel__lead guest-panel__lead--zen">
        {canPlant
          ? 'Tap a plant to read a note — or plant your own anonymous wish.'
          : 'Tap a plant to read a guest’s note.'}
      </p>

      {syncState === 'connecting' ? (
        <p className="guest-panel__status">Watering the greenhouse…</p>
      ) : null}
      {syncError ? <p className="guest-panel__error">{syncError}</p> : null}
      {note ? <p className="guest-panel__note">{note}</p> : null}

      <div className="zen-scene" aria-label="Planted messages">
        <img
          className="zen-scene__bg"
          src={zenGardenBackdrop}
          alt=""
          draggable={false}
        />
        <div className="zen-scene__mats">
          {GARDEN_MAT_SLOTS.map((mat, slot) => (
            <ZenSlot
              key={slot}
              mat={mat}
              planted={bySlot.get(slot)}
              onOpen={setSelected}
            />
          ))}
        </div>
      </div>

      {canPlant ? (
        canPlantMore ? (
          <button
            type="button"
            className="guest-fab"
            onClick={() => {
              setPlantStep('pick')
              setSelected(null)
            }}
          >
            Plant a message
          </button>
        ) : (
          <p className="guest-panel__note">You've planted 2 messages — that's the limit!</p>
        )
      ) : null}

      {selected ? (
        <div
          className="guest-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-msg-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="guest-sheet__panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="guest-sheet__pot-wrap">
              <img
                className="guest-sheet__pot"
                src={emptyPotImage}
                alt=""
              />
              <img
                className="guest-sheet__plant"
                src={getPlantMeta(selected.plantType).src}
                alt=""
              />
            </div>
            <p className="guest-sheet__eyebrow">
              {getPlantMeta(selected.plantType).label} · {selected.addedBy}
            </p>
            <h3 id="guest-msg-title" className="guest-sheet__title">
              A note in the garden
            </h3>
            <p className="guest-sheet__body">{selected.message}</p>
            <div className="guest-sheet__actions">
              {canDelete ? (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    void deleteMessage(selected.id)
                    setSelected(null)
                  }}
                >
                  Remove plant
                </button>
              ) : null}
              <button
                type="button"
                className="btn"
                onClick={() => setSelected(null)}
              >
                Tuck away
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canPlant && plantStep ? (
        <div
          className="guest-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-plant-title"
          onClick={() => setPlantStep(null)}
        >
          <div
            className="guest-sheet__panel guest-sheet__panel--flow"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="guest-plant-title" className="guest-sheet__title">
              {plantStep === 'pick' ? 'Choose what to plant' : 'Leave your note'}
            </h3>

            {plantStep === 'pick' ? (
              <>
                <div className="guest-plant-picker">
                  {plants.map((plant) => (
                    <button
                      key={plant.id}
                      type="button"
                      className={`guest-plant-picker__item${plantType === plant.id ? ' is-active' : ''}`}
                      onClick={() => setPlantType(plant.id)}
                    >
                      <img src={plant.src} alt="" />
                      <span>{plant.label}</span>
                    </button>
                  ))}
                </div>
                <div className="guest-sheet__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setPlantStep(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setPlantStep('write')}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={(e) => void onPlant(e)}>
                <label className="guest-sheet__label" htmlFor="guest-note">
                  Your message
                </label>
                <textarea
                  id="guest-note"
                  className="guest-sheet__textarea"
                  rows={4}
                  maxLength={280}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Something kind, soft, or silly…"
                  required
                />
                <p className="guest-sheet__count">{draft.length}/280</p>
                <div className="guest-sheet__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setPlantStep('pick')}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={busy || !draft.trim()}
                  >
                    {busy ? 'Planting…' : 'Plant it'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
