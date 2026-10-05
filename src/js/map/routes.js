const ROUTE_COLORS = {
  walking: "#27343d",
  transit: "#075bd4",
  bicycling: "#f36b08",
  driving: "#7624d6",
  connection: "#58636b"
};

export function getRouteColor(mode) {
  return ROUTE_COLORS[mode] ?? ROUTE_COLORS.connection;
}

export function getTravelMode(mode) {
  const modes = {
    walking: "WALKING",
    transit: "TRANSIT",
    bicycling: "BICYCLING",
    driving: "DRIVING"
  };
  return modes[mode] ?? "WALKING";
}

export function createRouteCacheKey(group) {
  const points = group.stops.map(({ location }) => [
    Number(location.lat.toFixed(5)),
    Number(location.lng.toFixed(5))
  ]);
  return `trip-route:v4:${group.mode}:${JSON.stringify(points)}`;
}

export function readCachedPath(key) {
  try {
    let value = localStorage.getItem(key);
    // Migrate geometry caches without issuing another paid request.
    if (!value) {
      const suffix = key.slice('trip-route:v4'.length);
      const legacyKey = Object.keys(localStorage).find((candidate) => candidate.startsWith('trip-route:v3:') && candidate.endsWith(suffix));
      if (legacyKey) value = localStorage.getItem(legacyKey);
    }
    const parsed = value ? JSON.parse(value) : null;
    // Legacy transit/bicycle paths did not record fallback provenance.
    const result = Array.isArray(parsed) ? { path: parsed, approximate: /:(transit|bicycling):/.test(key) } : parsed;
    return Array.isArray(result?.path) && result.path.length > 1 && result.path.every((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)) ? result : null;
  } catch {
    return null;
  }
}

export function writeCachedPath(key, path) {
  try {
    localStorage.setItem(key, JSON.stringify(path));
  } catch {
    // Private browsing or storage limits should not prevent map rendering.
  }
}
