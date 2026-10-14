# Blazebyte Work Tracker & Assessment Portal

A comprehensive web application designed for **Blazebyte** employees to log day-wise work updates, upload resource documents (DOCX, PDF, Word, Excel), monitor task completion/pending statuses, track daily work assessments, and receive pending task reminders.

---

## 👥 Blazebyte Pre-Configured Employees (6 Team Members)

All 6 employees have accounts pre-seeded with their designated roles and default passwords:

| No. | Name | Username | Role / Designation | Permissions | Default Password |
|---|---|---|---|---|---|
| 1 | **Badri** | `badri` | Team Lead | Team Lead / Admin | `badri@blazebyte` |
| 2 | **Bharath** | `bharath` | SEO and Team Management | Manager / Admin | `bharath@blazebyte` |
| 3 | **Saras** | `saras` | Media Management | Member | `saras@blazebyte` |
| 4 | **Prabha** | `prabha` | Lead Generation and Customer Handling | Member | `prabha@blazebyte` |
| 5 | **Praneeth** | `praneeth` | Lead Generation and Customer Support | Member | `praneeth@blazebyte` |
| 6 | **Jerson** | `jerson` | Lead Generation and Customer Handling | Member | `jerson@blazebyte` |

> 💡 **Quick Login:** On the login page, you can either enter credentials manually or click any employee pill to sign in with one click.

---

## 🌟 Key Features

1. **Day-wise Work Updates & Task Logging:**
   - Date picker to view or record daily tasks (today or past dates).
   - Task details: Title, Description, Department/Category, Priority, Status (Pending, In Progress, Completed), Hours Spent.
   - Self-Assessment Score (1-5 Stars).

2. **Work Completion & Pending Status:**
   - Real-time status toggling between *Pending* and *Completed*.
   - Filter by status and employee.
   - Company-wide and individual completion rates.

3. **Resource Vault & File Uploads:**
   - Supports **DOCX, DOC, PDF, XLS, XLSX, and CSV**.
   - Attach files directly to specific work tasks or store in the central Resource Vault.
   - One-click secure downloads and file management.

4. **Team Lead & Manager Work Assessment:**
   - Badri (Team Lead) and Bharath (Management) can inspect each member's tasks.
   - Submit formal Lead Assessment ratings (*Exceeds Expectations*, *Meets Expectations*, *Needs Followup*, *Pending Revisions*) and written feedback notes.

5. **Reminder & Notification System:**
   - **In-App Reminder Banner**: Warns team members if today's daily log has not been submitted yet.
   - **Pending Work Counter**: Notifies users of backlog or overdue tasks.
   - **Browser Desktop Notifications**: Built with Web Notification API to alert users of pending assignments.

6. **Login Details & Activity Auditing:**
   - Displays real-time authentication logs, timestamps, IP addresses, and session status for all employees.

---

## 🚀 Running the Application

The web portal is already running live on your system:
👉 **URL:** [http://localhost:5000](http://localhost:5000)

To start or restart the server manually at any time:
```powershell
cd C:\Users\bharath\.gemini\antigravity\scratch\blazebyte-tracker
npm start
```
