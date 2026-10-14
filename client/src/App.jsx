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
  Shield,
  TrendingUp,
  Calendar,
  Search,
  Check,
  LogOut,
  ChevronRight,
  FileQuestion,
  Users,
  Activity,
  Award,
  Sparkles,
  Database,
  Copy
} from 'lucide-react';

import {
  PRECONFIGURED_USERS,
  authenticateUser,
  getLoginLogs,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  uploadResourceFile,
  getResources,
  deleteResource,
  checkSupabaseConnection
} from './supabase';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('blazebyte_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('daily_log');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data states (Clean slate - 0 sample/demo tasks)
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [dbStatus, setDbStatus] = useState({ connected: true });
  const [copiedSql, setCopiedSql] = useState(false);

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'Lead Generation',
    priority: 'Medium',
    status: 'Pending',
    hours_spent: 2,
    completion_notes: '',
    self_rating: 4,
    date: new Date().toISOString().split('T')[0]
  });

  const [assessingTask, setAssessingTask] = useState(null);
  const [leadAssessmentForm, setLeadAssessmentForm] = useState({
    lead_assessment: '',
    lead_rating: 'Meets Expectations'
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTaskId, setUploadTaskId] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isLeadOrManager = currentUser && ['team_lead', 'management'].includes(currentUser.role);

  // Check Supabase connection on mount
  useEffect(() => {
    checkSupabaseConnection().then(status => {
      setDbStatus(status);
    });
  }, []);

  // Fetch data whenever user, date, or tab changes
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser, selectedDate]);

  const loadAllData = async () => {
    try {
      const taskList = await getTasks(selectedDate, currentUser.id, isLeadOrManager);
      setTasks(taskList || []);

      const resList = await getResources();
      setResources(resList || []);

      const logs = await getLoginLogs();
      setLoginLogs(logs || []);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('blazebyte_current_user');
    setCurrentUser(null);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await createTask({
        user_id: currentUser.id,
        username: currentUser.username,
        date: newTaskForm.date,
        title: newTaskForm.title.trim(),
        description: newTaskForm.description || '',
        category: newTaskForm.category,
        priority: newTaskForm.priority,
        status: newTaskForm.status,
        hours_spent: Number(newTaskForm.hours_spent) || 0,
        completion_notes: newTaskForm.completion_notes || '',
        self_rating: Number(newTaskForm.self_rating) || 3
      });

      setShowTaskModal(false);
      setNewTaskForm({
        title: '',
        description: '',
        category: 'Lead Generation',
        priority: 'Medium',
        status: 'Pending',
        hours_spent: 2,
        completion_notes: '',
        self_rating: 4,
        date: selectedDate
      });

      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error saving task');
    }
  };

  const handleToggleTaskStatus = async (task, newStatus) => {
    try {
      await updateTask(task.id, {
        status: newStatus,
        completion_notes: newStatus === 'Completed' ? (task.completion_notes || 'Completed on schedule') : task.completion_notes
      });
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!assessingTask) return;
    try {
      await updateTask(assessingTask.id, {
        lead_assessment: leadAssessmentForm.lead_assessment,
        lead_rating: leadAssessmentForm.lead_rating,
        assessed_by: currentUser.name,
        assessed_at: new Date().toISOString()
      });
      setAssessingTask(null);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploadLoading(true);
    try {
      await uploadResourceFile(uploadFile, uploadTaskId, uploadNotes, currentUser);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTaskId('');
      setUploadNotes('');
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Delete this resource file?')) return;
    try {
      await deleteResource(id);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this work log entry?')) return;
    try {
      await deleteTask(id);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      new Notification('Blazebyte Work Tracker', {
        body: 'Notifications enabled! You will be alerted for pending work and daily updates.',
        icon: '/favicon.svg'
      });
    }
  };

  // Dynamic reminders calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTasksList = tasks.filter(t => t.status === 'Pending');
  const loggedToday = tasks.some(t => t.date === todayStr && (t.user_id === currentUser?.id || t.username === currentUser?.username));

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesMember = filterMember === 'all' || String(task.user_id) === String(filterMember);
      return matchesSearch && matchesStatus && matchesMember;
    });
  }, [tasks, searchQuery, filterStatus, filterMember]);

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          localStorage.setItem('blazebyte_current_user', JSON.stringify(user));
          setCurrentUser(user);
        }}
      />
    );
  }

  const copySqlSchema = () => {
    const sql = `-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/lxpfglzteqevfaiyjxpw/sql/new
CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar_color TEXT,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  last_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.users (username, name, title, role, avatar_color, password_hash)
VALUES 
  ('badri', 'Badri', 'Team Lead', 'team_lead', '#3B82F6', 'badri@blazebyte'),
  ('bharath', 'Bharath', 'SEO and Team Management', 'management', '#8B5CF6', 'bharath@blazebyte'),
  ('saras', 'Saras', 'Media Management', 'member', '#EC4899', 'saras@blazebyte'),
  ('prabha', 'Prabha', 'Lead Generation and Customer Handling', 'member', '#F59E0B', 'prabha@blazebyte'),
  ('praneeth', 'Praneeth', 'Lead Generation and Customer Support', 'member', '#10B981', 'praneeth@blazebyte'),
  ('jerson', 'Jerson', 'Lead Generation and Customer Handling', 'member', '#06B6D4', 'jerson@blazebyte')
ON CONFLICT (username) DO UPDATE SET title = EXCLUDED.title;

CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Pending',
  hours_spent NUMERIC DEFAULT 0,
  completion_notes TEXT,
  self_rating INTEGER DEFAULT 3,
  lead_assessment TEXT,
  lead_rating TEXT,
  assessed_by TEXT,
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resources (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mimetype TEXT,
  size BIGINT,
  file_type TEXT,
  file_data TEXT,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.login_logs (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id BIGINT,
  username TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'SUCCESS'
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'reminder',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                    BLAZEBYTE
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                    Live Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">Work Tracker & Daily Assessment</p>
              </div>
            </div>

            {/* User profile & Notification bell */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition relative border border-slate-700/60"
                  title="Notifications & Reminders"
                >
                  <Bell className="w-5 h-5" />
                  {(!loggedToday || pendingTasksList.length > 0) && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {(loggedToday ? 0 : 1) + (pendingTasksList.length > 0 ? 1 : 0)}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-blue-400" /> Reminders
                      </span>
                      <button
                        onClick={requestNotificationPermission}
                        className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium"
                      >
                        {browserNotificationsEnabled ? '🔔 Desktop Active' : 'Enable Push'}
                      </button>
                    </div>

                    <div className="space-y-2 mt-3">
                      {!loggedToday && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                          <div className="font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" /> Daily Work Update Due
                          </div>
                          <div className="text-[11px] text-amber-300/80 mt-0.5">
                            You haven't logged your work for today yet.
                          </div>
                        </div>
                      )}

                      {pendingTasksList.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-blue-400" /> Pending Work Alert
                          </div>
                          <div className="text-[11px] text-blue-300/80 mt-0.5">
                            You have {pendingTasksList.length} task(s) awaiting completion.
                          </div>
                        </div>
                      )}

                      {loggedToday && pendingTasksList.length === 0 && (
                        <p className="text-center text-slate-400 py-3">No active pending reminders. Great job!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow"
                  style={{ backgroundColor: currentUser.color || '#3b82f6' }}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    {currentUser.name}
                    {isLeadOrManager && <Shield className="w-3 h-3 text-blue-400" />}
                  </div>
                  <div className="text-[11px] text-slate-400">{currentUser.title}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition ml-1"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Database Schema Setup Banner (Shown once if Supabase tables are pending) */}
      {dbStatus.reason === 'tables_missing' && (
        <div className="bg-indigo-950/80 border-b border-indigo-500/40 p-4">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-white text-sm">Supabase Cloud Database Setup (1 Click)</strong>
                <p className="text-indigo-200/80 mt-0.5">
                  To enable cross-device cloud sync on Vercel, copy the SQL schema script and run it once in your Supabase SQL Editor.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copySqlSchema}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <Copy className="w-3.5 h-3.5" /> {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}
              </button>
              <a
                href="https://supabase.com/dashboard/project/lxpfglzteqevfaiyjxpw/sql/new"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition"
              >
                Open SQL Editor ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
        {!loggedToday && (
          <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-200">Daily Work Update Pending for Today ({todayStr})</h4>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Hi {currentUser.name}, please record your daily tasks, hours, and work assessments!
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                setShowTaskModal(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
            >
              + Log Today's Work
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
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
              label="Login Details & Audit"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload Document
            </button>

            <button
              onClick={() => setShowTaskModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              + Update Work Log
            </button>
          </div>
        </div>

        {/* TAB 1: DAILY WORK LOG */}
        {activeTab === 'daily_log' && (
          <div className="space-y-5">
            {/* Date Picker Bar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block font-medium">Select Work Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 mt-0.5"
                  />
                </div>
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20 self-end mb-1"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 font-medium">
                  Completed: <strong>{tasks.filter(t => t.status === 'Completed').length}</strong>
                </div>
                <div className="px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400 font-medium">
                  Pending: <strong>{tasks.filter(t => t.status === 'Pending').length}</strong>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search work logs by title or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
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
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Team Members</option>
                    {PRECONFIGURED_USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Tasks Grid */}
            {filteredTasks.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center">
                <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-300">No work logged for {selectedDate}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Start logging your daily assignments, hours spent, and progress.
                </p>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  + Add Daily Work Log
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

        {/* TAB 2: TEAM MONITORING & ASSESSMENT */}
        {activeTab === 'monitor' && isLeadOrManager && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/30 rounded-3xl p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" /> Blazebyte Team Assessment & Daily Oversight
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Monitor work completion rates, review daily hours, and provide leadership feedback.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRECONFIGURED_USERS.map((user) => {
                const userTasks = tasks.filter(t => t.user_id === user.id || t.username === user.username);
                const completedCount = userTasks.filter(t => t.status === 'Completed').length;
                const pendingCount = userTasks.filter(t => t.status === 'Pending').length;
                const totalHours = userTasks.reduce((acc, t) => acc + (Number(t.hours_spent) || 0), 0);
                const isLogged = userTasks.some(t => t.date === todayStr);

                return (
                  <div key={user.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{user.name}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">{user.title}</div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isLogged
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isLogged ? '✓ Logged Today' : '⚠️ Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800 text-center my-3 text-xs">
                        <div className="bg-slate-950/60 p-2 rounded-xl">
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <strong className="text-white">{userTasks.length}</strong>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl">
                          <span className="text-[10px] text-emerald-400 block">Done</span>
                          <strong className="text-emerald-400">{completedCount}</strong>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl">
                          <span className="text-[10px] text-amber-400 block">Pending</span>
                          <strong className="text-amber-400">{pendingCount}</strong>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>Total Hours Logged:</span>
                          <strong className="text-white">{totalHours.toFixed(1)} hrs</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFilterMember(String(user.id));
                        setActiveTab('daily_log');
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1"
                    >
                      Inspect Daily Work <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: RESOURCE VAULT & FILES (docx, pdf, word, excel) */}
        {activeTab === 'resources' && (
          <div className="space-y-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" /> Company Document Vault
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Direct cloud storage for DOCX, Word, PDF, and Excel spreadsheets.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Upload className="w-3.5 h-3.5" /> + Upload Document
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center">
                <FileQuestion className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-300">No resources uploaded yet</h3>
                <p className="text-xs text-slate-500 mt-1">Upload client reports, excel sheets, or project briefs.</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-xl transition border border-cyan-500/20"
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" /> Upload First File
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((res) => (
                  <div key={res.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] border border-cyan-500/30">
                            {res.file_type ? res.file_type.toUpperCase() : 'DOC'}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white line-clamp-1" title={res.original_name}>
                              {res.original_name}
                            </h4>
                            <span className="text-[10px] text-slate-500">{(res.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>

                        {(res.user_id === currentUser.id || isLeadOrManager) && (
                          <button
                            onClick={() => handleDeleteResource(res.id)}
                            className="p-1 text-slate-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {res.notes && (
                        <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl mt-3 border border-slate-800">
                          {res.notes}
                        </p>
                      )}

                      <div className="mt-3 text-[10px] text-slate-400 space-y-0.5">
                        <div>Uploaded by: <strong className="text-slate-300">{res.uploaded_by}</strong></div>
                        <div>Date: {new Date(res.uploaded_at).toLocaleString()}</div>
                      </div>
                    </div>

                    <a
                      href={res.file_data}
                      download={res.original_name}
                      className="mt-4 w-full py-2 bg-slate-800 hover:bg-cyan-600/20 hover:text-cyan-300 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
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
                title="Total Tasks Logged"
                value={tasks.length}
                icon={<Briefcase className="w-5 h-5 text-blue-400" />}
              />
              <StatCard
                title="Work Completed"
                value={tasks.filter(t => t.status === 'Completed').length}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                color="text-emerald-400"
              />
              <StatCard
                title="Pending Tasks"
                value={tasks.filter(t => t.status === 'Pending').length}
                icon={<Clock className="w-5 h-5 text-amber-400" />}
                color="text-amber-400"
              />
              <StatCard
                title="Total Hours Logged"
                value={`${tasks.reduce((acc, t) => acc + (Number(t.hours_spent) || 0), 0).toFixed(1)} hrs`}
                icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
              />
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Blazebyte Daily Work Assessment Board
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Specialization</th>
                      <th className="py-3 px-4">Completed</th>
                      <th className="py-3 px-4">Pending</th>
                      <th className="py-3 px-4">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {PRECONFIGURED_USERS.map((user) => {
                      const userTasks = tasks.filter(t => t.user_id === user.id || t.username === user.username);
                      const done = userTasks.filter(t => t.status === 'Completed').length;
                      const pending = userTasks.filter(t => t.status === 'Pending').length;
                      const hrs = userTasks.reduce((acc, t) => acc + (Number(t.hours_spent) || 0), 0);

                      return (
                        <tr key={user.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: user.color }}>
                              {user.name.charAt(0)}
                            </span>
                            {user.name}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{user.title}</td>
                          <td className="py-3 px-4 font-bold text-emerald-400">{done}</td>
                          <td className="py-3 px-4 font-bold text-amber-400">{pending}</td>
                          <td className="py-3 px-4">{hrs.toFixed(1)} hrs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LOGIN AUDIT LOGS ("their login details should be seen") */}
        {activeTab === 'activity' && (
          <div className="space-y-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Employee Login & Activity Audit
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time record of employee authentication, device activity, and timestamps.
                </p>
              </div>
              <button
                onClick={loadAllData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700"
              >
                Refresh
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Access Point</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {loginLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white capitalize">{log.username}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.ip_address || 'Web'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {log.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CREATE WORK LOG MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" /> Log Daily Work Entry
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Date</label>
                <input
                  type="date"
                  value={newTaskForm.date}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Task Title / Deliverable *</label>
                <input
                  type="text"
                  placeholder="e.g. Qualified 15 enterprise leads & handled customer onboarding"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Customer Handling">Customer Handling</option>
                    <option value="SEO & Optimization">SEO & Optimization</option>
                    <option value="Media Management">Media Management</option>
                    <option value="Team Management">Team Management</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={newTaskForm.status}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hours Spent</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={newTaskForm.hours_spent}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, hours_spent: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Self Assessment (1-5 ★)</label>
                  <select
                    value={newTaskForm.self_rating}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, self_rating: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="5">★★★★★ 5 - Exceeded Target</option>
                    <option value="4">★★★★☆ 4 - Met Target Completely</option>
                    <option value="3">★★★☆☆ 3 - Good Progress</option>
                    <option value="2">★★☆☆☆ 2 - Partially Completed</option>
                    <option value="1">★☆☆☆☆ 1 - Roadblock / Incomplete</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Description & Accomplishments</label>
                <textarea
                  rows="3"
                  placeholder="Details of client interactions, resources used, or action items..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow"
                >
                  Save Work Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD ASSESSMENT MODAL */}
      {assessingTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> Team Lead Work Assessment
            </h3>
            <p className="text-slate-400 mb-4">
              Assessing work for: <strong className="text-white">{assessingTask.username}</strong>
            </p>

            <form onSubmit={handleSaveAssessment} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assessment Rating</label>
                <select
                  value={leadAssessmentForm.lead_rating}
                  onChange={(e) => setLeadAssessmentForm({ ...leadAssessmentForm, lead_rating: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Exceeds Expectations">🌟 Exceeds Expectations</option>
                  <option value="Meets Expectations">✅ Meets Expectations</option>
                  <option value="Needs Followup">⚠️ Needs Followup</option>
                  <option value="Pending Revisions">🔄 Pending Revisions</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Leadership Notes & Feedback</label>
                <textarea
                  rows="3"
                  placeholder="Add feedback, commendations, or specific instructions..."
                  value={leadAssessmentForm.lead_assessment}
                  onChange={(e) => setLeadAssessmentForm({ ...leadAssessmentForm, lead_assessment: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow"
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
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-xs">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" /> Upload Document
            </h3>
            <p className="text-slate-400 mb-4">
              Supports DOCX, Word, PDF, and Excel spreadsheets.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select File *</label>
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.xls,.xlsx,.csv"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Link to Task (Optional)</label>
                <select
                  value={uploadTaskId}
                  onChange={(e) => setUploadTaskId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="">-- General Resource Vault --</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes / File Description</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Master Client Prospect Sheet"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow"
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

// Helpers
function TabButton({ active, onClick, icon, label, badge, badgeColor = 'bg-slate-700 text-slate-300' }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
        active
          ? 'bg-blue-600 text-white shadow'
          : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function TaskCard({ task, currentUser, isLeadOrManager, onToggleStatus, onDelete, onAssess, onAttachFile }) {
  const isCompleted = task.status === 'Completed';
  const isPending = task.status === 'Pending';
  const isOwner = task.user_id === currentUser.id || task.username === currentUser.username;

  return (
    <div className={`rounded-2xl p-4 border transition flex flex-col justify-between ${
      isCompleted
        ? 'bg-slate-900/40 border-emerald-500/30'
        : isPending
        ? 'bg-slate-900/60 border-amber-500/30'
        : 'bg-slate-900/50 border-blue-500/30'
    }`}>
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isPending
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {task.status}
              </span>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                {task.category}
              </span>
            </div>
            <h4 className={`text-xs font-bold text-white ${isCompleted ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h4>
          </div>

          {(isOwner || isLeadOrManager) && (
            <button onClick={() => onDelete(task.id)} className="text-slate-500 hover:text-red-400 p-1" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
          <span className="text-amber-400 font-bold">★ {task.self_rating || 3}/5 Self-Rating</span>
          <span><strong className="text-slate-200">{task.hours_spent} hrs</strong> logged</span>
        </div>

        {task.lead_assessment && (
          <div className="mt-3 p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs">
            <div className="flex items-center justify-between text-blue-300 font-bold mb-1">
              <span>Assessment by {task.assessed_by || 'Lead'}</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded">
                {task.lead_rating || 'Reviewed'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">{task.lead_assessment}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
        <button
          onClick={() => onToggleStatus(task, isCompleted ? 'Pending' : 'Completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            isCompleted
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {isCompleted ? 'Mark Pending' : 'Mark Completed'}
        </button>

        {isLeadOrManager && (
          <button
            onClick={() => onAssess(task)}
            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-blue-400" /> Assess Work
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'text-white' }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">{icon}</div>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}

// LOGIN PAGE
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
      const user = await authenticateUser(username, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In to Tracker'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 mb-2.5 text-center uppercase tracking-wider">
            Quick 1-Click Login (6 Blazebyte Employees)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRECONFIGURED_USERS.map((user) => (
              <button
                key={user.username}
                type="button"
                onClick={() => handleSelectUser(user)}
                className={`p-2 rounded-xl text-left border transition ${
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
        </div>
      </div>
    </div>
  );
}
