const feeService = require('../../services/sms/fee.service');
const { sendSuccess } = require('../../utils/apiResponse');

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  };
}

function adminActor(req) {
  return { adminId: req.admin.id };
}

async function listFeeStructures(req, res) {
  const result = await feeService.listFeeStructures(req.validated.query);
  return sendSuccess(res, { message: 'Fee structures retrieved', data: result });
}

async function getFeeStructure(req, res) {
  const feeStructure = await feeService.getFeeStructureById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Fee structure retrieved', data: { feeStructure } });
}

async function createFeeStructure(req, res) {
  const feeStructure = await feeService.createFeeStructure(req.validated.body, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { status: 201, message: 'Fee structure created', data: { feeStructure } });
}

async function updateFeeStructure(req, res) {
  const feeStructure = await feeService.updateFeeStructure(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Fee structure updated', data: { feeStructure } });
}

async function deleteFeeStructure(req, res) {
  const feeStructure = await feeService.softDeleteFeeStructure(req.validated.params.id, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Fee structure deleted', data: { feeStructure } });
}

async function listStudentFees(req, res) {
  const result = await feeService.listStudentFees(req.validated.query);
  return sendSuccess(res, { message: 'Student fees retrieved', data: result });
}

async function getStudentFee(req, res) {
  const studentFee = await feeService.getStudentFeeById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Student fee retrieved', data: { studentFee } });
}

async function assignStudentFee(req, res) {
  const studentFee = await feeService.assignStudentFee(req.validated.body, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { status: 201, message: 'Student fee assigned', data: { studentFee } });
}

async function updateStudentFee(req, res) {
  const studentFee = await feeService.updateStudentFee(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { message: 'Student fee updated', data: { studentFee } });
}

async function deleteStudentFee(req, res) {
  const studentFee = await feeService.softDeleteStudentFee(req.validated.params.id, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Student fee deleted', data: { studentFee } });
}

async function listPayments(req, res) {
  const result = await feeService.listPayments(req.validated.params.id, req.validated.query);
  return sendSuccess(res, { message: 'Fee payments retrieved', data: result });
}

async function recordPayment(req, res) {
  const result = await feeService.recordPayment(
    req.validated.params.id,
    req.validated.body,
    adminActor(req),
    getRequestMeta(req)
  );
  return sendSuccess(res, { status: 201, message: 'Payment recorded', data: result });
}

async function deletePayment(req, res) {
  const { id, paymentId } = req.validated.params;
  const result = await feeService.softDeletePayment(id, paymentId, adminActor(req), getRequestMeta(req));
  return sendSuccess(res, { message: 'Payment deleted', data: result });
}

module.exports = {
  listFeeStructures,
  getFeeStructure,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  listStudentFees,
  getStudentFee,
  assignStudentFee,
  updateStudentFee,
  deleteStudentFee,
  listPayments,
  recordPayment,
  deletePayment,
};
