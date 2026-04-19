import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPortal, setCurrentPortal] = useState(null);
  const [currentOutlet, setCurrentOutlet] = useState(null);
  const [outlets, setOutlets] = useState([]);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('fnb_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
      setPermissions(res.data.permissions);
      const savedPortal = localStorage.getItem('fnb_portal');
      const savedOutlet = localStorage.getItem('fnb_outlet');
      if (savedPortal) setCurrentPortal(savedPortal);
      if (savedOutlet) setCurrentOutlet(savedOutlet);
      // Load outlets
      try {
        const outletsRes = await api.get('/api/core/outlets');
        setOutlets(outletsRes.data.outlets || []);
      } catch (e) { console.error('Failed to load outlets', e); }
    } catch (err) {
      localStorage.removeItem('fnb_token');
      localStorage.removeItem('fnb_user');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password, totpCode) => {
    const payload = { email, password };
    if (totpCode) payload.totp_code = totpCode;
    const res = await api.post('/api/auth/login', payload);
    const { token, user: userData, permissions: perms, must_change_password } = res.data;
    localStorage.setItem('fnb_token', token);
    localStorage.setItem('fnb_user', JSON.stringify(userData));
    setUser(userData);
    setPermissions(perms);
    // Load outlets
    try {
      const outletsRes = await api.get('/api/core/outlets');
      setOutlets(outletsRes.data.outlets || []);
    } catch (e) { console.error('Failed to load outlets', e); }
    return { user: userData, must_change_password: !!must_change_password };
  };

  const logout = () => {
    localStorage.removeItem('fnb_token');
    localStorage.removeItem('fnb_user');
    localStorage.removeItem('fnb_portal');
    localStorage.removeItem('fnb_outlet');
    setUser(null);
    setPermissions([]);
    setCurrentPortal(null);
    setCurrentOutlet(null);
  };

  const selectPortal = (portal) => {
    setCurrentPortal(portal);
    localStorage.setItem('fnb_portal', portal);
  };

  const selectOutlet = (outletId) => {
    setCurrentOutlet(outletId);
    localStorage.setItem('fnb_outlet', outletId);
  };

  const hasPermission = (perm) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(perm);
  };

  const hasPortalAccess = (portal) => {
    if (user?.is_superadmin) return true;
    return user?.portal_access?.includes(portal);
  };

  const hasOutletAccess = (outletId) => {
    if (user?.is_superadmin) return true;
    return user?.outlet_access?.includes(outletId);
  };

  const getOutletName = (outletId) => {
    const outlet = outlets.find(o => o.id === outletId);
    return outlet?.name || '';
  };

  return (
    <AuthContext.Provider value={{
      user, permissions, loading, currentPortal, currentOutlet, outlets,
      login, logout, selectPortal, selectOutlet,
      hasPermission, hasPortalAccess, hasOutletAccess, getOutletName, loadUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
