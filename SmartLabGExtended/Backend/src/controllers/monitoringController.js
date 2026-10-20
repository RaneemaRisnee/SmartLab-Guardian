const MonitoringSession = require('../models/MonitoringSession');
const MonitoringBatch = require('../models/MonitoringBatch');

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const STATUSES = ['ACTIVE', 'INACTIVE', 'SESSION_ENDED'];

function allowedComputerIds() {
  return String(process.env.AGENT_PC_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
}

function validId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value.trim());
}

function allowedPc(pcId) {
  const allowlist = allowedComputerIds();
  if (allowlist.length === 0) return { error: 'Monitoring computer allowlist is not configured', status: 503 };
  if (!validId(pcId) || !allowlist.includes(pcId.trim())) {
    return { error: 'Computer is not authorized for monitoring', status: 403 };
  }
  return null;
}

function parsedDate(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validSummary(summary, final) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return false;
  if (!STATUSES.includes(summary.current_status)) return false;
  if (final !== (summary.current_status === 'SESSION_ENDED')) return false;
  if (!Number.isFinite(summary.active_seconds) || summary.active_seconds < 0 || summary.active_seconds > 31536000) return false;
  if (!Number.isFinite(summary.inactive_seconds) || summary.inactive_seconds < 0 || summary.inactive_seconds > 31536000) return false;
  if (!Number.isInteger(summary.transition_count) || summary.transition_count < 0 || summary.transition_count > 1000000) return false;
  if (summary.last_activity_at != null && !parsedDate(summary.last_activity_at)) return false;
  return true;
}

function validAppUsage(records) {
  if (!Array.isArray(records) || records.length > 500) return false;
  return records.every((record) => {
    if (!record || typeof record !== 'object') return false;
    const start = parsedDate(record.started_at);
    const end = parsedDate(record.ended_at);
    return typeof record.app_name === 'string' && record.app_name.trim().length > 0 && record.app_name.length <= 128
      && typeof record.executable_name === 'string' && record.executable_name.trim().length > 0 && record.executable_name.length <= 260
      && start && end && end >= start
      && Number.isFinite(record.duration_seconds) && record.duration_seconds >= 0 && record.duration_seconds <= 86400;
  });
}

function validActivityChanges(changes, final) {
  if (!Array.isArray(changes) || changes.length > 100) return false;
  return changes.every((change) => change && STATUSES.includes(change.status)
    && (final || change.status !== 'SESSION_ENDED')
    && parsedDate(change.timestamp)
    && (change.last_activity_at == null || parsedDate(change.last_activity_at)));
}

function sessionResponse(session, res, status) {
  return res.status(status).json({
    session_id: session.session_id,
    pc_id: session.pc_id,
    status: session.status,
    started_at: session.started_at,
    ended_at: session.ended_at,
  });
}

// POST /api/monitoring/sessions/start
// The student/session manager must call this only after it has authorized a session.
exports.startSession = async (req, res) => {
  try {
    const { pc_id: pcId, session_id: sessionId } = req.body || {};
    const pcError = allowedPc(pcId);
    if (pcError) return res.status(pcError.status).json({ error: pcError.error });
    if (!validId(sessionId)) return res.status(400).json({ error: 'A valid authorized session_id is required' });

    const existing = await MonitoringSession.findOne({ session_id: sessionId.trim() });
    if (existing) {
      if (existing.pc_id !== pcId.trim()) return res.status(409).json({ error: 'Session is already bound to a different computer' });
      if (existing.status !== 'active') return res.status(409).json({ error: 'Session has already ended' });
      return sessionResponse(existing, res, 200);
    }
    const session = await MonitoringSession.create({
      session_id: sessionId.trim(), pc_id: pcId.trim(), status: 'active', started_at: new Date(),
    });
    return sessionResponse(session, res, 201);
  } catch (err) {
    if (err.code === 11000) {
      const existing = await MonitoringSession.findOne({ session_id: String(req.body?.session_id || '').trim() });
      if (existing && existing.pc_id === String(req.body?.pc_id || '').trim() && existing.status === 'active') {
        return sessionResponse(existing, res, 200);
      }
      return res.status(409).json({ error: 'Session ID is already in use' });
    }
    console.error('[startMonitoringSession]', err.message);
    return res.status(500).json({ error: 'Unable to start monitoring session' });
  }
};

// POST /api/monitoring/sessions/:sessionId/batches
exports.receiveBatch = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const body = req.body || {};
    const pcError = allowedPc(body.pc_id);
    if (pcError) return res.status(pcError.status).json({ error: pcError.error });
    if (!validId(sessionId) || body.session_id !== sessionId) {
      return res.status(400).json({ error: 'Session ID does not match the request path' });
    }
    if (!validId(body.batch_id)) return res.status(400).json({ error: 'A valid batch_id is required' });
    if (typeof body.final !== 'boolean' || !validSummary(body.summary, body.final)
      || !validAppUsage(body.app_usage) || !validActivityChanges(body.activity_changes, body.final)) {
      return res.status(400).json({ error: 'Invalid monitoring batch' });
    }
    const endedAt = body.final ? parsedDate(body.ended_at) : null;
    if (body.final && !endedAt) return res.status(400).json({ error: 'A valid ended_at is required for a final batch' });

    // Idempotency check precedes active-session validation so a lost response
    // after successful finalization can be retried safely.
    let batch = await MonitoringBatch.findOne({ batch_id: body.batch_id.trim() });
    let duplicate = Boolean(batch);
    if (batch && (batch.session_id !== sessionId || batch.pc_id !== body.pc_id.trim())) {
      return res.status(409).json({ error: 'Batch ID is already bound to another session' });
    }
    if (!batch) {
      const session = await MonitoringSession.findOne({ session_id: sessionId, pc_id: body.pc_id.trim(), status: 'active' });
      if (!session) return res.status(409).json({ error: 'No active authorized monitoring session matches this computer' });
      try {
        batch = await MonitoringBatch.create({
          batch_id: body.batch_id.trim(), session_id: sessionId, pc_id: body.pc_id.trim(),
          app_usage: body.app_usage, activity_changes: body.activity_changes,
          summary: body.summary, final: body.final, ended_at: endedAt,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
        batch = await MonitoringBatch.findOne({ batch_id: body.batch_id.trim() });
        duplicate = true;
        if (!batch || batch.session_id !== sessionId || batch.pc_id !== body.pc_id.trim()) {
          return res.status(409).json({ error: 'Batch ID is already in use' });
        }
      }
    }

    const update = { summary: body.summary };
    if (body.final) Object.assign(update, { status: 'ended', ended_at: endedAt });
    // Re-applying a duplicate batch is safe and repairs a possible interruption
    // between batch persistence and session summary update.
    await MonitoringSession.updateOne(
      { session_id: sessionId, pc_id: body.pc_id.trim(), ...(body.final ? {} : { status: 'active' }) },
      { $set: update }
    );
    return res.status(200).json({ accepted: true, duplicate });
  } catch (err) {
    console.error('[receiveMonitoringBatch]', err.message);
    return res.status(500).json({ error: 'Unable to store monitoring batch' });
  }
};
