const mongoose = require('mongoose');

/** A page visit recorded during a session, used for the usage report and blocked-site flags. */
const websiteActivitySchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoginSession',
      required: true,
      index: true
    },
    url: { type: String, required: true, trim: true },
    domain: { type: String, trim: true, lowercase: true, index: true },
    title: { type: String, trim: true },
    visitTime: { type: Date, required: true, default: Date.now },
    durationSeconds: { type: Number, default: 0, min: 0 },
    blocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

websiteActivitySchema.pre('validate', function deriveDomain(next) {
  if (!this.domain && this.url) {
    try {
      this.domain = new URL(this.url).hostname.replace(/^www\./, '');
    } catch (err) {
      // Agents occasionally report a bare hostname rather than a full URL.
      this.domain = this.url.split('/')[0].replace(/^www\./, '').toLowerCase();
    }
  }
  next();
});

module.exports = mongoose.model('WebsiteActivity', websiteActivitySchema);
