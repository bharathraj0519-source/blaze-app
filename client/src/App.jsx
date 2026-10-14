import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  Download,
  Trash2,
  Bell,
  User,
  Shield,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Check,
  Star,
  LogOut,
  ExternalLink,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  FileQuestion,
  Users,
  Activity,
  Award,
  Sparkles,
  MessageSquare
} from 'lucide-react';

const API_BASE = '/api';

// Pre-seeded users for quick reference & demo login
const PRECONFIGURED_USERS = [
  { username: 'badri', name: 'Badri', title: 'Team Lead', role: 'team_lead', color: 'bg-blue-600', passwordHint: 'badri@blazebyte' },
  { username: 'bharath', name: 'Bharath', title: 'SEO and Team Management', role: 'management', color: 'bg-purple-600', passwordHint: 'bharath@blazebyte' },
  { username: 'saras', name: 'Saras', title: 'Media Management', role: 'member', color: 'bg-pink-600', passwordHint: 'saras@blazebyte' },
  { username: 'prabha', name: 'Prabha', title: 'Lead Generation and Customer Handling', role: 'member', color: 'bg-amber-600', passwordHint: 'prabha@blazebyte' },
  { username: 'praneeth', name: 'Praneeth', title: 'Lead Generation and Customer Support', role: 'member', color: 'bg-emerald-600', passwordHint: 'praneeth@blazebyte' },
  { username: 'jerson', name: 'Jerson', title: 'Lead Generation and Customer Handling', role: 'member', color: 'bg-cyan-600', passwordHint: 'jerson@blazebyte' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('blazebyte_token') || '');
  const [loading, setLoading] = useState(true);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('daily_log'); // 'daily_log' | 'monitor' | 'resources' | 'activity' | 'stats'

  // Selected date for day-wise view (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Tasks & Resources state
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);
  const [notifications, setNotifications] = useState({ pending_count: 0, logged_today: false, reminders: [], history: [] });

  // Notifications drawer open/close
  const [showNotifications, setShowNotifications] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // New Task Modal / Form state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'Medium',
    status: 'Pending',
    hours_spent: 2,
    completion_notes: '',
    self_rating: 4,
    date: new Date().toISOString().split('T')[0]
  });

  // Assessment Modal state (For Team Lead / Manager)
  const [assessingTask, setAssessingTask] = useState(null);
  const [leadAssessmentForm, setLeadAssessmentForm] = useState({
    lead_assessment: '',
    lead_rating: 'Meets Expectations'
  });

  // Upload Resource Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Filter state for Team Monitor
  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Authentication check on load
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Periodic poll & data fetch
  useEffect(() => {
    if (currentUser) {
      loadInitialData();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, selectedDate]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    fetchTasks();
    fetchResources();
    fetchStats();
    fetchNotifications();
    fetchUsers();
    fetchLoginLogs();
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await fetch(`${API_BASE}/resources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);

        // Check if browser notifications should be triggered for pending reminders
        if (Notification.permission === 'granted' && data.pending_count > 0 && !data.logged_today) {
          // Trigger subtle desktop notification once if due
          triggerBrowserReminder(data.pending_count);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLoginLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Browser Notification helper
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      new Notification('Blazebyte Work Tracker', {
        body: 'Reminder notifications enabled! You will be reminded of pending work and daily updates.',
        icon: '/favicon.ico'
      });
    } else {
      setBrowserNotificationsEnabled(false);
    }
  };

  const triggerBrowserReminder = (pendingCount) => {
    if (Notification.permission === 'granted') {
      new Notification('Blazebyte Reminder ⏰', {
        body: `You have ${pendingCount} pending task(s) and today's daily log is pending. Please update your work!`,
        tag: 'blazebyte-daily-reminder'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('blazebyte_token');
    setToken('');
    setCurrentUser(null);
  };

  // Handle Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTaskForm)
      });
      if (res.ok) {
        setShowTaskModal(false);
        setNewTaskForm({
          title: '',
          description: '',
          category: 'General',
          priority: 'Medium',
          status: 'Pending',
          hours_spent: 2,
          completion_notes: '',
          self_rating: 4,
          date: selectedDate
        });
        fetchTasks();
        fetchStats();
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Status Toggle (e.g. from Pending -> Completed)
  const handleToggleTaskStatus = async (task, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          completion_notes: newStatus === 'Completed' ? (task.completion_notes || 'Completed on schedule') : task.completion_notes
        })
      });
      if (res.ok) {
        fetchTasks();
        fetchStats();
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Lead Assessment
  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!assessingTask) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${assessingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_assessment: leadAssessmentForm.lead_assessment,
          lead_rating: leadAssessmentForm.lead_rating
        })
      });
      if (res.ok) {
        setAssessingTask(null);
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadTaskId) formData.append('task_id', uploadTaskId);
    if (uploadNotes) formData.append('notes', uploadNotes);

    setUploadLoading(true);
    try {
      const res = await fetch(`${API_BASE}/resources/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTaskId('');
        setUploadNotes('');
        fetchResources();
        fetchTasks();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error occurred');
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete File
  const handleDeleteResource = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource file?')) return;
    try {
      const res = await fetch(`${API_BASE}/resources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchResources();
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this work entry?')) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Role permissions
  const isLeadOrManager = currentUser && ['team_lead', 'management'].includes(currentUser.role);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesMember = filterMember === 'all' || String(task.user_id) === String(filterMember);
      return matchesSearch && matchesStatus && matchesMember;
    });
  }, [tasks, searchQuery, filterStatus, filterMember]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium text-slate-300">Loading Blazebyte Portal...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Render Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(token, user) => {
          localStorage.setItem('blazebyte_token', token);
          setToken(token);
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Company Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                    BLAZEBYTE
                  </span>
                  <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                    Tracker & Assessment
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">Employee Daily Work Monitoring Portal</p>
              </div>
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition relative border border-slate-700/60"
                  title="Notifications & Reminders"
                >
                  <Bell className="w-5 h-5" />
                  {((notifications.reminders?.length || 0) + (notifications.pending_count > 0 ? 1 : 0)) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-black text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {(notifications.reminders?.length || 0) + (notifications.pending_count > 0 ? 1 : 0)}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-400" /> Reminders & Notifications
                      </span>
                      <button
                        onClick={requestNotificationPermission}
                        className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        {browserNotificationsEnabled ? '🔔 Desktop Active' : 'Enable Push'}
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 mt-3 pr-1">
                      {notifications.reminders?.map((rem, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                          <div className="flex items-center gap-2 font-semibold">
                            <Clock className="w-4 h-4 text-amber-400" />
                            {rem.title}
                          </div>
                          <p className="text-xs text-amber-300/90 mt-1">{rem.message}</p>
                        </div>
                      ))}

                      {notifications.history?.length > 0 ? (
                        notifications.history.map((hist) => (
                          <div key={hist.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                            <div className="text-xs font-medium text-blue-300">{hist.title}</div>
                            <div className="text-xs text-slate-300 mt-0.5">{hist.message}</div>
                            <div className="text-[10px] text-slate-500 mt-1">{new Date(hist.created_at).toLocaleString()}</div>
                          </div>
                        ))
                      ) : (
                        notifications.reminders?.length === 0 && (
                          <p className="text-xs text-slate-400 text-center py-4">No active reminders right now. All caught up!</p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Info */}
              <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow"
                  style={{ backgroundColor: currentUser.avatar_color || '#3b82f6' }}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
                    {currentUser.name}
                    {isLeadOrManager && (
                      <Shield className="w-3.5 h-3.5 text-blue-400" title="Management / Lead" />
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[160px]">{currentUser.title}</div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition ml-1"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Reminder Alerts Banner (If work not logged today or pending tasks) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
        {!notifications.logged_today && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-red-500/20 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">Daily Work Update Pending for Today</h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Hi {currentUser.name}, you have not submitted today's work assessment yet. Keep your daily progress recorded!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setShowTaskModal(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition"
            >
              + Log Today's Work
            </button>
          </div>
        )}

        {notifications.pending_count > 0 && notifications.logged_today && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span>You have <strong>{notifications.pending_count} pending task(s)</strong> awaiting completion.</span>
            </div>
            <button
              onClick={() => {
                setFilterStatus('Pending');
                setActiveTab('daily_log');
              }}
              className="text-blue-400 hover:text-blue-300 underline font-medium"
            >
              View Pending
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <TabButton
              active={activeTab === 'daily_log'}
              onClick={() => setActiveTab('daily_log')}
              icon={<Calendar className="w-4 h-4" />}
              label="Daily Work Log"
              badge={tasks.length > 0 ? tasks.length : null}
            />

            {isLeadOrManager && (
              <TabButton
                active={activeTab === 'monitor'}
                onClick={() => setActiveTab('monitor')}
                icon={<Users className="w-4 h-4" />}
                label="Team Monitoring & Assessment"
                badge="Lead Access"
                badgeColor="bg-blue-500/20 text-blue-400"
              />
            )}

            <TabButton
              active={activeTab === 'resources'}
              onClick={() => setActiveTab('resources')}
              icon={<FileText className="w-4 h-4" />}
              label="Resource Vault & Files"
              badge={resources.length > 0 ? resources.length : null}
            />

            <TabButton
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<TrendingUp className="w-4 h-4" />}
              label="Assessment & Analytics"
            />

            <TabButton
              active={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
              icon={<Activity className="w-4 h-4" />}
              label="Login Details & Activity"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload File
            </button>

            <button
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              + Update Work Log
            </button>
          </div>
        </div>

        {/* TAB 1: DAILY WORK LOG */}
        {activeTab === 'daily_log' && (
          <div className="space-y-6">
            {/* Top Bar: Date Picker & Quick Summary */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block font-medium">Select Work Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 mt-0.5"
                  />
                </div>
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20 self-end mb-1"
                >
                  Today
                </button>
              </div>

              {/* Day stats */}
              <div className="flex items-center gap-4 text-xs">
                <div className="px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-700/60 text-slate-300">
                  Date: <span className="font-semibold text-white">{selectedDate}</span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  Completed: <span className="font-bold">{tasks.filter(t => t.status === 'Completed').length}</span>
                </div>
                <div className="px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
                  Pending: <span className="font-bold">{tasks.filter(t => t.status === 'Pending').length}</span>
                </div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search daily tasks or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                {isLeadOrManager && (
                  <select
                    value={filterMember}
                    onChange={(e) => setFilterMember(e.target.value)}
                    className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Team Members</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl p-12 text-center">
                <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No work logged for {selectedDate}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Keep your work on track by logging completed and pending assignments.
                </p>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  + Add Work Log
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    isLeadOrManager={isLeadOrManager}
                    onToggleStatus={handleToggleTaskStatus}
                    onDelete={handleDeleteTask}
                    onAssess={(t) => {
                      setAssessingTask(t);
                      setLeadAssessmentForm({
                        lead_assessment: t.lead_assessment || '',
                        lead_rating: t.lead_rating || 'Meets Expectations'
                      });
                    }}
                    onAttachFile={(t) => {
                      setUploadTaskId(String(t.id));
                      setShowUploadModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM MONITORING & ASSESSMENT (Team Lead Badri & Manager Bharath) */}
        {activeTab === 'monitor' && isLeadOrManager && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border border-blue-500/30 rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-400" /> Blazebyte Team Performance & Work Assessment
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Supervise daily task submissions, assess work completion rates, and provide team feedback.
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 font-medium">
                  {dashboardStats?.company?.completed_tasks || 0} / {dashboardStats?.company?.total_tasks || 0} Completed ({dashboardStats?.company?.completion_rate || 0}%)
                </div>
              </div>
            </div>

            {/* 6 Employee Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardStats?.member_stats?.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base shadow"
                          style={{ backgroundColor: m.avatar_color || '#3b82f6' }}
                        >
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {m.name}
                            {m.role === 'team_lead' && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded font-semibold border border-blue-500/30">
                                Lead
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-1">{m.title}</div>
                        </div>
                      </div>

                      {/* Today Logged Badge */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          m.today_tasks_count > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {m.today_tasks_count > 0 ? '✓ Logged Today' : '⚠️ Pending Log'}
                      </span>
                    </div>

                    {/* Work stats */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-700/50 my-3 text-center">
                      <div className="bg-slate-900/60 p-2 rounded-xl">
                        <div className="text-[10px] text-slate-400">Total</div>
                        <div className="text-sm font-bold text-white">{m.total_tasks || 0}</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-xl">
                        <div className="text-[10px] text-emerald-400">Completed</div>
                        <div className="text-sm font-bold text-emerald-400">{m.completed_tasks || 0}</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-xl">
                        <div className="text-[10px] text-amber-400">Pending</div>
                        <div className="text-sm font-bold text-amber-400">{m.pending_tasks || 0}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 mb-4">
                      <div className="flex justify-between">
                        <span>Total Hours Logged:</span>
                        <span className="text-slate-200 font-semibold">{m.total_hours || 0} hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Self Rating:</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          ★ {m.avg_self_rating || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Login:</span>
                        <span className="text-slate-300 font-mono text-[11px]">
                          {m.last_login ? new Date(m.last_login).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFilterMember(String(m.id));
                      setActiveTab('daily_log');
                    }}
                    className="w-full py-2 bg-slate-700/60 hover:bg-blue-600/20 hover:text-blue-300 text-slate-300 text-xs font-semibold rounded-xl border border-slate-600/50 transition flex items-center justify-center gap-1"
                  >
                    Inspect Work & Assess <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RESOURCE VAULT & FILE UPLOADS (docx, pdf, word, excel) */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Company Resource & Document Vault
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Secure file sharing for DOCX, Word, PDF, and Excel spreadsheets.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> + Upload Document
              </button>
            </div>

            {/* Resources Grid */}
            {resources.length === 0 ? (
              <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-3xl p-12 text-center">
                <FileQuestion className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No resources uploaded yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Upload project files, sheets, reports, and documentation for the Blazebyte team.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition border border-cyan-500/20"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 rounded-2xl p-4 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <FileIconBadge type={res.file_type} />
                          <div>
                            <h4 className="text-xs font-bold text-white line-clamp-1" title={res.original_name}>
                              {res.original_name}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {(res.size / 1024).toFixed(1)} KB • {res.file_type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {(res.user_id === currentUser.id || isLeadOrManager) && (
                          <button
                            onClick={() => handleDeleteResource(res.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {res.notes && (
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-xl mt-3 border border-slate-800">
                          {res.notes}
                        </p>
                      )}

                      <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                        <div>Uploaded by: <span className="text-slate-200 font-medium">{res.uploaded_by}</span></div>
                        {res.task_title && (
                          <div>Attached to: <span className="text-blue-400 font-medium">{res.task_title}</span></div>
                        )}
                        <div>Date: <span className="text-slate-300">{new Date(res.uploaded_at).toLocaleString()}</span></div>
                      </div>
                    </div>

                    <a
                      href={`${API_BASE}/resources/download/${res.id}`}
                      download
                      className="mt-4 w-full py-2 bg-slate-700/60 hover:bg-cyan-600/20 hover:text-cyan-300 text-slate-300 text-xs font-semibold rounded-xl border border-slate-600/50 transition flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download File
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ASSESSMENT & ANALYTICS */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Tasks"
                value={dashboardStats?.company?.total_tasks || 0}
                icon={<Briefcase className="w-5 h-5 text-blue-400" />}
                badge="All time"
              />
              <StatCard
                title="Work Completed"
                value={dashboardStats?.company?.completed_tasks || 0}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                badge={`${dashboardStats?.company?.completion_rate || 0}% rate`}
                color="text-emerald-400"
              />
              <StatCard
                title="Pending Tasks"
                value={dashboardStats?.company?.pending_tasks || 0}
                icon={<Clock className="w-5 h-5 text-amber-400" />}
                badge="Needs Attention"
                color="text-amber-400"
              />
              <StatCard
                title="Your Logged Hours"
                value={`${dashboardStats?.user_stats?.total_hours || 0} hrs`}
                icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                badge="Productivity"
              />
            </div>

            {/* Assessment Breakdown */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Blazebyte Daily Work Assessment Leaderboard
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role & Specialization</th>
                      <th className="py-3 px-4">Tasks Done</th>
                      <th className="py-3 px-4">Pending</th>
                      <th className="py-3 px-4">Total Hours</th>
                      <th className="py-3 px-4">Avg Self Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {dashboardStats?.member_stats?.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-semibold flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: m.avatar_color || '#3b82f6' }}
                          >
                            {m.name.charAt(0)}
                          </span>
                          {m.name}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{m.title}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">{m.completed_tasks || 0}</td>
                        <td className="py-3 px-4 font-bold text-amber-400">{m.pending_tasks || 0}</td>
                        <td className="py-3 px-4">{m.total_hours || 0} hrs</td>
                        <td className="py-3 px-4 text-amber-400 font-semibold">★ {m.avg_self_rating || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LOGIN DETAILS & AUDIT LOGS ("their login details should be seen") */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Employee Login & Access Audit
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time visibility of company employee authentication, IP addresses, and timestamps.
                </p>
              </div>
              <button
                onClick={fetchLoginLogs}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700"
              >
                Refresh Logs
              </button>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Login Timestamp</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-semibold text-white capitalize">{log.username}</td>
                        <td className="py-3 px-4 text-slate-400">{log.title || 'Team Member'}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{log.ip_address}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE WORK LOG MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" /> Log Daily Work Update
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Work Date</label>
                <input
                  type="date"
                  value={newTaskForm.date}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Title / Assignment *</label>
                <input
                  type="text"
                  placeholder="e.g. Conducted client pitch & updated CRM leads"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Work Department / Category</label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Customer Handling">Customer Handling</option>
                    <option value="SEO & Optimization">SEO & Optimization</option>
                    <option value="Media Management">Media Management</option>
                    <option value="Team Management">Team Management</option>
                    <option value="Operations">Operations</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Current Status</label>
                  <select
                    value={newTaskForm.status}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={newTaskForm.hours_spent}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, hours_spent: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Self-Assessment Score (1-5 ★)</label>
                  <select
                    value={newTaskForm.self_rating}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, self_rating: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="5">★★★★★ 5 - Exceptional / Exceeded</option>
                    <option value="4">★★★★☆ 4 - Met all goals thoroughly</option>
                    <option value="3">★★★☆☆ 3 - Good progress made</option>
                    <option value="2">★★☆☆☆ 2 - Partially completed</option>
                    <option value="1">★☆☆☆☆ 1 - Blocked / Incomplete</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Work Description & Key Accomplishments</label>
                <textarea
                  rows="3"
                  placeholder="Outline what was accomplished, resources used, or roadblocks..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-500/25"
                >
                  Save Work Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM LEAD / MANAGER ASSESSMENT MODAL */}
      {assessingTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" /> Team Lead Work Assessment
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Reviewing work for: <strong className="text-white">{assessingTask.employee_name || assessingTask.username}</strong>
            </p>

            <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700 mb-4 text-xs">
              <div className="font-semibold text-white">{assessingTask.title}</div>
              <div className="text-slate-400 mt-1">{assessingTask.description || 'No description provided'}</div>
              <div className="text-slate-400 mt-2 flex items-center justify-between">
                <span>Self Rating: <strong className="text-amber-400">★ {assessingTask.self_rating}/5</strong></span>
                <span>Status: <strong className="text-slate-200">{assessingTask.status}</strong></span>
              </div>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Lead Assessment Rating</label>
                <select
                  value={leadAssessmentForm.lead_rating}
                  onChange={(e) => setLeadAssessmentForm({ ...leadAssessmentForm, lead_rating: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Exceeds Expectations">🌟 Exceeds Expectations</option>
                  <option value="Meets Expectations">✅ Meets Expectations</option>
                  <option value="Needs Followup">⚠️ Needs Followup</option>
                  <option value="Pending Revisions">🔄 Pending Revisions</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assessment Notes & Feedback</label>
                <textarea
                  rows="3"
                  placeholder="Provide constructive feedback, approval comments, or directions..."
                  value={leadAssessmentForm.lead_assessment}
                  onChange={(e) => setLeadAssessmentForm({ ...leadAssessmentForm, lead_assessment: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssessingTask(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow"
                >
                  Submit Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD FILE MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" /> Upload Resource File
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Accepted formats: DOCX, Word (.doc), PDF, Excel (.xls, .xlsx).
            </p>

            <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select File *</label>
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.xls,.xlsx,.csv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Link to Task (Optional)</label>
                <select
                  value={uploadTaskId}
                  onChange={(e) => setUploadTaskId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- General Resource (No Task Link) --</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / File Description</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Client Lead Master Sheet"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= SUB-COMPONENTS =================

// Navigation Tab Button
function TabButton({ active, onClick, icon, label, badge, badgeColor = 'bg-slate-700 text-slate-300' }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
        active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
          : 'bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// Task Card
function TaskCard({ task, currentUser, isLeadOrManager, onToggleStatus, onDelete, onAssess, onAttachFile }) {
  const isCompleted = task.status === 'Completed';
  const isPending = task.status === 'Pending';
  const isOwner = task.user_id === currentUser.id;

  return (
    <div
      className={`rounded-2xl p-5 border transition flex flex-col justify-between ${
        isCompleted
          ? 'bg-slate-800/30 border-emerald-500/30'
          : isPending
          ? 'bg-slate-800/50 border-amber-500/30'
          : 'bg-slate-800/40 border-blue-500/30'
      }`}
    >
      <div>
        {/* Header: Title & Badges */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isPending
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {task.status}
              </span>
              <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                {task.category}
              </span>
            </div>
            <h4 className={`text-sm font-bold text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h4>
          </div>

          {(isOwner || isLeadOrManager) && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-slate-500 hover:text-red-400 transition p-1"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-slate-300 mt-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
            {task.description}
          </p>
        )}

        {/* Self Assessment Rating & Hours */}
        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">★ {task.self_rating || 3}/5</span>
            <span className="text-[11px] text-slate-500">Self Rating</span>
          </div>
          <div>
            <span className="text-slate-300 font-semibold">{task.hours_spent} hrs</span> logged
          </div>
        </div>

        {/* Lead Assessment Feedback (If exists) */}
        {task.lead_assessment && (
          <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
            <div className="flex items-center justify-between text-blue-300 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> Assessment by {task.assessed_by || 'Lead'}
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                {task.lead_rating || 'Reviewed'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">{task.lead_assessment}</p>
          </div>
        )}

        {/* Attachments list */}
        {task.resources?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Attached Files:</span>
            {task.resources.map(file => (
              <a
                key={file.id}
                href={`${API_BASE}/resources/download/${file.id}`}
                download
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-xs text-cyan-300 transition"
              >
                <span className="truncate max-w-[200px] flex items-center gap-1.5">
                  <Download className="w-3 h-3" /> {file.original_name}
                </span>
                <span className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleStatus(task, isCompleted ? 'Pending' : 'Completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isCompleted
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            {isCompleted ? 'Mark Pending' : 'Mark Completed'}
          </button>

          <button
            onClick={() => onAttachFile(task)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition"
            title="Attach file (doc, pdf, excel)"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLeadOrManager && (
          <button
            onClick={() => onAssess(task)}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-semibold border border-blue-500/30 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-blue-400" /> Assess
          </button>
        )}
      </div>
    </div>
  );
}

// Stat Card
function StatCard({ title, value, icon, badge, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">{icon}</div>
      </div>
      <div>
        <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
        {badge && <span className="text-[10px] text-slate-400 mt-1 inline-block">{badge}</span>}
      </div>
    </div>
  );
}

// File icon helper
function FileIconBadge({ type }) {
  if (type === 'word') {
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
        DOC
      </div>
    );
  }
  if (type === 'pdf') {
    return (
      <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
        PDF
      </div>
    );
  }
  if (type === 'excel') {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
        XLS
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-slate-700/40 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-700">
      FILE
    </div>
  );
}

// ================= LOGIN PAGE =================
function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('badri');
  const [password, setPassword] = useState('badri@blazebyte');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to reach server. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (user) => {
    setUsername(user.username);
    setPassword(user.passwordHint);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 mb-3">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">BLAZEBYTE</h1>
          <p className="text-xs text-slate-400 mt-1">Employee Work Tracker & Assessment Portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. badri"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Tracker'}
          </button>
        </form>

        {/* 6 Employee Quick-Switch Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 mb-2.5 text-center uppercase tracking-wider">
            Quick 1-Click Login (6 Blazebyte Employees)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRECONFIGURED_USERS.map((user) => (
              <button
                key={user.username}
                type="button"
                onClick={() => handleSelectDemoUser(user)}
                className={`p-2 rounded-xl text-left border transition flex flex-col justify-center ${
                  username === user.username
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>{user.name}</span>
                  {username === user.username && <Check className="w-3 h-3 text-blue-400" />}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{user.title}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-mono text-center">
            Default passwords follow pattern: <span className="text-blue-400">&lt;username&gt;@blazebyte</span>
          </div>
        </div>
      </div>
    </div>
  );
}
