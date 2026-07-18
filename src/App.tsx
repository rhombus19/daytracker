import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileJson,
  Leaf,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react"

import { DayEditor } from "@/components/day-editor"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { downloadData, emptyData, isValidImport, loadData, saveData, type DaytrackerData } from "@/lib/storage"
import { cn } from "@/lib/utils"

const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

const scoreBackgrounds = [
  "bg-rose-100/90 hover:bg-rose-200/90",
  "bg-rose-100/90 hover:bg-rose-200/90",
  "bg-orange-100/90 hover:bg-orange-200/90",
  "bg-amber-100/90 hover:bg-amber-200/90",
  "bg-yellow-100/90 hover:bg-yellow-200/90",
  "bg-lime-100/90 hover:bg-lime-200/90",
  "bg-lime-100/90 hover:bg-lime-200/90",
  "bg-emerald-100/90 hover:bg-emerald-200/90",
  "bg-emerald-100/90 hover:bg-emerald-200/90",
  "bg-teal-100/90 hover:bg-teal-200/90",
]

const scoreDots = [
  "bg-rose-500",
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-lime-500",
  "bg-emerald-400",
  "bg-emerald-500",
  "bg-teal-600",
]

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export default function App() {
  const [data, setData] = useState<DaytrackerData>(emptyData)
  const [serverStatus, setServerStatus] = useState<"loading" | "connected" | "error">("loading")
  const [hasLoaded, setHasLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [notice, setNotice] = useState("")
  const importRef = useRef<HTMLInputElement>(null)

  const refreshData = useCallback(async () => {
    setServerStatus("loading")
    try {
      const serverData = await loadData()
      setData(serverData)
      setHasLoaded(true)
      setServerStatus("connected")
    } catch {
      setHasLoaded(false)
      setServerStatus("error")
    }
  }, [])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const naturalEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const end = addDays(start, 41)
    return eachDayOfInterval({ start, end: naturalEnd > end ? naturalEnd : end })
  }, [month])

  const monthEntries = useMemo(
    () =>
      Object.entries(data.days)
        .filter(([key]) => isSameMonth(parseISO(key), month))
        .map(([, entry]) => entry),
    [data.days, month],
  )

  const scoredDays = monthEntries.filter((entry) => entry.score !== null)
  const average = scoredDays.length
    ? scoredDays.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / scoredDays.length
    : null

  async function commit(nextData: DaytrackerData) {
    setSaving(true)
    try {
      await saveData(nextData)
      setData(nextData)
      setServerStatus("connected")
      return true
    } catch {
      setServerStatus("error")
      setNotice("Couldn’t save to the server — please retry")
      window.setTimeout(() => setNotice(""), 3000)
      return false
    } finally {
      setSaving(false)
    }
  }

  function openDay(date: Date) {
    if (!hasLoaded) return
    setSelectedDate(date)
    setEditorOpen(true)
  }

  async function saveDay(score: number | null, note: string) {
    if (!selectedDate) return
    const key = dateKey(selectedDate)
    const nextDays = { ...data.days }

    if (score === null && !note) {
      delete nextDays[key]
    } else {
      nextDays[key] = { score, note, updatedAt: new Date().toISOString() }
    }

    if (!(await commit({ version: 1, days: nextDays }))) return
    setEditorOpen(false)
    setNotice("Day saved")
    window.setTimeout(() => setNotice(""), 1800)
  }

  async function deleteDay() {
    if (!selectedDate) return
    const nextDays = { ...data.days }
    delete nextDays[dateKey(selectedDate)]
    if (!(await commit({ version: 1, days: nextDays }))) return
    setEditorOpen(false)
    setNotice("Day cleared")
    window.setTimeout(() => setNotice(""), 1800)
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !hasLoaded || saving) return

    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isValidImport(parsed)) throw new Error("Invalid backup")
      if (!(await commit(parsed))) return
      setNotice("Backup imported")
    } catch {
      setNotice("That file isn’t a valid Daymark backup")
    }
    window.setTimeout(() => setNotice(""), 2600)
  }

  const selectedEntry = selectedDate ? data.days[dateKey(selectedDate)] : undefined

  return (
    <TooltipProvider delayDuration={250}>
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(230,240,226,0.8),transparent_28%),radial-gradient(circle_at_95%_10%,rgba(246,229,205,0.7),transparent_30%)]" />

        <header className="relative z-10 flex flex-col gap-4 border-b border-border/70 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold leading-none tracking-tight">Daymark</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Database className="h-3 w-3" />
                  {serverStatus === "connected" && "Stored in the shared server file"}
                  {serverStatus === "loading" && "Loading server data…"}
                  {serverStatus === "error" && (
                    <button type="button" className="underline underline-offset-2" onClick={() => void refreshData()}>
                      Server unavailable · retry
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Button className="lg:hidden" size="sm" disabled={!hasLoaded || saving} onClick={() => openDay(new Date())}>
              <Plus className="mr-1.5 h-4 w-4" /> Today
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
            <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-44 text-center">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{format(month, "MMMM yyyy")}</h1>
            </div>
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled={!hasLoaded || saving} aria-label="Import JSON backup" onClick={() => importRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import JSON backup</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled={!hasLoaded || saving} aria-label="Export JSON backup" onClick={() => downloadData(data)}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export JSON backup</TooltipContent>
            </Tooltip>
            <Button disabled={!hasLoaded || saving} onClick={() => openDay(new Date())}>
              <Plus className="mr-2 h-4 w-4" /> Log today
            </Button>
          </div>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
        </header>

        <section className="relative z-10 flex flex-1 flex-col px-3 pb-3 pt-4 sm:px-6 sm:pb-5 lg:min-h-0 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <button
                className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Back to today
              </button>
              <span className="hidden h-4 w-px bg-border sm:block" />
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-xs text-muted-foreground">Rough</span>
                <div className="flex gap-1">
                  {["bg-rose-400", "bg-amber-400", "bg-yellow-300", "bg-lime-400", "bg-emerald-500"].map((color) => (
                    <span key={color} className={cn("h-2.5 w-5 rounded-full", color)} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Excellent</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground">Days logged </span>
                <span className="font-semibold">{monthEntries.length}</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div>
                <span className="text-muted-foreground">Average </span>
                <span className="font-semibold">{average === null ? "—" : average.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 px-1 pb-2 sm:px-2">
            {weekdays.map((weekday) => (
              <div key={weekday} className="text-center text-[10px] font-semibold tracking-[0.16em] text-muted-foreground sm:text-xs">
                {weekday}
              </div>
            ))}
          </div>

          <div className="grid min-h-[620px] flex-1 grid-cols-7 grid-rows-6 overflow-hidden rounded-2xl border border-white/80 bg-white/50 shadow-[0_8px_40px_-28px_rgba(30,30,20,0.35)] backdrop-blur-sm lg:min-h-0">
            {calendarDays.map((day, index) => {
              const key = dateKey(day)
              const entry = data.days[key]
              const outside = !isSameMonth(day, month)
              const score = entry?.score ?? null
              const notePreview = entry?.note.trim()

              return (
                <button
                  type="button"
                  key={key}
                  disabled={!hasLoaded || saving}
                  onClick={() => openDay(day)}
                  className={cn(
                    "group relative flex min-h-24 flex-col border-border/70 p-2 text-left transition-all focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-28 sm:p-3",
                    index % 7 !== 6 && "border-r",
                    index < 35 && "border-b",
                    outside && "bg-stone-50/40 text-muted-foreground/40",
                    !outside && !score && "hover:bg-white/90",
                    score && scoreBackgrounds[score - 1],
                  )}
                  aria-label={`${format(day, "MMMM d, yyyy")}${score ? `, score ${score}` : ", not logged"}`}
                >
                  <div className="flex w-full items-start justify-between">
                    <span
                      className={cn(
                        "flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-semibold sm:text-sm",
                        isToday(day) && "bg-foreground text-background shadow-sm",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {score && (
                      <span className="flex items-center gap-1 rounded-full bg-white/65 px-1.5 py-1 text-[10px] font-bold shadow-sm backdrop-blur-sm sm:px-2 sm:text-xs">
                        <span className={cn("h-1.5 w-1.5 rounded-full", scoreDots[score - 1])} />
                        {score}
                      </span>
                    )}
                  </div>

                  {notePreview ? (
                    <p className="mt-auto hidden w-full overflow-hidden text-ellipsis text-xs leading-relaxed text-foreground/65 sm:block sm:[display:-webkit-box] sm:[-webkit-box-orient:vertical] sm:[-webkit-line-clamp:2]">
                      {notePreview}
                    </p>
                  ) : (
                    !outside && (
                      <span className="mt-auto hidden items-center gap-1 text-[11px] text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/70 sm:flex">
                        <Plus className="h-3 w-3" /> Add entry
                      </span>
                    )
                  )}
                  {entry?.note && <span className="mt-auto h-1 w-1 rounded-full bg-foreground/40 sm:hidden" />}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between lg:hidden">
            <div className="flex gap-1">
              {["bg-rose-400", "bg-amber-400", "bg-yellow-300", "bg-lime-400", "bg-emerald-500"].map((color) => (
                <span key={color} className={cn("h-2 w-5 rounded-full", color)} />
              ))}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={!hasLoaded || saving} onClick={() => importRef.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" /> Import
              </Button>
              <Button variant="ghost" size="sm" disabled={!hasLoaded || saving} onClick={() => downloadData(data)}>
                <FileJson className="mr-1.5 h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </section>

        {notice && (
          <div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {notice}
          </div>
        )}

        <DayEditor
          date={selectedDate}
          entry={selectedEntry}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={saveDay}
          onDelete={deleteDay}
          saving={saving}
        />
      </main>
    </TooltipProvider>
  )
}
