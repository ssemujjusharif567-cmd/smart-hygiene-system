import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../api';

const SSE_URL = `${API_BASE}/api/dashboard/stream/`;
const RECONNECT_DELAY = 3000;

/**
 * useSSE — connects to the backend SSE stream and returns live dashboard data.
 * Automatically reconnects on disconnect.
 * Returns: { kpi, sensors, devices, alerts, summary, activity, connected }
 */
export function useSSE() {
  const [data, setData]           = useState({});
  const [connected, setConnected] = useState(false);
  const esRef                     = useRef(null);
  const retryRef                  = useRef(null);

  useEffect(() => {
    function connect() {
      if (esRef.current) esRef.current.close();

      const es = new EventSource(SSE_URL);
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (!payload.error) setData(payload);
        } catch {}
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        retryRef.current = setTimeout(connect, RECONNECT_DELAY);
      };
    }

    connect();

    return () => {
      if (esRef.current)    esRef.current.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  return {
    kpi:      data.kpi      ?? [],
    sensors:  data.sensors  ?? [],
    devices:  data.devices  ?? [],
    alerts:   data.alerts   ?? [],
    summary:  data.summary  ?? {},
    activity: data.activity ?? { hours: [], values: [] },
    connected,
  };
}
