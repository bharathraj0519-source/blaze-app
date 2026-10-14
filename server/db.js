const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'blazebyte.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plain_password_hint TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      avatar_color TEXT,
      last_login TEXT,
      last_ip TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'SUCCESS'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      hours_spent REAL DEFAULT 0,
      completion_notes TEXT,
      self_rating INTEGER DEFAULT 3,
      lead_assessment TEXT,
      lead_rating TEXT,
      assessed_by TEXT,
      assessed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      user_id INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mimetype TEXT,
      size INTEGER,
      file_type TEXT,
      notes TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'reminder',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedUsers();
}

const INITIAL_USERS = [
  {
    username: 'badri',
    name: 'Badri',
    title: 'Team Lead',
    role: 'team_lead',
    password: 'badri@blazebyte',
    color: '#3B82F6' // Blue
  },
  {
    username: 'bharath',
    name: 'Bharath',
    title: 'SEO and Team Management',
    role: 'management',
    password: 'bharath@blazebyte',
    color: '#8B5CF6' // Purple
  },
  {
    username: 'saras',
    name: 'Saras',
    title: 'Media Management',
    role: 'member',
    password: 'saras@blazebyte',
    color: '#EC4899' // Pink
  },
  {
    username: 'prabha',
    name: 'Prabha',
    title: 'Lead Generation and Customer Handling',
    role: 'member',
    password: 'prabha@blazebyte',
    color: '#F59E0B' // Amber
  },
  {
    username: 'praneeth',
    name: 'Praneeth',
    title: 'Lead Generation and Customer Support',
    role: 'member',
    password: 'praneeth@blazebyte',
    color: '#10B981' // Emerald
  },
  {
    username: 'jerson',
    name: 'Jerson',
    title: 'Lead Generation and Customer Handling',
    role: 'member',
    password: 'jerson@blazebyte',
    color: '#06B6D4' // Cyan
  }
];

function seedUsers() {
  const selectStmt = db.prepare('SELECT id FROM users WHERE username = ?');
  const insertStmt = db.prepare(`
    INSERT INTO users (username, password_hash, plain_password_hint, name, role, title, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE users SET title = ?, role = ?, avatar_color = ?, plain_password_hint = ? WHERE username = ?
  `);

  for (const user of INITIAL_USERS) {
    const existing = selectStmt.get(user.username);
    const hash = bcrypt.hashSync(user.password, 10);
    if (!existing) {
      insertStmt.run(
        user.username,
        hash,
        user.password,
        user.name,
        user.role,
        user.title,
        user.color
      );
    } else {
      updateStmt.run(
        user.title,
        user.role,
        user.color,
        user.password,
        user.username
      );
    }
  }
}

initDb();

module.exports = {
  db,
  INITIAL_USERS
};
