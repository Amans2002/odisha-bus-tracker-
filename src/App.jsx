import { useState, useEffect } from "react";
import Header from "./components/Header";
import UploadScreen from "./components/UploadScreen";
import TrackingScreen from "./components/TrackingScreen";
import Toast, { showToast } from "./components/Toast";
import dbData from "../db.json";

function App() {
  const [screen, setScreen] = useState("upload"); // "upload" | "tracking"
  const [ticket, setTicket] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);

  // Load data from JSON database
  useEffect(() => {
    setRoutes(dbData.routes);
    setActiveRoute(dbData.routes[0]); // Default first route
  }, []);

  const handleStart = (formData) => {
    // Save ticket to "database" (in-memory)
    const newTicket = {
      id: Date.now(),
      busNo: formData.busNo,
      captainId: formData.captainId,
      fromIdx: formData.fromIdx,
      toIdx: formData.toIdx,
      fare: formData.fare,
      service: formData.service,
      date: new Date().toISOString(),
    };

    // Add to local tickets array (simulated DB write)
    dbData.tickets.push(newTicket);

    setTicket(newTicket);
    setScreen("tracking");
    showToast("Journey tracking started!", "🚌");
  };

  const handleBack = () => {
    setScreen("upload");
    setTicket(null);
  };

  if (!activeRoute) return null;

  return (
    <>
      <Header />
      <div className="container">
        {screen === "upload" && (
          <UploadScreen
            stops={activeRoute.stops}
            onStart={handleStart}
            showToast={showToast}
          />
        )}
        {screen === "tracking" && ticket && (
          <TrackingScreen
            ticket={ticket}
            stops={activeRoute.stops}
            onBack={handleBack}
            showToast={showToast}
          />
        )}
      </div>
      <Toast />
    </>
  );
}

export default App;
