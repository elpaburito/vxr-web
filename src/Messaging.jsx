import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Bell, ArrowLeft, Search, Send, Paperclip, Smile,
  Phone, Video, MoreVertical, Check, CheckCheck, MessageCircle,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";

// ===== MOCK DATA — replace with real data when wiring to Supabase =====
const MOCK_CONVERSATIONS = [
  {
    id: 1,
    name: "Lebrown DJ",
    preview: "Hey! Tito when do we plan to meet?",
    time: "2m ago",
    unread: 3,
    online: true,
    messages: [
      { id: 1, fromMe: false, text: "Hey! Tito when do we plan to meet?", time: "10:21 AM" },
      { id: 2, fromMe: false, text: "About the unit listing on Salitran I", time: "10:21 AM" },
      { id: 3, fromMe: true, text: "Hi Lebrown! How about Saturday afternoon?", time: "10:25 AM", read: true },
      { id: 4, fromMe: false, text: "Saturday works! What time?", time: "10:28 AM" },
      { id: 5, fromMe: true, text: "Let's say 2pm. I'll send the exact pin location.", time: "10:30 AM", read: true },
    ],
  },
  {
    id: 2,
    name: "Juan Smith",
    preview: "Thanks for the help this morning!",
    time: "10m ago",
    unread: 2,
    online: false,
    messages: [
      { id: 1, fromMe: false, text: "Hi, is the studio still available?", time: "Yesterday" },
      { id: 2, fromMe: true, text: "Yes, it is! Want to book a viewing?", time: "Yesterday", read: true },
      { id: 3, fromMe: false, text: "Thanks for the help this morning!", time: "9:44 AM" },
    ],
  },
  {
    id: 3,
    name: "Ronelito Sonlito",
    preview: "Tipid! Rivals daw! Bilisan mo!",
    time: "1h ago",
    unread: 1,
    online: true,
    messages: [
      { id: 1, fromMe: false, text: "Tipid! Rivals daw! Bilisan mo!", time: "9:00 AM" },
    ],
  },
  {
    id: 4,
    name: "Jhulong Berry",
    preview: "Napaka TIPIP MO!",
    time: "1m ago",
    unread: 2,
    online: false,
    messages: [
      { id: 1, fromMe: false, text: "Napaka TIPIP MO!", time: "Just now" },
    ],
  },
];

export default function Messaging() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef(null);

  const initial = (profile?.full_name || user?.email || "?").charAt(0).toUpperCase();

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const activeConv = conversations.find((c) => c.id === activeId);

  // Mark messages read when opening a conversation
  useEffect(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c))
    );
  }, [activeId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages?.length]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!activeConv || !draft.trim()) return;
    const newMsg = {
      id: Date.now(),
      fromMe: true,
      text: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      read: false,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? { ...c, messages: [...c.messages, newMsg], preview: newMsg.text, time: "now" }
          : c
      )
    );
    setDraft("");
  };

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
              {filteredConversations.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-12 px-4">
                  No conversations match your search.
                </div>
              ) : (
                filteredConversations.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    onClick={() => setActiveId(c.id)}
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
                draft={draft}
                setDraft={setDraft}
                onSend={handleSend}
                messagesEndRef={messagesEndRef}
              />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ConversationRow({ conv, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 transition ${
        active ? "bg-orange-50/60" : "hover:bg-slate-50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white font-semibold flex items-center justify-center text-sm shadow-sm">
          {conv.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
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

function ChatThread({ conv, draft, setDraft, onSend, messagesEndRef }) {
  return (
    <>
      {/* Chat header */}
      <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] text-white font-semibold flex items-center justify-center text-sm">
              {conv.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            {conv.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{conv.name}</div>
            <div className="text-[11px] text-slate-500">
              {conv.online ? "Active now" : "Offline"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn aria-label="Voice call"><Phone size={16} /></IconBtn>
          <IconBtn aria-label="Video call"><Video size={16} /></IconBtn>
          <IconBtn aria-label="More options"><MoreVertical size={16} /></IconBtn>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {conv.messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={onSend}
        className="px-4 py-3 bg-white border-t border-gray-100 flex items-center gap-2"
      >
        <button
          type="button"
          className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition"
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
          disabled={!draft.trim()}
          className="w-10 h-10 rounded-full text-white flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #EC6138, #FF8E9E)" }}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
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
            {m.text}
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
          {m.text}
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
