/**
 * Public serializers for SMS identities. passwordHash is never included.
 */

function toPublicTeacher(teacher) {
  if (!teacher) return null;

  return {
    id: teacher.id,
    email: teacher.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    employeeCode: teacher.employeeCode,
    phone: teacher.phone,
    isActive: teacher.isActive,
    lastLoginAt: teacher.lastLoginAt,
    actor: 'teacher',
    deletedAt: teacher.deletedAt,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt,
  };
}

function toPublicStudent(student) {
  if (!student) return null;

  return {
    id: student.id,
    email: student.email,
    firstName: student.firstName,
    lastName: student.lastName,
    studentCode: student.studentCode,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    phone: student.phone,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    isActive: student.isActive,
    lastLoginAt: student.lastLoginAt,
    actor: 'student',
    deletedAt: student.deletedAt,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
  };
}

/** Minimal nested teacher reference (no contact details). */
function toTeacherRef(teacher) {
  if (!teacher) return null;

  return {
    id: teacher.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    employeeCode: teacher.employeeCode,
  };
}

/** Minimal nested student reference. */
function toStudentRef(student) {
  if (!student) return null;

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    studentCode: student.studentCode,
  };
}

module.exports = {
  toPublicTeacher,
  toPublicStudent,
  toTeacherRef,
  toStudentRef,
};
