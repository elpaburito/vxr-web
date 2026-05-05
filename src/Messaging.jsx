import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, Search, Send, Paperclip, Smile,
  MoreVertical, Check, CheckCheck, MessageCircle,
  Loader2, FileText,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  fetchConversations, fetchMessages, fetchUnreadCounts,
  sendMessage, sendAttachmentMessage,
  markMessagesRead, subscribeToMessages, subscribeToConversations,
} from "./lib/messagingService";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 60 * 24) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Messaging() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadMap, setUnreadMap] = useState(new Map());
  const [convsLoading, setConvsLoading] = useState(true);
  const [activeId, setActiveId] = useState(searchParams.get("c") ?? null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  // --- load conversations + unread counts ---
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setConvsLoading(true);
    const [{ data }, counts] = await Promise.all([
      fetchConversations(user.id),
      fetchUnreadCounts(user.id),
    ]);
    setConversations(data ?? []);
    setUnreadMap(counts);
    setConvsLoading(false);
  }, [user?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Keep activeId in sync with URL ?c=<id>
  useEffect(() => {
    const c = searchParams.get("c");
    if (c && c !== activeId) setActiveId(c);
  }, [searchParams, activeId]);

  // --- subscribe to conversation list updates ---
  useEffect(() => {
    if (!user?.id) return;
    const ch = subscribeToConversations(user.id, (updated) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === updated.id);
        const next = exists
          ? prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          : [updated, ...prev];
        return next.sort(
          (a, b) => new Date(b.last_message_at ?? 0) - new Date(a.last_message_at ?? 0)
        );
      });
    });
    return () => ch.unsubscribe();
  }, [user?.id]);

  // --- load messages when a conversation is selected ---
  useEffect(() => {
    if (!activeId) return;
    setMsgsLoading(true);
    fetchMessages(activeId).then(({ data }) => {
      setMessages(data ?? []);
      setMsgsLoading(false);
    });
    // Mark read
    if (user?.id) markMessagesRead(activeId, user.id);
    // Clear unread badge for this conv locally
    setUnreadMap((prev) => {
      if (!prev.has(activeId)) return prev;
      const next = new Map(prev);
      next.delete(activeId);
      return next;
    });
  }, [activeId, user?.id]);

  // --- realtime subscription for active conversation ---
  useEffect(() => {
    if (!activeId) return;
    const ch = subscribeToMessages(activeId, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates (optimistic + realtime)
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Mark read immediately if still viewing
      if (user?.id) markMessagesRead(activeId, user.id);
    });
    return () => ch.unsubscribe();
  }, [activeId, user?.id]);

  // --- auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!activeId || !draft.trim() || !user?.id || sending) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    // Optimistic update
    const optimistic = {
      id: `opt-${Date.now()}`,
      conversation_id: activeId,
      sender_id: user.id,
      type: "text",
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const { data: saved } = await sendMessage(activeId, user.id, text);
    if (saved) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    }
    setSending(false);
  };

  const handleAttach = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeId || !user?.id || sending) return;
    setSending(true);
    const isImage = file.type.startsWith("image/");
    const { data: saved, error } = await sendAttachmentMessage({
      conversationId: activeId,
      senderId: user.id,
      file,
      type: isImage ? "image" : "file",
    });
    if (saved) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
    } else if (error) {
      alert(error.message || "Failed to upload attachment.");
    }
    setSending(false);
  };

  // Normalize a conversation row to the shape the UI expects
  const normalizeConv = useCallback((c) => {
    const isTenant = c.tenant_id === user?.id;
    const otherName  = isTenant ? (c.landlord_name  ?? "Landlord") : (c.tenant_name   ?? "Tenant");
    const otherAvatar = isTenant ? c.landlord_avatar              : c.tenant_avatar;
    return {
      ...c,
      name:    otherName,
      avatar:  otherAvatar,
      preview: c.last_message ?? "No messages yet",
      time:    formatTime(c.last_message_at ?? c.created_at),
      unread:  unreadMap.get(c.id) ?? 0,
      online:  false,
    };
  }, [user?.id, unreadMap]);

  const filteredConversations = useMemo(() => {
    const normalized = conversations.map(normalizeConv);
    if (!search.trim()) return normalized;
    const q = search.toLowerCase();
    return normalized.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.preview ?? "").toLowerCase().includes(q)
    );
  }, [conversations, normalizeConv, search]);

  const activeConvRaw = conversations.find((c) => c.id === activeId);
  const activeConv = activeConvRaw ? normalizeConv(activeConvRaw) : null;

  const selectConversation = (id) => {
    setActiveId(id);
    setSearchParams(id ? { c: id } : {}, { replace: true });
  };

  // Build message display objects for the active conversation
  const displayMessages = messages
    .filter((m) => m.conversation_id === activeId)
    .map((m) => ({
      id:       m.id,
      fromMe:   m.sender_id === user?.id,
      type:     m.type ?? "text",
      text:     m.content,
      url:      m.url,
      fileName: m.file_name,
      time:     formatTime(m.created_at),
      read:     m.is_read,
    }));

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <Header
        navigate={navigate}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        initial={initial}
        isAuthenticated={isAuthenticated}
      />

      <div className="flex-1 flex max-w-[80rem] w-full mx-auto px-4 lg:px-6 py-6">
        <div className="flex-1 flex bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-full md:w-[320px] lg:w-[360px] flex flex-col border-r border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => navigate("/home2")}
                className="text-slate-500 hover:text-slate-900 transition"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Messages</h2>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations"
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-3 py-2 text-sm placeholder-slate-400 outline-none focus:border-[#EC6138] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {convsLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="animate-spin mr-2" size={16} /> Loading…
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-12 px-4">
                  {search ? "No conversations match your search." : "No conversations yet."}
                </div>
              ) : (
                filteredConversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    onClick={() => selectConversation(c.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Chat panel */}
          <section className="flex-1 hidden md:flex flex-col bg-slate-50/50">
            {activeConv ? (
              <ChatThread
                conv={activeConv}
                messages={displayMessages}
                msgsLoading={msgsLoading}
                draft={draft}
                setDraft={setDraft}
                onSend={handleSend}
                onAttach={() => fileInputRef.current?.click()}
                sending={sending}
                messagesEndRef={messagesEndRef}
              />
            ) : (
              <EmptyState />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleAttach}
              style={{ display: "none" }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function ConversationRow({ conv, active, onClick }) {
  const initials = conv.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 transition ${
        active ? "bg-orange-50/60" : "hover:bg-slate-50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white font-semibold flex items-center justify-center text-sm shadow-sm overflow-hidden">
          {conv.avatar ? (
            <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : initials}
        </div>
        {conv.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-900 text-sm truncate">{conv.name}</span>
          <span className="text-[11px] text-slate-400 flex-shrink-0">{conv.time}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${
              conv.unread > 0 ? "text-slate-700 font-medium" : "text-slate-500"
            }`}
          >
            {conv.preview}
          </p>
          {conv.unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-slate-400">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC6138]/10 to-[#FF8E9E]/10 flex items-center justify-center mb-4">
        <MessageCircle size={28} className="text-[#EC6138]" />
      </div>
      <p className="text-sm">Select a conversation to start messaging</p>
    </div>
  );
}

function ChatThread({ conv, messages, msgsLoading, draft, setDraft, onSend, onAttach, sending, messagesEndRef }) {
  const initials = conv.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <>
      {/* Chat header */}
      <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white font-semibold flex items-center justify-center text-sm overflow-hidden">
              {conv.avatar ? (
                <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : initials}
            </div>
            {conv.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{conv.name}</div>
            <div className="text-[11px] text-slate-500">
              {conv.listing_title ? conv.listing_title : (conv.online ? "Active now" : "Offline")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn aria-label="More options"><MoreVertical size={16} /></IconBtn>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {msgsLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={16} /> Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">No messages yet. Say hello!</div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={onSend}
        className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={onAttach}
          disabled={sending}
          className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 pr-10 text-sm placeholder-slate-400 outline-none focus:border-[#EC6138] focus:bg-white transition"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-full transition"
            aria-label="Emoji"
          >
            <Smile size={16} />
          </button>
        </div>
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
          aria-label="Send"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </>
  );
}

function MessageBody({ m, mine }) {
  if (m.type === "image" && m.url) {
    return (
      <a href={m.url} target="_blank" rel="noreferrer" className="block">
        <img
          src={m.url}
          alt={m.fileName || "attachment"}
          className="max-w-[260px] max-h-[320px] rounded-xl object-cover"
        />
      </a>
    );
  }
  if (m.type === "file" && m.url) {
    return (
      <a
        href={m.url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-2 ${mine ? "text-white" : "text-slate-800"}`}
      >
        <FileText size={18} className={mine ? "text-white" : "text-[#EC6138]"} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{m.fileName || "Attachment"}</p>
          <p className={`text-[11px] ${mine ? "text-white/80" : "text-slate-500"}`}>Tap to open</p>
        </div>
      </a>
    );
  }
  return <span>{m.text}</span>;
}

function MessageBubble({ m }) {
  if (m.fromMe) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div
            className="rounded-2xl rounded-br-sm px-4 py-2 text-sm text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
          >
            <MessageBody m={m} mine={true} />
          </div>
          <div className="text-[10px] text-slate-400 mt-1 mr-1 flex items-center gap-1 justify-end">
            {m.time}
            {m.read ? (
              <CheckCheck size={11} className="text-[#EC6138]" />
            ) : (
              <Check size={11} />
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%]">
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-2 text-sm text-slate-800 shadow-sm">
          <MessageBody m={m} mine={false} />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 ml-1">{m.time}</div>
      </div>
    </div>
  );
}

function IconBtn({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="w-9 h-9 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition"
    >
      {children}
    </button>
  );
}

function Header({ navigate, dropdownOpen, setDropdownOpen, initial, isAuthenticated }) {
  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      onClick={() => setDropdownOpen(false)}
    >
      <div
        style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span className="font-black text-lg" style={{ color: "#e8756a" }}>V</span>
          </div>
          <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <button
            onClick={() => navigate("/home2")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4,
            }}
          >
            <Home size={22} color="white" />
          </button>

          <button style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 4, position: "relative",
          }}>
            <Bell size={22} color="white" />
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 8, height: 8, borderRadius: "50%",
              background: "#ff3b30", border: "1.5px solid #f0a090",
            }} />
          </button>

          {isAuthenticated && (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "white", border: "none", cursor: "pointer",
                borderRadius: 999, padding: "5px 14px 5px 6px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #EC6138, #FF8E9E)",
                color: "white", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                {initial}
              </div>
              <div style={{
                width: 0, height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "8px solid #222",
              }} />
            </button>
          )}

          {dropdownOpen && <ProfileDropdown />}
        </div>
      </div>
    </nav>
  );
}
