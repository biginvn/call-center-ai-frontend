import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AgentDashboardView from '@/views/agent/AgentDashboardView.vue'
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import ConversationDetailView from '@/views/admin/ConversationDetailView.vue'
import AITrainingView from '@/views/admin/AITrainingView.vue'
import ClientManagementView from '@/views/admin/ClientManagementView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { requiresGuest: true } },
  {
    path: '/',
    name: 'dashboard',
    component: AgentDashboardView,
    // meta: { requiresAuth: true, role: 'agent' },
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: AdminDashboardView,
    // meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/ai-training',
    name: 'ai-training',
    component: AITrainingView,
    // meta: { requiresAuth: true, role: 'admin' },
  },
  {
    path: '/admin/clients',
    name: 'client-management',
    component: ClientManagementView,
    // meta: { requiresAuth: true, role: 'admin' },
  },
  // { path: '/admin/ai-training', name: 'ai-training', component: AITrainingView },
  //  { path: '/admin/conversations/:id', name: 'conversation-detail', component: ConversationDetailView, meta: { requiresAuth: true, role: 'admin' } },
  {
    path: '/admin/conversations/:id',
    name: 'conversation-detail',
    component: ConversationDetailView,
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
    next(authStore.user?.role === 'admin' ? '/admin' : '/')
    return
  }

  // If route requires auth
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
    } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
      next('/')
    } else {
      next()
    }
    return
  }

  next()
})

export default router
