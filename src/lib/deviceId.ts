const DEVICE_ID_KEY = 'antangoy-device-id'

function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing

    const newId = generateDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, newId)
    return newId
  } catch {
    // If localStorage fails, return a session-only ID
    return generateDeviceId()
  }
}
