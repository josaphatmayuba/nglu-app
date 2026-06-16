import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquare, Hash, BookOpen, Ticket, Search, Plus, Settings,
  LogOut, Users, Send, ArrowLeft, ChevronRight, Circle, ExternalLink,
  TrendingUp, Shield, X, CheckCheck,
} from "lucide-react";
import { useAuthToken, clearToken, LoginScreen, readToken } from "./auth.jsx";
import { api, API_ROOT } from "./api.js";
import { io } from "socket.io-client";

const NATIVE =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() === true ||
    /^capacitor:\/\//.test(window.location?.protocol || ""));
const WS_HOST = NATIVE
  ? ((typeof window !== "undefined" && window.CHAT_API_HOST) || "https://dev.ongdngolu.org")
  : (typeof window !== "undefined" ? window.location.origin : "");

const ICON_MAP = { TrendingUp, BookOpen, Users, Shield, Hash, MessageSquare, Ticket };
function ChanIcon({ name, size = 16 }) {
  const Icon = ICON_MAP[name] || Hash;
  return <Icon size={size} />;
}

function initials(fn, ln) { return `${(fn||"?")[0]}${(ln||"")[0]||""}`.toUpperCase(); }
function avatarColor(id) {
  const c = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444"];
  return c[(id||0) % c.length];
}
function relTime(dt) {
  if (!dt) return "";
  const d = new Date(dt), now = new Date();
  const diff = now - d;
  if (diff < 60000) return "maintenant";
  if (diff < 3600000) return `${Math.floor(diff/60000)}min`;
  if (diff < 86400000) return d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
}
function parseContent(text) {
  return (text||"").replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

// ── Fil de messages ──────────────────────────────────────────────────────────
function MessageThread({ discussionId, currentUserId, socket }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const currentDiscId = useRef(discussionId);

  useEffect(() => {
    currentDiscId.current = discussionId;
    setMessages([]);
    setLoading(true);
    api.messages(discussionId)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));

    if (socket) {
      socket.emit("joinRoom", { discussionId });
    }
    return () => {
      if (socket) socket.emit("leaveRoom", { discussionId });
    };
  }, [discussionId, socket]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (msg) => {
      if (msg.discussionId !== currentDiscId.current) return;
      setMessages((prev) => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
    };
    const onTyping = ({ firstName, discussionId: did }) => {
      if (did !== currentDiscId.current) return;
      setTyping(firstName);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(null), 2500);
    };
    socket.on("newMessage", onMsg);
    socket.on("userTyping", onTyping);
    return () => { socket.off("newMessage", onMsg); socket.off("userTyping", onTyping); };
  }, [socket]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = useCallback(async () => {
    if (!content.trim()) return;
    const text = content.trim();
    setContent("");
    setSending(true);
    try {
      if (socket?.connected) {
        socket.emit("sendMessage", { discussionId, userId: currentUserId, content: text, mentions: [] });
      } else {
        const msg = await api.sendMessage(discussionId, text);
        setMessages(prev => [...prev, msg]);
      }
    } catch(e) { console.error(e); }
    finally { setSending(false); inputRef.current?.focus(); }
  }, [content, discussionId, currentUserId, socket]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };
  const handleTyping = () => {
    if (!socket?.connected) return;
    const me = localStorage.getItem("user") || "Quelqu'un";
    socket.emit("typing", { discussionId, userId: currentUserId, firstName: me.split(" ")[0] });
  };

  if (loading) return (
    <div className="thread-loading"><div className="spinner" /><span>Chargement…</span></div>
  );

  return (
    <div className="thread">
      <div className="thread-msgs">
        {messages.length === 0 && (
          <div className="thread-empty">
            <MessageSquare size={36} />
            <p>Soyez le premier à écrire ici</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;
          const showAvatar = idx === 0 || messages[idx-1]?.sender_id !== msg.sender_id;
          return (
            <div key={msg.id} className={`msg-row ${isMe?"msg-me":"msg-other"}`}>
              {!isMe && showAvatar && (
                <div className="msg-avatar" style={{ background: avatarColor(msg.sender_id) }}>
                  {initials(msg.firstName, msg.lastName)}
                </div>
              )}
              {!isMe && !showAvatar && <div className="msg-avatar-gap" />}
              <div className="msg-group">
                {!isMe && showAvatar && (
                  <div className="msg-name">{msg.firstName} {msg.lastName}</div>
                )}
                <div className={`bubble ${isMe?"bubble-me":"bubble-other"}`}
                  dangerouslySetInnerHTML={{ __html: parseContent(msg.content) }} />
                <div className="msg-time">
                  {relTime(msg.created_at)}
                  {isMe && <CheckCheck size={12} style={{ color: msg.is_read?"#818cf8":"#64748b" }} />}
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="typing-indicator">
            <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            <span className="typing-label">{typing} écrit…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="thread-input-bar">
        <textarea ref={inputRef} className="msg-input"
          placeholder="Écrivez… Maj+Entrée pour saut de ligne"
          value={content}
          onChange={(e) => { setContent(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          rows={1} />
        <button className="send-btn" onClick={handleSend} disabled={!content.trim()||sending}>
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

// ── App principale ──────────────────────────────────────────────────────────
export default function App() {
  const token = useAuthToken();
  const [channels, setChannels] = useState([]);
  const [topics, setTopics] = useState([]);
  const [activeDisc, setActiveDisc] = useState(null); // { id, title, entityType, entityId }
  const [activeTab, setActiveTab] = useState("channels"); // channels | topics
  const [topicFilter, setTopicFilter] = useState("all"); // all | event | ticket
  const [search, setSearch] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [mobileMsgOpen, setMobileMsgOpen] = useState(false);
  const socketRef = useRef(null);
  const currentUserId = parseInt(localStorage.getItem("id") || "0", 10);

  // WebSocket
  useEffect(() => {
    if (!token) return;
    const socket = io(`${WS_HOST}/chat`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("register", { userId: currentUserId });
    });
    socket.on("newMessage", () => {
      // Rafraîchir les badges
      loadChannels();
      loadTopics();
    });
    return () => socket.disconnect();
  }, [token]);

  const loadChannels = useCallback(() => {
    api.channels().then(setChannels).catch(console.error);
  }, []);

  const loadTopics = useCallback(() => {
    api.topics({ type: topicFilter !== "all" ? topicFilter : undefined })
      .then(setTopics).catch(console.error);
  }, [topicFilter]);

  useEffect(() => { if (token) { loadChannels(); loadTopics(); } }, [token, loadChannels, loadTopics]);

  const openChannel = async (ch) => {
    try {
      const disc = await api.channelDiscussion(ch.id);
      setActiveDisc({ id: disc.id, title: `# ${ch.name}`, icon: ch.icon, color: ch.color });
      setMobileMsgOpen(true);
    } catch(e) { console.error(e); }
  };

  const openTopic = (topic) => {
    setActiveDisc({
      id: topic.id,
      title: topic.event_title || topic.title || `Sujet #${topic.id}`,
      entityType: topic.entity_type,
      entityId: topic.entity_id,
    });
    setMobileMsgOpen(true);
  };

  const filteredTopics = topics.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.event_title||t.title||"").toLowerCase().includes(q) ||
           (t.last_message||"").toLowerCase().includes(q);
  });

  if (!token) return <LoginScreen />;

  return (
    <div className="shell">
      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileMsgOpen ? "mob-hidden" : ""}`}>
        {/* Brand */}
        <div className="brand">
          <div className="brand-icon"><MessageSquare size={18} color="#fff" /></div>
          <span className="brand-name">Chat SIFA</span>
          <button className="icon-btn" onClick={clearToken} title="Déconnexion"><LogOut size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs">
          <button className={`tab-btn ${activeTab==="channels"?"active":""}`} onClick={() => setActiveTab("channels")}>
            <Hash size={14} /> Channels
          </button>
          <button className={`tab-btn ${activeTab==="topics"?"active":""}`} onClick={() => setActiveTab("topics")}>
            <BookOpen size={14} /> Sujets
          </button>
        </div>

        {activeTab === "channels" && (
          <>
            <div className="sidebar-section-head">
              <span>Channels</span>
              <button className="icon-btn-sm" onClick={() => setShowNewChannel(true)} title="Créer">
                <Plus size={14} />
              </button>
            </div>
            <div className="channel-list">
              {channels.map(ch => (
                <button key={ch.id} className={`channel-item ${activeDisc?.title===`# ${ch.name}`?"active":""}`}
                  onClick={() => openChannel(ch)}>
                  <span className="ch-icon" style={{ color: ch.color || "#6366f1" }}>
                    <ChanIcon name={ch.icon} size={15} />
                  </span>
                  <span className="ch-name">{ch.name}</span>
                  {ch.unread > 0 && <span className="ch-badge">{ch.unread > 99 ? "99+" : ch.unread}</span>}
                </button>
              ))}
              {channels.length === 0 && <div className="sidebar-empty">Aucun channel</div>}
            </div>
          </>
        )}

        {activeTab === "topics" && (
          <>
            <div className="sidebar-search">
              <Search size={13} />
              <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="topic-filters">
              {[["all","Tous"],["event","Événements"],["ticket","Tickets"]].map(([v,l]) => (
                <button key={v} className={`filter-pill ${topicFilter===v?"active":""}`}
                  onClick={() => setTopicFilter(v)}>{l}</button>
              ))}
            </div>
            <div className="topic-list">
              {filteredTopics.map(t => (
                <button key={t.id} className={`topic-item ${activeDisc?.id===t.id?"active":""}`}
                  onClick={() => openTopic(t)}>
                  <div className="topic-icon">
                    {t.entity_type === "journal_event" ? <BookOpen size={13}/> : <Ticket size={13}/>}
                  </div>
                  <div className="topic-body">
                    <div className="topic-title">{t.event_title || t.title || `#${t.entity_id}`}</div>
                    {t.last_message && (
                      <div className="topic-preview">{t.last_message.slice(0,50)}{t.last_message.length>50?"…":""}</div>
                    )}
                  </div>
                  <div className="topic-meta">
                    {t.last_message_at && <span>{relTime(t.last_message_at)}</span>}
                    {t.unread > 0 && <span className="ch-badge">{t.unread}</span>}
                  </div>
                </button>
              ))}
              {filteredTopics.length === 0 && <div className="sidebar-empty">Aucun sujet actif</div>}
            </div>
          </>
        )}
      </aside>

      {/* ── Zone principale ── */}
      <main className={`main-area ${!mobileMsgOpen ? "mob-hidden-main" : ""}`}>
        {activeDisc ? (
          <>
            {/* Header fil */}
            <div className="thread-header">
              <button className="back-btn mob-only" onClick={() => setMobileMsgOpen(false)}>
                <ArrowLeft size={18} />
              </button>
              <div className="thread-title">
                {activeDisc.icon
                  ? <span style={{ color: activeDisc.color||"#6366f1" }}><ChanIcon name={activeDisc.icon} size={18}/></span>
                  : (activeDisc.entityType === "journal_event" ? <BookOpen size={18}/> : <Ticket size={18}/>)
                }
                <span>{activeDisc.title}</span>
              </div>
              {activeDisc.entityType && (
                <a
                  href={activeDisc.entityType === "journal_event" ? "/journal/" : "/tickets/"}
                  className="open-source-btn" target="_blank" rel="noopener"
                  title="Ouvrir la source">
                  <ExternalLink size={15} />
                  <span>{activeDisc.entityType === "journal_event" ? "Journal" : "Tickets"}</span>
                </a>
              )}
            </div>
            <MessageThread
              discussionId={activeDisc.id}
              currentUserId={currentUserId}
              socket={socketRef.current}
            />
          </>
        ) : (
          <div className="empty-main">
            <MessageSquare size={52} />
            <h2>Sélectionnez un channel ou un sujet</h2>
            <p>Les discussions sont liées à vos événements et tickets.</p>
          </div>
        )}
      </main>

      {/* ── Modal nouveau channel ── */}
      {showNewChannel && (
        <NewChannelModal
          onClose={() => setShowNewChannel(false)}
          onCreate={() => { setShowNewChannel(false); loadChannels(); }}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

// ── Modal création channel ──────────────────────────────────────────────────
function NewChannelModal({ onClose, onCreate, currentUserId }) {
  const [form, setForm] = useState({ slug:"", name:"", description:"", icon:"Hash", color:"#6366f1", isDefault:false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.slug.trim() || !form.name.trim()) return;
    setSaving(true); setError(null);
    try {
      await api.createChannel(form);
      onCreate();
    } catch(e) { setError("Erreur : " + e.message); }
    finally { setSaving(false); }
  };

  const ICONS = ["Hash","TrendingUp","BookOpen","Users","Shield","MessageSquare","Ticket"];
  const COLORS = ["#6366f1","#10b981","#f59e0b","#e11d48","#8b5cf6","#3b82f6","#f97316"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span>Nouveau channel</span>
          <button className="icon-btn" onClick={onClose}><X size={16}/></button>
        </div>
        <form onSubmit={save} className="modal-body">
          <label className="form-label">Nom
            <input className="form-input" value={form.name} required
              onChange={e => { set("name",e.target.value); set("slug",e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")); }} />
          </label>
          <label className="form-label">Slug (URL)
            <input className="form-input" value={form.slug} required
              onChange={e => set("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} />
          </label>
          <label className="form-label">Description
            <input className="form-input" value={form.description}
              onChange={e => set("description",e.target.value)} />
          </label>
          <div className="form-label">Icône
            <div className="icon-picker">
              {ICONS.map(ic => (
                <button key={ic} type="button"
                  className={`icon-pick-btn ${form.icon===ic?"selected":""}`}
                  onClick={() => set("icon",ic)}>
                  <ChanIcon name={ic} size={16}/>
                </button>
              ))}
            </div>
          </div>
          <div className="form-label">Couleur
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} type="button"
                  className={`color-pick-btn ${form.color===c?"selected":""}`}
                  style={{ background:c }} onClick={() => set("color",c)} />
              ))}
            </div>
          </div>
          <label className="form-label form-row">
            <input type="checkbox" checked={form.isDefault} onChange={e => set("isDefault",e.target.checked)} />
            <span>Rejoindre automatiquement (tous les utilisateurs)</span>
          </label>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
