const SESSION_KEY = "findly_anonymous_session";

type StoredSession = {
  id: string;
  startedAt: string;
};

function newSession(): StoredSession {
  const random = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return { id: `sess_${random}`, startedAt: new Date().toISOString() };
}

export function getAnonymousSession(): StoredSession {
  if (typeof window === "undefined") return newSession();

  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as StoredSession;
      if (parsed.id && parsed.startedAt) return parsed;
    }

    const created = newSession();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(created));
    return created;
  } catch {
    return newSession();
  }
}

export function getSessionMetadata() {
  const session = getAnonymousSession();
  return {
    session_id: session.id,
    session_started_at: session.startedAt,
  };
}
