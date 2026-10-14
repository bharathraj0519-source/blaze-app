const { db } = require('./db');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function seedRealisticData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Create dummy sample files in uploads
  const sampleDocx = path.join(UPLOADS_DIR, 'sample-seo-audit.docx');
  const sampleXlsx = path.join(UPLOADS_DIR, 'sample-leads.xlsx');
  const samplePdf = path.join(UPLOADS_DIR, 'sample-campaign.pdf');

  if (!fs.existsSync(sampleDocx)) fs.writeFileSync(sampleDocx, 'Blazebyte Sample DOCX content for SEO Audit');
  if (!fs.existsSync(sampleXlsx)) fs.writeFileSync(sampleXlsx, 'Blazebyte Sample XLSX content for Leads');
  if (!fs.existsSync(samplePdf)) fs.writeFileSync(samplePdf, '%PDF-1.4 Blazebyte Sample PDF Document');

  // Check if tasks already exist
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  if (taskCount > 0) {
    console.log('Tasks already exist, skipping seed.');
    return;
  }

  const users = db.prepare('SELECT id, username, name FROM users').all();
  const userMap = {};
  users.forEach(u => { userMap[u.username] = u; });

  const sampleTasks = [
    {
      username: 'badri',
      title: 'Q4 Team Sprint Planning & Resource Allocation',
      description: 'Reviewed weekly deliverables, assigned lead targets to Prabha and Jerson, aligned media schedule with Saras.',
      category: 'Team Management',
      priority: 'High',
      status: 'Completed',
      hours_spent: 4,
      self_rating: 5,
      date: today,
      completion_notes: 'Sprint backlog finalized and team tasks allocated.'
    },
    {
      username: 'bharath',
      title: 'Technical SEO Audit & Search Console Indexation Review',
      description: 'Analyzed organic search performance, resolved 404 crawl errors, and mapped out keyword targeting strategy.',
      category: 'SEO & Optimization',
      priority: 'High',
      status: 'Completed',
      hours_spent: 3.5,
      self_rating: 4,
      date: today,
      completion_notes: 'Audit doc uploaded to resources vault.',
      lead_assessment: 'Excellent work on the crawl diagnostics. Let us review ranking improvements next week.',
      lead_rating: 'Exceeds Expectations',
      assessed_by: 'Badri'
    },
    {
      username: 'saras',
      title: 'Social Media Creative Assets & Ad Banner Design',
      description: 'Produced 8 display banner variations for upcoming product launch and scheduled LinkedIn posts.',
      category: 'Media Management',
      priority: 'Medium',
      status: 'In Progress',
      hours_spent: 3,
      self_rating: 4,
      date: today,
      completion_notes: '5 banners approved, remaining 3 undergoing brand review.'
    },
    {
      username: 'prabha',
      title: 'Outbound B2B Prospecting & Customer Qualification Calls',
      description: 'Outreached to 50 decision makers, scheduled 4 discovery meetings, and qualified high-intent leads.',
      category: 'Lead Generation',
      priority: 'High',
      status: 'Pending',
      hours_spent: 2.5,
      self_rating: 3,
      date: today,
      completion_notes: 'Follow-ups pending for afternoon call confirmations.'
    },
    {
      username: 'praneeth',
      title: 'Customer Onboarding & Priority Ticket Resolution',
      description: 'Handled 12 customer support tickets with 100% satisfaction score. Assisted 2 enterprise clients with setup.',
      category: 'Customer Handling',
      priority: 'Medium',
      status: 'Completed',
      hours_spent: 5,
      self_rating: 5,
      date: today,
      completion_notes: 'All tickets resolved without escalations.',
      lead_assessment: 'Great turnaround time and polite client communication.',
      lead_rating: 'Meets Expectations',
      assessed_by: 'Bharath'
    },
    {
      username: 'jerson',
      title: 'Enterprise Pipeline Follow-Up & Product Demos',
      description: 'Prepared tailored proposal decks and conducted product walkthroughs for two prospect organizations.',
      category: 'Lead Generation',
      priority: 'Medium',
      status: 'Pending',
      hours_spent: 2,
      self_rating: 4,
      date: today,
      completion_notes: 'Awaiting pricing confirmation from team lead.'
    }
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      user_id, username, date, title, description, category, priority, 
      status, hours_spent, completion_notes, self_rating, lead_assessment, lead_rating, assessed_by, assessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  const taskIds = [];
  for (const t of sampleTasks) {
    const user = userMap[t.username];
    if (user) {
      const res = insertTask.run(
        user.id,
        user.username,
        t.date,
        t.title,
        t.description,
        t.category,
        t.priority,
        t.status,
        t.hours_spent,
        t.completion_notes,
        t.self_rating,
        t.lead_assessment || null,
        t.lead_rating || null,
        t.assessed_by || null
      );
      taskIds.push({ id: res.lastInsertRowid, username: t.username });
    }
  }

  // Seed sample resources linked to tasks
  const insertResource = db.prepare(`
    INSERT INTO resources (task_id, user_id, uploaded_by, filename, original_name, mimetype, size, file_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (taskIds.length > 1) {
    insertResource.run(
      taskIds[1].id, // Bharath's task
      userMap['bharath'].id,
      'Bharath',
      'sample-seo-audit.docx',
      'Blazebyte_SEO_Audit_Report.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      42500,
      'docx',
      'Complete crawl and indexing diagnostic documentation'
    );

    insertResource.run(
      taskIds[3].id, // Prabha's task
      userMap['prabha'].id,
      'Prabha',
      'sample-leads.xlsx',
      'Q4_Prospect_Lead_Master.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      88400,
      'excel',
      'Verified corporate emails and phone numbers'
    );

    insertResource.run(
      null, // General resource
      userMap['saras'].id,
      'Saras',
      'sample-campaign.pdf',
      'Blazebyte_Brand_Guidelines_2026.pdf',
      'application/pdf',
      124000,
      'pdf',
      'Official company color palette, logo assets, and social banners'
    );
  }

  // Seed some initial login activity logs
  const insertLog = db.prepare(`
    INSERT INTO login_logs (user_id, username, ip_address, user_agent, status, timestamp)
    VALUES (?, ?, ?, ?, 'SUCCESS', datetime('now', ?))
  `);

  insertLog.run(userMap['badri'].id, 'badri', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0', '-10 minutes');
  insertLog.run(userMap['bharath'].id, 'bharath', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/128.0', '-25 minutes');
  insertLog.run(userMap['praneeth'].id, 'praneeth', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0', '-40 minutes');

  console.log('Sample data seeded successfully.');
}

seedRealisticData();
