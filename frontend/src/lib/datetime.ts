const TIME_ZONE = 'Africa/Casablanca'

export function todayInClinic(): string {
  return clinicDateKey(new Date().toISOString())
}

export function clinicDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export function formatClinicDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

export function formatClinicDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function casablancaLocalToIso(local: string): string {
  const [datePart, timePart] = local.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(utcGuess)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return new Date(utcGuess.getTime() - (asUtc - utcGuess.getTime())).toISOString()
}
