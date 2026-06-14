import { formatTime, AVG_SPEED_KMPH } from "../utils";

export default function ETACard({ kmTravelled, speed, fromStop, toStop }) {
  const fromKm = fromStop.km;
  const toKm = toStop.km;
  const totalDist = toKm - fromKm;
  const travelledOnSegment = kmTravelled - fromKm;
  const remaining = Math.max(0, toKm - kmTravelled);

  const effectiveSpeed = speed > 2 ? speed : AVG_SPEED_KMPH;
  const etaMins = remaining > 0.05 ? Math.round((remaining / effectiveSpeed) * 60) : 0;
  const arrivalTime = new Date(Date.now() + etaMins * 60000);
  const pct = totalDist > 0 ? Math.min(100, Math.round((travelledOnSegment / totalDist) * 100)) : 0;
  const arrived = remaining <= 0.05;

  return (
    <div className="eta-card">
      <div className="section-title" style={{ marginBottom: 0 }}>Estimated Arrival</div>

      <div className="eta-main">
        {arrived ? (
          <div className="eta-arrived">
            <div className="eta-arrived-icon">🎉</div>
            <div className="eta-arrived-text">You have arrived!</div>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "6px" }}>{toStop.name}</div>
          </div>
        ) : (
          <>
            <div className="eta-time">{etaMins}</div>
            <div className="eta-unit">minutes remaining</div>
            <div className="eta-arrive">Arriving around {formatTime(arrivalTime)}</div>
          </>
        )}
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>{fromStop.name}</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: pct + "%" }}></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{toStop.name}</span>
        </div>
      </div>
    </div>
  );
}
