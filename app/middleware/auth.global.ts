export default defineNuxtRouteMiddleware((to, from) => {
  // 检查是否访问 editor 页面
  if (to.path === '/editor') {
    // 在客户端检查是否有有效的 token
    if (process.client) {
      const token = localStorage.getItem('auth-token')
      
      // 如果没有 token，重定向到首页
      if (!token) {
        return navigateTo('/')
      }
    }
  }
})
