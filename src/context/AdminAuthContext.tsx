import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminAuthContextType {
  adminPassword: string;
  isAuthenticated: boolean;
  login: (password: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const login = (password: string) => {
    setAdminPassword(password);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setAdminPassword('');
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ adminPassword, isAuthenticated, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
