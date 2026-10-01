# SmartLab Guardian

## University Laboratory Monitoring, Security and Resource Management System

### IT3162 Group Project  
**University of Vavuniya**  
**Faculty of Applied Science**  
**Department of Physical Science**

---

## 📌 Project Overview

**SmartLab Guardian** is an advanced centralized system designed to monitor, secure, and efficiently manage university computer laboratories.

The system provides real-time monitoring of laboratory computers by collecting information about computer status, system performance, user activities, installed applications, network activities, and usage history through a monitoring agent and a centralized dashboard.

The main objective of this project is to reduce manual supervision, improve laboratory security, optimize resource management, and provide administrators with better control over university laboratory environments.

---

## 🎯 Key Features

### 🖥️ Computer Monitoring
- Real-time monitoring of computer status and performance.
- Track CPU, memory, storage, and system health information.
- Maintain computer usage history.

### 👥 User Activity Management
- Monitor user sessions and login activities.
- Track laboratory usage patterns.
- Maintain attendance and session records.

### 🔒 Security Management
- Detect unusual activities and potential security threats.
- Block unauthorized applications and websites.
- Generate security alerts.

### 📦 Software & Resource Management
- Maintain software inventory.
- Monitor installed applications.
- Manage laboratory resources efficiently.

### 📊 Dashboard & Reporting
- Centralized monitoring dashboard.
- Automated reports and analytics.
- Smart recommendations for improving lab management.

---

## 🏗️ System Components

### 1. Monitoring Agent
A lightweight agent installed on laboratory computers to collect:
- System performance data
- User activity information
- Application usage
- Network activities

### 2. Central Management Dashboard
A web-based dashboard used by administrators to:
- View laboratory status
- Analyze collected data
- Manage security settings
- Generate reports

### 3. Database System
Stores:
- Computer details
- User sessions
- Usage history
- Alerts
- Resource information

---

## 🚀 Project Objectives

- Provide centralized monitoring of university computer laboratories.
- Improve laboratory security and resource utilization.
- Reduce manual monitoring effort.
- Identify security risks and unusual activities.
- Support efficient decision-making through reports and analytics.

---

## 👨‍💻 Project Group

**Group - 05**

| No | Registration No | Email |
|---|---|---|
| 1 | 2022/ICT/36 | 2022ict36@stu.vau.ac.lk |
| 2 | 2022/ICT/52 | 2022ict52@stu.vau.ac.lk |
| 3 | 2022/ICT/126 | 2022ict126@stu.vau.ac.lk |
| 4 | 2022/ICT/135 | 2022ict135@stu.vau.ac.lk |
| 5 | 2022/ICT/141 | 2022ict141@stu.vau.ac.lk |
| 6 | 2021/ICT/128 | 2021ict128@stu.vau.ac.lk |

---

## 🛠️ Technologies Used

- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Node.js, Express.js, Socket.IO (live dashboard updates)
- **Database:** MongoDB (Mongoose ODM) - MongoDB Atlas in production, a local `mongod` for development
- **Monitoring Agent:** calls the `/api/agent/*` REST endpoints from each lab PC (heartbeat, login/logout, activity, hardware scan)
- **Other:** JWT auth + bcrypt (staff/student passwords), ExcelJS (spreadsheet import/export), Multer (file uploads), Helmet + rate limiting

---

## 🚀 Getting Started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in MONGO_URI, JWT_SECRET, AGENT_API_KEY
npm run seed:fresh          # creates demo labs, students, staff accounts, an exam, etc.
npm run dev                 # http://localhost:5000 (or PORT from .env)
```

Demo sign-ins created by the seed script:

| Role | Email | Password |
|---|---|---|
| Admin | admin@vau.ac.lk | Admin@12345 |
| Lecturer | lecturer@vau.ac.lk | Lecturer@12345 |
| Examiner | examiner@vau.ac.lk | Examiner@12345 |

Students sign in at the lab PC (not the dashboard) with their registration number (e.g. `2021ict128`) and the password `Student@123`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # VITE_API_BASE_URL=/api is fine for local dev
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend (`http://localhost:5050` by default - see `vite.config.js`), so no CORS setup is needed locally.

### 3. Project structure

```
backend/
  src/
    models/        Mongoose schemas (Student, Computer, LoginSession, HardwareDevice, ExamSession, ...)
    controllers/    request handlers per feature area
    services/       misuse-flagging rules, hardware-scan diffing, exam auto-assignment, Excel import/export
    routes/         Express routers, mounted under /api
    middleware/     JWT auth, monitoring-agent key auth, error handling, uploads
    realtime/       Socket.IO event emitter
    seed/           demo data generator
frontend/
  src/
    api/            one file per resource, thin wrappers over axios
    pages/          one page per feature area
    components/     shared layout, table, modal, badge, chart pieces
    context/        auth context (JWT storage + current user)
```
