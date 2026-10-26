import React, { useState, useEffect } from 'react';
import AdminAuth from './AdminAuth';
import AdminDashboard from './AdminDashboard';
import { getAdminStatus } from '../../services/admin.service';
import { disconnectSocket } from '../../services/socket';

const AdminPage = () => {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const status = await getAdminStatus();
        if (!status.hasAdmin) {
          // If no admin exists at all, clear any stale admin session so one-time signup displays immediately
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          setAdmin(null);
          setChecking(false);
          return;
        }

        const token = localStorage.getItem('adminToken');
        const storedUser = localStorage.getItem('adminUser');
        if (token && storedUser) {
          setAdmin(JSON.parse(storedUser));
        }
      } catch (e) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      } finally {
        setChecking(false);
      }
    };
    verifySession();
  }, []);

  const handleLoginSuccess = (adminData) => {
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    disconnectSocket();
    setAdmin(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin) {
    return <AdminAuth onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard admin={admin} onLogout={handleLogout} />;
};

export default AdminPage;
