import { beforeEach, describe, expect, it } from 'vitest';

import { clearAccessToken, getAccessToken, setAccessToken } from '@/services/api/authToken';
import {
  clearTeacherAccessToken,
  getTeacherAccessToken,
  setTeacherAccessToken,
} from '@/services/api/teacherAuthToken';

describe('teacher token isolation', () => {
  beforeEach(() => {
    clearAccessToken();
    clearTeacherAccessToken();
    window.sessionStorage.clear();
  });

  it('stores the teacher token under a separate key from the admin token', () => {
    setTeacherAccessToken('teacher-jwt');
    expect(getTeacherAccessToken()).toBe('teacher-jwt');
    expect(getAccessToken()).toBeNull();
    expect(window.sessionStorage.getItem('aa_teacher_access_token')).toBe('teacher-jwt');
    expect(window.sessionStorage.getItem('aa_access_token')).toBeNull();
  });

  it('clearing one session does not clear the other', () => {
    setAccessToken('admin-jwt');
    setTeacherAccessToken('teacher-jwt');

    clearTeacherAccessToken();
    expect(getTeacherAccessToken()).toBeNull();
    expect(getAccessToken()).toBe('admin-jwt');

    setTeacherAccessToken('teacher-jwt');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(getTeacherAccessToken()).toBe('teacher-jwt');
  });
});
