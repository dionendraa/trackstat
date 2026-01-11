import React from 'react';
import { Layout, Users, Bot } from 'lucide-react';

interface LandingProps {
  onShowPage: (page: string) => void;
  stats: {
    totalUsers: number;
    totalBots: number;
    totalCoins: number;
  };
}

export const LandingPage: React.FC<LandingProps> = ({ onShowPage, stats }) => {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex justify-between items-center px-[5%] py-4 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-br from-primary-light to-primary bg-clip-text text-transparent">
            RedCode
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => onShowPage('login')} className="hover:text-primary transition-colors">Login</button>
          <button onClick={() => onShowPage('register')} className="bg-gradient-to-br from-primary to-primary-dark px-6 py-3 rounded-lg shadow-lg hover:shadow-primary/50 transition-all hover:-translate-y-0.5">
            Register
          </button>
        </div>
      </nav>

      <section className="flex flex-col md:flex-row items-center justify-between px-[5%] py-20 gap-12">
        <div className="flex-1 max-w-[600px]">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-br from-primary-light via-primary to-[#818cf8] bg-clip-text text-transparent drop-shadow-2xl">
            Track Your Roblox Stats
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            Monitor your Roblox game statistics, player data, and bot performance in real-time with our powerful tracking platform.
          </p>
          <div className="flex gap-4">
            <button onClick={() => onShowPage('register')} className="bg-gradient-to-br from-primary to-primary-dark px-6 py-3 rounded-lg shadow-lg hover:shadow-primary/50 transition-all hover:-translate-y-0.5">
              Get Started
            </button>
            <button onClick={() => onShowPage('login')} className="bg-surface-light border border-border px-6 py-3 rounded-lg hover:bg-surface transition-all">
              Sign In
            </button>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-surface border border-border rounded-2xl p-8 flex gap-8 shadow-2xl shadow-primary/20">
            <div className="text-center">
              <span className="block text-3xl font-bold text-primary mb-1">{stats.totalUsers.toLocaleString()}</span>
              <span className="text-sm text-slate-400">Total Users</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-bold text-primary mb-1">{stats.totalBots.toLocaleString()}</span>
              <span className="text-sm text-slate-400">Total Bots</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-bold text-primary mb-1">{stats.totalCoins.toLocaleString()}</span>
              <span className="text-sm text-slate-400">Coins Collected</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-[5%] py-20 bg-surface">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard 
            icon={<Bot className="w-12 h-12 text-primary" />}
            title="Bot Management"
            description="Control and monitor your Roblox bots with ease"
          />
          <FeatureCard 
            icon={<Layout className="w-12 h-12 text-primary" />}
            title="Real-time Analytics"
            description="Track player statistics and game performance"
          />
          <FeatureCard 
            icon={<Users className="w-12 h-12 text-primary" />}
            title="Custom Settings"
            description="Configure tracking preferences to your needs"
          />
        </div>
      </section>

      <footer className="text-center py-8 text-slate-400 border-t border-border">
        <p>&copy; 2024 RedCode Roblox. All rights reserved.</p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-background border border-border rounded-2xl p-8 text-center transition-all hover:-translate-y-2 hover:border-primary hover:shadow-2xl hover:shadow-primary/20">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-slate-400">{description}</p>
  </div>
);

