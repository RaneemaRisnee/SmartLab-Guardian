const mongoose = require('mongoose');

/**
 * The "minimum activity level" a lecturer sets for students, plus the blocked
 * lists the flagging rules check against. A policy with `lab: null` is the
 * global default used by any lab without its own policy.
 */
const monitoringPolicySchema = new mongoose.Schema(
  {
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null, unique: true },
    minActiveMinutes: { type: Number, default: 30, min: 0 },
    idleThresholdSeconds: { type: Number, default: 300, min: 30 },
    requiredApps: [{ type: String, trim: true }],
    blockedApps: [{ type: String, trim: true }],
    blockedDomains: [{ type: String, trim: true, lowercase: true }],
    hardwareScanIntervalMinutes: { type: Number, default: 5, min: 1 },
    heartbeatTimeoutMinutes: { type: Number, default: 10, min: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

/**
 * Resolves the policy that applies to a lab, falling back to the global
 * default, and finally to in-code defaults if the collection is still empty.
 */
monitoringPolicySchema.statics.resolveFor = async function resolveFor(labId) {
  const [labPolicy, globalPolicy] = await Promise.all([
    labId ? this.findOne({ lab: labId }) : null,
    this.findOne({ lab: null })
  ]);

  return (
    labPolicy ||
    globalPolicy || {
      minActiveMinutes: 30,
      idleThresholdSeconds: 300,
      requiredApps: [],
      blockedApps: [],
      blockedDomains: [],
      hardwareScanIntervalMinutes: 5,
      heartbeatTimeoutMinutes: 10
    }
  );
};

module.exports = mongoose.model('MonitoringPolicy', monitoringPolicySchema);
