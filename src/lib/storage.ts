export type DayEntry = {
  score: number | null
  note: string
  updatedAt: string
}

export type DaytrackerData = {
  version: 1
  days: Record<string, DayEntry>
}

const STORAGE_KEY = "daymark:data:v1"

const emptyData: DaytrackerData = { version: 1, days: {} }

export function loadData(): DaytrackerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData
    const parsed = JSON.parse(raw) as DaytrackerData
    if (parsed.version !== 1 || !parsed.days || typeof parsed.days !== "object") return emptyData
    return parsed
  } catch {
    return emptyData
  }
}

export function saveData(data: DaytrackerData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function isValidImport(value: unknown): value is DaytrackerData {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<DaytrackerData>
  if (candidate.version !== 1 || !candidate.days || typeof candidate.days !== "object") return false

  return Object.entries(candidate.days).every(([date, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== "object") return false
    const day = entry as Partial<DayEntry>
    return (
      (day.score === null || (Number.isInteger(day.score) && Number(day.score) >= 1 && Number(day.score) <= 10)) &&
      typeof day.note === "string" &&
      typeof day.updatedAt === "string"
    )
  })
}

export function downloadData(data: DaytrackerData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `daymark-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
