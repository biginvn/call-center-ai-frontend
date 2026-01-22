import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useVersionStore } from '@/stores/version'
import AgentDashboardView from '@/views/agent/AgentDashboardView.vue'
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import ConversationDetailView from '@/views/admin/ConversationDetailView.vue'
import AITrainingView from '@/views/admin/AITrainingView.vue'
import ClientManagementView from '@/views/admin/ClientManagementView.vue'
import UserManagementView from '@/views/admin/UserManagementView.vue'
// V2 imports
import AITrainingViewV2 from '@/views/v2/AITrainingViewV2.vue'
import AppointmentsDashboardView from '@/views/v2/AppointmentsDashboardView.vue'
import UserDashboardViewV2 from '@/views/v2/UserDashboardViewV2.vue'
import AdminDashboardViewV2 from '@/views/v2/AdminDashboardViewV2.vue'
import UserManagementViewV2 from '@/views/v2/UserManagementViewV2.vue'
import CallsListViewV2 from '@/views/v2/CallsListViewV2.vue'
import CallDetailViewV2 from '@/views/v2/CallDetailViewV2.vue'

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
  // V2 Routes
  {
    path: '/v2/dashboard',
    name: 'v2-dashboard',
    component: UserDashboardViewV2,
    meta: { requiresAuth: true, version: 'v2' },
  },
  {
    path: '/v2/admin',
    name: 'v2-admin-dashboard',
    component: AdminDashboardViewV2,
    meta: { requiresAuth: true, role: 'admin', version: 'v2' },
  },
  {
    path: '/v2/ai-training',
    name: 'v2-ai-training',
    component: AITrainingViewV2,
    meta: { requiresAuth: true, version: 'v2' },
  },
  {
    path: '/v2/appointments',
    name: 'v2-appointments',
    component: AppointmentsDashboardView,
    meta: { requiresAuth: true, version: 'v2' },
  },
  {
    path: '/v2/users',
    name: 'v2-user-management',
    component: UserManagementViewV2,
    meta: { requiresAuth: true, role: 'admin', version: 'v2' },
  },
  {
    path: '/v2/calls',
    name: 'v2-calls-list',
    component: CallsListViewV2,
    meta: { requiresAuth: true, version: 'v2' },
  },
  {
    path: '/v2/calls/:id',
    name: 'v2-call-detail',
    component: CallDetailViewV2,
    meta: { requiresAuth: true, version: 'v2' },
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
  const versionStore = useVersionStore()

  // Load version from storage first
  versionStore.loadFromStorage()

  // Load auth state if not already loaded
  // Only load if version matches saved version
  if (!authLoaded) {
    const savedVersion = localStorage.getItem('app_version') || 'v1'
    const currentVersion = versionStore.isV2 ? 'v2' : 'v1'
    
    // Only load auth if version matches, otherwise it will be cleared in loadFromStorage
    if (savedVersion === currentVersion) {
      await authStore.loadFromStorage()
    }
    authLoaded = true
  }

  // Check if route is v2
  const isV2Route = to.meta.version === 'v2' || to.path.startsWith('/v2')

  // If route requires guest (like login page) and user is authenticated
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Redirect to appropriate dashboard based on role and version
    if (isV2Route || versionStore.isV2) {
      if (authStore.user?.role === 'admin') {
        next('/v2/admin')
        return
      } else {
        next('/v2/dashboard')
        return
      }
    } else {
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
  }

  // If route requires auth
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    // Check version mismatch
    if (isV2Route && !versionStore.isV2) {
      // User is on v1 but trying to access v2 route
      next('/login')
      return
    }
    if (!isV2Route && versionStore.isV2 && to.path !== '/login') {
      // User is on v2 but trying to access v1 route
      if (authStore.user?.role === 'admin') {
        next('/v2/admin')
        return
      } else {
        next('/v2/dashboard')
        return
      }
    }

    // Handle role-based access for v2
    if (isV2Route) {
      const routeRoles = Array.isArray(to.meta.role)
        ? to.meta.role
        : to.meta.role
          ? [to.meta.role]
          : []
      const userRole = authStore.user?.role as string | undefined

      // For v2, map 'agent' role to 'user' for API compatibility
      const v2UserRole = userRole === 'agent' ? 'user' : userRole

      if (routeRoles.length > 0 && (!v2UserRole || !routeRoles.includes(v2UserRole))) {
        if (v2UserRole === 'admin') {
          next('/v2/admin')
          return
        } else {
          next('/v2/dashboard')
          return
        }
      }
      next()
      return
    }

    // Handle role-based access for v1 (existing logic)
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
