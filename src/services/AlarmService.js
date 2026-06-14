/**
 * AlarmService — Handles all notifications, alarms, and periodic alerts.
 *
 * Features:
 *   1. Alarm sound (Web Audio API beep) when destination is near
 *   2. Browser push notifications for stop alerts
 *   3. 5-minute interval updates with current position & ETA
 *   4. Vibration on supported devices
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play an alarm beep pattern using Web Audio API (works offline, no files needed).
 * pattern: "alert" = 3 short beeps, "arrival" = long celebratory tone
 */
export function playAlarm(pattern = "alert") {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    if (pattern === "arrival") {
      // Celebratory ascending tones
      const freqs = [523, 659, 784, 1047]; // C5, E5, G5, C6
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.4);
      });
    } else if (pattern === "approaching") {
      // Urgent double beep pattern, repeated 3 times
      for (let r = 0; r < 3; r++) {
        [0, 0.15].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(880, ctx.currentTime + r * 0.5 + offset);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + r * 0.5 + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + r * 0.5 + offset + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + r * 0.5 + offset);
          osc.stop(ctx.currentTime + r * 0.5 + offset + 0.1);
        });
      }
    } else {
      // Standard alert: 3 short beeps
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime + i * 0.3);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.3 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.3);
        osc.stop(ctx.currentTime + i * 0.3 + 0.2);
      }
    }
  } catch (e) {
    console.warn("Audio alarm failed:", e);
  }
}

/**
 * Vibrate the device (mobile support)
 */
export function vibrate(pattern = [200, 100, 200]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

/**
 * Show a browser notification (works even when tab is in background)
 */
export function showNotification(title, body, tag = "bus-tracker") {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    // Try service worker notification first (more reliable)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          tag,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚌</text></svg>",
          badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📍</text></svg>",
          vibrate: [200, 100, 200],
          requireInteraction: false,
          silent: false,
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, { body, tag });
    }
  } catch (e) {
    console.warn("Notification failed:", e);
  }
}

/**
 * Manages the 5-minute periodic alert interval
 */
let periodicAlertInterval = null;

export function startPeriodicAlerts(getStatusFn, onAlert) {
  stopPeriodicAlerts();

  // Fire first alert immediately
  const status = getStatusFn();
  if (status) onAlert(status);

  // Then every 5 minutes
  periodicAlertInterval = setInterval(() => {
    const status = getStatusFn();
    if (status) onAlert(status);
  }, 5 * 60 * 1000); // 5 minutes
}

export function stopPeriodicAlerts() {
  if (periodicAlertInterval) {
    clearInterval(periodicAlertInterval);
    periodicAlertInterval = null;
  }
}

/**
 * Check proximity and trigger appropriate alerts.
 * Returns the alert type triggered, or null.
 */
export function checkProximityAlerts(kmTravelled, stops, toIdx, alreadyAlerted) {
  const destKm = stops[toIdx].km;
  const remaining = destKm - kmTravelled;
  const destName = stops[toIdx].name;

  // Arrived (< 200m)
  if (remaining <= 0.2 && !alreadyAlerted.has("arrived")) {
    playAlarm("arrival");
    vibrate([300, 100, 300, 100, 500]);
    showNotification(
      "🎉 You have arrived!",
      `You've reached ${destName}. Have a great day!`,
      "arrival"
    );
    return "arrived";
  }

  // Very close (< 500m)
  if (remaining <= 0.5 && remaining > 0.2 && !alreadyAlerted.has("very-close")) {
    playAlarm("approaching");
    vibrate([200, 100, 200, 100, 200]);
    showNotification(
      "📍 Almost there!",
      `${destName} is just ${(remaining * 1000).toFixed(0)}m away. Get ready to alight!`,
      "proximity"
    );
    return "very-close";
  }

  // Approaching (< 1km)
  if (remaining <= 1.0 && remaining > 0.5 && !alreadyAlerted.has("approaching")) {
    playAlarm("alert");
    vibrate([200, 100, 200]);
    showNotification(
      "🔔 Stop approaching!",
      `${destName} is about ${remaining.toFixed(1)} km away (~${Math.ceil((remaining / 22) * 60)} min). Start getting ready.`,
      "proximity"
    );
    return "approaching";
  }

  // Next stop alert (< 2km)
  if (remaining <= 2.0 && remaining > 1.0 && !alreadyAlerted.has("next-stop")) {
    playAlarm("alert");
    showNotification(
      "🚌 Your stop is next!",
      `${destName} is about ${remaining.toFixed(1)} km away. Approximately ${Math.ceil((remaining / 22) * 60)} minutes.`,
      "proximity"
    );
    return "next-stop";
  }

  return null;
}
