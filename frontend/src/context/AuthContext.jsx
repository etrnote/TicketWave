import { createContext, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext(null);

function parseJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = parseJwtPayload(token);
  // sub must be a numeric user ID — reject legacy tokens where sub was an email
  return payload !== null && /^\d+$/.test(payload.sub);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('token');
    if (stored && !isTokenValid(stored)) {
      localStorage.removeItem('token');
      return null;
    }
    return stored;
  });
  const queryClient = useQueryClient();

  const isAuthenticated = !!token;
  const payload = token ? parseJwtPayload(token) : null;
  const role = payload?.role ?? null;
  const name = payload?.name ?? null;
  const isAdmin = role === 'ADMIN';

  const login = (jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, role, name, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
