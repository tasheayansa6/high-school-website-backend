type TeacherUnauthorizedListener = () => void;

const listeners = new Set<TeacherUnauthorizedListener>();

/** Subscribe to teacher-session 401 handling (isolated from admin auth events). */
export function onTeacherUnauthorized(listener: TeacherUnauthorizedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTeacherUnauthorized(): void {
  for (const listener of listeners) {
    listener();
  }
}
