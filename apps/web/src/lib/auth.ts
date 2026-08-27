import { create } from 'zustand';

export type GlobalRole = 'admin' | 'teacher' | 'audience';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  globalRole: GlobalRole;
}

const TOKEN_KEY = 'task.accessToken';
const USER_KEY = 'task.user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: readStoredUser(),
  token: getToken(),
  login: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null });
  },
}));
