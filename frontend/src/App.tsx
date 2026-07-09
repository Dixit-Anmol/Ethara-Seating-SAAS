import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderGit, 
  Grid3X3, 
  MessageSquare, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Bell,
  Sparkles
} from 'lucide-react';

// Import Pages
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Projects';
import Seats from './pages/Seats';
import AIChat from './pages/AIChat';

// Custom Toast System context/hook replacement
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export let showToastGlobal: (message: string, type?: 'success' | 'error' | 'info') => void = () => {};

function NavigationLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const location = useLocation();

  useEffect(() => {
    // Initialize dark mode by default
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Set global toast trigger
  useEffect(() => {
    showToastGlobal = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Projects', path: '/projects', icon: FolderGit },
    { name: 'Seats', path: '/seats', icon: Grid3X3 },
    { name: 'AI Assistant', path: '/ai-chat', icon: MessageSquare, highlight: true },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight">Ethara</span>
              <span className="text-xs block text-muted-foreground font-medium -mt-1">Seat Allocation</span>
            </div>
          </div>
          <button className="md:hidden p-1 rounded-lg hover:bg-muted" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'} />
                  <span>{item.name}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Profile Mock */}
        <div className="p-4 border-t border-border bg-black/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate">Admin User</span>
              <span className="block text-xs text-muted-foreground truncate">admin@ethara.com</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-muted text-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl flex items-center gap-2">
              {location.pathname === '/' && 'Office Dashboard'}
              {location.pathname === '/employees' && 'Employee Directory'}
              {location.pathname === '/projects' && 'Project Management'}
              {location.pathname === '/seats' && 'Interactive Office Map'}
              {location.pathname === '/ai-chat' && (
                <>
                  <Sparkles size={20} className="text-violet-400 animate-pulse-subtle" />
                  <span>AI Office Assistant</span>
                </>
              )}
            </h1>
          </div>

          {/* Quick Actions / Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Dark/Light mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
            </button>

            <div className="hidden sm:block text-xs text-muted-foreground border-l border-border pl-3">
              <span className="font-semibold text-foreground">SaaS Mode</span>
              <span className="block text-[10px]">Version 1.0.0</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/seats" element={<Seats />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-slide-in pointer-events-auto transform translate-y-0 transition-transform duration-300
              ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-red-500/15 border-red-500/30 text-red-400' : ''}
              ${toast.type === 'info' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : ''}
            `}
          >
            <div className="flex-1 text-sm font-medium">{toast.message}</div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-xs opacity-75 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationLayout />
    </BrowserRouter>
  );
}
