import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  User as UserIcon, 
  Fish, 
  Star, 
  Gem, 
  Zap, 
  Flame, 
  LayoutDashboard, 
  Bot as BotIcon, 
  Backpack, 
  Settings as SettingsIcon, 
  LogOut,
  List,
  Box,
  Copy,
  Check,
  X,
  ClipboardList
} from 'lucide-react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Bot {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'idle';
  coin: number;
  fishCaught: number;
  rarestFish: string;
  rarity: string;
  backpackCurrent: number;
  backpackMax: number;
  lastUpdate?: string;
  quests?: string; // Format like "1/4"
  hasGhostfinn?: boolean;
  hasElement?: boolean;
  backpackItems?: BackpackItem[];
}

interface BackpackItem {
  name: string;
  rarity: string;
  count: number;
  type: string;
  icon?: string;
  botName?: string;
  weight?: string;
  price?: string;
  chance?: string;
  owners?: number;
}

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('bot-section');
  const [bots, setBots] = useState<Bot[]>([]);
  const [stats, setStats] = useState({ online: 0, total: 0, secret: 0, mythic: 0, ghostfinn: 0, element: 0, totalCoins: 0 });
  const [newBotName, setNewBotName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [backpackMode, setBackpackMode] = useState<'detailed' | 'simple'>('detailed');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchBots();
    const fetchInterval = setInterval(fetchBots, 15000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(fetchInterval);
      clearInterval(clockInterval);
    };
  }, [user]);

  const fetchBots = async () => {
    if (!user) return;
    try {
      const response = await api.get(`/bots?userId=${user.id}`);
      const botList = response.data.bots || [];
      setBots(botList);
      
      const online = botList.filter((b: Bot) => b.status === 'online').length;
      let secretCount = 0;
      let mythicCount = 0;
      let ghostCount = 0;
      let elementCount = 0;
      let totalCoins = 0;

      botList.forEach((bot: Bot) => {
        totalCoins += bot.coin || 0;
        if (bot.rarity === 'secret') secretCount++;
        if (bot.rarity === 'mythic') mythicCount++;
        if (bot.hasGhostfinn) ghostCount++;
        if (bot.hasElement) elementCount++;
      });

      setStats({ 
        online, 
        total: botList.length, 
        secret: secretCount, 
        mythic: mythicCount, 
        ghostfinn: ghostCount, 
        element: elementCount,
        totalCoins
      });
    } catch (err: any) {
      console.error('Failed to fetch bots', err);
    }
  };

  const handleAddBot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBotName.trim() || !user) return;
    try {
      await api.post('/bots', { userId: user.id, name: newBotName.trim() });
      setNewBotName('');
      fetchBots();
    } catch (err) {
      console.error('Failed to add bot', err);
    }
  };

  const removeAllBots = async () => {
    if (!confirm('Are you sure you want to remove ALL bots?')) return;
    for (const bot of bots) {
      await api.delete(`/bots/${bot.id}`);
    }
    fetchBots();
  };

  const deleteBot = async (id: number) => {
    try {
      await api.delete(`/bots/${id}`);
      fetchBots();
    } catch (err) {
      console.error('Failed to delete bot', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const lastUpdate = new Date(dateStr);
    const diffInSeconds = Math.floor((currentTime.getTime() - lastUpdate.getTime()) / 1000);

    if (diffInSeconds < 0) return '0s ago'; // Handle minor clock skews
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h ago`;
  };

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || bot.status === filter;
    return matchesSearch && matchesFilter;
  });

  const navItems = [
    { id: 'dashboard-section', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'bot-section', label: 'Bot Fleet', icon: <BotIcon size={18} /> },
    { id: 'backpack-section', label: 'Inventory', icon: <Backpack size={18} /> },
    { id: 'setting-section', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className="flex min-h-screen bg-[#040811] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a101f]/80 backdrop-blur-xl border-r border-white/5 flex flex-col fixed h-full z-40">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white uppercase">REDCODE</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-slate-400 transition-all rounded-xl group relative",
                activeSection === item.id ? "text-white bg-purple-600/10" : "hover:text-white hover:bg-white/5"
              )}
            >
              {activeSection === item.id && (
                <motion.div layoutId="navIndicator" className="absolute left-0 w-1 h-5 bg-purple-600 rounded-r-full" />
              )}
              <span className={cn(activeSection === item.id ? "text-purple-500" : "text-slate-500 group-hover:text-slate-300")}>
                {item.icon}
              </span>
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 transition-all rounded-xl hover:bg-red-400/5">
            <LogOut size={18} />
            <span className="font-bold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen relative p-8">
        <AnimatePresence mode="wait">
          {activeSection === 'bot-section' && (
            <motion.div key="bot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Top Add Section */}
              <div className="flex gap-3 mb-8">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Enter nickname..."
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddBot()}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-6 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
                <button 
                  onClick={() => handleAddBot()}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
                >
                  <Plus size={18} /> Add
                </button>
                <button className="bg-[#1a1a1a] hover:bg-[#252525] border border-white/5 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                  <Plus size={18} /> Multiple
                </button>
                <button 
                  onClick={removeAllBots}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                >
                  <Trash2 size={18} /> Remove All
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <HeaderStat icon={<UserIcon size={20} className="text-blue-400" />} label="Online / Accounts" value={`${stats.online} / ${stats.total}`} />
                <HeaderStat icon={<Fish size={20} className="text-blue-300" />} label="Total Fish" value={formatNumber(stats.totalCoins)} />
                <HeaderStat icon={<Star size={20} className="text-yellow-400" />} label="Mythic Fish" value={stats.mythic.toString()} />
                <HeaderStat icon={<Gem size={20} className="text-blue-400" />} label="Secret Fish" value={stats.secret.toString()} />
                <HeaderStat icon={<Zap size={20} className="text-green-400" />} label="Ghostfinn Rod" value={stats.ghostfinn.toString()} />
                <HeaderStat icon={<Flame size={20} className="text-orange-500" />} label="Element Rod" value={stats.element.toString()} />
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 mb-6 shadow-xl">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-white/5 rounded-xl pl-12 pr-6 py-3 text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex bg-[#0d0d0d] p-1 rounded-xl border border-white/5">
                    {['all', 'online', 'offline'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={cn(
                          "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                          filter === f ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-slate-500 hover:text-white"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex bg-[#0d0d0d] p-1 rounded-xl border border-white/5">
                      <button className="p-2 text-purple-500 bg-purple-500/10 rounded-lg"><List size={18} /></button>
                      <button className="p-2 text-slate-500 hover:text-white"><Zap size={18} /></button>
                      <button className="p-2 text-slate-500 hover:text-white"><Box size={18} /></button>
                    </div>
                    <button className="p-3 bg-[#0d0d0d] border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all"><Copy size={18} /></button>
                    <button onClick={fetchBots} className="p-3 bg-[#0d0d0d] border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all"><RefreshCw size={18} /></button>
                  </div>
                </div>
              </div>

              {/* Main Table */}
              <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#161616]">
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5">#</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5">Status</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5">Username</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5 text-center">Quest</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5">Coins</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5">Total Caught</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5">Rarest Fish</th>
                      <th className="px-4 py-5 text-center border-b border-white/5"><Zap size={16} className="mx-auto text-green-400" /></th>
                      <th className="px-4 py-5 text-center border-b border-white/5"><Flame size={16} className="mx-auto text-orange-500" /></th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5 text-center">Backpack</th>
                      <th className="px-6 py-5 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-white/5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBots.map((bot, index) => (
                      <tr key={bot.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5 text-slate-500 font-medium">{index + 1}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", bot.status === 'online' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                            <span className="text-xs font-bold text-slate-300">{getTimeAgo(bot.lastUpdate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-white tracking-wide">{bot.name}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black">1/4</span>
                            <ClipboardList size={14} className="text-slate-600" />
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-200">{formatNumber(bot.coin)}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-white leading-none mb-1">{formatNumber(bot.fishCaught)}</span>
                            <span className="text-[9px] text-slate-500">({getTimeAgo(bot.lastUpdate)})</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs font-bold text-slate-400">1/4M</td>
                        <td className="px-4 py-5 text-center">
                          {bot.hasGhostfinn ? <Check size={16} className="mx-auto text-green-500" /> : <X size={16} className="mx-auto text-red-500/30" />}
                        </td>
                        <td className="px-4 py-5 text-center">
                          {bot.hasElement ? <Check size={16} className="mx-auto text-green-500" /> : <X size={16} className="mx-auto text-red-500/30" />}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button onClick={() => setActiveSection('backpack-section')} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                            <Backpack size={16} />
                          </button>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button 
                            onClick={() => deleteBot(bot.id)}
                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeSection === 'dashboard-section' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              {/* Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-600/20 to-transparent border border-purple-500/20 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-purple-500/20 transition-all" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Fleet Health</p>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-white">{stats.online}</span>
                    <span className="text-purple-400 font-black mb-1">/ {stats.total}</span>
                    <span className="text-slate-500 text-xs font-bold mb-1.5 ml-auto">ONLINE</span>
                  </div>
                  <div className="mt-4 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.online / (stats.total || 1)) * 100}%` }}
                      className="h-full bg-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                    />
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Global Wealth</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                      <Fish size={20} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white">{formatNumber(stats.totalCoins)}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Total Coins</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Mythic / Secret</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-500">
                      <Star size={20} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white">{stats.mythic} / {stats.secret}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Rarity Count</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] border border-white/5 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-all">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-2">Fleet Performance</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white">{(stats.online * 1.5).toFixed(1)}/s</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Avg. Yield</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts & Activity Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Chart Simulation */}
                <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Fleet Performance</h3>
                      <p className="text-xs text-slate-500 font-bold">Yield trends for the last 7 sessions</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-purple-600" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Yield</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64 flex items-end justify-between gap-4 px-4">
                    {[65, 45, 75, 55, 90, 70, 85].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                        <div className="w-full relative">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: i * 0.1, duration: 1 }}
                            className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-xl group-hover:from-purple-500 group-hover:to-purple-300 transition-all shadow-lg shadow-purple-600/20"
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-xl">
                            {height}%
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase">S0{i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Performing Bots */}
                <div className="bg-[#1a1a1a] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-white mb-6">High Rollers</h3>
                  <div className="space-y-4">
                    {bots.sort((a, b) => b.coin - a.coin).slice(0, 5).map((bot, i) => (
                      <div key={bot.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center font-black text-purple-500 text-xs">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-sm text-white truncate">{bot.name}</h5>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{formatNumber(bot.coin)} Coins</p>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full border", 
                            bot.status === 'online' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {bot.status}
                          </div>
                        </div>
                      </div>
                    ))}
                    {bots.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-slate-600 font-bold text-sm">No active bots found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'setting-section' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-2xl mx-auto">
              <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-8 shadow-xl space-y-8">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight mb-6">User Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                      <input type="text" value={user?.username} disabled className="w-full bg-[#0d0d0d] border border-white/5 rounded-xl px-4 py-3 text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">API Key</label>
                      <div className="flex gap-2">
                        <input type="password" value={user?.apiKey} disabled className="flex-1 bg-[#0d0d0d] border border-white/5 rounded-xl px-4 py-3 text-slate-400" />
                        <button className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all"><Copy size={18} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-4 rounded-xl font-bold transition-all">
                  Delete Account
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'backpack-section' && (
            <motion.div key="backpack" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black italic tracking-tight uppercase">Global Inventory</h2>
                <div className="flex items-center gap-4 bg-[#1a1a1a] border border-white/10 px-4 py-2 rounded-2xl shadow-xl">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Simple Mode</span>
                  <button 
                    onClick={() => setBackpackMode(backpackMode === 'simple' ? 'detailed' : 'simple')}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner",
                      backpackMode === 'simple' ? "bg-purple-600" : "bg-[#333]"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md",
                      backpackMode === 'simple' ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="space-y-12">
                {['Secret', 'Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'].map(rarity => {
                  const items = bots.flatMap(b => (b.backpackItems || [])
                    .filter(item => (item.rarity || '').toLowerCase() === rarity.toLowerCase())
                    .map(item => ({ ...item, botName: b.name }))
                  );

                  if (items.length === 0) return null;

                  return (
                    <div key={rarity} className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          rarity.toLowerCase() === 'secret' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : 
                          rarity.toLowerCase() === 'mythic' ? "bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]" : "bg-slate-500"
                        )} />
                        <h3 className="text-xl font-black italic uppercase tracking-tighter">{rarity} ({items.length})</h3>
                      </div>

                      <div className={cn(
                        "grid gap-4",
                        backpackMode === 'detailed' 
                          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5" 
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                      )}>
                        {items.map((item, idx) => (
                          backpackMode === 'detailed' ? (
                            <DetailedItemCard key={idx} item={item} />
                          ) : (
                            <SimpleItemCard key={idx} item={item} />
                          )
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const HeaderStat = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-center group hover:border-purple-500/30 transition-all cursor-default shadow-xl">
    <div className="mb-3 bg-white/5 p-2 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-xl font-black text-white">{value}</h4>
  </div>
);

const DetailedItemCard = ({ item }: { item: BackpackItem }) => (
  <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 group hover:border-white/20 transition-all shadow-xl">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-[#0d0d0d] rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
        {item.icon ? <img src={item.icon} className="w-8 h-8 object-contain" /> : <Fish className="text-slate-700" size={24} />}
      </div>
      <div className="min-w-0">
        <h4 className="font-bold text-sm truncate text-white">{item.name}</h4>
        <p className="text-[10px] text-slate-500 font-medium truncate">{item.botName}</p>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500 font-bold">Weight:</span>
        <span className="text-slate-300">{item.weight || '564.50 kg'}</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500 font-bold">Price:</span>
        <span className="text-slate-300">{item.price || '98.0K'}</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500 font-bold">Chance:</span>
        <span className="text-slate-300">{item.chance || '1/250.00K'}</span>
      </div>
    </div>
  </div>
);

const SimpleItemCard = ({ item }: { item: BackpackItem }) => {
  const getRarityColor = (r: string) => {
    switch (r.toLowerCase()) {
      case 'secret': return 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.2)]';
      case 'mythic': return 'bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.2)]';
      case 'legendary': return 'bg-orange-500';
      case 'epic': return 'bg-purple-600';
      case 'rare': return 'bg-blue-600';
      default: return 'bg-slate-700';
    }
  };

  return (
    <div className={cn(
      "rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xl relative overflow-hidden group",
      getRarityColor(item.rarity)
    )}>
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl" />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
          {item.icon ? <img src={item.icon} className="w-7 h-7 object-contain" /> : <Fish className="text-white/80" size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-black text-xs truncate leading-tight uppercase tracking-tighter">{item.name}</h4>
          <div className="flex items-center gap-1.5 opacity-80 mt-0.5">
            <UserIcon size={10} />
            <span className="text-[9px] font-black">{item.owners || 7}</span>
            <span className="text-[9px] font-black ml-auto">x{item.count || 10}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-end mt-auto">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-70 italic">{item.rarity}</span>
        <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-lg border border-white/5">{item.price || '980.0K'}</span>
      </div>
    </div>
  );
};
