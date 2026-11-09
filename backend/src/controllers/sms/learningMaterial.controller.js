const learningMaterialService = require('../../services/sms/learningMaterial.service');
const { sendSuccess } = require('../../utils/apiResponse');

function meta(req) {
  return { ipAddress: req.ip };
}

async function adminList(req, res) {
  const data = await learningMaterialService.listMaterials(req.validated.query);
  return sendSuccess(res, { message: 'Learning materials retrieved', data });
}

async function adminStats(req, res) {
  const data = await learningMaterialService.getStats(req.validated.query);
  return sendSuccess(res, { message: 'Learning material stats retrieved', data });
}

async function adminGet(req, res) {
  const material = await learningMaterialService.getById(req.validated.params.id, {
    includeDeleted: req.validated.query?.includeDeleted === true,
  });
  return sendSuccess(res, { message: 'Learning material retrieved', data: { material } });
}

async function adminPublish(req, res) {
  const material = await learningMaterialService.setPublication(
    req.validated.params.id,
    true,
    { adminId: req.admin.id },
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material published', data: { material } });
}

async function adminUnpublish(req, res) {
  const material = await learningMaterialService.setPublication(
    req.validated.params.id,
    false,
    { adminId: req.admin.id },
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material unpublished', data: { material } });
}

async function adminArchive(req, res) {
  const material = await learningMaterialService.archiveForAdmin(
    req.validated.params.id,
    req.admin,
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material archived', data: { material } });
}

async function adminDelete(req, res) {
  const material = await learningMaterialService.softDeleteForAdmin(
    req.validated.params.id,
    req.admin,
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material deleted', data: { material } });
}

async function adminDownload(req, res) {
  const { prisma } = require('../../config/database');
  const AppError = require('../../utils/AppError');
  const row = await prisma.learningMaterial.findFirst({
    where: { id: req.validated.params.id, deletedAt: null },
  });
  if (!row) {
    throw new AppError('Learning material not found.', 404, {
      code: 'LEARNING_MATERIAL_NOT_FOUND',
    });
  }
  const { stream, mimeType, fileSize, fileName } =
    await learningMaterialService.openDownloadStream(row);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', String(fileSize));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${String(fileName).replace(/"/g, '')}"`
  );
  stream.pipe(res);
}

async function teacherList(req, res) {
  const data = await learningMaterialService.listMaterials(req.validated.query, {
    teacherId: req.teacher.id,
  });
  return sendSuccess(res, { message: 'Learning materials retrieved', data });
}

async function teacherGet(req, res) {
  const material = await learningMaterialService.getById(req.validated.params.id);
  if (material.teacherId !== req.teacher.id) {
    const AppError = require('../../utils/AppError');
    throw new AppError('You can only view your own learning materials.', 403, {
      code: 'FORBIDDEN',
    });
  }
  return sendSuccess(res, { message: 'Learning material retrieved', data: { material } });
}

async function teacherCreate(req, res) {
  const material = await learningMaterialService.createForTeacher(
    req.validated.body,
    req.file,
    req.teacher,
    meta(req)
  );
  return sendSuccess(res, {
    status: 201,
    message: 'Learning material created',
    data: { material },
  });
}

async function teacherUpdate(req, res) {
  const material = await learningMaterialService.updateForTeacher(
    req.validated.params.id,
    req.validated.body,
    req.teacher,
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material updated', data: { material } });
}

async function teacherReplaceFile(req, res) {
  const material = await learningMaterialService.replaceFileForTeacher(
    req.validated.params.id,
    req.file,
    req.teacher,
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material file replaced', data: { material } });
}

async function teacherPublish(req, res) {
  const material = await learningMaterialService.setPublication(
    req.validated.params.id,
    true,
    { teacherId: req.teacher.id },
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material published', data: { material } });
}

async function teacherUnpublish(req, res) {
  const material = await learningMaterialService.setPublication(
    req.validated.params.id,
    false,
    { teacherId: req.teacher.id },
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material unpublished', data: { material } });
}

async function teacherDelete(req, res) {
  const material = await learningMaterialService.softDeleteForTeacher(
    req.validated.params.id,
    req.teacher,
    meta(req)
  );
  return sendSuccess(res, { message: 'Learning material deleted', data: { material } });
}

async function teacherDownload(req, res) {
  const row = await learningMaterialService.assertTeacherCanAccess(
    req.validated.params.id,
    req.teacher.id
  );
  const { stream, mimeType, fileSize, fileName } =
    await learningMaterialService.openDownloadStream(row);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', String(fileSize));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${String(fileName).replace(/"/g, '')}"`
  );
  stream.pipe(res);
}

async function studentList(req, res) {
  const data = await learningMaterialService.listForStudent(
    req.student.id,
    req.validated.query
  );
  return sendSuccess(res, { message: 'Learning materials retrieved', data });
}

async function studentGet(req, res) {
  await learningMaterialService.assertStudentCanAccess(
    req.validated.params.id,
    req.student.id
  );
  const material = await learningMaterialService.getById(req.validated.params.id);
  return sendSuccess(res, { message: 'Learning material retrieved', data: { material } });
}

async function studentDownload(req, res) {
  const row = await learningMaterialService.assertStudentCanAccess(
    req.validated.params.id,
    req.student.id
  );
  const { stream, mimeType, fileSize, fileName } =
    await learningMaterialService.openDownloadStream(row);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', String(fileSize));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${String(fileName).replace(/"/g, '')}"`
  );
  stream.pipe(res);
}

module.exports = {
  adminList,
  adminStats,
  adminGet,
  adminPublish,
  adminUnpublish,
  adminArchive,
  adminDelete,
  adminDownload,
  teacherList,
  teacherGet,
  teacherCreate,
  teacherUpdate,
  teacherReplaceFile,
  teacherPublish,
  teacherUnpublish,
  teacherDelete,
  teacherDownload,
  studentList,
  studentGet,
  studentDownload,
};
