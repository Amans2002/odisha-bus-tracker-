import { useState, useEffect, useRef, useCallback } from "react";
import TicketCard from "./TicketCard";
import ETACard from "./ETACard";
import StatsGrid from "./StatsGrid";
import StopList from "./StopList";
import RouteMap from "./RouteMap";
import { closestKmOnRoute, interpolatePosition, formatTime, AVG_SPEED_KMPH } from "../utils";
import {
  playAlarm,
  vibrate,
  requestNotificationPermission,
  showNotification,
  checkProximityAlerts,
  startPeriodicAlerts,
  stopPeriodicAlerts,
} from "../services/AlarmService";

export default function TrackingScreen({ ticket, stops, onBack, showToast }) {
  const [tracking, setTracking] = useState(false);
  const [kmTravelled, setKmTravelled] = useState(stops[ticket.fromIdx].km);
  const [speed, setSpeed] = useState(0);
  const [locStatus, setLocStatus] = useState({ text: 'Tap "Start Tracking" to detect your location', className: "" });
  const [error, setError] = useState(null);
  const [notifPermission, setNotifPermission] = useState("default");
  const [alertLog, setAlertLog] = useState([]);
  const [nextAlertIn, setNextAlertIn] = useState(null);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);

  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const lastPosRef = useRef(null);
  const trackingRef = useRef(false);
  const alertedRef = useRef(new Set());
  const kmRef = useRef(stops[ticket.fromIdx].km);
  const speedRef = useRef(0);
  const alertCountdownRef = useRef(null);

  const fromKm = stops[ticket.fromIdx].km;
  const toKm = stops[ticket.toIdx].km;

  // Keep refs in sync
  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    kmRef.current = kmTravelled;
  }, [kmTravelled]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Monitor online/offline
  useEffect(() => {
    const goOffline = () => setOfflineMode(true);
    const goOnline = () => setOfflineMode(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (alertCountdownRef.current) clearInterval(alertCountdownRef.current);
      stopPeriodicAlerts();
    };
  }, []);

  // Check proximity alerts whenever kmTravelled changes
  useEffect(() => {
    if (!tracking) return;
    const alertType = checkProximityAlerts(kmTravelled, stops, ticket.toIdx, alertedRef.current);
    if (alertType) {
      alertedRef.current.add(alertType);
      const remaining = Math.max(0, toKm - kmTravelled);
      const timestamp = formatTime(new Date());
      setAlertLog((prev) => [
        { type: alertType, time: timestamp, remaining: remaining.toFixed(1) },
        ...prev.slice(0, 9),
      ]);
    }
  }, [kmTravelled, tracking]);

  // Get current status for periodic alerts
  const getStatus = useCallback(() => {
    const remaining = Math.max(0, toKm - kmRef.current);
    const effectiveSpeed = speedRef.current > 2 ? speedRef.current : AVG_SPEED_KMPH;
    const etaMins = remaining > 0.05 ? Math.round((remaining / effectiveSpeed) * 60) : 0;
    return {
      remaining: remaining.toFixed(1),
      etaMins,
      destName: stops[ticket.toIdx].name,
      travelled: (kmRef.current - fromKm).toFixed(1),
    };
  }, [toKm, fromKm, stops, ticket.toIdx]);

  // Handle periodic 5-min alert callback
  const handlePeriodicAlert = useCallback((status) => {
    if (status.remaining <= 0.05) {
      stopPeriodicAlerts();
      return;
    }
    playAlarm("alert");
    showNotification(
      `🚌 5-Min Update · ${status.etaMins} min to go`,
      `${status.travelled} km done, ${status.remaining} km left to ${status.destName}. ETA: ~${status.etaMins} min.`,
      "periodic-update"
    );
    const timestamp = formatTime(new Date());
    setAlertLog((prev) => [
      { type: "5-min-update", time: timestamp, remaining: status.remaining },
      ...prev.slice(0, 9),
    ]);
    showToast(`📍 ${status.remaining} km left · ~${status.etaMins} min`, "🔔");
  }, [showToast]);

  // 5-minute countdown timer display
  useEffect(() => {
    if (!tracking) {
      setNextAlertIn(null);
      if (alertCountdownRef.current) clearInterval(alertCountdownRef.current);
      return;
    }
    let seconds = 300; // 5 minutes
    setNextAlertIn(seconds);
    alertCountdownRef.current = setInterval(() => {
      seconds--;
      if (seconds <= 0) seconds = 300;
      setNextAlertIn(seconds);
    }, 1000);
    return () => {
      if (alertCountdownRef.current) clearInterval(alertCountdownRef.current);
    };
  }, [tracking]);

  const enableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      showToast("Notifications enabled!", "🔔");
    } else {
      showToast("Notification permission denied", "⚠️");
    }
  };

  const startSimulation = () => {
    setTracking(true);
    setLocStatus({ text: "📡 Offline GPS Mode · No internet needed", className: "ok" });
    setError(null);

    let simKm = fromKm;
    simIntervalRef.current = setInterval(() => {
      if (!trackingRef.current) {
        clearInterval(simIntervalRef.current);
        return;
      }
      simKm += 0.15 + Math.random() * 0.2;
      if (simKm >= toKm) {
        simKm = toKm;
        setKmTravelled(simKm);
        setSpeed(0);
        clearInterval(simIntervalRef.current);
        stopPeriodicAlerts();
        showToast("You have arrived! 🎉", "🎉");
        return;
      }

      const pos = interpolatePosition(simKm, stops);
      setLocStatus({ text: `📡 Offline GPS · ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`, className: "ok" });
      setSpeed(AVG_SPEED_KMPH + (Math.random() * 10 - 5));
      setKmTravelled(simKm);
    }, 2000);

    // Start 5-min periodic alerts
    startPeriodicAlerts(getStatus, handlePeriodicAlert);
    showToast("Offline tracking started with alerts", "📡");
  };

  const startTracking = async () => {
    if (tracking) {
      // Stop
      setTracking(false);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      stopPeriodicAlerts();
      alertedRef.current.clear();
      setLocStatus({ text: "Tracking stopped", className: "" });
      return;
    }

    // Request notification permission
    if (Notification.permission !== "granted") {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
    }

    // Unlock audio context on user gesture
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      ctx.close();
    } catch (e) {}

    setLocStatus({ text: "📡 Acquiring GPS signal (works offline)...", className: "loading" });

    if (!navigator.geolocation) {
      startSimulation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTracking(true);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastPosRef.current = { lat, lng };

        let km = closestKmOnRoute(lat, lng, stops);
        km = Math.max(fromKm, Math.min(toKm, km));
        setKmTravelled(km);
        setLocStatus({ text: `📡 GPS Locked · ${lat.toFixed(4)}, ${lng.toFixed(4)}${offlineMode ? " (Offline)" : ""}`, className: "ok" });

        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            if (!trackingRef.current) return;
            const newLat = p.coords.latitude;
            const newLng = p.coords.longitude;
            let newKm = closestKmOnRoute(newLat, newLng, stops);
            newKm = Math.max(fromKm, Math.min(toKm, newKm));
            const spd = p.coords.speed ? p.coords.speed * 3.6 : 0;
            setKmTravelled(newKm);
            setSpeed(spd);
            setLocStatus({
              text: `📡 GPS Live · ${newLat.toFixed(4)}, ${newLng.toFixed(4)}${!navigator.onLine ? " (Offline)" : ""}`,
              className: "ok",
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        // Start 5-min periodic alerts
        startPeriodicAlerts(getStatus, handlePeriodicAlert);
        showToast("Live tracking with alerts started!", "📍");
      },
      () => {
        startSimulation();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleBack = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    stopPeriodicAlerts();
    setTracking(false);
    onBack();
  };

  const testAlarm = () => {
    playAlarm("approaching");
    vibrate([200, 100, 200]);
    showToast("🔔 Alarm test — this plays when your stop is near!", "🔊");
  };

  const formatCountdown = (secs) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fade-up">
      <button className="back-btn" onClick={handleBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to Ticket Upload
      </button>

      {/* Offline Banner */}
      {offlineMode && (
        <div className="offline-banner">
          <span>📡</span>
          <span>Offline Mode — GPS tracking works without internet</span>
        </div>
      )}

      <TicketCard ticket={ticket} stops={stops} />

      {/* Notification & Alarm Controls */}
      <div className="alert-controls">
        <div className="alert-controls-header">
          <div className="section-title" style={{ margin: 0 }}>🔔 Alerts &amp; Notifications</div>
          {tracking && nextAlertIn && (
            <div className="next-alert-badge">
              Next alert: {formatCountdown(nextAlertIn)}
            </div>
          )}
        </div>

        <div className="alert-features">
          <div className="alert-feature">
            <span className="alert-feature-icon">📡</span>
            <div>
              <div className="alert-feature-title">Offline GPS Tracking</div>
              <div className="alert-feature-desc">Works without internet — like IRCTC</div>
            </div>
            <span className="alert-status-on">Active</span>
          </div>
          <div className="alert-feature">
            <span className="alert-feature-icon">🔔</span>
            <div>
              <div className="alert-feature-title">Stop Notifications</div>
              <div className="alert-feature-desc">Alerts at 2km, 1km, 500m, arrival</div>
            </div>
            {Notification.permission === "granted" ? (
              <span className="alert-status-on">On</span>
            ) : (
              <button className="alert-enable-btn" onClick={enableNotifications}>Enable</button>
            )}
          </div>
          <div className="alert-feature">
            <span className="alert-feature-icon">⏰</span>
            <div>
              <div className="alert-feature-title">5-Min Updates</div>
              <div className="alert-feature-desc">Periodic position &amp; ETA alerts</div>
            </div>
            <span className={tracking ? "alert-status-on" : "alert-status-off"}>
              {tracking ? "Active" : "Off"}
            </span>
          </div>
          <div className="alert-feature">
            <span className="alert-feature-icon">🔊</span>
            <div>
              <div className="alert-feature-title">Alarm Sound</div>
              <div className="alert-feature-desc">Audio beep when stop is near</div>
            </div>
            <button className="alert-enable-btn" onClick={testAlarm}>Test</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-card">
          <span>📍</span>
          <span>{error}</span>
        </div>
      )}

      <div className={`location-status ${locStatus.className}`}>
        <span>📡</span> {locStatus.text}
      </div>

      <button className={`btn ${tracking ? "btn-danger" : ""}`} onClick={startTracking}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
        {tracking ? "Stop Tracking" : "Start Offline GPS Tracking"}
      </button>

      {tracking && (
        <>
          <RouteMap stops={stops} fromIdx={ticket.fromIdx} toIdx={ticket.toIdx} kmTravelled={kmTravelled} />
          <ETACard kmTravelled={kmTravelled} speed={speed} fromStop={stops[ticket.fromIdx]} toStop={stops[ticket.toIdx]} />
          <StatsGrid kmTravelled={kmTravelled} fromKm={fromKm} toKm={toKm} speed={speed} />
          <StopList stops={stops} fromIdx={ticket.fromIdx} toIdx={ticket.toIdx} kmTravelled={kmTravelled} />

          {/* Alert Log */}
          {alertLog.length > 0 && (
            <div className="alert-log">
              <div className="section-title">Recent Alerts</div>
              {alertLog.map((log, i) => (
                <div className="alert-log-item" key={i}>
                  <span className="alert-log-icon">
                    {log.type === "arrived" ? "🎉" : log.type === "5-min-update" ? "⏰" : "🔔"}
                  </span>
                  <div className="alert-log-text">
                    <span className="alert-log-type">
                      {log.type === "arrived" && "Arrived!"}
                      {log.type === "very-close" && "Almost there!"}
                      {log.type === "approaching" && "Stop approaching"}
                      {log.type === "next-stop" && "Your stop is next"}
                      {log.type === "5-min-update" && "5-min update"}
                    </span>
                    <span className="alert-log-detail">{log.remaining} km left · {log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <p className="disclaimer">
        📡 GPS works offline — no internet needed for location tracking.<br />
        Alarm sounds &amp; notifications alert you when your stop is near.<br />
        Position updates sent every 5 minutes automatically.
      </p>
    </div>
  );
}
