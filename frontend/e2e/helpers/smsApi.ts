import type { APIRequestContext } from '@playwright/test';

export const API_BASE =
  process.env.E2E_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:5000/api/v1';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'tasheayansa@gmail.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123456!';
export const ACTOR_PASSWORD = process.env.E2E_ACTOR_PASSWORD ?? 'E2ePortal99!';

export interface SmsFixture {
  stamp: string;
  prefix: string;
  code: string;
  year: { id: number; name: string; code: string };
  grade: { id: number; name: string; code: string };
  section: { id: number; name: string; code: string };
  subject: { id: number; name: string; code: string };
  klass: { id: number; name: string };
  outsiderTeacher: { id: number; email: string };
  exam: { id: number; name: string };
}

type Json = Record<string, unknown>;

async function readJson(response: Awaited<ReturnType<APIRequestContext['fetch']>>) {
  const body = (await response.json()) as { data?: Json; message?: string; error?: Json };
  if (!response.ok()) {
    throw new Error(
      `API ${response.url()} → ${response.status()}: ${JSON.stringify(body).slice(0, 500)}`,
    );
  }
  return body;
}

export async function assertApiReachable(request: APIRequestContext) {
  const health = await request.get(`${API_BASE}/academic/overview`);
  if (!health.ok()) {
    throw new Error(
      `Backend API not reachable at ${API_BASE} (status ${health.status()}). Start the backend before Playwright.`,
    );
  }
}

export async function adminLogin(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/admin/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const body = await readJson(response);
  const token = (body.data as { accessToken?: string } | undefined)?.accessToken;
  if (!token) throw new Error('Admin login did not return accessToken');
  return token;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function seedAcademicScaffold(request: APIRequestContext): Promise<SmsFixture> {
  await assertApiReachable(request);
  const token = await adminLogin(request);
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    .slice(-10)
    .toUpperCase();
  const prefix = `e2e.${stamp.toLowerCase()}`;
  // Academic codes are unique; keep short and collision-resistant across parallel workers.
  const code = `E${stamp.slice(0, 7)}`;

  const post = async (path: string, data: Json) => {
    const response = await request.post(`${API_BASE}/admin/sms${path}`, {
      headers: auth(token),
      data,
    });
    const body = await readJson(response);
    return body.data as Json;
  };

  const year = (
    await post('/academic-years', {
      name: `E2E Year ${stamp}`,
      code: `${code}-Y`,
      startsOn: '2038-09-01',
      endsOn: '2039-06-30',
    })
  ).academicYear as SmsFixture['year'];

  const grade = (
    await post('/grade-levels', {
      name: `E2E Grade ${stamp}`,
      code: `${code}-G`,
      sortOrder: 900,
    })
  ).gradeLevel as SmsFixture['grade'];

  const section = (
    await post('/sections', {
      name: `E${stamp.slice(0, 2)}`,
      code: `${code}-S`,
    })
  ).section as SmsFixture['section'];

  const subject = (
    await post('/subjects', {
      name: `E2E Maths ${stamp}`,
      code: `${code}-M`,
    })
  ).subject as SmsFixture['subject'];

  const klass = (
    await post('/class-offerings', {
      academicYearId: year.id,
      gradeLevelId: grade.id,
      sectionId: section.id,
    })
  ).classOffering as SmsFixture['klass'];

  const outsiderTeacher = (
    await post('/teachers', {
      email: `${prefix}.outsider@example.com`,
      password: ACTOR_PASSWORD,
      firstName: 'Out',
      lastName: 'Sider',
      employeeCode: `${code}-OUT`,
    })
  ).teacher as { id: number; email: string };

  const exam = (
    await post('/examinations', {
      name: `E2E Quiz ${stamp}`,
      examType: 'QUIZ',
      academicYearId: year.id,
      classOfferingId: klass.id,
      subjectId: subject.id,
      examDate: '2038-11-15',
      maxScore: 20,
    })
  ).examination as SmsFixture['exam'];

  return {
    stamp,
    prefix,
    code,
    year,
    grade,
    section,
    subject,
    klass,
    outsiderTeacher,
    exam,
  };
}

export async function publishExam(request: APIRequestContext, examId: number) {
  const token = await adminLogin(request);
  const response = await request.post(`${API_BASE}/admin/sms/examinations/${examId}/publish`, {
    headers: auth(token),
  });
  await readJson(response);
}

export async function teacherLoginApi(request: APIRequestContext, email: string) {
  const response = await request.post(`${API_BASE}/teacher/auth/login`, {
    data: { email, password: ACTOR_PASSWORD },
  });
  const body = await readJson(response);
  return (body.data as { accessToken: string }).accessToken;
}

export async function studentLoginApi(
  request: APIRequestContext,
  identifier: { email?: string; studentCode?: string },
) {
  const response = await request.post(`${API_BASE}/student/auth/login`, {
    data: { ...identifier, password: ACTOR_PASSWORD },
  });
  const body = await readJson(response);
  return (body.data as { accessToken: string }).accessToken;
}
