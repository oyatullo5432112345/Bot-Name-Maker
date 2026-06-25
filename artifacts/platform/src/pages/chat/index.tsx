import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/use-auth";
import { Send, MessageSquare, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";
const getToken = () => localStorage.getItem("talim_auth_token");

interface Msg {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

interface ChatUser {
  user_id: string;
  user_name: string;
  user_role: string;
  last_message: string;
  last_time: string;
  unread_count: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", director: "Direktor", zam_direktor: "Direktor o'rinbosari",
  zavuch: "Zavuch", teacher: "O'qituvchi", sinf_rahbari: "Sinf rahbari",
  student: "O'quvchi", kutubxonachi: "Kutubxonachi", mudir: "Obidov Boburjon",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function MessageBubble({ msg, isMe }: { msg: Msg; isMe: boolean }) {
  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm break-words",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        <p className="whitespace-pre-wrap">{msg.message}</p>
        <p className={cn("text-[10px] mt-1 text-right", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {formatTime(msg.created_at)}
          {isMe && <span className="ml-1">{msg.is_read ? "✓✓" : "✓"}</span>}
        </p>
      </div>
    </div>
  );
}

// ─── User Chat View ───────────────────────────────────────────────────────────
function UserChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const r = await fetch(`${API_BASE}/support/messages`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (r.ok) {
      const data = await r.json() as Msg[];
      setMessages(data);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 5000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/support/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: text.trim() }),
      });
      setText("");
      await fetchMessages();
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
          A
        </div>
        <div>
          <p className="font-semibold text-sm">Admin</p>
          <p className="text-xs text-muted-foreground">Toshloq tuman 3-maktab</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm">Hali xabar yo'q</p>
            <p className="text-xs">Admin bilan bog'lanish uchun xabar yozing</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} isMe={!msg.is_from_admin} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-3 flex items-end gap-2 bg-background">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Xabar yozing..."
          rows={1}
          className="resize-none min-h-[40px] max-h-[120px]"
        />
        <Button size="icon" onClick={send} disabled={!text.trim() || sending} className="shrink-0 h-10 w-10">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Admin Chat View ──────────────────────────────────────────────────────────
function AdminChat() {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const fetchUsers = useCallback(async () => {
    const r = await fetch(`${API_BASE}/support/chats`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (r.ok) {
      const data = await r.json() as ChatUser[];
      setChatUsers(data);
    }
  }, []);

  const fetchMessages = useCallback(async (uid: string) => {
    const r = await fetch(`${API_BASE}/support/chats/${uid}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (r.ok) {
      const data = await r.json() as Msg[];
      setMessages(data);
      // O'qilgan deb belgilash — unread count yangilash
      setChatUsers(prev => prev.map(u => u.user_id === uid ? { ...u, unread_count: 0 } : u));
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const t = setInterval(fetchUsers, 6000);
    return () => clearInterval(t);
  }, [fetchUsers]);

  useEffect(() => {
    if (!selectedUser) return;
    fetchMessages(selectedUser.user_id);
    const t = setInterval(() => fetchMessages(selectedUser.user_id), 5000);
    return () => clearInterval(t);
  }, [selectedUser, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectUser = (u: ChatUser) => {
    setSelectedUser(u);
    setMessages([]);
    setMobileShowChat(true);
    fetchMessages(u.user_id);
  };

  const send = async () => {
    if (!text.trim() || !selectedUser || sending) return;
    setSending(true);
    try {
      await fetch(`${API_BASE}/support/chats/${selectedUser.user_id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ message: text.trim() }),
      });
      setText("");
      await fetchMessages(selectedUser.user_id);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex h-full border rounded-xl overflow-hidden shadow-sm">
      {/* Left: Users list */}
      <div className={cn(
        "w-full md:w-72 lg:w-80 border-r flex flex-col bg-muted/20 shrink-0",
        mobileShowChat ? "hidden md:flex" : "flex"
      )}>
        <div className="px-4 py-3 border-b font-semibold text-sm bg-background">
          💬 Barcha chatlar
          {chatUsers.some(u => u.unread_count > 0) && (
            <span className="ml-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {chatUsers.reduce((s, u) => s + u.unread_count, 0)}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
              <User className="w-10 h-10 opacity-20" />
              <p className="text-sm">Hali xabar yo'q</p>
            </div>
          ) : (
            chatUsers.map(u => (
              <button
                key={u.user_id}
                onClick={() => selectUser(u)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border/50",
                  selectedUser?.user_id === u.user_id && "bg-accent"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                  {u.user_name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-medium text-sm truncate">{u.user_name}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(u.last_time)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[u.user_role] ?? u.user_role}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{u.last_message}</p>
                </div>
                {u.unread_count > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-1">
                    {u.unread_count > 9 ? "9+" : u.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !mobileShowChat ? "hidden md:flex" : "flex"
      )}>
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
              <button
                className="md:hidden p-1 rounded-lg hover:bg-accent"
                onClick={() => setMobileShowChat(false)}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                {selectedUser.user_name[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="font-semibold text-sm">{selectedUser.user_name}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[selectedUser.user_role] ?? selectedUser.user_role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMe={msg.is_from_admin} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t px-3 py-3 flex items-end gap-2 bg-background">
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`${selectedUser.user_name}ga javob yozing...`}
                rows={1}
                className="resize-none min-h-[40px] max-h-[120px]"
              />
              <Button size="icon" onClick={send} disabled={!text.trim() || sending} className="shrink-0 h-10 w-10">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="w-16 h-16 opacity-15" />
            <p className="text-sm">Chap tarafdan foydalanuvchi tanlang</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();
  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <div className={cn("flex flex-col", isAdmin ? "h-[calc(100vh-7rem)]" : "h-[calc(100vh-8rem)]")}>
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">
          {isAdmin ? "Qo'llab-quvvatlash — Admin panel" : "Qo'llab-quvvatlash"}
        </h1>
      </div>

      <div className="flex-1 min-h-0">
        {isAdmin ? <AdminChat /> : <UserChat userId={String(user.id)} />}
      </div>
    </div>
  );
}
