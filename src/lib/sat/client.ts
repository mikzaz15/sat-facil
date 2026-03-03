const USER_ID_KEY = "sat_user_id";
const SESSION_ID_KEY = "sat_session_id";

function randomId(): string {
  return crypto.randomUUID();
}

export function getOrCreateLocalUserId(): string {
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) {
    return existing;
  }

  const userId = randomId();
  window.localStorage.setItem(USER_ID_KEY, userId);
  return userId;
}

export function getOrCreateLocalSessionId(): string {
  const existing = window.localStorage.getItem(SESSION_ID_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = randomId();
  window.localStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

export function setCurrentSessionId(sessionId: string) {
  window.localStorage.setItem(SESSION_ID_KEY, sessionId);
}
