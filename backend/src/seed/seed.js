/**
 * Seeds a demo dataset: two labs, staff accounts, students, hardware, a week
 * of sessions with realistic usage, open hardware alerts and a scheduled exam.
 *
 *   npm run seed          add/refresh the demo data
 *   npm run seed:fresh    wipe the collections first
 *
 * The demo passwords below are for local development only.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const {
  ApplicationUsage,
  AttendanceRecord,
  Computer,
  ExamAssignment,
  ExamSession,
  HardwareDevice,
  HardwareRemovalAlert,
  Lab,
  LoginSession,
  MonitoringPolicy,
  Student,
  UsageReport,
  User,
  WebsiteActivity
} = require('../models');
const { evaluateSession } = require('../services/flaggingService');

const FRESH = process.argv.includes('--fresh');

const STAFF = [
  { name: 'Lab Administrator', email: 'admin@vau.ac.lk', role: 'admin', password: 'Admin@12345' },
  { name: 'Ms. S. Bramyah', email: 'lecturer@vau.ac.lk', role: 'lecturer', password: 'Lecturer@12345' },
  { name: 'Exam Coordinator', email: 'examiner@vau.ac.lk', role: 'examiner', password: 'Examiner@12345' }
];

const STUDENTS = [
  { regNo: '2021/ICT/128', name: 'M.A. Raneema Risnee', batch: '2021' },
  { regNo: '2022/ICT/36', name: 'T.A.H.M. Thenuwara', batch: '2022' },
  { regNo: '2022/ICT/52', name: 'P.A. Thilini Tharushika', batch: '2022' },
  { regNo: '2022/ICT/126', name: 'J. Kokulan', batch: '2022' },
  { regNo: '2022/ICT/135', name: 'D.A.R.Y. Athukorala', batch: '2022' },
  { regNo: '2022/ICT/141', name: 'A.F. Shahnaz', batch: '2022' },
  { regNo: '2022/ICT/07', name: 'K. Nirojan', batch: '2022' },
  { regNo: '2022/ICT/18', name: 'S. Fathima Rizna', batch: '2022' },
  { regNo: '2022/ICT/44', name: 'W.M. Dilshan Perera', batch: '2022' },
  { regNo: '2022/ICT/91', name: 'B. Arulnesan', batch: '2022' },
  { regNo: '2022/ICT/103', name: 'H.M. Sanduni Herath', batch: '2022' },
  { regNo: '2022/ICT/117', name: 'M.I. Ahamed Rifky', batch: '2022' }
];

const DEVICE_TYPES = ['keyboard', 'mouse', 'monitor', 'system-unit'];
const APPS = [
  { appName: 'Visual Studio Code', category: 'development' },
  { appName: 'Google Chrome', category: 'browser' },
  { appName: 'MySQL Workbench', category: 'development' },
  { appName: 'Microsoft Word', category: 'productivity' },
  { appName: 'File Explorer', category: 'system' },
  { appName: 'Steam', category: 'game' },
  { appName: 'VLC Media Player', category: 'media' }
];
const SITES = [
  'https://stackoverflow.com/questions/tagged/node.js',
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'https://github.com/RaneemaRisnee/SmartLab-Guardian',
  'https://www.youtube.com/watch?v=demo',
  'https://web.facebook.com/'
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function wipe() {
  console.log('Clearing existing collections...');
  await Promise.all([
    ApplicationUsage.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    Computer.deleteMany({}),
    ExamAssignment.deleteMany({}),
    ExamSession.deleteMany({}),
    HardwareDevice.deleteMany({}),
    HardwareRemovalAlert.deleteMany({}),
    Lab.deleteMany({}),
    LoginSession.deleteMany({}),
    MonitoringPolicy.deleteMany({}),
    Student.deleteMany({}),
    UsageReport.deleteMany({}),
    User.deleteMany({}),
    WebsiteActivity.deleteMany({})
  ]);
}

async function seedStaff() {
  const created = {};
  for (const row of STAFF) {
    let user = await User.findOne({ email: row.email });
    if (!user) {
      user = new User({
        name: row.name,
        email: row.email,
        role: row.role,
        department: 'Physical Science'
      });
      user.password = row.password;
      await user.save();
    }
    created[row.role] = user;
  }
  console.log(`Staff accounts ready: ${Object.keys(created).join(', ')}`);
  return created;
}

async function seedStudents() {
  const students = [];
  for (const row of STUDENTS) {
    let student = await Student.findOne({ regNo: row.regNo });
    if (!student) {
      student = new Student({
        regNo: row.regNo,
        name: row.name,
        email: `${row.regNo.replace(/[^a-z0-9]/gi, '').toLowerCase()}@stu.vau.ac.lk`,
        batch: row.batch,
        department: 'Physical Science'
      });
      student.password = process.env.DEFAULT_STUDENT_PASSWORD || 'Student@123';
      await student.save();
    }
    students.push(student);
  }
  console.log(`Students ready: ${students.length}`);
  return students;
}

async function seedLabs() {
  const definitions = [
    { code: 'LAB-A', name: 'Computer Laboratory A', location: 'Ground Floor, Applied Science', capacity: 12 },
    { code: 'LAB-B', name: 'Computer Laboratory B', location: 'First Floor, Applied Science', capacity: 8 }
  ];

  const labs = [];
  for (const def of definitions) {
    let lab = await Lab.findOne({ code: def.code });
    if (!lab) lab = await Lab.create(def);
    labs.push(lab);
  }
  console.log(`Labs ready: ${labs.map((l) => l.code).join(', ')}`);
  return labs;
}

async function seedComputers(labs) {
  const computers = [];

  for (const lab of labs) {
    const prefix = lab.code === 'LAB-A' ? 'PCA' : 'PCB';
    for (let i = 1; i <= lab.capacity; i += 1) {
      const pcNumber = `${prefix}-${String(i).padStart(2, '0')}`;
      let computer = await Computer.findOne({ pcNumber });
      if (!computer) {
        computer = await Computer.create({
          pcNumber,
          lab: lab._id,
          hostname: pcNumber.toLowerCase().replace('-', ''),
          ipAddress: `192.168.${lab.code === 'LAB-A' ? 10 : 11}.${i + 10}`,
          macAddress: `00:1B:44:11:${String(i).padStart(2, '0')}:${lab.code === 'LAB-A' ? 'A1' : 'B1'}`,
          status: i % 7 === 0 ? 'maintenance' : 'available',
          specs: { cpu: 'Intel Core i5-10400', ramGb: 8, storageGb: 512, os: 'Windows 11 Pro' },
          agentVersion: '1.0.0',
          lastHeartbeatAt: new Date()
        });
      }
      computers.push(computer);
    }
  }

  console.log(`Computers ready: ${computers.length}`);
  return computers;
}

async function seedHardware(computers) {
  let count = 0;

  for (const computer of computers) {
    for (const deviceType of DEVICE_TYPES) {
      const hardwareId = `HW-${computer.pcNumber}-${deviceType.slice(0, 3).toUpperCase()}`;
      const existing = await HardwareDevice.findOne({ hardwareId });
      if (existing) continue;

      await HardwareDevice.create({
        hardwareId,
        computer: computer._id,
        lab: computer.lab,
        deviceType,
        vendor: pick(['Dell', 'HP', 'Logitech', 'Lenovo']),
        model: `${deviceType}-${randInt(100, 999)}`,
        serialNumber: `SN${randInt(100000, 999999)}`,
        condition: Math.random() < 0.1 ? 'fair' : 'good',
        status: 'connected',
        location: computer.pcNumber,
        lastSeenAt: new Date()
      });
      count += 1;
    }
  }

  // A few spares sitting in the store room.
  for (let i = 1; i <= 4; i += 1) {
    const hardwareId = `HW-STORE-${String(i).padStart(2, '0')}`;
    if (await HardwareDevice.findOne({ hardwareId })) continue;
    await HardwareDevice.create({
      hardwareId,
      deviceType: pick(DEVICE_TYPES),
      vendor: 'Dell',
      model: `spare-${randInt(100, 999)}`,
      serialNumber: `SN${randInt(100000, 999999)}`,
      condition: 'new',
      status: 'in-store',
      location: 'Store room'
    });
    count += 1;
  }

  console.log(`Hardware devices ready: ${count} new`);
}

async function seedPolicy(admin, labs) {
  const global = await MonitoringPolicy.findOne({ lab: null });
  if (!global) {
    await MonitoringPolicy.create({
      lab: null,
      minActiveMinutes: 30,
      idleThresholdSeconds: 300,
      requiredApps: [],
      blockedApps: ['Steam', 'VLC Media Player'],
      blockedDomains: ['facebook.com', 'tiktok.com'],
      hardwareScanIntervalMinutes: 5,
      heartbeatTimeoutMinutes: 10,
      updatedBy: admin._id
    });
  }

  const labA = labs.find((l) => l.code === 'LAB-A');
  if (labA && !(await MonitoringPolicy.findOne({ lab: labA._id }))) {
    await MonitoringPolicy.create({
      lab: labA._id,
      minActiveMinutes: 45,
      idleThresholdSeconds: 240,
      requiredApps: ['Visual Studio Code'],
      blockedApps: ['Steam'],
      blockedDomains: ['facebook.com', 'tiktok.com', 'youtube.com'],
      hardwareScanIntervalMinutes: 5,
      heartbeatTimeoutMinutes: 10,
      updatedBy: admin._id
    });
  }

  console.log('Monitoring policies ready');
}

/** Builds a past session with usage rows, then runs the real flagging rules over it. */
async function createHistoricSession(student, computer, dayOffset) {
  const loginTime = new Date();
  loginTime.setDate(loginTime.getDate() - dayOffset);
  loginTime.setHours(randInt(8, 13), randInt(0, 59), 0, 0);

  const durationMinutes = randInt(35, 150);
  const logoutTime = new Date(loginTime.getTime() + durationMinutes * 60000);

  // Most students work steadily; roughly one in four mostly idles.
  const slacking = Math.random() < 0.25;
  const activeRatio = slacking ? Math.random() * 0.3 : 0.6 + Math.random() * 0.35;
  const activeSeconds = Math.round(durationMinutes * 60 * activeRatio);
  const idleSeconds = durationMinutes * 60 - activeSeconds;

  const session = await LoginSession.create({
    student: student._id,
    computer: computer._id,
    lab: computer.lab,
    sessionType: 'lab',
    loginTime,
    logoutTime,
    lastActivityAt: logoutTime,
    activeSeconds,
    idleSeconds,
    status: 'ended'
  });

  const appRows = [];
  let cursor = loginTime.getTime();
  const appCount = slacking ? randInt(1, 2) : randInt(3, 5);

  for (let i = 0; i < appCount; i += 1) {
    const app = slacking && i === 0 ? pick([APPS[5], APPS[6], APPS[1]]) : pick(APPS);
    const seconds = randInt(300, 2400);
    appRows.push({
      session: session._id,
      appName: app.appName,
      windowTitle: `${app.appName} - work`,
      category: app.category,
      startTime: new Date(cursor),
      endTime: new Date(cursor + seconds * 1000),
      durationSeconds: seconds,
      blocked: ['Steam', 'VLC Media Player'].includes(app.appName)
    });
    cursor += seconds * 1000;
  }
  await ApplicationUsage.insertMany(appRows);

  const siteCount = randInt(1, 4);
  for (let i = 0; i < siteCount; i += 1) {
    const url = slacking ? pick(SITES.slice(3)) : pick(SITES.slice(0, 3));
    await WebsiteActivity.create({
      session: session._id,
      url,
      title: 'Visited page',
      visitTime: new Date(loginTime.getTime() + randInt(60, durationMinutes * 60) * 1000),
      durationSeconds: randInt(60, 900),
      blocked: url.includes('facebook.com')
    });
  }

  await evaluateSession(session._id);
  return session;
}

async function seedSessions(students, computers) {
  const existing = await LoginSession.countDocuments();
  if (existing > 0) {
    console.log(`Sessions already present (${existing}) - skipping history generation`);
    return;
  }

  const usable = computers.filter((c) => c.status !== 'maintenance');
  let created = 0;

  for (let day = 1; day <= 7; day += 1) {
    const attendees = [...students].sort(() => Math.random() - 0.5).slice(0, randInt(5, 9));
    for (const student of attendees) {
      await createHistoricSession(student, pick(usable), day);
      created += 1;
    }
  }

  // Two sittings still open right now, so the live view has something in it.
  const labA = usable.filter((c) => c.pcNumber.startsWith('PCA'));
  for (let i = 0; i < 2; i += 1) {
    const computer = labA[i];
    const student = students[i];
    const loginTime = new Date(Date.now() - randInt(20, 90) * 60000);

    const session = await LoginSession.create({
      student: student._id,
      computer: computer._id,
      lab: computer.lab,
      sessionType: 'lab',
      loginTime,
      lastActivityAt: new Date(),
      activeSeconds: randInt(600, 3000),
      idleSeconds: randInt(120, 900),
      status: 'active'
    });

    await ApplicationUsage.create({
      session: session._id,
      appName: 'Visual Studio Code',
      windowTitle: 'server.js - SmartLab Guardian',
      category: 'development',
      startTime: loginTime,
      durationSeconds: randInt(600, 2400)
    });

    computer.status = 'in-use';
    await computer.save();
    await evaluateSession(session._id);
    created += 1;
  }

  console.log(`Sessions ready: ${created}`);
}

async function seedAlerts(computers) {
  if ((await HardwareRemovalAlert.countDocuments()) > 0) {
    console.log('Hardware alerts already present - skipping');
    return;
  }

  const candidates = await HardwareDevice.find({
    status: 'connected',
    deviceType: { $in: ['mouse', 'keyboard', 'monitor'] }
  }).limit(3);

  for (const [index, device] of candidates.entries()) {
    device.status = 'disconnected';
    await device.save();

    const computer = computers.find((c) => c._id.toString() === device.computer.toString());
    const removalTime = new Date(Date.now() - (index + 1) * 3600000);

    await HardwareRemovalAlert.create({
      hardwareDevice: device._id,
      computer: device.computer,
      lab: device.lab,
      deviceType: device.deviceType,
      deviceLabel: `${device.vendor} ${device.model}`,
      removalTime,
      detectedAt: removalTime,
      severity: device.deviceType === 'monitor' ? 'high' : 'medium',
      status: index === 2 ? 'acknowledged' : 'open'
    });

    console.log(`  alert: ${device.deviceType} removed from ${computer ? computer.pcNumber : 'unknown PC'}`);
  }

  console.log('Hardware removal alerts ready: 3');
}

async function seedExam(examiner, labs, students) {
  const code = 'IT3162-PRAC-01';
  if (await ExamSession.findOne({ code })) {
    console.log('Exam session already present - skipping');
    return;
  }

  const labB = labs.find((l) => l.code === 'LAB-B') || labs[0];
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 3);

  const exam = await ExamSession.create({
    code,
    name: 'IT3162 Practical Examination - Paper I',
    lab: labB._id,
    examDate,
    startTime: '09:00',
    endTime: '11:00',
    status: 'scheduled',
    autoSignIn: true,
    createdBy: examiner._id,
    notes: 'Seating generated automatically from the candidate spreadsheet.'
  });

  const { autoAssign } = require('../services/assignmentService');
  const candidates = students.slice(0, 6).map((s) => s._id);
  const result = await autoAssign(exam, candidates, { strategy: 'sequential' });

  console.log(`Exam session ready: ${exam.code} with ${result.assigned} candidates seated`);
}

async function run() {
  await connectDB();

  if (FRESH) await wipe();

  const staff = await seedStaff();
  const students = await seedStudents();
  const labs = await seedLabs();
  const computers = await seedComputers(labs);

  await seedHardware(computers);
  await seedPolicy(staff.admin, labs);
  await seedSessions(students, computers);
  await seedAlerts(computers);
  await seedExam(staff.examiner, labs, students);

  console.log('\nSeed complete. Sign in to the dashboard with:');
  for (const row of STAFF) {
    console.log(`  ${row.role.padEnd(9)} ${row.email}  /  ${row.password}`);
  }
  console.log(`\nStudent lab logins use the registration number (e.g. 2021ict128) with password "${
    process.env.DEFAULT_STUDENT_PASSWORD || 'Student@123'
  }".`);

  await mongoose.connection.close();
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
