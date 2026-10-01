/** Single import point for every model, so controllers stay tidy. */
module.exports = {
  ApplicationUsage: require('./ApplicationUsage'),
  AttendanceRecord: require('./AttendanceRecord'),
  Computer: require('./Computer'),
  ExamAssignment: require('./ExamAssignment'),
  ExamSession: require('./ExamSession'),
  HardwareDevice: require('./HardwareDevice'),
  HardwareRemovalAlert: require('./HardwareRemovalAlert'),
  Lab: require('./Lab'),
  LoginSession: require('./LoginSession'),
  MonitoringPolicy: require('./MonitoringPolicy'),
  Student: require('./Student'),
  UsageReport: require('./UsageReport'),
  User: require('./User'),
  WebsiteActivity: require('./WebsiteActivity')
};
