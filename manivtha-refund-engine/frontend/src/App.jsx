import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { refundService, authService } from './services/api';
import UserManagementPage from './UserManagement';
import ForgotPasswordPage from './ForgotPassword';
import ResetPasswordPage from './ResetPassword';
import bannerImg from './assets/banner.png';
import { 
  LayoutDashboard, 
  FileText, 
  History, 
  LogOut, 
  Search, 
  DollarSign, 
  CheckCircle,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Bell,
  PlaneTakeoff,
  X,
  Moon,
  Sun,
  Download,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Users
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar, Legend
} from 'recharts';

// ----------------------------------------------------------------------
// 0. THEME CONTEXT
// ----------------------------------------------------------------------
const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('manivtha_theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('manivtha_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ----------------------------------------------------------------------
// 0.5. USER CONTEXT
// ----------------------------------------------------------------------
const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('manivtha_user');
    return saved ? JSON.parse(saved) : {
      firstName: '',
      lastName: '',
      email: '',
      role: 'STAFF',
      avatar: null
    };
  });

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('manivtha_user', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (localStorage.getItem('manivtha_auth') === 'true') {
        try {
          const data = await authService.me();
          updateUser({
            firstName: data.name.split(' ')[0] || 'User',
            lastName: data.name.split(' ').slice(1).join(' ') || '',
            email: data.email,
            role: data.role
          });
        } catch (e) {
          // If the token is invalid or expired, log them out
          if (e.response && e.response.status === 401) {
            localStorage.removeItem('manivtha_auth');
            localStorage.removeItem('manivtha_auth_token');
            localStorage.removeItem('manivtha_user');
            window.location.href = '/login';
          }
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ----------------------------------------------------------------------
// 1. TOAST NOTIFICATIONS
// ----------------------------------------------------------------------
const ToastContext = createContext(null);
const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto min-w-[320px] p-4 rounded-lg shadow-lg flex items-start gap-3 border ${
            t.type === 'success' ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-900/50' : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50'
          }`}>
            {t.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`text-sm font-semibold ${t.type === 'success' ? 'text-green-900 dark:text-green-400' : 'text-red-900 dark:text-red-400'}`}>
                {t.type === 'success' ? 'Success' : 'Error'}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t.message}</p>
            </div>
            <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ----------------------------------------------------------------------
// 2. AUTH GUARD & LAYOUT
// ----------------------------------------------------------------------
function AuthGuard({ children }) {
  const isAuthenticated = localStorage.getItem('manivtha_auth') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useToast();
  const { theme, toggleTheme } = useTheme();
  
  const { user } = useUser();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    refundService.getAuditLogs().then(data => setRecentLogs(data.slice(0, 5)));
    refundService.getOrders().then(setOrders).catch(console.error);
  }, []);
  
  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.trim().length > 1) {
      setIsSearchOpen(true);
      const lower = val.toLowerCase();
      setSearchResults(orders.filter(o => 
        o.customer_name.toLowerCase().includes(lower) || 
        o.booking_id.toString().includes(lower) ||
        o.status.toLowerCase().includes(lower)
      ));
    } else {
      setIsSearchOpen(false);
      setSearchResults([]);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('manivtha_auth');
    addToast('Logged out successfully', 'success');
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/cancellation-entry', label: 'Cancellations', icon: FileText },
    { path: '/audit-logs', label: 'Audit Logs', icon: History },
    { path: '/reports', label: 'Reports & Analytics', icon: TrendingUp }
  ];
  if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
    navLinks.push({ path: '/users', label: 'User Management', icon: Users });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between fixed inset-y-0 left-0 z-40 border-r border-slate-800 dark:border-slate-800/50">
        <div>
          <div className="h-16 px-6 border-b border-slate-800 dark:border-slate-800/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <PlaneTakeoff className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">Manivtha Tours</span>
          </div>

          <nav className="p-4 space-y-1 mt-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-600/10 text-blue-500' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 dark:border-slate-800/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-white border border-slate-700 overflow-hidden shrink-0">
              {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : (user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ml-64 min-h-screen">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 px-8 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96 hidden md:block" ref={searchRef}>
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => { if(searchTerm.length > 1) setIsSearchOpen(true); }}
                placeholder="Search bookings by ID or customer name..." 
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-md text-sm focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none transition-all dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              />
              {isSearchOpen && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-50 animate-fade-in overflow-hidden">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">Search Results</div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No results found for "{searchTerm}"</div>
                    ) : (
                      searchResults.map(order => (
                        <div key={order.booking_id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center cursor-pointer" onClick={() => { setIsSearchOpen(false); navigate('/cancellation-entry'); }}>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">#{order.booking_id} - {order.customer_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Status: <span className={order.status === 'Cancelled' ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>{order.status}</span></p>
                          </div>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">₹{order.total_amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative transition-colors" title="Toggle Theme">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative" ref={notifRef}>
              <button onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative transition-colors">
                <Bell className="w-5 h-5" />
                {recentLogs.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 transition-colors"></span>}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-50 animate-fade-in overflow-hidden">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Notifications</h3>
                    <Link to="/notifications" onClick={() => setIsNotifOpen(false)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All</Link>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {recentLogs.map(log => (
                      <div key={log.log_id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <History className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Booking #{log.booking_id} Cancelled</p>
                          <p className="text-xs text-slate-500 mt-0.5">Refund: ₹{log.refund_amount.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                    {recentLogs.length === 0 && <div className="p-4 text-center text-sm text-slate-500">No new notifications</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={profileRef}>
              <button onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 dark:hover:ring-offset-slate-900">
                {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : (user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U')}
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-50 animate-fade-in py-1">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link to="/profile" onClick={() => setIsProfileOpen(false)} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Profile Settings</Link>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                    <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. LOGIN PAGE
// ----------------------------------------------------------------------
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const addToast = useToast();
  const { theme, toggleTheme } = useTheme();
  const { updateUser } = useUser();

  useEffect(() => {
    if (localStorage.getItem('manivtha_auth') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('manivtha_auth', 'true');
      localStorage.setItem('manivtha_auth_token', data.access_token);
      updateUser({
        firstName: data.name.split(' ')[0] || 'User',
        lastName: data.name.split(' ').slice(1).join(' ') || '',
        email: data.email,
        role: data.role
      });
      addToast('Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Invalid credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200 relative">
      <button onClick={toggleTheme} className="absolute top-8 right-8 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors duration-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <PlaneTakeoff className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to your account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manivtha Tours Enterprise Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="admin@manivtha.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-6 transition-all"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. DASHBOARD
// ----------------------------------------------------------------------
function DashboardPage() {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, logsData, policiesData] = await Promise.all([
          refundService.getOrders(),
          refundService.getAuditLogs(),
          refundService.getPolicies()
        ]);
        setOrders(ordersData);
        setAuditLogs(logsData);
        setPolicies(policiesData.sort((a,b) => a.policy_id - b.policy_id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const updatePolicyField = (index, field, value) => {
    const newPolicies = [...policies];
    newPolicies[index] = { ...newPolicies[index], [field]: value };
    
    // Auto-adjust adjacent bounds
    if (index === 0 && field === 'min_hours') {
        if (newPolicies[1]) newPolicies[1] = { ...newPolicies[1], max_hours: value };
    } else if (index === 1 && field === 'max_hours') {
        if (newPolicies[0]) newPolicies[0] = { ...newPolicies[0], min_hours: value };
    } else if (index === 1 && field === 'min_hours') {
        if (newPolicies[2]) newPolicies[2] = { ...newPolicies[2], max_hours: value };
    } else if (index === 2 && field === 'max_hours') {
        if (newPolicies[1]) newPolicies[1] = { ...newPolicies[1], min_hours: value };
    }
    setPolicies(newPolicies);
  };
  
  const handleSavePolicies = async (e) => {
    e.preventDefault();
    try {
        await refundService.updatePolicies(policies);
        addToast('Global policies updated successfully', 'success');
    } catch {
        addToast('Failed to update policies', 'error');
    }
  };

  const totalCancellations = auditLogs.length;
  const totalRefunds = auditLogs.reduce((sum, log) => sum + log.refund_amount, 0);
  const activeBookings = orders.filter(o => o.status !== 'Cancelled').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Trial */}
      <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden relative shadow-lg">
        <img src={bannerImg} alt="Travel Banner" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent flex items-end">
          <div className="p-8 text-white">
            <h2 className="text-3xl font-bold mb-2">Welcome to Manivtha Tours</h2>
            <p className="opacity-90 max-w-lg">Manage your refund operations, cancellations, and active bookings efficiently.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mt-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time metrics of your refund operations.</p>
        </div>
        <Link
          to="/cancellation-entry"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md shadow-blue-600/20"
        >
          New Cancellation
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Cancellations</h3>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{totalCancellations}</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> 12% increase</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Capital Refunded</h3>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{formatCurrency(totalRefunds)}</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> 4% increase</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Bookings</h3>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{activeBookings}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Currently valid and active</p>
        </div>
      </div>



      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No recent activity found.</div>
          ) : (
            auditLogs.slice(0, 5).map(log => (
              <div key={log.log_id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Booking #{log.booking_id} cancelled</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Policy applied: {log.policy_applied}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">+{formatCurrency(log.refund_amount)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(log.cancellation_date).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Global Policies Editor Demo Card */}
      {user.role === 'ADMIN' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-8">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Global Refund Policies</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure default refund percentages and timeframes for future cancellations.</p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">DEMO</span>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {policies.length === 3 ? (
                <>
                  {/* Tier 1 */}
                  <div className="space-y-4 p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Timeframe</label>
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span>More than</span>
                        <input type="number" value={policies[0].min_hours / 24} onChange={e => updatePolicyField(0, 'min_hours', Number(e.target.value) * 24)} min="1" className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-center transition-colors" />
                        <span>days</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Refund Amount</label>
                      <div className="relative">
                        <input type="number" value={policies[0].refund_percentage} onChange={e => updatePolicyField(0, 'refund_percentage', Number(e.target.value))} min="0" max="100" className="w-full pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white sm:text-sm transition-colors" />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-slate-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="space-y-4 p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Timeframe</label>
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span>Between</span>
                        <input type="number" value={policies[1].min_hours / 24} onChange={e => updatePolicyField(1, 'min_hours', Number(e.target.value) * 24)} min="1" className="w-14 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-center transition-colors" />
                        <span>to</span>
                        <input type="number" value={policies[1].max_hours / 24} onChange={e => updatePolicyField(1, 'max_hours', Number(e.target.value) * 24)} min="1" className="w-14 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-center transition-colors" />
                        <span>days</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Refund Amount</label>
                      <div className="relative">
                        <input type="number" value={policies[1].refund_percentage} onChange={e => updatePolicyField(1, 'refund_percentage', Number(e.target.value))} min="0" max="100" className="w-full pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white sm:text-sm transition-colors" />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-slate-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="space-y-4 p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Timeframe</label>
                      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span>Less than</span>
                        <input type="number" value={policies[2].max_hours} onChange={e => updatePolicyField(2, 'max_hours', Number(e.target.value))} min="1" className="w-16 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-center transition-colors" />
                        <span>hours</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Refund Amount</label>
                      <div className="relative">
                        <input type="number" value={policies[2].refund_percentage} onChange={e => updatePolicyField(2, 'refund_percentage', Number(e.target.value))} min="0" max="100" className="w-full pl-3 pr-8 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white sm:text-sm transition-colors" />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-slate-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 text-center text-slate-500 py-8">Loading policies...</div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button 
                onClick={handleSavePolicies}
                disabled={policies.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                Save Policy Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. CANCELLATION FORM
// ----------------------------------------------------------------------
function CancellationEntryPage() {
  const [orders, setOrders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [calculationResult, setCalculationResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, policiesData] = await Promise.all([
            refundService.getOrders(),
            refundService.getPolicies()
        ]);
        setOrders(ordersData.filter(o => o.status !== 'Cancelled'));
        const sortedPolicies = policiesData.sort((a,b) => a.policy_id - b.policy_id);
        setPolicies(sortedPolicies);
        if (sortedPolicies.length > 0) {
            setSelectedPolicyId(sortedPolicies[0].policy_id);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOrderChange = (e) => {
    const id = e.target.value;
    setSelectedOrderId(id);
    setCalculationResult(null);
    if (id) {
      setSelectedOrder(orders.find(o => o.booking_id === parseInt(id)));
    } else {
      setSelectedOrder(null);
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    if (!selectedOrder || !selectedPolicyId) return;
    setIsCalculating(true);
    setTimeout(() => {
      const amount = selectedOrder.total_amount;
      const policy = policies.find(p => p.policy_id === selectedPolicyId);
      const percentage = policy ? policy.refund_percentage : 0;
      let label = "";
      if (policy) {
          if (policy.max_hours === null) label = `More than ${policy.min_hours/24} days prior`;
          else if (policy.min_hours === 0) label = `Less than ${policy.max_hours} hours prior`;
          else label = `Between ${policy.min_hours/24} to ${policy.max_hours/24} days prior`;
      }

      setCalculationResult({
        refundPercentage: percentage,
        refundAmount: (amount * percentage) / 100,
        retentionFee: amount - ((amount * percentage) / 100),
        noticePeriodApplied: label,
        policy: policy
      });
      setIsCalculating(false);
    }, 500);
  };

  const handleCommit = async () => {
    if (!selectedOrder || !calculationResult) return;
    setIsSubmitting(true);
    try {
      const tripDate = new Date(selectedOrder.trip_date);
      let d = new Date();
      const policy = calculationResult.policy;
      
      // Simulate cancellation date based on selected policy
      if (policy.max_hours === null) {
          d.setTime(tripDate.getTime() - ((policy.min_hours + 24) * 3600000));
      } else if (policy.min_hours === 0) {
          d.setTime(tripDate.getTime() - ((policy.max_hours / 2) * 3600000));
      } else {
          d.setTime(tripDate.getTime() - (((policy.min_hours + policy.max_hours) / 2) * 3600000));
      }

      const result = await refundService.processCancellation({
        booking_id: selectedOrder.booking_id,
        cancellation_date: d.toISOString()
      });

      if (result.success) {
        addToast(`Successfully cancelled booking #${selectedOrder.booking_id}`, 'success');
        setCalculationResult(null);
        setSelectedOrder(null);
        setSelectedOrderId('');
        const updated = await refundService.getOrders();
        setOrders(updated.filter(o => o.status !== 'Cancelled'));
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to process cancellation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500 dark:text-slate-400">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Process Cancellation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Calculate refunds based on company policy.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <form onSubmit={handleCalculate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Booking</label>
              <select
                required
                value={selectedOrderId}
                onChange={handleOrderChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-800 dark:text-white transition-colors"
              >
                <option value="">Select a booking...</option>
                {orders.map(o => (
                  <option key={o.booking_id} value={o.booking_id}>#{o.booking_id} - {o.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Package Value</label>
              <input
                type="text"
                readOnly
                value={selectedOrder ? `₹${selectedOrder.total_amount.toLocaleString('en-IN')}` : ''}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-md shadow-sm sm:text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed transition-colors"
                placeholder="₹0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notice Period</label>
            <div className="space-y-3">
              {policies.map((policy) => {
                let tier;
                if (policy.max_hours === null) tier = `More than ${policy.min_hours/24} days prior`;
                else if (policy.min_hours === 0) tier = `Less than ${policy.max_hours} hours prior`;
                else tier = `Between ${policy.min_hours/24} to ${policy.max_hours/24} days prior`;

                return (
                <label key={policy.policy_id} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${selectedPolicyId === policy.policy_id ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <input type="radio" name="noticePeriod" value={policy.policy_id} checked={selectedPolicyId === policy.policy_id} onChange={(e) => { setSelectedPolicyId(parseInt(e.target.value)); setCalculationResult(null); }} className="h-4 w-4 text-blue-600 border-gray-300 dark:border-slate-600 focus:ring-blue-500" />
                  <span className="ml-3 block text-sm font-medium text-slate-900 dark:text-slate-200">{tier}</span>
                </label>
              )})}
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedOrder || isCalculating}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Refund'}
          </button>
        </form>
      </div>

      {calculationResult && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 animate-slide-up">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Calculation Summary</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Refund Amount ({calculationResult.refundPercentage}%)</dt>
              <dd className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">₹{calculationResult.refundAmount.toLocaleString('en-IN')}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Retention Fee</dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">₹{calculationResult.retentionFee.toLocaleString('en-IN')}</dd>
            </div>
          </dl>
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleCommit}
              disabled={isSubmitting}
              className="flex justify-center py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Committing...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. AUDIT LOGS (WITH SEARCH, FILTER, PAGINATION)
// ----------------------------------------------------------------------
function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const addToast = useToast();

  const fetchLogs = () => {
    setLoading(true);
    refundService.getAuditLogs().then(setAuditLogs).finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, []);

  const handleStatusChange = async (logId, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Processed' : 'Pending';
    try {
      await refundService.updateAuditLogStatus(logId, newStatus);
      addToast(`Status updated to ${newStatus}`, 'success');
      fetchLogs();
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const searchString = search.toLowerCase();
    const customerName = log.order?.customer_name?.toLowerCase() || '';
    const bookingIdStr = log.booking_id.toString();
    const matchesSearch = bookingIdStr.includes(searchString) || customerName.includes(searchString);
    const matchesStatus = statusFilter === 'All' || log.refund_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Transaction history of processed refunds.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search ID or Name..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-40 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processed">Processed</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Log ID</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booking ID</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Refund</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Fee</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">Loading...</td></tr>
              ) : paginatedLogs.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No logs found matching your criteria.</td></tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">#{log.log_id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                      #{log.booking_id}
                      {log.order && <span className="block text-xs font-normal text-slate-500">{log.order.customer_name}</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(log.cancellation_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium text-right">₹{log.refund_amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-slate-900 dark:text-slate-200 text-right">₹{log.retention_fee.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleStatusChange(log.log_id, log.refund_status)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:shadow-sm ${log.refund_status === 'Processed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'}`}
                      >
                        {log.refund_status || 'Pending'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center space-x-4">
                      <Link to={`/audit-logs/${log.log_id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="View Details">
                        <Eye className="w-4 h-4 inline" />
                      </Link>
                      <Link to={`/edit-cancellation/${log.log_id}`} className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" title="Edit Log">
                        <Edit className="w-4 h-4 inline" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-medium">{filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-medium">{filteredLogs.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded text-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded text-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6A. AUDIT LOG DETAILS VIEW
// ----------------------------------------------------------------------
function AuditLogDetailsPage() {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refundService.getAuditLogDetails(id)
      .then(setDetails)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center p-8 text-slate-500">Loading details...</div>;
  if (!details) return <div className="text-center p-8 text-slate-500">Log not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/audit-logs" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Cancellation Details</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Log #{details.log_id} &bull; Booking #{details.booking_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" /> Original Booking
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Customer Name</dt>
              <dd className="mt-1 text-base text-slate-900 dark:text-slate-200">{details.order?.customer_name || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Destination</dt>
              <dd className="mt-1 text-base text-slate-900 dark:text-slate-200">{details.order?.destination || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Trip Date</dt>
              <dd className="mt-1 text-base text-slate-900 dark:text-slate-200">{details.order ? new Date(details.order.trip_date).toLocaleDateString() : 'N/A'}</dd>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Amount</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">₹{details.order?.total_amount.toLocaleString('en-IN') || '0'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-red-500" /> Refund Processed
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Cancellation Date</dt>
              <dd className="mt-1 text-base text-slate-900 dark:text-slate-200">{new Date(details.cancellation_date).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Policy Applied</dt>
              <dd className="mt-1 text-base text-slate-900 dark:text-slate-200">{details.policy_applied}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${details.refund_status === 'Processed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200'}`}>
                  {details.refund_status || 'Pending'}
                </span>
              </dd>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Refund Amount</dt>
                <dd className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">₹{details.refund_amount.toLocaleString('en-IN')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Retention Fee</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">₹{details.retention_fee.toLocaleString('en-IN')}</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6B. EDIT CANCELLATION FORM
// ----------------------------------------------------------------------
function EditCancellationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [formData, setFormData] = useState({
    refund_amount: 0,
    retention_fee: 0,
    policy_applied: ''
  });

  useEffect(() => {
    refundService.getAuditLogDetails(id).then(data => {
      setFormData({
        refund_amount: data.refund_amount,
        retention_fee: data.retention_fee,
        policy_applied: data.policy_applied
      });
      // Capture total amount to keep refund + retention balanced
      if (data.order && data.order.total_amount !== undefined) {
        setTotalAmount(data.order.total_amount);
      } else {
        setTotalAmount(data.refund_amount + data.retention_fee);
      }
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  const handleRefundChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    const newRefund = val === '' ? 0 : val;
    setFormData({
      ...formData,
      refund_amount: val,
      retention_fee: Math.max(0, totalAmount - newRefund)
    });
  };

  const handleRetentionChange = (e) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    const newRetention = val === '' ? 0 : val;
    setFormData({
      ...formData,
      retention_fee: val,
      refund_amount: Math.max(0, totalAmount - newRetention)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await refundService.updateAuditLog(id, {
        refund_amount: Number(formData.refund_amount),
        retention_fee: Number(formData.retention_fee),
        policy_applied: formData.policy_applied
      });
      addToast('Cancellation record updated successfully', 'success');
      navigate('/audit-logs');
    } catch {
      addToast('Failed to update record', 'error');
    }
  };

  if (loading) return <div className="text-center p-8 text-slate-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/audit-logs" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Edit Cancellation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update manual refund amounts for Log #{id}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Total Booking Amount: ₹{totalAmount.toLocaleString('en-IN')}</strong><br/>
            Altering the refund amount will automatically adjust the retention fee, and vice versa.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Policy Applied</label>
            <input 
              type="text" 
              required
              value={formData.policy_applied} 
              onChange={e => setFormData({...formData, policy_applied: e.target.value})} 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Refund Amount (₹)</label>
              <input 
                type="number" 
                required
                min="0"
                value={formData.refund_amount} 
                onChange={handleRefundChange} 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Retention Fee (₹)</label>
              <input 
                type="number" 
                required
                min="0"
                value={formData.retention_fee} 
                onChange={handleRetentionChange} 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors" 
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Link to="/audit-logs" className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</Link>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6C. REPORTS & ANALYTICS DASHBOARD
// ----------------------------------------------------------------------
function ReportsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refundService.getAuditLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['Log ID', 'Booking ID', 'Date', 'Refund Amount', 'Retention Fee', 'Status', 'Policy Applied'];
    const csvContent = [
      headers.join(','),
      ...logs.map(l => [
        l.log_id, 
        l.booking_id, 
        new Date(l.cancellation_date).toLocaleDateString(), 
        l.refund_amount, 
        l.retention_fee, 
        l.refund_status || 'Pending',
        `"${l.policy_applied}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cancellations_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="text-center p-8 text-slate-500">Loading...</div>;

  const policyData = logs.reduce((acc, log) => {
    let policy = log.policy_applied || 'Unknown';
    if (policy.includes('Tier 1') || policy.includes('> 7 days') || policy.includes('More than 7 days')) policy = '> 7 Days (90% Refund)';
    else if (policy.includes('Tier 2') || policy.includes('2 to 7 days') || policy.includes('Between 2 to 7 days')) policy = '2-7 Days (50% Refund)';
    else if (policy.includes('Tier 3') || policy.includes('< 48 hours') || policy.includes('Less than 48 hours')) policy = '< 48 Hours (10% Refund)';
    else if (policy.includes('Trip has already started')) policy = 'Invalid/Started (0%)';
    
    const existing = acc.find(x => x.name === policy);
    if (existing) existing.value += 1;
    else acc.push({ name: policy, value: 1 });
    return acc;
  }, []);

  // Aggregate logs by date for faster rendering and better analytics
  const barData = Object.values(logs.reduce((acc, log) => {
    const date = new Date(log.cancellation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fullDate = new Date(log.cancellation_date);
    // Use date string as key to group
    if (!acc[date]) {
      acc[date] = { date, timestamp: fullDate.getTime(), refund_amount: 0, retention_fee: 0 };
    }
    acc[date].refund_amount += log.refund_amount;
    acc[date].retention_fee += log.retention_fee;
    return acc;
  }, {})).sort((a, b) => a.timestamp - b.timestamp);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Insights into cancellation trends and volumes.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Cancellation Policies Breakdown</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={policyData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label isAnimationActive={false}>
                  {policyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Daily Refund Volumes</h3>
          <div className="h-80 w-full overflow-x-auto overflow-y-hidden">
            <div style={{ minWidth: '600px', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(value) => `₹${value/1000}k`} />
                  <RechartsTooltip cursor={{fill: '#334155', opacity: 0.1}} contentStyle={{borderRadius: '8px', backgroundColor: '#1e293b', border: 'none', color: '#fff'}} />
                  <Bar dataKey="refund_amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Refund (₹)" isAnimationActive={false} />
                  <Bar dataKey="retention_fee" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Fee (₹)" isAnimationActive={false} />
                  <Legend verticalAlign="bottom" align="center" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ----------------------------------------------------------------------
// 7. PROFILE SETTINGS
// ----------------------------------------------------------------------
function ProfileSettingsPage() {
  const { user, updateUser } = useUser();
  const addToast = useToast();
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUser({ avatar: reader.result });
        addToast('Profile picture updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    addToast('Profile updated successfully');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Profile Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account details.</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-6 mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md overflow-hidden flex items-center justify-center text-3xl font-semibold text-slate-600 dark:text-slate-400">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full text-white cursor-pointer shadow-sm hover:bg-blue-700 transition-colors">
                <div className="w-4 h-4 flex items-center justify-center text-lg">+</div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            {user.avatar && (
              <button type="button" onClick={() => { updateUser({ avatar: null }); addToast('Profile picture removed'); }} className="text-red-500 hover:text-red-600 text-xs font-medium">Remove Picture</button>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{user.firstName} {user.lastName}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Administrator</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
              <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
              <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none" required />
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 8. NOTIFICATIONS PAGE
// ----------------------------------------------------------------------
function NotificationsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refundService.getAuditLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All recent system alerts and updates.</p>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">No notifications.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map(log => (
              <div key={log.log_id} className="p-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Booking #{log.booking_id} Cancelled</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">A refund of ₹{log.refund_amount.toLocaleString('en-IN')} was processed.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{new Date(log.cancellation_date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/dashboard" element={<AuthGuard><Layout><DashboardPage /></Layout></AuthGuard>} />
              <Route path="/cancellation-entry" element={<AuthGuard><Layout><CancellationEntryPage /></Layout></AuthGuard>} />
              <Route path="/audit-logs" element={<AuthGuard><Layout><AuditLogsPage /></Layout></AuthGuard>} />
              <Route path="/audit-logs/:id" element={<AuthGuard><Layout><AuditLogDetailsPage /></Layout></AuthGuard>} />
              <Route path="/edit-cancellation/:id" element={<AuthGuard><Layout><EditCancellationPage /></Layout></AuthGuard>} />
              <Route path="/reports" element={<AuthGuard><Layout><ReportsPage /></Layout></AuthGuard>} />
              <Route path="/profile" element={<AuthGuard><Layout><ProfileSettingsPage /></Layout></AuthGuard>} />
              <Route path="/notifications" element={<AuthGuard><Layout><NotificationsPage /></Layout></AuthGuard>} />
              <Route path="/users" element={<AuthGuard><Layout><UserManagementPage /></Layout></AuthGuard>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ToastProvider>
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
