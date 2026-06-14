import { useState, useRef, useCallback, useEffect } from "react";

export default function Toast() {
  const [toast, setToast] = useState({ visible: false, msg: "", icon: "✅" });
  const timerRef = useRef(null);

  const show = useCallback((msg, icon = "✅") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, msg, icon });
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  useEffect(() => {
    // Expose globally so any component can call it
    window.__showToast = show;
    return () => { delete window.__showToast; };
  }, [show]);

  return (
    <div className={`toast ${toast.visible ? "visible" : ""}`}>
      <span>{toast.icon}</span>
      <span>{toast.msg}</span>
    </div>
  );
}

export function showToast(msg, icon = "✅") {
  if (window.__showToast) window.__showToast(msg, icon);
}
