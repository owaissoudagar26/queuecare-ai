import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('queuecare_token');
    const storedUser = localStorage.getItem('queuecare_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('queuecare_token');
        localStorage.removeItem('queuecare_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    const data = res.data;
    const userData = {
      id: data.user_id,
      email: email,
      fullName: data.full_name,
      role: data.role,
      departmentId: data.department_id,
    };
    localStorage.setItem('queuecare_token', data.access_token);
    localStorage.setItem('queuecare_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('queuecare_token');
    localStorage.removeItem('queuecare_user');
    setUser(null);
  };

  const switchRole = async (targetRole, email, password) => {
    try {
      await login(email, password);
    } catch (err) {
      console.error('Failed to quick-switch role:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
