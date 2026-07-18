export type DayEntry = {
  score: number | null
  note: string
  updatedAt: string
}

export type DaytrackerData = {
  version: 1
  days: Record<string, DayEntry>
}

export const emptyData: DaytrackerData = { version: 1, days: {} }

async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, init)
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Server request failed (${response.status})`)
  }
  return response
}

export async function loadData(): Promise<DaytrackerData> {
  const response = await apiRequest("/api/data", {
    headers: { Accept: "application/json" },
  })
  const parsed: unknown = await response.json()
  if (!isValidImport(parsed)) throw new Error("The server returned invalid Daymark data")
  return parsed
}

export async function saveData(data: DaytrackerData): Promise<void> {
  await apiRequest("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
}

export function isValidImport(value: unknown): value is DaytrackerData {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<DaytrackerData>
  if (candidate.version !== 1 || !candidate.days || typeof candidate.days !== "object" || Array.isArray(candidate.days)) return false

  return Object.entries(candidate.days).every(([date, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !entry || typeof entry !== "object") return false
    const day = entry as Partial<DayEntry>
    return (
      (day.score === null || (Number.isInteger(day.score) && Number(day.score) >= 1 && Number(day.score) <= 10)) &&
      typeof day.note === "string" &&
      day.note.length <= 2000 &&
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
