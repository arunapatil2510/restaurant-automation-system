
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const ADMIN_STORAGE_KEY = 'resto_admin_auth';
const ADMIN_KEY_STORAGE = 'resto_admin_key';

export const AuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(ADMIN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Verify saved admin session with backend
  useEffect(() => {
    const verifySession = async () => {
      const savedKey = sessionStorage.getItem(ADMIN_KEY_STORAGE);
      const savedUser = sessionStorage.getItem(ADMIN_STORAGE_KEY);

      if (!savedKey || !savedUser) {
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        setAdminUser(null);
        setAuthLoading(false);
        return;
      }

      try {
        await api.get('/admin/verify');
        setIsAuthenticated(true);
      } catch {
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        setAdminUser(null);
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    verifySession();
  }, []);

  // Login through backend API
  const login = async (usernameOrEmail, password) => {
    const username = (usernameOrEmail || '').trim();

    if (!username || !password || !password.trim()) {
      return {
        success: false,
        message: 'Username and password are required.',
      };
    }

    try {
      const response = await api.post('/admin/login', {
        username,
        password,
      });

      const result = response.data;

      if (!result.success || !result.data?.adminKey) {
        return {
          success: false,
          message: result.message || 'Authentication failed.',
        };
      }

      const { adminKey, ...userProfile } = result.data;

      sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey);
      sessionStorage.setItem(
        ADMIN_STORAGE_KEY,
        JSON.stringify(userProfile)
      );

      setAdminUser(userProfile);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Unable to connect to the backend.',
      };
    }
  };

  // Logout
  const logout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        adminUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
