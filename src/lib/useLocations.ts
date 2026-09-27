import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Locations } from '../api/types'

/** Справочник стран и городов (включая Молдову) для форм и фильтров */
export function useLocations(): Locations | null {
  const [locations, setLocations] = useState<Locations | null>(null)
  useEffect(() => {
    let cancelled = false
    api.getLocations().then((value) => { if (!cancelled) setLocations(value) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  return locations
}

export function citiesOf(locations: Locations | null, country: string): string[] {
  return (locations?.cities ?? []).filter((c) => c.country === country).map((c) => c.city)
}
