export type Mood = 'Chill' | 'Adventure' | 'Foodie' | 'Romantic' | 'Cozy'
export type Season = 'Dry' | 'Rainy' | 'Holiday' | 'Anytime'
export type Budget = 'Under ₱500' | '₱500–1500' | '₱1500–3000' | 'Splurge'
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible'
export type Duration = '1–2 hrs' | 'Half day' | 'Full day' | 'Overnight'

export type DateIdea = {
  id: string
  title: string
  description: string
  mood: Mood
  season: Season
  budget: Budget
  locationHint: string
  timeOfDay: TimeOfDay
  duration: Duration
}

export const moods: Mood[] = ['Chill', 'Adventure', 'Foodie', 'Romantic', 'Cozy']
export const seasons: Season[] = ['Dry', 'Rainy', 'Holiday', 'Anytime']
export const budgets: Budget[] = [
  'Under ₱500',
  '₱500–1500',
  '₱1500–3000',
  'Splurge',
]

/** PH-ish season guess from the current month (local time). */
export function detectPhilippineSeason(now: Date = new Date()): Season {
  const month = now.getMonth() + 1
  if (month === 12) return 'Holiday'
  // Rough Dry: Dec–May, Rainy: Jun–Nov (Dec already Holiday)
  if (month >= 6 && month <= 11) return 'Rainy'
  return 'Dry'
}

export function mapsSearchUrl(locationHint: string): string {
  const query = encodeURIComponent(`${locationHint}, Philippines`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

const RECENT_WINDOW = 5

/** Prefer fresh + untried ideas; fall back when the pool is thin. */
export function pickDateIdea(
  pool: DateIdea[],
  recentIds: string[],
  triedIds: string[],
): DateIdea | null {
  if (pool.length === 0) return null

  const recent = new Set(recentIds.slice(0, RECENT_WINDOW))
  const tried = new Set(triedIds)

  const notRecent = pool.filter((idea) => !recent.has(idea.id))
  const base = notRecent.length > 0 ? notRecent : pool

  const untried = base.filter((idea) => !tried.has(idea.id))
  const finalPool = untried.length > 0 ? untried : base

  return finalPool[Math.floor(Math.random() * finalPool.length)] ?? null
}

export function pickDateIdeaTrio(
  pool: DateIdea[],
  recentIds: string[],
  triedIds: string[],
): DateIdea[] {
  const picked: DateIdea[] = []
  const used = new Set<string>()
  let recent = [...recentIds]

  for (let i = 0; i < 3; i += 1) {
    const next = pickDateIdea(
      pool.filter((idea) => !used.has(idea.id)),
      recent,
      triedIds,
    )
    if (!next) break
    picked.push(next)
    used.add(next.id)
    recent = [next.id, ...recent].slice(0, RECENT_WINDOW)
  }

  return picked
}

export const dateIdeas: DateIdea[] = [
  {
    id: 'd1',
    title: 'Sunset picnic at the baywalk',
    description:
      'Grab takoyaki or fishballs, a mat, and watch the sky turn gold over Manila Bay.',
    mood: 'Romantic',
    season: 'Dry',
    budget: 'Under ₱500',
    locationHint: 'Manila Bay / local baywalk',
    timeOfDay: 'Evening',
    duration: '1–2 hrs',
  },
  {
    id: 'd2',
    title: 'Café hopping in Poblacion',
    description:
      'Two specialty cafés, one shared dessert, and zero rush. Perfect rainy-day pace.',
    mood: 'Chill',
    season: 'Rainy',
    budget: '₱500–1500',
    locationHint: 'Makati Poblacion',
    timeOfDay: 'Afternoon',
    duration: 'Half day',
  },
  {
    id: 'd3',
    title: 'Intramuros golden-hour walk',
    description:
      'Kalesa optional. Walls, cobblestones, and a photo stop at Fort Santiago.',
    mood: 'Adventure',
    season: 'Dry',
    budget: 'Under ₱500',
    locationHint: 'Intramuros, Manila',
    timeOfDay: 'Afternoon',
    duration: 'Half day',
  },
  {
    id: 'd4',
    title: 'Night market + street food crawl',
    description:
      'Skewers, isaw or vegan swaps, halo-halo to finish. Budget-friendly and loud in the best way.',
    mood: 'Foodie',
    season: 'Anytime',
    budget: 'Under ₱500',
    locationHint: 'Local night market',
    timeOfDay: 'Evening',
    duration: '1–2 hrs',
  },
  {
    id: 'd5',
    title: 'BGC highline + soft serve',
    description:
      'Stroll the elevated park, people-watch, then split a cone before heading home.',
    mood: 'Chill',
    season: 'Anytime',
    budget: '₱500–1500',
    locationHint: 'Bonifacio High Street',
    timeOfDay: 'Afternoon',
    duration: '1–2 hrs',
  },
  {
    id: 'd6',
    title: 'Tagaytay misty morning',
    description:
      'Bulalo for two, Taal views, and a cozy hoodie moment if the fog rolls in.',
    mood: 'Cozy',
    season: 'Rainy',
    budget: '₱1500–3000',
    locationHint: 'Tagaytay',
    timeOfDay: 'Morning',
    duration: 'Full day',
  },
  {
    id: 'd7',
    title: 'Museum date + gallery café',
    description:
      'Ayala or National Museum, then sit with coffee and talk about your favorite piece.',
    mood: 'Chill',
    season: 'Anytime',
    budget: '₱500–1500',
    locationHint: 'Metro Manila museums',
    timeOfDay: 'Afternoon',
    duration: 'Half day',
  },
  {
    id: 'd8',
    title: 'Karaoke night, private room',
    description:
      'Book a room, request each other’s comfort songs, and pretend the neighbors cannot hear.',
    mood: 'Cozy',
    season: 'Anytime',
    budget: '₱500–1500',
    locationHint: 'Local karaoke bar',
    timeOfDay: 'Evening',
    duration: '1–2 hrs',
  },
  {
    id: 'd9',
    title: 'Binondo food pilgrimage',
    description:
      'Siopao, hopia, and hot pot if you are hungry. Map a short loop and eat like locals.',
    mood: 'Foodie',
    season: 'Anytime',
    budget: '₱500–1500',
    locationHint: 'Binondo, Manila',
    timeOfDay: 'Afternoon',
    duration: 'Half day',
  },
  {
    id: 'd10',
    title: 'Rizal Park bike rental',
    description:
      'Rent bikes for an hour, loop the park, and cool down with fresh buko juice.',
    mood: 'Adventure',
    season: 'Dry',
    budget: 'Under ₱500',
    locationHint: 'Luneta / Rizal Park',
    timeOfDay: 'Morning',
    duration: '1–2 hrs',
  },
  {
    id: 'd11',
    title: 'Mall cinema + popcorn ritual',
    description:
      'Pick a film neither of you has seen. Midweek tickets keep it easy on the budget.',
    mood: 'Cozy',
    season: 'Rainy',
    budget: '₱500–1500',
    locationHint: 'Any SM / Ayala cinema',
    timeOfDay: 'Evening',
    duration: 'Half day',
  },
  {
    id: 'd12',
    title: 'Holiday lights walk',
    description:
      'Chase Christmas displays, share bibingka, and take one silly matching photo.',
    mood: 'Romantic',
    season: 'Holiday',
    budget: 'Under ₱500',
    locationHint: 'Ayala Triangle / local plaza',
    timeOfDay: 'Evening',
    duration: '1–2 hrs',
  },
  {
    id: 'd13',
    title: 'Quezon City park picnic',
    description:
      'U.P. Sunken Garden or Quezon Memorial — mat, playlist, and homemade sandwiches.',
    mood: 'Chill',
    season: 'Dry',
    budget: 'Under ₱500',
    locationHint: 'Quezon City',
    timeOfDay: 'Afternoon',
    duration: 'Half day',
  },
  {
    id: 'd14',
    title: 'Ramen date + late LRT ride home',
    description:
      'Steam, broth, and a quiet ride back. Simple, warm, very “us.”',
    mood: 'Foodie',
    season: 'Rainy',
    budget: '₱500–1500',
    locationHint: 'Your favorite ramen spot',
    timeOfDay: 'Evening',
    duration: '1–2 hrs',
  },
  {
    id: 'd15',
    title: 'Day trip to Antipolo / art café',
    description:
      'Hills, views, and a leisurely lunch away from the city rush.',
    mood: 'Adventure',
    season: 'Dry',
    budget: '₱1500–3000',
    locationHint: 'Antipolo',
    timeOfDay: 'Morning',
    duration: 'Full day',
  },
  {
    id: 'd16',
    title: 'Fine dining tasting for two',
    description:
      'Save up and book somewhere special — anniversary energy, even on a random Friday.',
    mood: 'Romantic',
    season: 'Anytime',
    budget: 'Splurge',
    locationHint: 'Makati / BGC fine dining',
    timeOfDay: 'Evening',
    duration: 'Half day',
  },
  {
    id: 'd17',
    title: 'Overnight Baguio escape',
    description:
      'Strawberries, Session Road, and cold air. Pack layers and a shared playlist.',
    mood: 'Adventure',
    season: 'Anytime',
    budget: 'Splurge',
    locationHint: 'Baguio',
    timeOfDay: 'Flexible',
    duration: 'Overnight',
  },
  {
    id: 'd18',
    title: 'Home cooking challenge',
    description:
      'Pick one Pinoy dish neither of you has mastered. Grocery run under ₱500, winner chooses the movie.',
    mood: 'Cozy',
    season: 'Rainy',
    budget: 'Under ₱500',
    locationHint: 'Your kitchen',
    timeOfDay: 'Evening',
    duration: 'Half day',
  },
  {
    id: 'd19',
    title: 'Simbang Gabi + puto bumbong',
    description:
      'Early mass (or just the puto), warm drinks, and a quiet walk after.',
    mood: 'Romantic',
    season: 'Holiday',
    budget: 'Under ₱500',
    locationHint: 'Local parish plaza',
    timeOfDay: 'Morning',
    duration: '1–2 hrs',
  },
  {
    id: 'd20',
    title: 'Island day (Batangas / nearby)',
    description:
      'Day tour with snorkel stops — pack sunscreen and leave the city behind.',
    mood: 'Adventure',
    season: 'Dry',
    budget: '₱1500–3000',
    locationHint: 'Batangas / nearby islands',
    timeOfDay: 'Morning',
    duration: 'Full day',
  },
]
