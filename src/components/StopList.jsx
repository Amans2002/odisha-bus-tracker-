import { AVG_SPEED_KMPH } from "../utils";

export default function StopList({ stops, fromIdx, toIdx, kmTravelled }) {
  const stopsToShow = stops.slice(fromIdx, toIdx + 1);

  let currentStopIdx = 0;
  stopsToShow.forEach((s, i) => {
    if (kmTravelled >= s.km) currentStopIdx = i;
  });

  return (
    <div className="stop-list">
      <div className="section-title">Route Stops</div>
      {stopsToShow.map((stop, i) => {
        const isPassed = kmTravelled > stop.km + 0.1;
        const isCurrent = i === currentStopIdx;
        const isLast = i === stopsToShow.length - 1;
        const remainKm = Math.max(0, stop.km - kmTravelled);
        const etaMin = Math.round((remainKm / AVG_SPEED_KMPH) * 60);

        const dotClass = isPassed ? "passed" : isCurrent ? "current" : "";
        const nameClass = isPassed ? "passed" : isCurrent ? "current" : "";
        const etaText = isPassed ? "✓ Passed" : isCurrent ? "📍 You are here" : `~${etaMin} min`;
        const etaClass = isCurrent ? "current" : "";

        let badge;
        if (isPassed) badge = <span className="status-badge badge-done">Done</span>;
        else if (isCurrent) badge = <span className="status-badge badge-here">Here</span>;
        else badge = <span className="status-badge badge-upcoming">Upcoming</span>;

        return (
          <div className="stop-item" key={i}>
            <div className="stop-dot-wrap">
              <div className={`stop-dot ${dotClass}`}></div>
              {!isLast && <div className={`stop-line ${isPassed ? "passed" : ""}`}></div>}
            </div>
            <div className="stop-info">
              <div className={`stop-info-name ${nameClass}`}>{stop.name}</div>
              <div className={`stop-eta-label ${etaClass}`}>{etaText}</div>
            </div>
            {badge}
          </div>
        );
      })}
    </div>
  );
}
