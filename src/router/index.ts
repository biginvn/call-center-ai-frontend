import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AgentDashboardView from '@/views/agent/AgentDashboardView.vue'
import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import LoginView from '@/views/LoginView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { requiresGuest: true } },
  { path: '/', name: 'dashboard', component: AgentDashboardView, meta: { requiresAuth: true, role: 'agent' } },
  { path: '/admin', name: 'admin-dashboard', component: AdminDashboardView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/test', component: AgentDashboardView },
  { path: '/test1', component: AdminDashboardView },
];

const router = createRouter({
  // import.meta.env.BASE_URL
  history: createWebHistory(),
  routes,
});

// Flag to track if auth has been loaded
let authLoaded = false;

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Load auth state if not already loaded
  if (!authLoaded) {
    await authStore.loadFromStorage();
    authLoaded = true;
  }

  // If route requires guest (like login page) and user is authenticated
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    next(authStore.user?.role === 'admin' ? '/admin' : '/');
    return;
  }

  // If route requires auth
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login');
    } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
      next('/');
    } else {
      next();
    }
    return;
  }

  next();
});

export default router
