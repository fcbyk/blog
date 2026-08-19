const TOKEN_KEY = 'admin-token'

const isLoggedIn = ref(false)
const isChecking = ref(true)

async function checkAuth() {
  isChecking.value = true
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    try {
      const res = await $fetch<{ valid: boolean }>('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.valid) {
        isLoggedIn.value = true
        isChecking.value = false
        return
      }
    } catch {}
    localStorage.removeItem(TOKEN_KEY)
  }
  isLoggedIn.value = false
  isChecking.value = false
}

function login(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  isLoggedIn.value = true
}

function logout() {
  localStorage.removeItem(TOKEN_KEY)
  isLoggedIn.value = false
}

export function useAuth() {
  return {
    isLoggedIn: readonly(isLoggedIn),
    isChecking: readonly(isChecking),
    checkAuth,
    login,
    logout,
  }
}