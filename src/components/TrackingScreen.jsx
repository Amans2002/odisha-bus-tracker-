import { useState, useEffect, useRef } from "react";
import TicketCard from "./TicketCard";
import ETACard from "./ETACard";
import StatsGrid from "./StatsGrid";
import StopList from "./StopList";
import RouteMap from "./RouteMap";
import { closestKmOnRoute, interpolatePosition, AVG_SPEED_KMPH } from "../utils";

export default function TrackingScreen({ ticket, stops, onBack, showToast }) {
  const [tracking, setTracking] = useState(false);
  const [kmTravelled, setKmTravelled] = useState(stops[ticket.fromIdx].km);
  const [speed, setSpeed] = useState(0);
  const [locStatus, setLocStatus] = useState({ text: 'Tap "Start Tracking" to detect your location', className: "" });
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);
  const simIntervalRef = useRef(null);
  const lastPosRef = useRef(null);
  const trackingRef = useRef(false);

  const fromKm = stops[ticket.fromIdx].km;
  const toKm = stops[ticket.toIdx].km;

  // Keep ref in sync
  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const startSimulation = () => {
    setTracking(true);
    setLocStatus({ text: "Simulation mode · GPS unavailable", className: "ok" });
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
        showToast("You have arrived! 🎉", "🎉");
        return;
      }

      const pos = interpolatePosition(simKm, stops);
      setLocStatus({ text: `Simulation · ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`, className: "ok" });
      setSpeed(AVG_SPEED_KMPH + (Math.random() * 10 - 5));
      setKmTravelled(simKm);
    }, 2000);

    showToast("Simulation mode started", "🎮");
  };

  const startTracking = () => {
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
      setLocStatus({ text: "Tracking stopped", className: "" });
      return;
    }

    setLocStatus({ text: "Acquiring GPS signal...", className: "loading" });

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
        setLocStatus({ text: `Location acquired · ${lat.toFixed(4)}, ${lng.toFixed(4)}`, className: "ok" });

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
            setLocStatus({ text: `Live · ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`, className: "ok" });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        showToast("Live tracking started!", "📍");
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
    setTracking(false);
    onBack();
  };

  return (
    <div className="fade-up">
      <button className="back-btn" onClick={handleBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to Ticket Upload
      </button>

      <TicketCard ticket={ticket} stops={stops} />

      {error && (
        <div className="error-card">
          <span>📍</span>
          <span>{error}</span>
        </div>
      )}

      <div className={`location-status ${locStatus.className}`}>
        <span>📍</span> {locStatus.text}
      </div>

      <button
        className={`btn ${tracking ? "btn-danger" : ""}`}
        onClick={startTracking}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>
        {tracking ? "Stop Tracking" : "Start Tracking My Location"}
      </button>

      {tracking && (
        <>
          <RouteMap
            stops={stops}
            fromIdx={ticket.fromIdx}
            toIdx={ticket.toIdx}
            kmTravelled={kmTravelled}
          />

          <ETACard
            kmTravelled={kmTravelled}
            speed={speed}
            fromStop={stops[ticket.fromIdx]}
            toStop={stops[ticket.toIdx]}
          />

          <StatsGrid
            kmTravelled={kmTravelled}
            fromKm={fromKm}
            toKm={toKm}
            speed={speed}
          />

          <StopList
            stops={stops}
            fromIdx={ticket.fromIdx}
            toIdx={ticket.toIdx}
            kmTravelled={kmTravelled}
          />
        </>
      )}

      <p className="disclaimer">
        ETA is estimated based on your GPS location and average bus speed.<br />
        Real-time traffic &amp; stops may affect actual arrival. Keep app open for live updates.
      </p>
    </div>
  );
}
