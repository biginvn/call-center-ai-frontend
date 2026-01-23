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

      // Note: Token refresh logic removed as v2 API doesn't support refresh

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (axiosInstanceV2 as any)[prop];
  }
});

export default axiosProxy;
