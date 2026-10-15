const {
  ApplicationUsage,
  AttendanceRecord,
  LoginSession,
  MonitoringPolicy,
  WebsiteActivity
} = require('../models');
const { toMinutes } = require('../utils/dates');

/**
 * Weighted rules behind "student login and identity misuse detection".
 * Each rule inspects one session and either returns null or a reason plus the
 * risk points it contributes. Rules are deliberately small and data-driven so
 * the team can add lab-specific rules without touching the evaluator.
 */
const RULES = [
  {
    key: 'no-activity',
    weight: 30,
    evaluate: ({ session, appUsage, policy }) => {
      const minutesOpen = toMinutes(session.durationSeconds);
      if (appUsage.length === 0 && minutesOpen >= 10) {
        return `Logged in for ${minutesOpen} min with no application activity recorded`;
      }
      return null;
    }
  },
  {
    key: 'below-minimum-activity',
    weight: 20,
    evaluate: ({ session, policy }) => {
      // Only meaningful once the sitting is long enough to judge.
      const minutesOpen = toMinutes(session.durationSeconds);
      const activeMinutes = toMinutes(session.activeSeconds);
      if (minutesOpen >= policy.minActiveMinutes && activeMinutes < policy.minActiveMinutes) {
        return `Active time ${activeMinutes} min is below the required ${policy.minActiveMinutes} min`;
      }
      return null;
    }
  },
  {
    key: 'mostly-idle',
    weight: 15,
    evaluate: ({ session }) => {
      const total = session.activeSeconds + session.idleSeconds;
      if (total >= 1800 && session.idleSeconds / total > 0.8) {
        return `Idle for ${Math.round((session.idleSeconds / total) * 100)}% of the session`;
      }
      return null;
    }
  },
  {
    key: 'blocked-application',
    weight: 25,
    evaluate: ({ appUsage, policy }) => {
      const blocked = policy.blockedApps || [];
      if (!blocked.length) return null;
      const hits = appUsage
        .filter((u) => blocked.some((b) => u.appName.toLowerCase().includes(b.toLowerCase())))
        .map((u) => u.appName);
      const unique = [...new Set(hits)];
      return unique.length ? `Blocked application used: ${unique.join(', ')}` : null;
    }
  },
  {
    key: 'blocked-website',
    weight: 25,
    evaluate: ({ webActivity, policy }) => {
      const blocked = policy.blockedDomains || [];
      if (!blocked.length) return null;
      const hits = webActivity
        .filter((w) => blocked.some((b) => (w.domain || '').includes(b.toLowerCase())))
        .map((w) => w.domain);
      const unique = [...new Set(hits)];
      return unique.length ? `Blocked website visited: ${unique.join(', ')}` : null;
    }
  },
  {
    key: 'concurrent-session',
    weight: 40,
    evaluate: ({ concurrentCount }) =>
      concurrentCount > 0
        ? `Account is signed in on ${concurrentCount + 1} computers at the same time`
        : null
  },
  {
    key: 'wrong-exam-pc',
    weight: 40,
    evaluate: ({ session, assignedComputerId }) => {
      if (session.sessionType !== 'exam' || !assignedComputerId) return null;
      const actual = session.computer._id ? session.computer._id.toString() : session.computer.toString();
      return actual !== assignedComputerId.toString()
        ? 'Signed in on a computer other than the one assigned for this exam'
        : null;
    }
  }
];

/**
 * Re-runs every rule for a session and persists the outcome. Called whenever
 * new activity arrives and again when the session ends.
 *
 * @returns {{flagged: boolean, riskScore: number, flagReasons: string[]}}
 */
async function evaluateSession(sessionId, { assignedComputerId } = {}) {
  const session = await LoginSession.findById(sessionId);
  if (!session) return null;

  const [appUsage, webActivity, policy, concurrentCount] = await Promise.all([
    ApplicationUsage.find({ session: session._id }).lean(),
    WebsiteActivity.find({ session: session._id }).lean(),
    MonitoringPolicy.resolveFor(session.lab),
    LoginSession.countDocuments({
      student: session.student,
      status: 'active',
      _id: { $ne: session._id }
    })
  ]);

  const context = { session, appUsage, webActivity, policy, concurrentCount, assignedComputerId };

  const reasons = [];
  let riskScore = 0;

  for (const rule of RULES) {
    const reason = rule.evaluate(context);
    if (reason) {
      reasons.push(reason);
      riskScore += rule.weight;
    }
  }

  riskScore = Math.min(riskScore, 100);

  session.flagReasons = reasons;
  session.riskScore = riskScore;
  session.flagged = reasons.length > 0;
  await session.save();

  await syncAttendance(session, policy, appUsage);

  return { flagged: session.flagged, riskScore, flagReasons: reasons };
}

/**
 * Keeps the attendance record in step with the session's measured activity.
 * A student is 'present' only once they clear the minimum active time and have
 * opened every required application.
 */
async function syncAttendance(session, policy, appUsage) {
  const activeMinutes = toMinutes(session.activeSeconds);
  const requiredApps = policy.requiredApps || [];
  const usedApps = appUsage.map((u) => u.appName.toLowerCase());

  const requiredAppsUsed = requiredApps.filter((app) =>
    usedApps.some((used) => used.includes(app.toLowerCase()))
  );
  const requiredAppsMissing = requiredApps.filter((app) => !requiredAppsUsed.includes(app));

  const meetsMinActivity =
    activeMinutes >= policy.minActiveMinutes && requiredAppsMissing.length === 0;

  // While a session is still running, "not yet enough activity" is not a
  // failure - only judge it as flagged once the sitting has ended.
  const status = meetsMinActivity ? 'present' : session.status === 'active' ? 'present' : 'flagged';

  await AttendanceRecord.findOneAndUpdate(
    { session: session._id },
    {
      $set: {
        student: session.student,
        lab: session.lab,
        date: session.loginTime,
        status,
        meetsMinActivity,
        activeMinutes,
        requiredMinutes: policy.minActiveMinutes,
        requiredAppsUsed,
        requiredAppsMissing
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { evaluateSession, RULES };
