#!/usr/bin/env node
/**
 * Soft-delete synthetic E2E / SMS test catalog rows so the public Features page
 * only reflects real school data.
 *
 * Safe defaults: soft-delete only (deleted_at). Does not hard-delete.
 * Usage:
 *   node scripts/cleanup-synthetic-academic-catalog.js --dry-run
 *   node scripts/cleanup-synthetic-academic-catalog.js
 */

const { prisma } = require('../src/config/database');
const { isSyntheticCatalogEntry } = require('../src/services/publicAcademic.service');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const [grades, subjects, years] = await Promise.all([
    prisma.gradeLevel.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
    prisma.subject.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
    prisma.academicYear.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true, isCurrent: true },
    }),
  ]);

  const gradeIds = grades.filter(isSyntheticCatalogEntry).map((g) => g.id);
  const subjectIds = subjects.filter(isSyntheticCatalogEntry).map((s) => s.id);
  const yearIds = years.filter(isSyntheticCatalogEntry).map((y) => y.id);

  console.log(
    JSON.stringify(
      {
        dryRun,
        wouldSoftDelete: {
          gradeLevels: gradeIds.length,
          subjects: subjectIds.length,
          academicYears: yearIds.length,
        },
        samples: {
          grades: grades.filter(isSyntheticCatalogEntry).slice(0, 5),
          subjects: subjects.filter(isSyntheticCatalogEntry).slice(0, 5),
        },
      },
      null,
      2
    )
  );

  if (dryRun) {
    await prisma.$disconnect();
    return;
  }

  const now = new Date();
  if (gradeIds.length) {
    await prisma.gradeLevel.updateMany({
      where: { id: { in: gradeIds } },
      data: { deletedAt: now },
    });
  }
  if (subjectIds.length) {
    await prisma.subject.updateMany({
      where: { id: { in: subjectIds } },
      data: { deletedAt: now },
    });
  }
  if (yearIds.length) {
    await prisma.academicYear.updateMany({
      where: { id: { in: yearIds } },
      data: { deletedAt: now, isCurrent: false },
    });
  }

  console.log('Soft-delete complete.');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
