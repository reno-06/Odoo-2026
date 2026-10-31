import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getActiveWorkspace,
  login as apiLogin,
  logout as apiLogout,
  restoreSession,
  setActiveWorkspace,
  selectWorkspace as apiSelectWorkspace,
  setUnauthorizedHandler,
  type Session,
  type Workspace,
} from '../services/api';

type AuthState = {
  session: Session | null;
  workspaces: Workspace[];
  workspaceId?: string;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  chooseWorkspace: (id: string) => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(getActiveWorkspace());
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setSession(null);
      setWorkspaces([]);
      setWorkspaceId(undefined);
    }
  }, []);

  const refresh = useCallback(async () => {
    const restored = await restoreSession();
    setSession(restored.session);
    setWorkspaces(restored.workspaces);
    setWorkspaceId(getActiveWorkspace());
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setActiveWorkspace(undefined);
      setSession(null);
      setWorkspaces([]);
      setWorkspaceId(undefined);
    });
    let active = true;
    void refresh()
      .catch(() => {
        if (active) {
          setActiveWorkspace(undefined);
          setSession(null);
          setWorkspaces([]);
          setWorkspaceId(undefined);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      setUnauthorizedHandler(() => undefined);
    };
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    await refresh();
  }, [refresh]);

  const chooseWorkspace = useCallback(async (id: string) => {
    await apiSelectWorkspace(id);
    setWorkspaceId(id);
  }, []);

  const value = useMemo(
    () => ({
      session,
      workspaces,
      workspaceId,
      ready,
      signIn,
      signOut,
      chooseWorkspace,
      refreshSession: refresh,
    }),
    [session, workspaces, workspaceId, ready, signIn, signOut, chooseWorkspace, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
