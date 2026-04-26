'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/src/app/providers';
import type { Permission, UserRole } from '@/src/types';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface Household {
  _id: string;
  name: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  households: Household[];
  currentHouseholdId: string | null;
  currentRole: UserRole | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  selectHousehold: (householdId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phoneno?: string;
  createHousehold?: boolean;
  householdName?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    households: [],
    currentHouseholdId: null,
    currentRole: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  });

  // tRPC mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const selectHouseholdMutation = trpc.auth.selectHousehold.useMutation();
  const refreshMutation = trpc.auth.refresh.useMutation();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  // Store tokens
  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }, []);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    try {
      const result = await meQuery.refetch();
      if (result.data) {
        setState(prev => ({
          ...prev,
          user: result.data.user,
          households: result.data.households,
          currentHouseholdId: result.data.currentHouseholdId || null,
          currentRole: result.data.currentRole as UserRole || null,
          permissions: result.data.permissions as Permission[],
          isAuthenticated: true,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
        }));
      }
    } catch {
      clearTokens();
      setState(prev => ({
        ...prev,
        user: null,
        households: [],
        currentHouseholdId: null,
        currentRole: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
      }));
    }
  }, [meQuery, clearTokens]);

  // Refresh tokens
  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const result = await refreshMutation.mutateAsync({ refreshToken });
      setTokens(result.accessToken, result.refreshToken);
      await fetchUser();
    } catch {
      clearTokens();
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }));
    }
  }, [refreshMutation, setTokens, clearTokens, fetchUser]);

  // Initialize auth on mount — runs once, fetchUser/refreshAuth are stable callbacks
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      fetchUser();
    } else {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        refreshAuth();
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password });

      setTokens(result.accessToken, result.refreshToken);

      setState(prev => ({
        ...prev,
        user: result.user,
        households: result.households,
        currentHouseholdId: result.selectedHouseholdId || null,
        isAuthenticated: true,
        isLoading: false,
      }));

      // Redirect to dashboard
      router.push('/dashboard');
    },
    [loginMutation, setTokens, router]
  );

  // Register
  const register = useCallback(
    async (data: RegisterData) => {
      const result = await registerMutation.mutateAsync(data);

      setTokens(result.accessToken, result.refreshToken);

      // Fetch full user data
      await fetchUser();

      // Redirect to dashboard
      router.push('/dashboard');
    },
    [registerMutation, setTokens, fetchUser, router]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore errors on logout
    }

    clearTokens();
    setState({
      user: null,
      households: [],
      currentHouseholdId: null,
      currentRole: null,
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
    });

    router.push('/login');
  }, [logoutMutation, clearTokens, router]);

  // Select household
  const selectHousehold = useCallback(
    async (householdId: string) => {
      const result = await selectHouseholdMutation.mutateAsync({ householdId });

      setTokens(result.accessToken, result.refreshToken);

      setState(prev => ({
        ...prev,
        currentHouseholdId: result.household._id,
        currentRole: result.role as UserRole,
      }));
    },
    [selectHouseholdMutation, setTokens]
  );

  // Check permission
  const hasPermission = useCallback(
    (permission: Permission) => {
      return state.permissions.includes(permission);
    },
    [state.permissions]
  );

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    selectHousehold,
    refreshAuth,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
