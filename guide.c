# SmartLab Guardian — Getting Started Guide
### How to Actually Build Your Module, Step by Step

This guide walks through **one full module** (Student Login Monitoring, owned by Risnee) from zero to working feature. Every other member follows the *exact same pattern* for their own module — just swap the entity names.

---

## PHASE 0: One-Time Team Setup (Do this together, Day 1)

1. **Create the repo structure.** One person (Thenuwara, since he owns integration) sets this up and pushes it first:
```
smartlab-guardian/
├── backend/
│   ├── src/
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express route files
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/     # API call functions
│   │   └── App.jsx
│   └── package.json
└── README.md
```

2. **Everyone clones it:**
```bash
git clone https://github.com/RaneemaRisnee/SmartLab-Guardian.git
cd SmartLab-Guardian
```

3. **Branching rule:** never push directly to `main`. Each person works on their own branch:
```bash
git checkout -b feature/student-login       # Risnee
git checkout -b feature/exam-assignment     # Shahnaz
git checkout -b feature/hardware-inventory  # Kokulan
git checkout -b feature/hardware-alerts     # Athukorala
git checkout -b feature/usage-monitoring    # Thilini
git checkout -b feature/dashboard-integration # Thenuwara
```
When a module is working, open a Pull Request → someone else reviews → merge into `main`.

4. **Shared MongoDB Atlas cluster:** one person creates a free Atlas cluster, adds everyone's IP/email, and shares the connection string. Everyone puts it in their own local `.env` file (never commit `.env` — only `.env.example`).

5. **Install the base tools** (each person, on their own machine):
```bash
node --version   # confirm Node.js installed (v18+)
npm install -g nodemon
```

---

## PHASE 1 (Week 1): Break Down Your Requirements

Take your module's bullet points from the proposal and turn them into a checklist. Example for **Student Login**:

- [ ] Student logs in with username + password
- [ ] System records login time, PC, and session start
- [ ] System records logout time
- [ ] System monitors active vs idle time during session
- [ ] System flags login if activity pattern looks suspicious (e.g. no app usage logged, or login from wrong PC group)

Do this for your own module. Write it in a shared Google Doc or a `docs/requirements.md` file per module — one page, plain checklist, no need to overthink it.

---

## PHASE 2 (Week 2): Design Your Database Schema

Look at your entities in the ER diagram from the proposal. For Student Login, the relevant tables are `Student` and `LoginSession`.

Write this as an actual Mongoose schema file — this **is** your design deliverable for Week 2:

```javascript
// backend/src/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  reg_no: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password_hash: { type: String, required: true }
});

module.exports = mongoose.model('Student', studentSchema);
```

```javascript
// backend/src/models/LoginSession.js
const mongoose = require('mongoose');

const loginSessionSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  pc_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Computer', required: true },
  login_time: { type: Date, default: Date.now },
  logout_time: { type: Date },
  active_time: { type: Number, default: 0 }, // in minutes
  flagged: { type: Boolean, default: false }
});

module.exports = mongoose.model('LoginSession', loginSessionSchema);
```

**Your Week 2 task:** write the schema file(s) for your own module's entities and push them to your branch. That's the concrete deliverable — not just a diagram, an actual file.

---

## PHASE 3 (Week 3): Wireframe Your Screens

You don't need Figma skill — a rough sketch is enough at this stage.

1. Go to **[figma.com](https://figma.com)** → free account → new design file.
2. For Student Login module, sketch just 2 screens:
   - **Login screen:** username field, password field, login button.
   - **Session status (for admin/lecturer view):** a table showing student name, PC, login time, active time, flagged status.
3. Use simple rectangles and text — don't polish it. The point is agreeing on what fields appear where *before* coding the frontend.
4. Export as PNG and drop it in `docs/wireframes/` in the repo, or just screenshot and share in your group chat.

Do this for whatever screens your module needs (e.g. Kokulan sketches the hardware list + add/edit hardware form; Athukorala sketches the alert notification panel).

---

## PHASE 4 (Weeks 4–5): Build the Backend

This is the same pattern for everyone: **Model → Controller → Route**, then test it in Postman before touching the frontend.

**4.1 — Set up Express + MongoDB connection (once, shared by Thenuwara, others just use it):**
```javascript
// backend/src/server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/students', require('./routes/studentRoutes'));
// each member adds their own route line here, e.g.:
// app.use('/api/hardware', require('./routes/hardwareRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**4.2 — Write your controller (the actual logic):**
```javascript
// backend/src/controllers/studentLoginController.js
const LoginSession = require('../models/LoginSession');

exports.loginStudent = async (req, res) => {
  try {
    const { student_id, pc_id } = req.body;
    const session = await LoginSession.create({ student_id, pc_id });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logoutStudent = async (req, res) => {
  try {
    const session = await LoginSession.findByIdAndUpdate(
      req.params.sessionId,
      { logout_time: new Date() },
      { new: true }
    );
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFlaggedSessions = async (req, res) => {
  const flagged = await LoginSession.find({ flagged: true }).populate('student_id');
  res.json(flagged);
};
```

**4.3 — Wire up the routes:**
```javascript
// backend/src/routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/studentLoginController');

router.post('/login', controller.loginStudent);
router.put('/logout/:sessionId', controller.logoutStudent);
router.get('/flagged', controller.getFlaggedSessions);

module.exports = router;
```

**4.4 — Test it in Postman** before writing any frontend code:
- `POST http://localhost:5000/api/students/login` with body `{ "student_id": "...", "pc_id": "..." }`
- Confirm you get back a session object with an `_id`.
- This is your proof the backend works — screenshot it for your weekly progress report.

**Everyone repeats 4.2–4.4 for their own module** (hardware CRUD, exam assignment logic, usage tracking, alert generation).

---

## PHASE 5 (Week 6): Build the Frontend

**5.1 — Create an API service file** (keeps API calls out of your components):
```javascript
// frontend/src/services/studentService.js
const BASE_URL = 'http://localhost:5000/api/students';

export const loginStudent = async (student_id, pc_id) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, pc_id })
  });
  return res.json();
};

export const getFlaggedSessions = async () => {
  const res = await fetch(`${BASE_URL}/flagged`);
  return res.json();
};
```

**5.2 — Build the component:**
```jsx
// frontend/src/components/LoginForm.jsx
import { useState } from 'react';
import { loginStudent } from '../services/studentService';

export default function LoginForm() {
  const [studentId, setStudentId] = useState('');
  const [pcId, setPcId] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    const session = await loginStudent(studentId, pcId);
    setStatus(session._id ? 'Logged in successfully' : 'Login failed');
  };

  return (
    <div>
      <input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} />
      <input placeholder="PC ID" value={pcId} onChange={e => setPcId(e.target.value)} />
      <button onClick={handleSubmit}>Login</button>
      <p>{status}</p>
    </div>
  );
}
```

Follow the same pattern (service file + component) for your own module's screens from your Week 3 wireframe.

---

## PHASE 6 (Weeks 7–8): Finish Module Logic + Connect to Dashboard

- Finish any remaining logic specific to your module (e.g. the flagging rule for suspicious logins, the 5-minute hardware check interval, the auto-assignment algorithm for exams).
- Send Thenuwara your route list and response shape (e.g. "`GET /api/students/flagged` returns an array of session objects") so he can pull your data into the shared Admin Dashboard.

---

## PHASE 7 (Weeks 9–11): Integration & Testing

1. Merge your branch into `main` via Pull Request.
2. Pull the latest `main` and test that your module still works alongside everyone else's.
3. Manually test edge cases: What happens if a student logs in twice? What if the PC ID doesn't exist? Fix what breaks.
4. Write a short `README.md` section for your module: what it does, its endpoints, how to run it.

---

## PHASE 8 (Week 12): Polish & Demo

- Clean up console.logs and unused code.
- Prepare a 1–2 minute walkthrough of your module for the demo.
- Make sure your part of the GitHub repo is clean and pushed.

---

## Quick Reference: Weekly Checklist Per Person

| Week | What you personally produce |
|---|---|
| 1 | Requirements checklist for your module |
| 2 | Mongoose schema file(s), pushed to your branch |
| 3 | Wireframe image(s) for your screens |
| 4–5 | Working backend routes, tested in Postman |
| 6 | Working frontend screen(s) connected to your API |
| 7 | Core logic finished (alerts, flags, calculations) |
| 8 | API shared with Thenuwara for dashboard integration |
| 9 | Cross-module connections tested |
| 10–11 | Bugs fixed, module README written |
| 12 | Demo-ready, code cleaned up |

If you get stuck at any phase, the fix is almost always: go back to the previous phase's output and check it's actually correct before moving forward (e.g. if the frontend isn't showing data, re-test the backend route in Postman first).