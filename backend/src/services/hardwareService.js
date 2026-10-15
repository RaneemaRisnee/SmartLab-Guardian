const {
  Computer,
  HardwareDevice,
  HardwareRemovalAlert,
  LoginSession
} = require('../models');
const { emitEvent } = require('../realtime/io');

/** Devices whose disappearance is worth waking an admin for. */
const HIGH_VALUE_TYPES = ['system-unit', 'monitor', 'storage'];

function severityFor(deviceType) {
  if (HIGH_VALUE_TYPES.includes(deviceType)) return 'high';
  if (deviceType === 'other') return 'low';
  return 'medium';
}

/**
 * Pairs each registered device with at most one scanned device, and vice
 * versa, so a device already claimed by one match is never claimed again.
 *
 * Serial numbers decide a match whenever both sides report one - that is the
 * only identifier precise enough to tell apart two devices of the same type
 * on one PC (e.g. dual monitors). Everything else is matched by type alone:
 * a real USB "model" string from the OS almost never lines up with the
 * free-text model an admin typed into the inventory, so requiring both to
 * match would silently treat every ordinary scan as a full removal. A lab PC
 * normally has exactly one of each device type, so type-only matching is
 * right in the common case and only becomes ambiguous for true duplicates,
 * which serials would resolve anyway.
 *
 * @returns {{matched: Map<string, Object>, unknown: Array}} matched keys are
 *   registered device ids; unknown is the scanned devices left unclaimed.
 */
function matchDevices(registered, scanned) {
  const remaining = [...scanned];
  const matched = new Map();

  const claim = (device, predicate) => {
    const index = remaining.findIndex(predicate);
    if (index === -1) return false;
    matched.set(device._id.toString(), remaining[index]);
    remaining.splice(index, 1);
    return true;
  };

  // Pass 1: exact serial number match.
  for (const device of registered) {
    const serial = (device.serialNumber || '').trim().toLowerCase();
    if (!serial) continue;
    claim(device, (s) => (s.serialNumber || '').trim().toLowerCase() === serial);
  }

  // Pass 2: same type, preferring a matching model when both sides give one.
  for (const device of registered) {
    if (matched.has(device._id.toString())) continue;
    const model = (device.model || '').trim().toLowerCase();

    if (model) {
      const gotModelMatch = claim(
        device,
        (s) => s.deviceType === device.deviceType && (s.model || '').trim().toLowerCase() === model
      );
      if (gotModelMatch) continue;
    }

    claim(device, (s) => s.deviceType === device.deviceType && !s.serialNumber);
  }

  return { matched, unknown: remaining };
}

/**
 * Compares what the agent currently sees on a PC against the devices
 * registered to it, then records the difference.
 *
 * Devices present again are marked connected (and any open alert for them is
 * closed as a false alarm); devices that vanished are marked disconnected and
 * raise an alert. Unknown devices are reported back but never auto-registered,
 * so the inventory stays under admin control.
 *
 * @param {Object} computer - the Computer document being scanned
 * @param {Array}  scannedDevices - [{ deviceType, vendor, model, serialNumber }]
 * @returns {{reconnected: number, removed: Array, unknown: Array, alerts: Array}}
 */
async function processHardwareScan(computer, scannedDevices = [], scanTime = new Date()) {
  const registered = await HardwareDevice.find({
    computer: computer._id,
    status: { $nin: ['retired', 'in-store'] }
  });

  const { matched, unknown } = matchDevices(registered, scannedDevices);

  const stillPresent = registered.filter((d) => matched.has(d._id.toString()));
  const missing = registered.filter((d) => !matched.has(d._id.toString()));

  // Devices seen again: refresh them and retire any stale open alert.
  let reconnected = 0;
  for (const device of stillPresent) {
    const wasDisconnected = device.status !== 'connected';
    device.status = 'connected';
    device.lastSeenAt = scanTime;
    await device.save();

    if (wasDisconnected) {
      reconnected += 1;
      await HardwareRemovalAlert.updateMany(
        { hardwareDevice: device._id, status: 'open' },
        {
          $set: {
            status: 'false-alarm',
            resolutionNote: 'Device reconnected before the alert was reviewed',
            reviewedAt: scanTime
          }
        }
      );
    }
  }

  // Devices that disappeared since the previous scan raise one alert each.
  const activeSession = await LoginSession.findOne({
    computer: computer._id,
    status: 'active'
  }).select('student');

  const alerts = [];
  for (const device of missing) {
    if (device.status === 'disconnected' || device.status === 'missing') {
      // Already reported - do not spam a new alert every scan interval.
      continue;
    }

    device.status = 'disconnected';
    await device.save();

    const alert = await HardwareRemovalAlert.create({
      hardwareDevice: device._id,
      computer: computer._id,
      lab: computer.lab,
      deviceType: device.deviceType,
      deviceLabel: [device.vendor, device.model].filter(Boolean).join(' ') || device.hardwareId,
      removalTime: scanTime,
      detectedAt: scanTime,
      severity: severityFor(device.deviceType),
      activeSessionStudent: activeSession ? activeSession.student : undefined
    });

    alerts.push(alert);
  }

  if (alerts.length) {
    emitEvent('hardware:alert', {
      computer: computer.pcNumber,
      count: alerts.length,
      severity: alerts[0].severity
    });
  }

  return {
    reconnected,
    removed: missing.map((d) => ({ hardwareId: d.hardwareId, deviceType: d.deviceType })),
    unknown,
    alerts
  };
}

/** Counts by status and condition for the inventory summary cards. */
async function inventorySummary(filter = {}) {
  const [byStatus, byType, byCondition, total] = await Promise.all([
    HardwareDevice.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    HardwareDevice.aggregate([
      { $match: filter },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    HardwareDevice.aggregate([
      { $match: filter },
      { $group: { _id: '$condition', count: { $sum: 1 } } }
    ]),
    HardwareDevice.countDocuments(filter)
  ]);

  const toMap = (rows) =>
    rows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});

  return {
    total,
    byStatus: toMap(byStatus),
    byCondition: toMap(byCondition),
    byType: byType.map((r) => ({ deviceType: r._id, count: r.count }))
  };
}

/** Marks PCs whose agent has gone quiet as offline. Run on the heartbeat sweep. */
async function markStaleComputersOffline(timeoutMinutes = 10) {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60000);
  const result = await Computer.updateMany(
    { status: { $in: ['available', 'in-use'] }, lastHeartbeatAt: { $lt: cutoff } },
    { $set: { status: 'offline' } }
  );
  return result.modifiedCount || 0;
}

module.exports = { processHardwareScan, inventorySummary, markStaleComputersOffline, severityFor };
