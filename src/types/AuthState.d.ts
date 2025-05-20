import type { User } from "./User";

export default interface AuthState {
  access_token: string | null;
  refresh_token: string | null;
  user: User | null;
  refreshToken: () => Promise<{ access_token: string; refresh_token: string; token_type: string }>;
}
