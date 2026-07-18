import { addDays, isSameDay } from "date-fns"

export type BavarianHoliday = {
  name: string
}

function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

export function getNurembergHoliday(date: Date): BavarianHoliday | null {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  const fixedHoliday = fixedHolidays.find(
    (holiday) => holiday.month === month && holiday.day === day,
  )
  if (fixedHoliday) return fixedHoliday.holiday

  const easter = easterSunday(year)
  const movableHoliday = movableHolidays.find((holiday) =>
    isSameDay(date, addDays(easter, holiday.daysAfterEaster)),
  )

  return movableHoliday?.holiday ?? null
}

const fixedHolidays: Array<{
  month: number
  day: number
  holiday: BavarianHoliday
}> = [
  { month: 0, day: 1, holiday: { name: "New Year’s Day" } },
  { month: 0, day: 6, holiday: { name: "Epiphany" } },
  { month: 4, day: 1, holiday: { name: "Labour Day" } },
  { month: 9, day: 3, holiday: { name: "German Unity Day" } },
  { month: 10, day: 1, holiday: { name: "All Saints’ Day" } },
  { month: 11, day: 25, holiday: { name: "Christmas Day" } },
  { month: 11, day: 26, holiday: { name: "Second Day of Christmas" } },
]

const movableHolidays: Array<{
  daysAfterEaster: number
  holiday: BavarianHoliday
}> = [
  { daysAfterEaster: -2, holiday: { name: "Good Friday" } },
  { daysAfterEaster: 1, holiday: { name: "Easter Monday" } },
  { daysAfterEaster: 39, holiday: { name: "Ascension Day" } },
  { daysAfterEaster: 50, holiday: { name: "Whit Monday" } },
  { daysAfterEaster: 60, holiday: { name: "Corpus Christi" } },
]
