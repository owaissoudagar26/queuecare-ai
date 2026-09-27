import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WS_BASE_URL } from '../utils/constants';

const QueueSocketContext = createContext(null);

export function QueueSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = () => {
    try {
      const ws = new WebSocket(WS_BASE_URL);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('[QueueCare AI] WebSocket connection established.');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch {
          // ignore plain text ping responses
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Automatic reconnection attempt after 3.5s
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3500);
      };

      ws.onerror = (err) => {
        console.warn('[QueueCare AI] WebSocket connection encountered issue, falling back to polling.', err);
        ws.close();
      };

      socketRef.current = ws;
    } catch (e) {
      console.warn('Could not initialize WebSocket:', e);
    }
  };

  useEffect(() => {
    connect();

    // Heartbeat ping every 25 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return (
    <QueueSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </QueueSocketContext.Provider>
  );
}

export function useQueueSocket() {
  return useContext(QueueSocketContext);
}
