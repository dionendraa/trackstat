import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import api from './api/client';

const AppContent: React.FC = () => {
  const { user, login, logout, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');
  const [stats, setStats] = useState({ totalUsers: 0, totalBots: 0, totalCoins: 0 });

  useEffect(() => {
    fetchStats();
    verifySession();
  }, []);

  const verifySession = async () => {
    const savedUser = localStorage.getItem('redcode_current_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        const response = await api.post('/verify', { userId: userData.id });
        if (response.data.valid) {
          login(response.data.user);
        } else {
          logout();
        }
      } catch (err) {
        // Don't logout on network error, just let it be
      }
    }
  };

  useEffect(() => {
    if (user) {
      setCurrentPage('dashboard');
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user || currentPage === 'dashboard') {
    return <DashboardPage />;
  }

  switch (currentPage) {
    case 'login':
      return <AuthPage type="login" onShowPage={setCurrentPage} onSuccess={() => setCurrentPage('dashboard')} />;
    case 'register':
      return <AuthPage type="register" onShowPage={setCurrentPage} onSuccess={() => setCurrentPage('login')} />;
    default:
      return <LandingPage onShowPage={setCurrentPage} stats={stats} />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
