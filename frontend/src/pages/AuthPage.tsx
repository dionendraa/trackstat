import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  type: 'login' | 'register';
  onShowPage: (page: string) => void;
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ type, onShowPage, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = type === 'login' ? '/login' : '/register';
      const response = await api.post(endpoint, { username, password });
      
      if (response.data.success) {
        if (type === 'login') {
          const userData = {
            ...response.data.user,
            token: response.data.token
          };
          login(userData);
          onSuccess();
        } else {
          onShowPage('login');
        }
      } else {
        setError(response.data.error || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Connection failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/20">
      <div className="w-full max-w-md bg-surface border border-border p-10 rounded-[2.5rem] shadow-2xl shadow-primary/20">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold bg-gradient-to-br from-primary-light to-primary bg-clip-text text-transparent mb-4">
            RedCode
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {type === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400">
            {type === 'login' ? 'Sign in to your account' : 'Start tracking your Roblox stats'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-slate-400 block ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400 block ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-br from-primary to-primary-dark py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
          >
            {type === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-slate-400">
            {type === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => onShowPage(type === 'login' ? 'register' : 'login')}
              className="text-primary hover:underline font-medium"
            >
              {type === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
          <button
            onClick={() => onShowPage('landing')}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

