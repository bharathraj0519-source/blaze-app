const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, INITIAL_USERS } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'blazebyte-super-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter for docx, doc, pdf, xls, xlsx, txt, images
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.docx', '.doc', '.pdf', '.xls', '.xlsx', '.txt', '.csv', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported. Please upload docx, pdf, word, or excel files.`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter
});

// Helper: Determine file category
function getFileType(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (['.doc', '.docx'].includes(ext)) return 'word';
  if (ext === '.pdf') return 'pdf';
  if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'excel';
  return 'other';
}

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ================= AUTH ROUTES =================

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown Browser';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim());

  if (!user) {
    db.prepare(`
      INSERT INTO login_logs (user_id, username, ip_address, user_agent, status)
      VALUES (NULL, ?, ?, ?, 'FAILED')
    `).run(username, ip, userAgent);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    db.prepare(`
      INSERT INTO login_logs (user_id, username, ip_address, user_agent, status)
      VALUES (?, ?, ?, ?, 'FAILED')
    `).run(user.id, user.username, ip, userAgent);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users SET last_login = ?, last_ip = ? WHERE id = ?
  `).run(now, ip, user.id);

  db.prepare(`
    INSERT INTO login_logs (user_id, username, ip_address, user_agent, status)
    VALUES (?, ?, ?, ?, 'SUCCESS')
  `).run(user.id, user.username, ip, userAgent);

  const tokenPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    title: user.title,
    avatar_color: user.avatar_color
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Login successful',
    token,
    user: {
      ...tokenPayload,
      last_login: now,
      last_ip: ip
    }
  });
});

// Current User profile & stats
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, title, avatar_color, last_login, last_ip, created_at, plain_password_hint FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// List all company employees
app.get('/api/auth/users', authenticateToken, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, name, role, title, avatar_color, last_login, last_ip, plain_password_hint
    FROM users
    ORDER BY 
      CASE 
        WHEN username = 'badri' THEN 1
        WHEN username = 'bharath' THEN 2
        WHEN username = 'saras' THEN 3
        WHEN username = 'prabha' THEN 4
        WHEN username = 'praneeth' THEN 5
        WHEN username = 'jerson' THEN 6
        ELSE 7
      END
  `).all();
  res.json(users);
});

// Login activity logs (see their login details)
app.get('/api/auth/login-logs', authenticateToken, (req, res) => {
  const isManagerOrLead = ['team_lead', 'management'].includes(req.user.role);
  let logs;
  if (isManagerOrLead) {
    logs = db.prepare(`
      SELECT l.*, u.title, u.avatar_color 
      FROM login_logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC 
      LIMIT 100
    `).all();
  } else {
    logs = db.prepare(`
      SELECT l.*, u.title, u.avatar_color 
      FROM login_logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      WHERE l.user_id = ? 
      ORDER BY l.timestamp DESC 
      LIMIT 50
    `).all(req.user.id);
  }
  res.json(logs);
});

// ================= TASK & WORK LOG ROUTES =================

// Get tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
  const { date, user_id, status } = req.query;
  const isManagerOrLead = ['team_lead', 'management'].includes(req.user.role);

  let query = `
    SELECT t.*, u.name as employee_name, u.title as employee_title, u.avatar_color,
           (SELECT COUNT(*) FROM resources r WHERE r.task_id = t.id) as attachment_count
    FROM tasks t
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // If regular member and not explicitly allowed to view all, only view own
  if (!isManagerOrLead) {
    query += ` AND t.user_id = ?`;
    params.push(req.user.id);
  } else if (user_id) {
    query += ` AND t.user_id = ?`;
    params.push(user_id);
  }

  if (date) {
    query += ` AND t.date = ?`;
    params.push(date);
  }

  if (status && status !== 'all') {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY t.date DESC, t.id DESC`;

  const tasks = db.prepare(query).all(...params);

  // Attach resources if any
  const tasksWithAttachments = tasks.map(task => {
    const resources = db.prepare('SELECT * FROM resources WHERE task_id = ?').all(task.id);
    return {
      ...task,
      resources
    };
  });

  res.json(tasksWithAttachments);
});

// Create daily work entry
app.post('/api/tasks', authenticateToken, (req, res) => {
  const {
    title,
    description,
    category = 'General',
    priority = 'Medium',
    status = 'Pending',
    hours_spent = 0,
    completion_notes = '',
    self_rating = 3,
    date = new Date().toISOString().split('T')[0]
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (
      user_id, username, date, title, description, category, priority, 
      status, hours_spent, completion_notes, self_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    req.user.username,
    date,
    title.trim(),
    description || '',
    category,
    priority,
    status,
    Number(hours_spent) || 0,
    completion_notes || '',
    Number(self_rating) || 3
  );

  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newTask);
});

// Update task / assess work
app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const isManagerOrLead = ['team_lead', 'management'].includes(req.user.role);
  const isOwner = task.user_id === req.user.id;

  if (!isOwner && !isManagerOrLead) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const {
    title = task.title,
    description = task.description,
    category = task.category,
    priority = task.priority,
    status = task.status,
    hours_spent = task.hours_spent,
    completion_notes = task.completion_notes,
    self_rating = task.self_rating,
    lead_assessment,
    lead_rating
  } = req.body;

  let updateFields = [
    'title = ?',
    'description = ?',
    'category = ?',
    'priority = ?',
    'status = ?',
    'hours_spent = ?',
    'completion_notes = ?',
    'self_rating = ?',
    'updated_at = CURRENT_TIMESTAMP'
  ];
  let params = [
    title,
    description,
    category,
    priority,
    status,
    Number(hours_spent) || 0,
    completion_notes,
    Number(self_rating) || 3
  ];

  // If manager or team lead provides feedback/assessment
  if (isManagerOrLead && (lead_assessment !== undefined || lead_rating !== undefined)) {
    updateFields.push('lead_assessment = ?', 'lead_rating = ?', 'assessed_by = ?', 'assessed_at = CURRENT_TIMESTAMP');
    params.push(lead_assessment || null, lead_rating || null, req.user.name);

    // Notify the employee about the assessment
    if (lead_assessment || lead_rating) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'assessment')
      `).run(
        task.user_id,
        `New Assessment from ${req.user.name}`,
        `Your task "${task.title}" was assessed: ${lead_rating || 'Feedback provided'}. Note: "${lead_assessment || 'No comments'}"`
      );
    }
  }

  params.push(taskId);

  db.prepare(`
    UPDATE tasks 
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...params);

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.json(updatedTask);
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isManagerOrLead = ['team_lead', 'management'].includes(req.user.role);
  if (task.user_id !== req.user.id && !isManagerOrLead) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  res.json({ message: 'Task deleted successfully' });
});

// ================= RESOURCE & FILE UPLOADS =================

// Upload file (docx, pdf, word, excel)
app.post('/api/resources/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file format not supported' });
  }

  const { task_id, notes = '' } = req.body;
  const fileType = getFileType(req.file.originalname);

  const result = db.prepare(`
    INSERT INTO resources (task_id, user_id, uploaded_by, filename, original_name, mimetype, size, file_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task_id ? Number(task_id) : null,
    req.user.id,
    req.user.name,
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    fileType,
    notes
  );

  const newResource = db.prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newResource);
});

// List resources / files
app.get('/api/resources', authenticateToken, (req, res) => {
  const { file_type, task_id } = req.query;
  let query = `
    SELECT r.*, u.avatar_color, t.title as task_title 
    FROM resources r 
    LEFT JOIN users u ON r.user_id = u.id 
    LEFT JOIN tasks t ON r.task_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (file_type && file_type !== 'all') {
    query += ` AND r.file_type = ?`;
    params.push(file_type);
  }

  if (task_id) {
    query += ` AND r.task_id = ?`;
    params.push(task_id);
  }

  query += ` ORDER BY r.uploaded_at DESC`;
  const resources = db.prepare(query).all(...params);
  res.json(resources);
});

// Download / View resource
app.get('/api/resources/download/:id', authenticateToken, (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOADS_DIR, resource.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File on disk not found' });
  }

  res.download(filePath, resource.original_name);
});

// Delete resource
app.delete('/api/resources/:id', authenticateToken, (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: 'File not found' });

  const isManagerOrLead = ['team_lead', 'management'].includes(req.user.role);
  if (resource.user_id !== req.user.id && !isManagerOrLead) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const filePath = path.join(UPLOADS_DIR, resource.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error removing file:', e);
    }
  }

  db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  res.json({ message: 'Resource removed' });
});

// ================= NOTIFICATIONS & REMINDERS =================

// Get notifications + dynamic pending reminders
app.get('/api/notifications', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Check pending tasks for user
  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'Pending'
  `).get(req.user.id).count;

  // Check if today's work has been logged
  const todayCount = db.prepare(`
    SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date = ?
  `).get(req.user.id, today).count;

  const storedNotifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
  `).all(req.user.id);

  const reminders = [];
  if (todayCount === 0) {
    reminders.push({
      id: 'dynamic-today-log',
      type: 'reminder',
      title: 'Daily Work Update Needed',
      message: `You haven't logged any work for today (${today}). Please update your daily progress!`,
      is_dynamic: true,
      created_at: new Date().toISOString()
    });
  }

  if (pendingCount > 0) {
    reminders.push({
      id: 'dynamic-pending-tasks',
      type: 'pending_alert',
      title: 'Pending Work Alert',
      message: `You currently have ${pendingCount} pending task${pendingCount > 1 ? 's' : ''} waiting for completion.`,
      is_dynamic: true,
      created_at: new Date().toISOString()
    });
  }

  res.json({
    pending_count: pendingCount,
    logged_today: todayCount > 0,
    reminders,
    history: storedNotifications
  });
});

// Mark notification as read
app.post('/api/notifications/mark-read', authenticateToken, (req, res) => {
  const { id } = req.body;
  if (id) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user.id);
  } else {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  }
  res.json({ success: true });
});

// ================= DASHBOARD & WORK ASSESSMENT STATS =================

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const isManagerOrLead = ['team_lead', 'management'].includes(req.user.role);

  // Overall totals
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Completed'").get().count;
  const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Pending'").get().count;
  const inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'In Progress'").get().count;

  // Today totals
  const todayTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE date = ?').get(today).count;
  const todayCompleted = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE date = ? AND status = 'Completed'").get(today).count;

  // Member-wise breakdown
  const memberStats = db.prepare(`
    SELECT 
      u.id, u.username, u.name, u.title, u.role, u.avatar_color, u.last_login,
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status = 'Pending' THEN 1 ELSE 0 END) as pending_tasks,
      SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
      SUM(CASE WHEN t.date = ? THEN 1 ELSE 0 END) as today_tasks_count,
      ROUND(AVG(t.self_rating), 1) as avg_self_rating,
      ROUND(SUM(t.hours_spent), 1) as total_hours
    FROM users u
    LEFT JOIN tasks t ON u.id = t.user_id
    GROUP BY u.id
    ORDER BY 
      CASE 
        WHEN u.username = 'badri' THEN 1
        WHEN u.username = 'bharath' THEN 2
        WHEN u.username = 'saras' THEN 3
        WHEN u.username = 'prabha' THEN 4
        WHEN u.username = 'praneeth' THEN 5
        WHEN u.username = 'jerson' THEN 6
        ELSE 7
      END
  `).all(today);

  // User-specific stats
  const userTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?').get(req.user.id).count;
  const userCompleted = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'Completed'").get(req.user.id).count;
  const userPending = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'Pending'").get(req.user.id).count;
  const userHours = db.prepare('SELECT SUM(hours_spent) as hours FROM tasks WHERE user_id = ?').get(req.user.id).hours || 0;

  res.json({
    company: {
      name: 'Blazebyte',
      total_employees: 6,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      in_progress_tasks: inProgressTasks,
      completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      today_tasks: todayTasks,
      today_completed: todayCompleted
    },
    member_stats: memberStats,
    user_stats: {
      total: userTasks,
      completed: userCompleted,
      pending: userPending,
      total_hours: userHours,
      completion_rate: userTasks > 0 ? Math.round((userCompleted / userTasks) * 100) : 0
    }
  });
});

// Serve frontend build if dist folder exists
const CLIENT_DIST = path.join(__dirname, '../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Blazebyte Work Tracker API running on http://localhost:${PORT}`);
  console.log(`💼 Seeded 6 Employees: Badri, Bharath, Saras, Prabha, Praneeth, Jerson`);
  console.log(`📁 Uploads Directory: ${UPLOADS_DIR}`);
  console.log(`=========================================`);
});
