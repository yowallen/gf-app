import daisySrc from '../assets/daisy.svg'
import emptyPotSrc from '../assets/empty-pot.png'
import fernSrc from '../assets/fern.svg'
import lavenderSrc from '../assets/lavender.svg'
import roseSrc from '../assets/rose.svg'
import sunflowerSrc from '../assets/sunflower.svg'
import tinyMushroomSrc from '../assets/tiny-mushroom.svg'
import tulipSrc from '../assets/tulip.svg'
import zenGardenSrc from '../assets/zen-garden.png'

export const zenGardenBackdrop = zenGardenSrc
export const emptyPotImage = emptyPotSrc

export const PLANT_TYPES = [
  'daisy',
  'rose',
  'sunflower',
  'tulip',
  'lavender',
  'fern',
  'tiny-mushroom',
] as const

export type PlantType = (typeof PLANT_TYPES)[number]

export type PlantMeta = {
  id: PlantType
  label: string
  src: string
}

export const plants: PlantMeta[] = [
  { id: 'daisy', label: 'Daisy', src: daisySrc },
  { id: 'rose', label: 'Rose', src: roseSrc },
  { id: 'sunflower', label: 'Sunflower', src: sunflowerSrc },
  { id: 'tulip', label: 'Tulip', src: tulipSrc },
  { id: 'lavender', label: 'Lavender', src: lavenderSrc },
  { id: 'fern', label: 'Fern', src: fernSrc },
  { id: 'tiny-mushroom', label: 'Tiny mushroom', src: tinyMushroomSrc },
]

export function isPlantType(value: string): value is PlantType {
  return (PLANT_TYPES as readonly string[]).includes(value)
}

export function getPlantMeta(id: PlantType): PlantMeta {
  return plants.find((p) => p.id === id) ?? plants[0]
}

/** Two zen tables × 4×4 pots (PvZ-style) */
export const GARDEN_SLOT_COUNT = 32

/** Pot anchor on zen-garden.png — percentages of the backdrop (center of each bamboo mat). */
export type GardenMatSlot = {
  /** Horizontal center (%) */
  x: number
  /** Vertical center of mat (%) */
  y: number
  /** Pot width as % of backdrop width (front rows slightly larger) */
  size: number
}

/**
 * Slot order matches planting: left table 0–15 (row-major 4×4), right table 16–31.
 * Coordinates measured from bamboo mat centroids on `zen-garden.png`.
 */
export const GARDEN_MAT_SLOTS: readonly GardenMatSlot[] = (() => {
  const rowsY = [32.4, 44.0, 56.3, 72.0] as const
  const rowsX: ReadonlyArray<ReadonlyArray<number>> = [
    [27.7, 33.9, 40.5, 46.9, 53.6, 60.0, 66.5, 72.8],
    [27.05, 33.5, 40.35, 46.46, 54.25, 60.64, 67.25, 73.7],
    [25.0, 32.0, 39.1, 46.0, 54.2, 61.2, 68.2, 75.2],
    [23.5, 30.5, 37.7, 45.0, 54.7, 62.2, 69.5, 76.5],
  ]
  const sizes = [5.5, 6.0, 6.6, 7.4] as const
  const slots: GardenMatSlot[] = []

  // Left table cols 0–3, then right table cols 4–7 (preserves existing slot ids)
  for (const table of [0, 1] as const) {
    const colOffset = table * 4
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        slots.push({
          x: rowsX[row][colOffset + col],
          y: rowsY[row],
          size: sizes[row],
        })
      }
    }
  }

  return slots
})()
