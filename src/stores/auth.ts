import { defineStore } from "pinia";
import type User from "@/types/User";
import type AuthState from "@/types/AuthState";
import { logoutUser, refreshToken, getUserInfo } from '@/services/authService';
type UpdateUser = {
  username: string,
  extension_number: string,
  role: string,
  fullName: string
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState & { refreshToken: () => Promise<{ access_token: string; refresh_token: string; token_type: string }> } => ({
    access_token: null,
    refresh_token: null,
    user: null,
    refreshToken: async function () {
      if (!this.refresh_token) {
        throw new Error('No refresh token available');
      }

      try {
        const response = await refreshToken(this.refresh_token);
        this.access_token = response.access_token;
        this.refresh_token = response.refresh_token;
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token);
        return response;
      } catch (error) {
        const store = useAuthStore();
        store.logout();
        throw error;
      }
    }
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.access_token,
    isAdmin: (state): boolean => state.user?.role === "admin",
    isAgent: (state): boolean => state.user?.role === "agent",
  },

  actions: {
    login(this: AuthState, payload: { access_token: string; refresh_token: string; user: User }) {
      this.access_token = payload.access_token;
      this.refresh_token = payload.refresh_token;
      this.user = payload.user;
      localStorage.setItem("access_token", payload.access_token);
      localStorage.setItem("refresh_token", payload.refresh_token);
      localStorage.setItem("user", JSON.stringify(payload.user));
    },

    logout(this: AuthState) {
      if (this.access_token) {
        logoutUser(this.access_token)
      }
      this.access_token = null;
      this.refresh_token = null;
      this.user = null;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      localStorage.removeItem("extension_number");
    },

    updateUser(this: AuthState, user: UpdateUser) {
      if (this.user) {
        this.user.fullName = user.fullName;
        this.user.username = user.username;
        this.user.extensionNumber = Number(user.extension_number);
        this.user.role = user.role as "agent" | "admin";
      }
      localStorage.setItem("extension_number", user.extension_number);
      localStorage.setItem("username", user.username);
      localStorage.setItem("role", user.role);
      localStorage.setItem("fullName", user.fullName);
    },

    async loadFromStorage(this: AuthState) {
      const access_token = localStorage.getItem("access_token");
      const refresh_token = localStorage.getItem("refresh_token");
      const userStr = localStorage.getItem("user");

      if (!access_token || !refresh_token || !userStr) {
        return;
      }

      try {
        const userData = await getUserInfo(access_token);
        const user = JSON.parse(userStr);

        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.user = {
          ...user,
          ...userData
        };
      } catch (error) {
        console.error('Failed to load user data:', error);

        // Try to refresh token before logging out
        try {
          await this.refreshToken();
          // If refresh successful, try loading user data again
          const userData = await getUserInfo(this.access_token!);
          const user = JSON.parse(userStr!);
          this.user = {
            ...user,
            ...userData
          };
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          const store = useAuthStore();
          store.logout();
        }
      }
    },
  },
});
