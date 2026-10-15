const { Computer, ExamAssignment } = require('../models');
const ApiError = require('../utils/ApiError');

/** Natural sort so PC-2 comes before PC-10. */
function comparePcNumber(a, b) {
  const na = parseInt((a.pcNumber.match(/\d+/) || [0])[0], 10);
  const nb = parseInt((b.pcNumber.match(/\d+/) || [0])[0], 10);
  if (na !== nb) return na - nb;
  return a.pcNumber.localeCompare(b.pcNumber);
}

/** Fisher-Yates, used when seating should not follow registration order. */
function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Seats a list of students on the usable PCs of an exam's lab.
 *
 * `strategy` is either 'sequential' (registration order onto PC order, which
 * is what invigilators expect for a printed seating list) or 'random' (spreads
 * the same batch apart to discourage copying).
 *
 * Existing assignments for the exam are replaced, so re-running after adding
 * students is safe.
 */
async function autoAssign(examSession, studentIds, { strategy = 'sequential' } = {}) {
  const computers = await Computer.find({
    lab: examSession.lab,
    status: { $ne: 'maintenance' }
  });

  if (!computers.length) {
    throw ApiError.badRequest('This lab has no usable computers to assign');
  }

  if (studentIds.length > computers.length) {
    throw ApiError.badRequest(
      `Cannot seat ${studentIds.length} students - the lab has only ${computers.length} usable computers`
    );
  }

  const orderedComputers = computers.sort(comparePcNumber);
  const orderedStudents = strategy === 'random' ? shuffle(studentIds) : studentIds;

  await ExamAssignment.deleteMany({ examSession: examSession._id });

  const assignments = orderedStudents.map((studentId, index) => ({
    examSession: examSession._id,
    student: studentId,
    computer: orderedComputers[index]._id,
    seatNumber: `S${String(index + 1).padStart(2, '0')}`,
    assignedAt: new Date(),
    signInStatus: 'pending'
  }));

  const created = await ExamAssignment.insertMany(assignments);

  return {
    assigned: created.length,
    unusedComputers: orderedComputers.length - created.length,
    strategy
  };
}

module.exports = { autoAssign, comparePcNumber };
