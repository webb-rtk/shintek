const crypto = require('crypto');

class SessionService {
  constructor() {
    // In-memory storage for sessions (for production, use Redis or a database)
    this.sessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Create a new session
   */
  createSession() {
    const sessionId = crypto.randomUUID();
    const session = {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (Date.now() - session.lastAccessedAt > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    return session;
  }

  /**
   * Update session with new messages
   */
  updateSession(sessionId, messages) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found or expired');
    }

    session.messages = messages;
    session.lastAccessedAt = Date.now();
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Add message to session
   */
  addMessage(sessionId, role, content) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found or expired');
    }

    session.messages.push({ role, content });
    session.lastAccessedAt = Date.now();
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Get session messages
   */
  getMessages(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    return session.messages;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions() {
    this.sessions.clear();
  }

  /**
   * Clean up expired sessions (can be run periodically)
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        session => Date.now() - session.lastAccessedAt < this.sessionTimeout
      ).length
    };
  }
}

// Run cleanup every 5 minutes
const sessionService = new SessionService();
setInterval(() => {
  sessionService.cleanupExpiredSessions();
}, 5 * 60 * 1000);

module.exports = sessionService;
