import Patient from '../models/Patient.js';

export async function getAccessiblePatients(userId, role) {
  if (role === 'caregiver') {
    return Patient.find({
      $or: [{ userId }, { ownerId: userId }],
    });
  }
  return Patient.find({ userId });
}

export async function verifyPatientAccess(userId, patientId, role) {
  const query =
    role === 'caregiver'
      ? { _id: patientId, $or: [{ userId }, { ownerId: userId }] }
      : { _id: patientId, userId };

  return Patient.findOne(query);
}
