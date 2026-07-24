import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquare, Hash, BookOpen, Ticket, Search, Plus, Settings,
  LogOut, Users, Send, ArrowLeft, ChevronRight, Circle, ExternalLink,
  TrendingUp, Shield, X, CheckCheck, Mic, Phone, User,
} from "lucide-react";
import { useAuthToken, clearToken, LoginScreen, readToken } from "./auth.jsx";
import { api, API_ROOT } from "./api.js";
import { sanitizeHtml } from "./sanitizeHtml.js";
import { io } from "socket.io-client";
import { useCall } from "./call/useCall.js";
import { CallUI } from "./call/CallUI.jsx";
import { CallPicker } from "./call/CallPicker.jsx";
import { useVoiceRecorder } from "./voice/useVoiceRecorder.js";
import { VoiceMessage } from "./voice/VoiceMessage.jsx";

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
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
function parseContent(text) {
  // Echappe d'abord tout le HTML (anti-XSS stocke) PUIS surligne les mentions.
  return escapeHtml(text).replace(/@(\w+)/g, '<span class="mention">@$1</span>');
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

  // Messages vocaux : envoi différé avec reprise. Le fil est rafraîchi quand un
  // vocal en attente finit par partir (parfois plusieurs minutes après, en 2G).
  const reloadMessages = useCallback((did) => {
    if (did !== currentDiscId.current) return;
    api.messages(did).then(setMessages).catch(() => { /* rechargement best-effort */ });
  }, []);
  const voice = useVoiceRecorder(discussionId, { onSent: reloadMessages });

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
                {msg.attachment_type === "voice" ? (
                  <div className={`bubble ${isMe?"bubble-me":"bubble-other"} bubble-voice`}>
                    <VoiceMessage
                      messageId={msg.id}
                      durationSec={msg.attachment_duration_sec}
                      isMe={isMe}
                    />
                  </div>
                ) : (
                  <div className={`bubble ${isMe?"bubble-me":"bubble-other"}`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(parseContent(msg.content)) }} />
                )}
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
      {voice.recording ? (
        <div className="thread-input-bar recording-bar">
          <button className="voice-cancel" onClick={voice.cancelRecording} title="Annuler">
            <X size={18} />
          </button>
          <div className="recording-info">
            <span className="recording-dot" />
            <span className="recording-time">
              {Math.floor(voice.elapsedSec / 60)}:{(voice.elapsedSec % 60).toString().padStart(2, "0")}
            </span>
            <span className="recording-hint">Enregistrement…</span>
          </div>
          <button className="send-btn" onClick={voice.stopRecording} title="Envoyer le vocal">
            <Send size={17} />
          </button>
        </div>
      ) : (
        <div className="thread-input-bar">
          <textarea ref={inputRef} className="msg-input"
            placeholder="Écrivez… Maj+Entrée pour saut de ligne"
            value={content}
            onChange={(e) => { setContent(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            rows={1} />
          {/* Le micro remplace l'envoi tant qu'aucun texte n'est saisi :
              sur réseau très faible, le vocal est le mode qui passe toujours. */}
          {content.trim() ? (
            <button className="send-btn" onClick={handleSend} disabled={sending}>
              <Send size={17} />
            </button>
          ) : (
            <button className="send-btn mic-btn" onClick={voice.startRecording} title="Message vocal">
              <Mic size={17} />
            </button>
          )}
        </div>
      )}
      {voice.pendingCount > 0 && (
        <div className="voice-pending">
          {voice.pendingCount} vocal{voice.pendingCount > 1 ? "s" : ""} en attente d’envoi — reprise automatique
        </div>
      )}
      {voice.error && <div className="voice-pending voice-pending-err">{voice.error}</div>}
    </div>
  );
}

// ── App principale ──────────────────────────────────────────────────────────
export default function App() {
  const token = useAuthToken();
  const [channels, setChannels] = useState([]);
  const [topics, setTopics] = useState([]);
  const [people, setPeople] = useState([]);
  const [activeDisc, setActiveDisc] = useState(null); // { id, title, entityType, entityId, peerId }
  const [activeTab, setActiveTab] = useState("channels"); // channels | topics | people
  const [topicFilter, setTopicFilter] = useState("all"); // all | event | ticket
  const [search, setSearch] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [mobileMsgOpen, setMobileMsgOpen] = useState(false);
  const socketRef = useRef(null);
  // Le socket est aussi en state : une ref ne déclenche pas de re-rendu, or les
  // hooks d'appel doivent recevoir l'instance dès qu'elle existe.
  const [socket, setSocket] = useState(null);
  const currentUserId = parseInt(localStorage.getItem("id") || "0", 10);

  // Appels audio : monté au niveau de l'app pour recevoir les appels entrants
  // même quand aucune discussion n'est ouverte.
  const call = useCall(socket, currentUserId);
  const [callPickerOpen, setCallPickerOpen] = useState(false);

  // WebSocket
  useEffect(() => {
    if (!token) return;
    const socket = io(`${WS_HOST}/chat`, {
      auth: { token },
      // Repli polling autorisé : sur certains réseaux mobiles africains et
      // derrière des proxys d'entreprise, l'upgrade WebSocket échoue. Sans
      // polling, le chat ET les appels seraient totalement inutilisables.
      transports: ["websocket", "polling"],
      // Reconnexion patiente : en 2G, une coupure de 30 s est banale.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 25000,
    });
    socketRef.current = socket;
    setSocket(socket);
    socket.on("connect", () => {
      socket.emit("register", { userId: currentUserId });
    });
    socket.on("newMessage", () => {
      // Rafraîchir les badges
      loadChannels();
      loadTopics();
      loadPeople();
    });
    return () => {
      socket.disconnect();
      setSocket(null);
    };
  }, [token]);

  const loadChannels = useCallback(() => {
    api.channels().then(setChannels).catch(console.error);
  }, []);

  const loadTopics = useCallback(() => {
    api.topics({ type: topicFilter !== "all" ? topicFilter : undefined })
      .then(setTopics).catch(console.error);
  }, [topicFilter]);

  const loadPeople = useCallback(() => {
    api.directConversations().then(setPeople).catch(console.error);
  }, []);

  useEffect(() => {
    if (token) { loadChannels(); loadTopics(); loadPeople(); }
  }, [token, loadChannels, loadTopics, loadPeople]);

  const openChannel = async (ch) => {
    try {
      const disc = await api.channelDiscussion(ch.id);
      setActiveDisc({ id: disc.id, title: `# ${ch.name}`, icon: ch.icon, color: ch.color });
      setMobileMsgOpen(true);
    } catch(e) { console.error(e); }
  };

  // Tête-à-tête : la discussion est créée à la volée au premier clic, on n'a
  // donc pas besoin d'attendre qu'un channel commun existe.
  const openPerson = async (p) => {
    try {
      const disc = await api.openDirect(p.user_id);
      const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || `Utilisateur ${p.user_id}`;
      setActiveDisc({ id: disc.id, title: name, peerId: p.user_id });
      setMobileMsgOpen(true);
      loadPeople();
      return disc;
    } catch (e) { console.error(e); }
  };

  // Appel direct depuis la liste : ouvre d'abord la discussion, car un appel
  // est toujours rattaché à une discussion côté backend.
  const callPerson = async (e, p) => {
    e.stopPropagation();
    // La demande de permission doit partir directement du clic. L'ouverture
    // de la discussion fait un appel reseau et ferait perdre le geste utilisateur.
    const microphoneReady = call.prepareMicrophone();
    const disc = await openPerson(p);
    if (!disc) return;
    try { await microphoneReady; } catch { /* startCall affiche l'erreur */ }
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || `Utilisateur ${p.user_id}`;
    call.startCall(disc.id, p.user_id, name);
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

  const filteredPeople = people.filter(p => {
    if (!search) return true;
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase());
  });

  if (!token) return <LoginScreen />;

  return (
    <div className="shell">
      {/* Appels : montés à la racine pour que la sonnerie entrante s'affiche
          même sans discussion ouverte. */}
      <CallUI call={call} />
      <CallPicker
        open={callPickerOpen}
        onClose={() => setCallPickerOpen(false)}
        currentUserId={currentUserId}
        onPick={(calleeId, name) => {
          if (activeDisc) call.startCall(activeDisc.id, calleeId, name);
        }}
      />

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
          <button className={`tab-btn ${activeTab==="people"?"active":""}`} onClick={() => setActiveTab("people")}>
            <User size={14} /> Personnes
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

        {activeTab === "people" && (
          <>
            <div className="sidebar-search">
              <Search size={13} />
              <input placeholder="Rechercher une personne…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="topic-list">
              {filteredPeople.map(p => {
                const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || `Utilisateur ${p.user_id}`;
                return (
                  <div key={p.user_id}
                    className={`person-item ${activeDisc?.peerId===p.user_id?"active":""}`}
                    onClick={() => openPerson(p)}>
                    <div className="msg-avatar" style={{ background: avatarColor(p.user_id) }}>
                      {initials(p.firstName, p.lastName)}
                    </div>
                    <div className="topic-body">
                      <div className="topic-title">{name}</div>
                      {p.last_message && (
                        <div className="topic-preview">{p.last_message.slice(0,40)}{p.last_message.length>40?"…":""}</div>
                      )}
                    </div>
                    <div className="topic-meta">
                      {p.last_message_at && <span>{relTime(p.last_message_at)}</span>}
                      {p.unread > 0 && <span className="ch-badge">{p.unread}</span>}
                    </div>
                    <button className="person-call-btn"
                      onClick={(e) => callPerson(e, p)}
                      disabled={!socket || call.isActive}
                      title={call.isActive ? "Appel en cours" : `Appeler ${name}`}>
                      <Phone size={14} />
                    </button>
                  </div>
                );
              })}
              {filteredPeople.length === 0 && <div className="sidebar-empty">Aucune personne</div>}
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
                  : activeDisc.peerId
                    ? <User size={18}/>
                    : (activeDisc.entityType === "journal_event" ? <BookOpen size={18}/> : <Ticket size={18}/>)
                }
                <span>{activeDisc.title}</span>
              </div>
              {/* Appel audio : désactivé tant que le socket n'est pas connecté.
                  En tête-à-tête le correspondant est connu — pas de sélecteur. */}
              <button
                className="call-start-btn"
                onClick={() => {
                  if (activeDisc.peerId) call.startCall(activeDisc.id, activeDisc.peerId, activeDisc.title);
                  else setCallPickerOpen(true);
                }}
                disabled={!socket || call.isActive}
                title={call.isActive ? "Appel en cours" : "Appeler"}
              >
                <Phone size={15} />
              </button>
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
