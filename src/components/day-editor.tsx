import { useEffect, useState } from "react"
import { format } from "date-fns"
import { CalendarDays, Check, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { DayEntry } from "@/lib/storage"

type DayEditorProps = {
  date: Date | null
  entry?: DayEntry
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (score: number | null, note: string) => void
  onDelete: () => void
}

const scoreStyles = [
  "bg-rose-500 text-white border-rose-500",
  "bg-rose-400 text-white border-rose-400",
  "bg-orange-400 text-stone-950 border-orange-400",
  "bg-amber-400 text-stone-950 border-amber-400",
  "bg-yellow-300 text-stone-950 border-yellow-300",
  "bg-lime-300 text-stone-950 border-lime-300",
  "bg-lime-400 text-stone-950 border-lime-400",
  "bg-emerald-400 text-stone-950 border-emerald-400",
  "bg-emerald-500 text-white border-emerald-500",
  "bg-teal-600 text-white border-teal-600",
]

export function DayEditor({ date, entry, open, onOpenChange, onSave, onDelete }: DayEditorProps) {
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState("")

  useEffect(() => {
    if (open) {
      setScore(entry?.score ?? null)
      setNote(entry?.note ?? "")
    }
  }, [open, entry, date])

  if (!date) return null

  const hasEntry = Boolean(entry)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader className="pr-10">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <DialogTitle>{format(date, "EEEE, MMMM d")}</DialogTitle>
          <DialogDescription>How did this day feel? Add a score and a few words.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <fieldset>
            <div className="mb-3 flex items-baseline justify-between">
              <legend className="text-sm font-medium">Day score</legend>
              <span className="text-xs text-muted-foreground">1 rough · 10 excellent</span>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Score ${value} out of 10`}
                  aria-pressed={score === value}
                  onClick={() => setScore(score === value ? null : value)}
                  className={cn(
                    "relative aspect-square rounded-xl border bg-background text-sm font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    score === value && scoreStyles[value - 1],
                  )}
                >
                  {value}
                  {score === value && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="day-note" className="mb-2 block text-sm font-medium">
              A note for the day
            </label>
            <Textarea
              id="day-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What made today what it was?"
              maxLength={2000}
              autoFocus
            />
            <div className="mt-2 text-right text-xs text-muted-foreground">{note.length} / 2000</div>
          </div>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <div>
            {hasEntry && (
              <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear day
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => onSave(score, note.trim())}>
              Save day
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
