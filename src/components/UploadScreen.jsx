import { useState, useRef } from "react";

const DEMO_ROUTES = [
  { fromIdx: 0, toIdx: 8, bus: "OD05CB0251", fare: "22.50", captain: "NC11049", service: "AC", label: "KIIT → Patapur", desc: "Full Route · 12.8 km" },
  { fromIdx: 0, toIdx: 4, bus: "OD05CB0317", fare: "15.00", captain: "NC11032", service: "AC", label: "KIIT → Rasulgarh", desc: "Mid Route · 6.1 km" },
  { fromIdx: 3, toIdx: 8, bus: "OD05CB0198", fare: "12.00", captain: "NC11087", service: "Non-AC", label: "AG Sq → Patapur", desc: "South Bound · 8.3 km" },
  { fromIdx: 5, toIdx: 8, bus: "OD05CB0422", fare: "10.00", captain: "NC11155", service: "Electric", label: "Mancheswar → Patapur", desc: "Short Route · 5.0 km" },
];

export default function UploadScreen({ stops, onStart, showToast }) {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    busNo: "OD05CB0251",
    captainId: "NC11049",
    fromIdx: 0,
    toIdx: 8,
    fare: "22.50",
    service: "AC",
  });

  const updateField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Please upload an image file", "⚠️");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview({ src: e.target.result, name: file.name, size: (file.size / 1024).toFixed(0) + " KB" });
    };
    reader.readAsDataURL(file);
  };

  const scanTicket = () => {
    setScanning(true);
    setTimeout(() => {
      const r = DEMO_ROUTES[Math.floor(Math.random() * DEMO_ROUTES.length)];
      setForm({ busNo: r.bus, captainId: r.captain, fromIdx: r.fromIdx, toIdx: r.toIdx, fare: r.fare, service: r.service });
      setScanning(false);
      showToast("Ticket scanned successfully!", "🎫");
    }, 2200);
  };

  const loadDemo = (demo) => {
    setForm({ busNo: demo.bus, captainId: demo.captain, fromIdx: demo.fromIdx, toIdx: demo.toIdx, fare: demo.fare, service: demo.service });
    showToast(`Loaded ${demo.label}`, "🚌");
  };

  const handleSubmit = () => {
    if (form.fromIdx >= form.toIdx) {
      showToast("Destination must be after origin!", "⚠️");
      return;
    }
    onStart(form);
  };

  return (
    <div className="fade-up">
      {/* Hero */}
      <div className="upload-hero">
        <div className="upload-hero-icon">🎫</div>
        <h2>Track Your Bus Journey</h2>
        <p>Upload your bus ticket or enter details manually to track your ride in real time</p>
      </div>

      {/* Upload Zone */}
      {!preview && (
        <div
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
          onDragLeave={(e) => e.currentTarget.classList.remove("dragover")}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("dragover"); handleFile(e.dataTransfer.files[0]); }}
        >
          <span className="upload-zone-icon">📸</span>
          <div className="upload-zone-text">Upload Ticket Photo</div>
          <div className="upload-zone-sub">Tap to capture or choose from gallery · JPG, PNG</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="upload-preview">
          <img src={preview.src} alt="Ticket preview" />
          <div className="preview-info">
            <span className="preview-filename">{preview.name}</span>
            <span className="preview-size">{preview.size}</span>
          </div>
        </div>
      )}

      {/* Scan Button */}
      {preview && (
        <button className="btn" onClick={scanTicket} disabled={scanning}>
          {scanning ? (
            <><span className="spinner"></span> Scanning ticket...</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
              Scan &amp; Extract Ticket Details
            </>
          )}
        </button>
      )}

      <div className="divider-or">or enter manually</div>

      {/* Manual Entry */}
      <div className="manual-section">
        <div className="section-title">Ticket Details</div>
        <div className="input-row">
          <div className="input-field">
            <label>Bus Number</label>
            <input type="text" value={form.busNo} onChange={(e) => updateField("busNo", e.target.value)} placeholder="e.g. OD05CB0251" />
          </div>
          <div className="input-field">
            <label>Captain ID</label>
            <input type="text" value={form.captainId} onChange={(e) => updateField("captainId", e.target.value)} placeholder="e.g. NC11049" />
          </div>
        </div>
        <div className="input-row">
          <div className="input-field">
            <label>Route / From</label>
            <select value={form.fromIdx} onChange={(e) => updateField("fromIdx", parseInt(e.target.value))}>
              {stops.map((s, i) => (
                <option key={i} value={i}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="input-field">
            <label>To</label>
            <select value={form.toIdx} onChange={(e) => updateField("toIdx", parseInt(e.target.value))}>
              {stops.map((s, i) => (
                <option key={i} value={i}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="input-row">
          <div className="input-field">
            <label>Fare Paid (₹)</label>
            <input type="text" value={form.fare} onChange={(e) => updateField("fare", e.target.value)} placeholder="e.g. 22.50" />
          </div>
          <div className="input-field">
            <label>Service Type</label>
            <select value={form.service} onChange={(e) => updateField("service", e.target.value)}>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
              <option value="Electric">Electric</option>
            </select>
          </div>
        </div>
      </div>

      <button className="btn" onClick={handleSubmit}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start Journey Tracking
      </button>

      {/* Demo Tickets */}
      <div className="demo-section">
        <div className="section-title">Quick Demo Routes</div>
        <div className="demo-tickets">
          {DEMO_ROUTES.map((demo, i) => (
            <div className="demo-ticket" key={i} onClick={() => loadDemo(demo)}>
              <div className="demo-ticket-route">{demo.label}</div>
              <div className="demo-ticket-info">{demo.desc}<br />{demo.service} · ₹{demo.fare}</div>
              <div className="demo-ticket-bus">{demo.bus}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
