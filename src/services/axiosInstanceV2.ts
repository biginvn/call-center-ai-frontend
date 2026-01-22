import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";
import { loadConfig } from "@/config";

let axiosInstanceV2: ReturnType<typeof axios.create> | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

const initializeAxiosV2 = async () => {
  if (isInitializing) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      const config = await loadConfig();
      const baseURL = config.API_V2_URL || config.API_URL;
      
      axiosInstanceV2 = axios.create({
        baseURL,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "Access-Control-Allow-Origin": "*"
        },
      });

      // Flag to prevent multiple refresh attempts
      let isRefreshing = false;
      // Store pending requests
      interface QueueItem {
        resolve: (token: string) => void;
        reject: (error: unknown) => void;
      }
      let failedQueue: QueueItem[] = [];

      const processQueue = (error: unknown, token: string | null = null) =>
        failedQueue.forEach(prom => {
          if (error) {
            prom.reject(error);
          } else {
            prom.resolve(token as string);
          }
        });
        failedQueue = [];

      axiosInstanceV2.interceptors.request.use(
        (config) => {
          const authStore = useAuthStore();
          const access_token = authStore.access_token;
          if (access_token) {
            config.headers.Authorization = `Bearer ${access_token}`;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      axiosInstanceV2.interceptors.response.use(
        (response) => {
          return response;
        },
        async (error) => {
          const authStore = useAuthStore();
          const originalRequest = error.config;

          // v2 API doesn't support token refresh, so on 401 just logout
          if (error.response?.status === 401) {
            authStore.logout();
            router.push('/login');
            return Promise.reject(error);
          }

          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('Failed to initialize axios v2 instance:', error);
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
};

export const getAxiosInstanceV2 = async () => {
  if (!axiosInstanceV2) {
    await initializeAxiosV2();
  }
  if (!axiosInstanceV2) {
    throw new Error('Failed to initialize axios v2 instance');
  }
  return axiosInstanceV2;
};

// Create a proxy that will wait for initialization
const axiosProxy = new Proxy({} as ReturnType<typeof axios.create>, {
  get: (target, prop) => {
    if (!axiosInstanceV2) {
      throw new Error('Axios v2 instance not initialized. Call getAxiosInstanceV2() first.');
    }
    return (axiosInstanceV2 as any)[prop];
  }
});

export default axiosProxy;
