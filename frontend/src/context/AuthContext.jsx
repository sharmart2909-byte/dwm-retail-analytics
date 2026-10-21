import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('retail_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('retail_auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('retail_auth_token');
      if (storedToken) {
        try {
          const res = await authApi.getProfile();
          setUser(res.data.user);
          localStorage.setItem('retail_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.warn('Session expired or invalid, logging out.');
          logout();
        }
      }
      setLoading(false);
    };
    verifySession();
  }, []);

  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('retail_auth_token', newToken);
    localStorage.setItem('retail_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const register = async (username, password, fullName, customerId) => {
    const res = await authApi.register(username, password, fullName, customerId);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('retail_auth_token', newToken);
    localStorage.setItem('retail_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    try {
      authApi.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('retail_auth_token');
    localStorage.removeItem('retail_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isCustomer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
