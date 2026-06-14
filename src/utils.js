export const AVG_SPEED_KMPH = 22;

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function closestKmOnRoute(lat, lng, stops) {
  let distances = stops.map((s, i) => ({
    idx: i,
    dist: haversine(lat, lng, s.lat, s.lng),
    km: s.km,
  }));
  distances.sort((a, b) => a.dist - b.dist);

  if (distances[0].dist < 0.3) {
    return distances[0].km;
  }

  let s1 = distances[0],
    s2 = distances[1];
  if (s1.idx > s2.idx) [s1, s2] = [s2, s1];

  const totalDist = s1.dist + s2.dist;
  const ratio = s1.dist / totalDist;
  return s1.km + (s2.km - s1.km) * ratio;
}

export function interpolatePosition(km, stops) {
  for (let i = 0; i < stops.length - 1; i++) {
    if (km >= stops[i].km && km <= stops[i + 1].km) {
      const seg = stops[i + 1].km - stops[i].km;
      const t = seg > 0 ? (km - stops[i].km) / seg : 0;
      return {
        lat: stops[i].lat + t * (stops[i + 1].lat - stops[i].lat),
        lng: stops[i].lng + t * (stops[i + 1].lng - stops[i].lng),
      };
    }
  }
  return { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
}

export function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  const t = formatTime(date);
  return `${d}/${m}/${y} · ${t}`;
}
