import { formatDate } from "../utils";

export default function TicketCard({ ticket, stops }) {
  const fromStop = stops[ticket.fromIdx];
  const toStop = stops[ticket.toIdx];
  const totalKm = (toStop.km - fromStop.km).toFixed(1);

  return (
    <div className="ticket-card">
      <div className="ticket-header">
        <div>
          <div className="ticket-label">Your Ticket</div>
          <div className="ticket-val">Bus {ticket.busNo}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="ticket-label">Date &amp; Time</div>
          <div className="ticket-val" style={{ fontSize: "12px" }}>
            {formatDate(new Date())}
          </div>
        </div>
      </div>

      <div className="route-display">
        <div className="stop-col">
          <div className="stop-name">{fromStop.name}</div>
          <div className="stop-label">Origin</div>
        </div>
        <div className="route-arrow">
          <svg viewBox="0 0 24 24" width="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M14 6l6 6-6 6" />
          </svg>
          <div className="km-badge">{totalKm} km</div>
        </div>
        <div className="stop-col" style={{ textAlign: "right" }}>
          <div className="stop-name">{toStop.name}</div>
          <div className="stop-label">Destination</div>
        </div>
      </div>

      <div className="ticket-meta">
        <div className="meta-item">
          <div className="meta-val">₹{ticket.fare}</div>
          <div className="meta-label">Paid (UPI)</div>
        </div>
        <div className="meta-item">
          <div className="meta-val">{ticket.service}</div>
          <div className="meta-label">Service</div>
        </div>
        <div className="meta-item">
          <div className="meta-val">{ticket.captainId}</div>
          <div className="meta-label">Captain ID</div>
        </div>
      </div>
    </div>
  );
}
