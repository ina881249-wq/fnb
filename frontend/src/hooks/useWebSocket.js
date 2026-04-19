import { useEffect, useRef, useCallback } from 'react';

/**
 * Subscribes to backend WebSocket /ws/{token} and invokes onMessage for each event.
 * Auto-reconnects with backoff. Sends ping every 30s to keep connection alive.
 *
 * @param {Function} onMessage (msg) => void
 * @param {Array<string>} eventTypes optional filter — only invoke onMessage for these message.type values
 */
export default function useWebSocket(onMessage, eventTypes = null) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pingTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('fnb_token');
    if (!token) return;
    const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
    // Transform http(s) → ws(s)
    const wsUrl = backendUrl.replace(/^http/, 'ws') + `/ws/${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        // Ping every 30s to keep connection alive
        if (pingTimer.current) clearInterval(pingTimer.current);
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 30000);
      };

      ws.onmessage = (e) => {
        if (e.data === 'pong') return;
        try {
          const msg = JSON.parse(e.data);
          if (eventTypes && !eventTypes.includes(msg.type)) return;
          onMessageRef.current?.(msg);
        } catch (err) { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
        // Exponential backoff reconnect (max 30s)
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current++), 30000);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => { try { ws.close(); } catch (e) {} };
    } catch (e) {
      // Retry
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [eventTypes]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        try { wsRef.current.close(); } catch (e) {}
      }
    };
  }, [connect]);

  return wsRef;
}
