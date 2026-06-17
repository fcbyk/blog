import { ref, computed, watch } from 'vue'

type ColorMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'color-mode'

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

const preference = ref<ColorMode>(
  (typeof localStorage !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as ColorMode)) || 'system'
)

const value = computed<'light' | 'dark'>(() => {
  if (preference.value === 'system') return getSystemPreference()
  return preference.value
})

watch(preference, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  applyTheme(val === 'system' ? getSystemPreference() : val)
}, { immediate: true })

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (preference.value === 'system') applyTheme(getSystemPreference())
  })
}

export function useColorMode() {
  const colorMode = value as typeof value & { preference: typeof preference.value }
  colorMode.preference = preference.value
  Object.defineProperty(colorMode, 'preference', {
    get: () => preference.value,
    set: (val: ColorMode) => { preference.value = val }
  })
  return colorMode
}
