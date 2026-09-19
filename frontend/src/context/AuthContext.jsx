import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const isAuthenticated = Boolean(adminUser);

  // Sync to sessionStorage
  useEffect(() => {
    if (adminUser) {
      sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem(ADMIN_KEY_STORAGE, adminUser.passkey || 'restoAdmin2026');
    } else {
      sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    }
  }, [adminUser]);

  // Demo / Student-project authentication handler
  const login = async (usernameOrEmail, password) => {
    const cleanUser = (usernameOrEmail || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser) {
      return { success: false, message: 'Please enter your username or email.' };
    }
    if (!cleanPass) {
      return { success: false, message: 'Please enter your password.' };
    }

    // Demo credentials verification (Accepts admin credentials or valid format for local demo)
    if (cleanUser === 'admin' || cleanUser === 'admin@restosmart.com' || cleanUser.includes('admin')) {
      const userObj = {
        username: cleanUser,
        name: 'Restaurant Manager',
        email: cleanUser.includes('@') ? cleanUser : 'admin@restosmart.com',
        role: 'Admin / Manager',
        passkey: cleanPass,
        loginTime: new Date().toISOString(),
      };
      setAdminUser(userObj);
      return { success: true };
    }

    // Default valid login for student demo testing
    const userObj = {
      username: cleanUser,
      name: cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1),
      email: cleanUser.includes('@') ? cleanUser : `${cleanUser}@restosmart.com`,
      role: 'Staff Member',
      passkey: cleanPass,
      loginTime: new Date().toISOString(),
    };
    setAdminUser(userObj);
    return { success: true };
  };

  const logout = () => {
    setAdminUser(null);
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
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
