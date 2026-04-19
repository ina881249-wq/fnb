import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { useLang } from '../../context/LangContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { MessageCircle, Send, Sparkles, Trash2, Plus, User } from 'lucide-react';
import { toast } from 'sonner';

const SUGGESTIONS = [
  { id: 'top', text_id: 'Outlet mana paling untung bulan ini?', text_en: 'Which outlet is most profitable this month?' },
  { id: 'waste', text_id: 'Berapa total waste 30 hari terakhir dan dari kategori apa paling banyak?', text_en: 'What is total waste in last 30 days by category?' },
  { id: 'variance', text_id: 'Ada shift kasir dengan variance besar belakangan ini?', text_en: 'Any large cashier shift variances recently?' },
  { id: 'trend', text_id: 'Bagaimana trend revenue 2 minggu terakhir?', text_en: 'How is the revenue trend last 2 weeks?' },
];

// Reuse markdown renderer
function renderInline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[hsl(var(--foreground))]">$1</strong>').replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-black/20 text-xs">$1</code>');
}

export default function AIChat() {
  const { lang } = useLang();
  const { outlets } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [outletId, setOutletId] = useState('all');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadSessions = async () => {
    try {
      const res = await api.get('/api/ai/chat/sessions');
      setSessions(res.data.sessions || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selectSession = async (sid) => {
    setCurrentSession(sid);
    try {
      const res = await api.get(`/api/ai/chat/sessions/${sid}`);
      setMessages(res.data.messages || []);
    } catch (e) { toast.error('Failed to load session'); }
  };

  const newSession = () => {
    setCurrentSession(null);
    setMessages([]);
  };

  const deleteSession = async (sid) => {
    if (!window.confirm(lang === 'id' ? 'Hapus percakapan ini?' : 'Delete this session?')) return;
    try {
      await api.delete(`/api/ai/chat/sessions/${sid}`);
      loadSessions();
      if (currentSession === sid) newSession();
    } catch (e) { toast.error('Failed'); }
  };

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    const userMsg = { role: 'user', text: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', text: '...', loading: true }]);
    try {
      const res = await api.post('/api/ai/chat', {
        session_id: currentSession,
        message: msg,
        outlet_id: outletId === 'all' ? null : outletId,
      });
      const newSid = res.data.session_id;
      if (!currentSession) {
        setCurrentSession(newSid);
        loadSessions();
      }
      setMessages(prev => {
        const withoutLoading = prev.filter(m => !m.loading);
        return [...withoutLoading, { role: 'assistant', text: res.data.response, timestamp: new Date().toISOString() }];
      });
    } catch (e) {
      setMessages(prev => prev.filter(m => !m.loading));
      toast.error(e.response?.data?.detail || (lang === 'id' ? 'Gagal menghubungi AI' : 'AI error'));
    } finally { setSending(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-180px)]" data-testid="ai-chat-page">
      {/* Sidebar: Sessions */}
      <div className="lg:col-span-1 space-y-2 flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-1.5" style={{ fontFamily: 'Space Grotesk' }}>
            <MessageCircle className="w-4 h-4" />
            {lang === 'id' ? 'Percakapan' : 'Sessions'}
          </h3>
          <Button size="sm" variant="outline" onClick={newSession} className="h-7 text-xs gap-1" data-testid="ai-chat-new">
            <Plus className="w-3 h-3" /> {lang === 'id' ? 'Baru' : 'New'}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {sessions.length === 0 && (
            <div className="text-xs text-[hsl(var(--muted-foreground))] p-3 text-center">{lang === 'id' ? 'Belum ada percakapan' : 'No sessions yet'}</div>
          )}
          {sessions.map(s => (
            <div key={s.session_id} onClick={() => selectSession(s.session_id)}
              className={`group p-2.5 rounded-lg border cursor-pointer text-xs ${
                currentSession === s.session_id
                  ? 'bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/40'
                  : 'bg-[var(--glass-bg)] border-[var(--glass-border)] hover:border-[var(--glass-border-strong)]'
              }`} data-testid={`ai-chat-session-${s.session_id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="line-clamp-2 text-[hsl(var(--foreground))]/90">{s.preview || '(kosong)'}</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    {s.message_count} msg · {new Date(s.updated_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.session_id); }} className="opacity-0 group-hover:opacity-100 text-[hsl(var(--destructive))] p-0.5" data-testid={`ai-chat-delete-${s.session_id}`}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="lg:col-span-3 flex flex-col">
        <Card className="bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-xl flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))]/30 to-purple-500/30 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>AI Executive Assistant</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">Claude Sonnet 4.5 · Bisnis F&B Anda</div>
              </div>
            </div>
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger className="h-8 w-[180px] text-xs" data-testid="ai-chat-outlet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === 'id' ? 'Semua Outlet' : 'All Outlets'}</SelectItem>
                {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center pt-10">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))]/20 to-purple-500/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="font-semibold text-base mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                  {lang === 'id' ? 'Halo! Saya asisten AI eksekutif Anda' : 'Hi! I am your AI executive assistant'}
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                  {lang === 'id' ? 'Tanya saya tentang data bisnis F&B Anda — outlet, revenue, waste, kas, dan lainnya.' : 'Ask me about your F&B business data.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.map(s => (
                    <button key={s.id} onClick={() => send(lang === 'id' ? s.text_id : s.text_en)}
                      className="text-left p-3 rounded-lg bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] hover:border-[hsl(var(--primary))]/40 transition-colors text-sm"
                      data-testid={`ai-chat-suggestion-${s.id}`}>
                      <Sparkles className="w-3 h-3 inline mr-1.5 text-[hsl(var(--primary))]" />
                      {lang === 'id' ? s.text_id : s.text_en}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`ai-chat-msg-${i}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))]/30 to-purple-500/30 border border-[hsl(var(--primary))]/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                  m.role === 'user'
                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                    : 'bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]'
                }`}>
                  {m.loading ? (
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInline(m.text) }} />
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-[var(--glass-border)] flex items-center gap-2">
            <Input
              placeholder={lang === 'id' ? 'Tanyakan apa saja...' : 'Ask anything...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className="h-10 bg-[var(--glass-bg-strong)]"
              data-testid="ai-chat-input"
            />
            <Button type="submit" disabled={sending || !input.trim()} className="h-10 gap-1.5 px-4" data-testid="ai-chat-send">
              <Send className="w-4 h-4" />
              {lang === 'id' ? 'Kirim' : 'Send'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
