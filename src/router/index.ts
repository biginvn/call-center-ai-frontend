import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AgentDashboardView from '@/views/agent/AgentDashboardView.vue'
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import ConversationDetailView from '@/views/admin/ConversationDetailView.vue'
import AITrainingView from '@/views/admin/AITrainingView.vue'
import ClientManagementView from '@/views/admin/ClientManagementView.vue'
import UserManagementView from '@/views/admin/UserManagementView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { requiresGuest: true } },
  {
    path: '/',
    name: 'dashboard',
    component: AgentDashboardView,
    meta: { requiresAuth: true, role: 'agent' },
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: AdminDashboardView,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/ai-training',
    name: 'ai-training',
    component: AITrainingView,
    meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/clients',
    name: 'client-management',
    component: ClientManagementView,
    meta: { requiresAuth: true, role: ['admin', 'system'] },
  },
  {
    path: '/admin/users',
    name: 'user-management',
    component: UserManagementView,
    meta: { requiresAuth: true, role: 'admin' },
  },
  // { path: '/admin/ai-training', name: 'ai-training', component: AITrainingView },
  // { path: '/admin/conversations/:id', name: 'conversation-detail', component: ConversationDetailView, meta: { requiresAuth: true, role: 'admin' } },
  {
    path: '/admin/conversations/:id',
    name: 'conversation-detail',
    component: ConversationDetailView,
    meta: { requiresAuth: true, role: 'admin' },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  { path: '/admin/test', name: 'admin-dashboard-test', component: AdminDashboardView },
]

const router = createRouter({
  // import.meta.env.BASE_URL
  history: createWebHistory(),
  routes,
})

// Flag to track if auth has been loaded
let authLoaded = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Load auth state if not already loaded
  if (!authLoaded) {
    await authStore.loadFromStorage()
    authLoaded = true
  }

  // If route requires guest (like login page) and user is authenticated
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    if (authStore.user?.role === 'admin') {
      next('/admin')
      return
    } else if (authStore.user?.role === 'system') {
      next('/admin/clients')
      return
    } else {
      next('/')
      return
    }
  }

  // If route requires auth
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    // Handle role-based access
    const routeRoles = Array.isArray(to.meta.role)
      ? to.meta.role
      : to.meta.role
        ? [to.meta.role]
        : []
    const userRole = authStore.user?.role as string | undefined

    // Special handling: system role can ONLY access /admin/clients, never any other route
    if (userRole === 'system') {
      if (to.path !== '/admin/clients') {
        next('/admin/clients')
        return
      }
    } else if (routeRoles.length > 0 && (!userRole || !routeRoles.includes(userRole))) {
      if (userRole === 'admin') {
        next('/admin')
        return
      } else {
        next('/')
        return
      }
    }
    next()
    return
  }

  next()
})

export default router
