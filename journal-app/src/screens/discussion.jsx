import { useState, useEffect, useRef, useCallback } from "react";
import { Send, X, Paperclip, ArrowLeft, MessageCircle, Users } from "lucide-react";
import { API_ROOT } from "../api.js";
import { readToken } from "../auth.jsx";
import { io } from "socket.io-client";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const API_HOST =
  (typeof window !== "undefined" && window.JOURNAL_API_HOST) || "https://dev.ongdngolu.org";
const DISC_BASE = (NATIVE ? API_HOST : "") + "/api/discussions";
const WS_HOST = NATIVE ? API_HOST : (typeof window !== "undefined" ? window.location.origin : "");

function authHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function discFetch(path, init = {}) {
  const res = await fetch(`${DISC_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function initials(firstName, lastName) {
  return `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
}

function avatarColor(id) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  return colors[(id || 0) % colors.length];
}

function parseContent(text) {
  return text.replace(/@(\w+)/g, (_, name) => `<span class="mention">@${name}</span>`);
}

// ── Composant principal ──────────────────────────────────────────────────────
export function Discussion({ entityType, entityId, entityTitle, onClose, currentUserId }) {
  const [discussion, setDiscussion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const inputRef = useRef(null);

  // Charger ou créer la discussion
  useEffect(() => {
    discFetch(`/${entityType}/${entityId}`)
      .then((disc) => {
        setDiscussion(disc);
        return Promise.all([
          discFetch(`/${disc.id}/messages`),
          discFetch(`/${disc.id}/participants`),
        ]);
      })
      .then(([msgs, parts]) => {
        setMessages(msgs);
        setParticipants(parts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  // Connexion WebSocket
  useEffect(() => {
    if (!discussion) return;
    const token = readToken();
    const socket = io(`${WS_HOST}/discussion`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinDiscussion", { discussionId: discussion.id, userId: currentUserId });
    });

    socket.on("newMessage", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("userTyping", ({ firstName }) => {
      setTyping(firstName);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(null), 2000);
    });

    return () => {
      socket.emit("leaveDiscussion", { discussionId: discussion.id });
      socket.disconnect();
    };
  }, [discussion, currentUserId]);

  // Scroll bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!content.trim() || !discussion) return;
    const text = content.trim();
    setContent("");
    setSending(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("sendMessage", {
          discussionId: discussion.id,
          userId: currentUserId,
          content: text,
          mentions: [],
        });
      } else {
        // Fallback REST
        const msg = await discFetch(`/${discussion.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ content: text }),
        });
        setMessages((prev) => [...prev, msg]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [content, discussion, currentUserId]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (!socketRef.current?.connected || !discussion) return;
    const me = participants.find((p) => p.user_id === currentUserId);
    socketRef.current.emit("typing", {
      discussionId: discussion.id,
      userId: currentUserId,
      firstName: me?.firstName || "Quelqu'un",
    });
  };

  if (loading) {
    return (
      <div className="disc-panel">
        <div className="disc-loading">
          <div className="disc-spinner" />
          <span>Chargement de la discussion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="disc-panel">
      {/* ── Header ── */}
      <div className="disc-header">
        <button className="disc-back" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div className="disc-header-info">
          <div className="disc-header-title">
            <MessageCircle size={16} style={{ color: "#6366f1" }} />
            <span>{entityTitle || "Discussion"}</span>
          </div>
          <div className="disc-header-sub">{participants.length} participant{participants.length > 1 ? "s" : ""}</div>
        </div>
        <button
          className="disc-participants-btn"
          onClick={() => setShowParticipants((v) => !v)}
          title="Participants"
        >
          <Users size={18} />
        </button>
      </div>

      {/* ── Participants sidebar ── */}
      {showParticipants && (
        <div className="disc-parts-list">
          {participants.map((p) => (
            <div key={p.user_id} className="disc-part-item">
              <div className="disc-avatar" style={{ background: avatarColor(p.user_id) }}>
                {initials(p.firstName, p.lastName)}
              </div>
              <span>{p.firstName} {p.lastName}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="disc-messages">
        {messages.length === 0 && (
          <div className="disc-empty">
            <MessageCircle size={40} style={{ color: "#cbd5e1", marginBottom: 8 }} />
            <p>Démarrez la conversation sur cet événement</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;
          const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id;
          return (
            <div key={msg.id} className={`disc-msg-row ${isMe ? "me" : "other"}`}>
              {!isMe && showAvatar && (
                <div className="disc-avatar sm" style={{ background: avatarColor(msg.sender_id) }}>
                  {initials(msg.firstName, msg.lastName)}
                </div>
              )}
              {!isMe && !showAvatar && <div className="disc-avatar-spacer" />}
              <div className="disc-msg-group">
                {!isMe && showAvatar && (
                  <div className="disc-msg-name">{msg.firstName} {msg.lastName}</div>
                )}
                <div className={`disc-bubble ${isMe ? "bubble-me" : "bubble-other"}`}>
                  <span
                    dangerouslySetInnerHTML={{ __html: parseContent(msg.content) }}
                  />
                </div>
                <div className="disc-msg-time">
                  {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {isMe && <span className="disc-check">{msg.is_read ? "✓✓" : "✓"}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="disc-typing">
            <span className="disc-typing-dot" /><span className="disc-typing-dot" /><span className="disc-typing-dot" />
            <span style={{ marginLeft: 6, color: "#64748b", fontSize: 12 }}>{typing} est en train d'écrire…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Saisie ── */}
      <div className="disc-input-bar">
        <textarea
          ref={inputRef}
          className="disc-input"
          placeholder="Écrivez un message… @mentionner"
          value={content}
          onChange={(e) => { setContent(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="disc-send-btn"
          onClick={handleSend}
          disabled={!content.trim() || sending}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Bouton badge (utilisé dans activite.jsx) ────────────────────────────────
export function DiscussionBadge({ entityType, entityId, onClick, currentUserId }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetch(`${DISC_BASE}/unread/${entityType}/${entityId}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : { unread: 0 })
      .then((d) => setUnread(d.unread || 0))
      .catch(() => {});
  }, [entityType, entityId]);

  return (
    <button className="disc-badge-btn" onClick={onClick} title="Discussion">
      <MessageCircle size={16} />
      {unread > 0 && <span className="disc-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
  );
}
