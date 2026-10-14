import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://lxpfglzteqevfaiyjxpw.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4cGZnbHp0ZXFldmZhaXlqeHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTUwNDgsImV4cCI6MjEwNzU3MTA0OH0.SaFXor8qrIQ9icLPo2N8KtAQycS4IRByWP0IuE2FtSE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Default 6 Blazebyte team members
export const PRECONFIGURED_USERS = [
  { id: 1, username: 'badri', name: 'Badri', title: 'Team Lead', role: 'team_lead', color: '#3B82F6', password: 'badri@blazebyte' },
  { id: 2, username: 'bharath', name: 'Bharath', title: 'SEO and Team Management', role: 'management', color: '#8B5CF6', password: 'bharath@blazebyte' },
  { id: 3, username: 'saras', name: 'Saras', title: 'Media Management', role: 'member', color: '#EC4899', password: 'saras@blazebyte' },
  { id: 4, username: 'prabha', name: 'Prabha', title: 'Lead Generation and Customer Handling', role: 'member', color: '#F59E0B', password: 'prabha@blazebyte' },
  { id: 5, username: 'praneeth', name: 'Praneeth', title: 'Lead Generation and Customer Support', role: 'member', color: '#10B981', password: 'praneeth@blazebyte' },
  { id: 6, username: 'jerson', name: 'Jerson', title: 'Lead Generation and Customer Handling', role: 'member', color: '#06B6D4', password: 'jerson@blazebyte' }
];

// Check if Supabase tables exist
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      return { connected: false, reason: 'tables_missing' };
    }
    return { connected: !error, error };
  } catch (e) {
    return { connected: false, error: e };
  }
}

// Authentication & Login logging
export async function authenticateUser(username, password) {
  const cleanUser = username.trim().toLowerCase();
  const matched = PRECONFIGURED_USERS.find(u => u.username === cleanUser);

  if (!matched || matched.password !== password) {
    throw new Error('Invalid username or password');
  }

  const now = new Date().toISOString();
  const ip = 'Cloud Client';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser';

  // Try logging to Supabase
  try {
    await supabase.from('login_logs').insert([
      { user_id: matched.id, username: matched.username, timestamp: now, ip_address: ip, user_agent: userAgent, status: 'SUCCESS' }
    ]);
    await supabase.from('users').update({ last_login: now, last_ip: ip }).eq('username', matched.username);
  } catch (err) {
    console.warn('Supabase login log skipped:', err);
  }

  // Also log locally in case tables are being set up
  const localLogs = JSON.parse(localStorage.getItem('blazebyte_login_logs') || '[]');
  localLogs.unshift({
    id: Date.now(),
    username: matched.username,
    title: matched.title,
    timestamp: now,
    ip_address: ip,
    status: 'SUCCESS'
  });
  localStorage.setItem('blazebyte_login_logs', JSON.stringify(localLogs.slice(0, 50)));

  return {
    ...matched,
    last_login: now,
    last_ip: ip
  };
}

// Fetch all login logs
export async function getLoginLogs() {
  try {
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
    if (!error && data && data.length > 0) return data;
  } catch (e) {}

  return JSON.parse(localStorage.getItem('blazebyte_login_logs') || '[]');
}

// Fetch tasks for date (0 sample tasks!)
export async function getTasks(date, userId, isLeadOrManager) {
  try {
    let query = supabase.from('tasks').select('*');
    if (date) query = query.eq('date', date);
    if (!isLeadOrManager && userId) query = query.eq('user_id', userId);
    query = query.order('id', { ascending: false });

    const { data, error } = await query;
    if (!error && data) return data;
  } catch (e) {}

  // Fallback to local storage
  const localTasks = JSON.parse(localStorage.getItem('blazebyte_tasks') || '[]');
  return localTasks.filter(t => {
    const dateMatch = !date || t.date === date;
    const userMatch = isLeadOrManager || String(t.user_id) === String(userId);
    return dateMatch && userMatch;
  });
}

// Create new task
export async function createTask(taskData) {
  try {
    const { data, error } = await supabase.from('tasks').insert([taskData]).select();
    if (!error && data && data[0]) {
      // Also cache locally
      const local = JSON.parse(localStorage.getItem('blazebyte_tasks') || '[]');
      local.unshift(data[0]);
      localStorage.setItem('blazebyte_tasks', JSON.stringify(local));
      return data[0];
    }
  } catch (e) {}

  const newTask = {
    id: Date.now(),
    ...taskData,
    created_at: new Date().toISOString()
  };
  const local = JSON.parse(localStorage.getItem('blazebyte_tasks') || '[]');
  local.unshift(newTask);
  localStorage.setItem('blazebyte_tasks', JSON.stringify(local));
  return newTask;
}

// Update task
export async function updateTask(id, updates) {
  try {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select();
    if (!error && data && data[0]) {
      // Sync local
      const local = JSON.parse(localStorage.getItem('blazebyte_tasks') || '[]');
      const updated = local.map(t => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem('blazebyte_tasks', JSON.stringify(updated));
      return data[0];
    }
  } catch (e) {}

  const local = JSON.parse(localStorage.getItem('blazebyte_tasks') || '[]');
  const updated = local.map(t => t.id === id ? { ...t, ...updates } : t);
  localStorage.setItem('blazebyte_tasks', JSON.stringify(updated));
  return updated.find(t => t.id === id);
}

// Delete task
export async function deleteTask(id) {
  try {
    await supabase.from('tasks').delete().eq('id', id);
  } catch (e) {}

  const local = JSON.parse(localStorage.getItem('blazebyte_tasks') || '[]');
  localStorage.setItem('blazebyte_tasks', JSON.stringify(local.filter(t => t.id !== id)));
}

// Upload resource file (docx, pdf, word, excel) as base64 for 100% serverless persistence
export async function uploadResourceFile(file, taskId, notes, user) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const ext = file.name.split('.').pop().toLowerCase();
      let fileType = 'other';
      if (['doc', 'docx'].includes(ext)) fileType = 'word';
      else if (ext === 'pdf') fileType = 'pdf';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) fileType = 'excel';

      const resourceRecord = {
        task_id: taskId ? Number(taskId) : null,
        user_id: user.id,
        uploaded_by: user.name,
        filename: file.name,
        original_name: file.name,
        mimetype: file.type,
        size: file.size,
        file_type: fileType,
        file_data: base64Data,
        notes: notes || '',
        uploaded_at: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase.from('resources').insert([resourceRecord]).select();
        if (!error && data && data[0]) {
          const local = JSON.parse(localStorage.getItem('blazebyte_resources') || '[]');
          local.unshift(data[0]);
          localStorage.setItem('blazebyte_resources', JSON.stringify(local));
          return resolve(data[0]);
        }
      } catch (e) {}

      const newRes = { id: Date.now(), ...resourceRecord };
      const local = JSON.parse(localStorage.getItem('blazebyte_resources') || '[]');
      local.unshift(newRes);
      localStorage.setItem('blazebyte_resources', JSON.stringify(local));
      resolve(newRes);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get resources
export async function getResources() {
  try {
    const { data, error } = await supabase.from('resources').select('*').order('uploaded_at', { ascending: false });
    if (!error && data) return data;
  } catch (e) {}

  return JSON.parse(localStorage.getItem('blazebyte_resources') || '[]');
}

// Delete resource
export async function deleteResource(id) {
  try {
    await supabase.from('resources').delete().eq('id', id);
  } catch (e) {}

  const local = JSON.parse(localStorage.getItem('blazebyte_resources') || '[]');
  localStorage.setItem('blazebyte_resources', JSON.stringify(local.filter(r => r.id !== id)));
}
