import { useEffect, useState } from 'react'
import { platformApi } from '../api/client'
import type { PublicSettings } from '../api/types'

// Настройки меняются редко — один запрос на вкладку, результат разделяют все компоненты
let cache: Promise<PublicSettings> | null = null

function load(): Promise<PublicSettings> {
  cache ??= platformApi.publicSettings().catch(() => {
    cache = null
    return {}
  })
  return cache
}

export function usePublicSettings(): PublicSettings {
  const [settings, setSettings] = useState<PublicSettings>({})
  useEffect(() => {
    let cancelled = false
    load().then((value) => { if (!cancelled) setSettings(value) })
    return () => { cancelled = true }
  }, [])
  return settings
}

export function useAnnouncement(): string {
  return usePublicSettings()['platform.announcement'] ?? ''
}

export function useSupportEmail(): string {
  return usePublicSettings()['support.email'] || 'support@kontur.work'
}
