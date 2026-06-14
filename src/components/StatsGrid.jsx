import { formatTime, AVG_SPEED_KMPH } from "../utils";

export default function StatsGrid({ kmTravelled, fromKm, toKm, speed }) {
  const travelledOnSegment = Math.max(0, kmTravelled - fromKm);
  const remaining = Math.max(0, toKm - kmTravelled);

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📍</div>
        <div className="stat-val">{travelledOnSegment.toFixed(1)}</div>
        <div className="stat-label">KM Travelled</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🏁</div>
        <div className="stat-val">{remaining.toFixed(1)}</div>
        <div className="stat-label">KM Remaining</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">⚡</div>
        <div className="stat-val">{speed > 0 ? Math.round(speed) : "~" + AVG_SPEED_KMPH}</div>
        <div className="stat-label">Current Speed (km/h)</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🕐</div>
        <div className="stat-val">{formatTime(new Date())}</div>
        <div className="stat-label">Last Updated</div>
      </div>
    </div>
  );
}
