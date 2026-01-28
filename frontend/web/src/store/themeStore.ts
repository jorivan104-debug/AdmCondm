import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'admcondm-theme'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'dark' || stored === 'light') return stored
  return 'light'
}

// Aplicar tema guardado al cargar el módulo (evita parpadeo)
const initial = readStoredTheme()
applyTheme(initial)

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  setTheme: (theme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme)
    }
    applyTheme(theme)
    set({ theme })
  },
}))
