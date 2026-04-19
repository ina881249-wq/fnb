import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Bell, CheckCheck, AlertCircle, Info, CheckCircle2, AlertTriangle, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const formatRelative = (iso) => {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}d`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}h`;
    return d.toLocaleDateString('id-ID');
  } catch { return ''; }
};

const severityIcon = (sev) => {
  switch (sev) {
    case 'critical': return <AlertCircle className="w-4 h-4 text-rose-400" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    default: return <Info className="w-4 h-4 text-cyan-400" />;
  }
};

const severityBorder = (sev) => {
  switch (sev) {
    case 'critical': return 'border-l-rose-400';
    case 'warning': return 'border-l-amber-400';
    case 'success': return 'border-l-emerald-400';
    default: return 'border-l-cyan-400';
  }
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | unread
  const wsRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications', { params: { unread_only: filter === 'unread', limit: 25 } });
      setItems(res.data.items || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch { /* silent */ }
    setLoading(false);
  }, [filter]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications/unread-count');
      setUnreadCount(res.data.unread_count || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000); // poll every 30s as fallback
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, filter, fetchNotifications]);

  // WebSocket: push new notifications in real-time
  useEffect(() => {
    if (!token) return undefined;
    try {
      const base = process.env.REACT_APP_BACKEND_URL || window.location.origin;
      const wsUrl = base.replace(/^http/, 'ws') + `/ws/${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'notification_new') {
            setUnreadCount((c) => c + 1);
            if (open) {
              setItems((prev) => [ { ...msg.notification, is_read: false }, ...prev ].slice(0, 25));
            }
          }
        } catch { /* ignore */ }
      };
      ws.onerror = () => { /* silent */ };
      return () => { try { ws.close(); } catch { /* ignore */ } };
    } catch { return undefined; }
  }, [token, open]);

  const handleItemClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.post(`/api/notifications/${n.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setItems((prev) => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      } catch { /* ignore */ }
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      setUnreadCount(0);
      setItems((prev) => prev.map(x => ({ ...x, is_read: true })));
    } catch { /* ignore */ }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="relative h-9 w-9 p-0 hover:bg-white/5"
          data-testid="notification-bell-button"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-rose-500 border-0 text-[9px] font-bold animate-pulse"
              data-testid="notification-unread-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 bg-[var(--glass-bg-strong)] border-[var(--glass-border)] backdrop-blur-2xl"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Notifikasi</span>
            {unreadCount > 0 && (
              <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400 bg-rose-500/10">{unreadCount} baru</Badge>
            )}
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:text-[hsl(var(--muted-foreground))] disabled:cursor-not-allowed flex items-center gap-1"
            data-testid="mark-all-read-button"
          >
            <CheckCheck className="w-3 h-3" /> Tandai semua
          </button>
        </div>

        <div className="flex gap-1 p-2 border-b border-[var(--glass-border)]">
          {[
            { k: 'all', l: 'Semua' },
            { k: 'unread', l: 'Belum dibaca' },
          ].map(opt => (
            <button
              key={opt.k}
              className={`text-[11px] px-2 py-1 rounded ${filter === opt.k ? 'bg-cyan-500/20 text-cyan-400' : 'text-[hsl(var(--muted-foreground))] hover:bg-white/5'}`}
              onClick={() => setFilter(opt.k)}
              data-testid={`notification-filter-${opt.k}`}
            >
              {opt.l}
            </button>
          ))}
        </div>

        <ScrollArea className="h-[400px]">
          {loading && <p className="text-xs text-center text-[hsl(var(--muted-foreground))] py-6">Loading...</p>}
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center" data-testid="notification-empty">
              <Inbox className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-40" />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">Tidak ada notifikasi</p>
            </div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`w-full text-left p-3 border-b border-[var(--glass-border)]/50 hover:bg-white/5 transition-colors border-l-2 ${severityBorder(n.severity)} ${!n.is_read ? 'bg-white/[0.02]' : ''}`}
              data-testid={`notification-item-${n.id}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{severityIcon(n.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs leading-tight ${!n.is_read ? 'font-semibold text-foreground' : 'text-[hsl(var(--muted-foreground))]'}`}>{n.title}</p>
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">{formatRelative(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">{n.body}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[9px] capitalize border-white/10">{(n.type || '').replace(/_/g, ' ')}</Badge>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
