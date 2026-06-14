import { useRef, useEffect } from "react";
import { interpolatePosition } from "../utils";

export default function RouteMap({ stops, fromIdx, toIdx, kmTravelled }) {
  const canvasRef = useRef(null);
  const stopsToShow = stops.slice(fromIdx, toIdx + 1);

  useEffect(() => {
    if (!canvasRef.current) return;
    const W = canvasRef.current.clientWidth || 360;
    const H = canvasRef.current.clientHeight || 200;
    const pad = 30;

    const lats = stopsToShow.map((s) => s.lat);
    const lngs = stopsToShow.map((s) => s.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const dLat = maxLat - minLat || 0.01;
    const dLng = maxLng - minLng || 0.01;

    const toX = (lng) => pad + ((lng - minLng) / dLng) * (W - 2 * pad);
    const toY = (lat) => pad + ((maxLat - lat) / dLat) * (H - 2 * pad);

    const curPos = interpolatePosition(kmTravelled, stops);
    const curX = toX(curPos.lng);
    const curY = toY(curPos.lat);

    let passedPoints = [];
    let remainPoints = [];

    stopsToShow.forEach((s) => {
      const x = toX(s.lng);
      const y = toY(s.lat);
      if (kmTravelled >= s.km) {
        passedPoints.push(`${x},${y}`);
      } else {
        if (remainPoints.length === 0 && passedPoints.length > 0) {
          remainPoints.push(`${curX},${curY}`);
        }
        remainPoints.push(`${x},${y}`);
      }
    });
    if (passedPoints.length > 0) passedPoints.push(`${curX},${curY}`);

    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

    // Grid
    for (let i = 0; i < 6; i++) {
      const y = pad + (i / 5) * (H - 2 * pad);
      svg += `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#1E2D48" stroke-width="0.5" stroke-dasharray="4,4"/>`;
    }

    // Remaining path
    if (remainPoints.length > 1) {
      svg += `<polyline points="${remainPoints.join(" ")}" fill="none" stroke="#1E2D48" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    // Passed path
    if (passedPoints.length > 1) {
      svg += `<polyline points="${passedPoints.join(" ")}" fill="none" stroke="url(#grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    // Defs
    svg += `<defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#22C55E"/><stop offset="100%" stop-color="#FF6B1A"/>
      </linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    // Stop dots
    stopsToShow.forEach((s, i) => {
      const x = toX(s.lng);
      const y = toY(s.lat);
      const isPassed = kmTravelled >= s.km;
      const color = isPassed ? "#22C55E" : "#1E2D48";
      const r = i === 0 || i === stopsToShow.length - 1 ? 5 : 3.5;

      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="${isPassed ? "#22C55E" : "#2A3B5C"}" stroke-width="1.5"/>`;

      if (i === 0 || i === stopsToShow.length - 1) {
        const anchor = i === 0 ? "start" : "end";
        svg += `<text x="${x}" y="${y - 10}" text-anchor="${anchor}" fill="#6B7A99" font-size="9" font-family="Space Grotesk, sans-serif">${s.name}</text>`;
      }
    });

    // Current position
    svg += `<circle cx="${curX}" cy="${curY}" r="8" fill="rgba(255,107,26,0.2)" filter="url(#glow)"/>`;
    svg += `<circle cx="${curX}" cy="${curY}" r="5" fill="#FF6B1A" stroke="#FFB347" stroke-width="2">
      <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/>
    </circle>`;

    svg += `</svg>`;
    canvasRef.current.innerHTML = svg;
  }, [kmTravelled, fromIdx, toIdx]);

  return (
    <div className="map-card">
      <div className="map-header">
        <div className="section-title" style={{ margin: 0 }}>Live Route Map</div>
      </div>
      <div className="map-canvas" ref={canvasRef}></div>
    </div>
  );
}
