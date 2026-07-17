import { useCallback, useState } from 'react'

const STORAGE_KEY = 'antangoy-date-idea-memory'
const RECENT_LIMIT = 8

export type DateIdeaMemory = {
  recentIds: string[]
  triedIds: string[]
  likedIds: string[]
}

function emptyMemory(): DateIdeaMemory {
  return { recentIds: [], triedIds: [], likedIds: [] }
}

function loadMemory(): DateIdeaMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyMemory()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return emptyMemory()
    const data = parsed as Record<string, unknown>
    return {
      recentIds: Array.isArray(data.recentIds)
        ? data.recentIds.filter((id): id is string => typeof id === 'string')
        : [],
      triedIds: Array.isArray(data.triedIds)
        ? data.triedIds.filter((id): id is string => typeof id === 'string')
        : [],
      likedIds: Array.isArray(data.likedIds)
        ? data.likedIds.filter((id): id is string => typeof id === 'string')
        : [],
    }
  } catch {
    return emptyMemory()
  }
}

function saveMemory(memory: DateIdeaMemory): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
}

export function useDateIdeaMemory() {
  const [memory, setMemory] = useState<DateIdeaMemory>(loadMemory)

  const rememberRecent = useCallback((id: string) => {
    setMemory((prev) => {
      const next: DateIdeaMemory = {
        ...prev,
        recentIds: [id, ...prev.recentIds.filter((x) => x !== id)].slice(
          0,
          RECENT_LIMIT,
        ),
      }
      saveMemory(next)
      return next
    })
  }, [])

  const toggleTried = useCallback((id: string) => {
    setMemory((prev) => {
      const has = prev.triedIds.includes(id)
      const next: DateIdeaMemory = {
        ...prev,
        triedIds: has
          ? prev.triedIds.filter((x) => x !== id)
          : [...prev.triedIds, id],
      }
      saveMemory(next)
      return next
    })
  }, [])

  const toggleLiked = useCallback((id: string) => {
    setMemory((prev) => {
      const has = prev.likedIds.includes(id)
      const next: DateIdeaMemory = {
        ...prev,
        likedIds: has
          ? prev.likedIds.filter((x) => x !== id)
          : [...prev.likedIds, id],
      }
      saveMemory(next)
      return next
    })
  }, [])

  return {
    recentIds: memory.recentIds,
    triedIds: memory.triedIds,
    likedIds: memory.likedIds,
    rememberRecent,
    toggleTried,
    toggleLiked,
    isTried: (id: string) => memory.triedIds.includes(id),
    isLiked: (id: string) => memory.likedIds.includes(id),
  }
}
