type StudentUnauthorizedListener = () => void;

const listeners = new Set<StudentUnauthorizedListener>();

/** Subscribe to student-session 401 handling (isolated from admin auth events). */
export function onStudentUnauthorized(listener: StudentUnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitStudentUnauthorized(): void {
  for (const listener of listeners) {
    listener();
  }
}
