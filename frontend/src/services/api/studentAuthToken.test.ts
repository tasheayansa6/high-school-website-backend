import { beforeEach, describe, expect, it } from 'vitest';

import { clearAccessToken, getAccessToken, setAccessToken } from '@/services/api/authToken';
import {
  clearStudentAccessToken,
  getStudentAccessToken,
  setStudentAccessToken,
} from '@/services/api/studentAuthToken';

describe('student token isolation', () => {
  beforeEach(() => {
    clearAccessToken();
    clearStudentAccessToken();
    window.sessionStorage.clear();
  });

  it('stores the student token under a separate key from the admin token', () => {
    setStudentAccessToken('student-jwt');
    expect(getStudentAccessToken()).toBe('student-jwt');
    expect(getAccessToken()).toBeNull();
    expect(window.sessionStorage.getItem('aa_student_access_token')).toBe('student-jwt');
    expect(window.sessionStorage.getItem('aa_access_token')).toBeNull();
  });

  it('clearing one session does not clear the other', () => {
    setAccessToken('admin-jwt');
    setStudentAccessToken('student-jwt');

    clearStudentAccessToken();
    expect(getStudentAccessToken()).toBeNull();
    expect(getAccessToken()).toBe('admin-jwt');

    setStudentAccessToken('student-jwt');
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(getStudentAccessToken()).toBe('student-jwt');
  });
});
