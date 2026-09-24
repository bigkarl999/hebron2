import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackVisitor } from "@/lib/api";

const makeId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

const getOrCreate = (storage, key) => {
  let value = storage.getItem(key);
  if (!value) {
    value = makeId();
    storage.setItem(key, value);
  }
  return value;
};

const VisitorTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;

    const visitorId = getOrCreate(localStorage, "upperroomVisitorId");
    const sessionId = getOrCreate(sessionStorage, "upperroomSessionId");
    const payload = {
      visitor_id: visitorId,
      session_id: sessionId,
      path: location.pathname + location.search,
      event_type: "page_view",
      referrer: document.referrer || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      language: navigator.language || null,
      screen_width: window.screen?.width || window.innerWidth || null,
    };

    trackVisitor(payload).catch(() => {});

    const interval = window.setInterval(() => {
      trackVisitor({ ...payload, event_type: "heartbeat" }).catch(() => {});
    }, 30000);

    return () => window.clearInterval(interval);
  }, [location.pathname, location.search]);

  return null;
};

export default VisitorTracker;
