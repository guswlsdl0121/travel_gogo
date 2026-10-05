import { loadGoogleMaps } from './load.js';
import { createPin, createInfoWindow } from './presentation.js';
import { getRouteColor, getTravelMode, createRouteCacheKey, readCachedPath, writeCachedPath } from './routes.js';

export class TripMap {
  constructor(element, onStopSelect, onSelectionClear) {
    this.element = element;
    this.onStopSelect = onStopSelect;
    this.onSelectionClear = onSelectionClear;
    this.pendingRoutes = new Map();
    this.viewportListener = null;
    this.map = null;
    this.Route = null;
    this.focusActions = document.querySelector("#map-focus-actions");
    this.infoWindow = null;
    this.markers = new Map();
    this.overlays = [];
    this.bounds = null;
    this.allBounds = null;
    this.renderVersion = 0;
    this.activeStopId = null;
  }

  async initialize(apiKey) {
    await loadGoogleMaps(apiKey);
    const routesLibrary = await google.maps.importLibrary("routes");
    this.Route = routesLibrary.Route;
    this.map = new google.maps.Map(this.element, {
      center: { lat: 33.59, lng: 130.4 },
      zoom: 13,
      mapId: "DEMO_MAP_ID",
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false
    });
    this.infoWindow = new google.maps.InfoWindow({ disableAutoPan: true });
    this.map.addListener("click", () => this.onSelectionClear());
    this.infoWindow.addListener('closeclick', () => this.onSelectionClear());
  }

  renderDay(day, focusGroups = [], focusStopId = null) {
    this.clear();
    const version = ++this.renderVersion;
    this.bounds = new google.maps.LatLngBounds();
    this.allBounds = new google.maps.LatLngBounds();
    this.renderFocusActions(focusGroups);

    const visibleStops = day.stops.filter((stop) => stop.mapVisible !== false);
    const coordinateKey = (stop) => `${stop.location.lat},${stop.location.lng}`;
    const sharedCoordinates = new Map();
    visibleStops.forEach((stop) => {
      const key = coordinateKey(stop);
      sharedCoordinates.set(key, (sharedCoordinates.get(key) ?? 0) + 1);
    });
    const coordinateSlots = new Map();

    visibleStops.forEach((stop) => {
      const index = day.stops.indexOf(stop);
      const position = stop.location;
      const content = createPin(index + 1, day.color, stop.name);
      const key = coordinateKey(stop);
      const slot = coordinateSlots.get(key) ?? 0;
      coordinateSlots.set(key, slot + 1);
      const count = sharedCoordinates.get(key);
      if (count > 1) content.style.setProperty('--pin-offset-x', `${(slot - (count - 1) / 2) * 23}px`);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position,
        content,
        title: stop.name,
        zIndex: index + 1
      });
      marker.addListener("click", () => this.onStopSelect(stop.id));
      this.markers.set(stop.id, { marker, content, stop, baseZIndex: index + 1 });
      this.allBounds.extend(position);
      if (stop.includeInBounds !== false) this.bounds.extend(position);

    });

    this.drawRoutes(visibleStops, version);
    if (!focusStopId) this.fitToDay();
  }

  focusStop(stopId, shouldPan = true) {
    this.cancelViewportListener();
    this.activeStopId = stopId;
    this.markers.forEach((entry, id) => {
      const isActive = id === stopId;
      entry.content.classList.toggle("is-active", isActive);
      entry.marker.zIndex = isActive ? 1000000 : entry.baseZIndex;
      entry.content.setAttribute('aria-pressed', String(isActive));
    });
    this.highlightRoute(stopId);

    const selected = this.markers.get(stopId);
    if (!selected) return;
    if (shouldPan) {
      this.map.panTo(selected.stop.location);
      if (window.matchMedia('(max-width: 900px)').matches && this.map.getZoom() < 15) {
        this.map.setZoom(15);
      }
    }
    // Mobile uses the selected timeline card for details, keeping the map clear.
    if (window.matchMedia('(min-width: 901px)').matches) {
      this.infoWindow.setContent(createInfoWindow(selected.stop, this.onSelectionClear));
      this.infoWindow.open({ map: this.map, anchor: selected.marker });
    } else this.infoWindow.close();
  }

  clearSelection() {
    this.activeStopId = null;
    this.infoWindow?.close();
    this.markers.forEach(({ marker, content, baseZIndex }) => {
      marker.zIndex = baseZIndex;
      content.classList.remove('is-active');
      content.setAttribute('aria-pressed', 'false');
    });
    this.highlightRoute(null);
  }

  cancelViewportListener() {
    this.viewportListener?.remove();
    this.viewportListener = null;
  }

  fitBounds(bounds, maxZoom) {
    this.cancelViewportListener();
    this.onSelectionClear();
    this.map.fitBounds(bounds, { top: 70, right: 36, bottom: 60, left: 36 });
    this.viewportListener = google.maps.event.addListenerOnce(this.map, 'idle', () => {
      this.viewportListener = null;
      if (this.map.getZoom() > maxZoom) this.map.setZoom(maxZoom);
    });
  }

  fitToDay(includeAll = false) {
    const targetBounds = includeAll ? this.allBounds : this.bounds;
    if (!this.map || !targetBounds || targetBounds.isEmpty()) return;
    this.fitBounds(targetBounds, 15);
  }

  fitToGroup(groupId) {
    const group = this.focusGroups?.find((candidate) => candidate.id === groupId);
    if (!group || !this.map) return;
    const bounds = new google.maps.LatLngBounds();
    group.stopIds.forEach((stopId) => {
      const entry = this.markers.get(stopId);
      if (entry) bounds.extend(entry.stop.location);
    });
    if (bounds.isEmpty()) return;
    this.fitBounds(bounds, 17);
  }

  renderFocusActions(focusGroups) {
    this.focusGroups = Array.isArray(focusGroups) ? focusGroups : [];
    if (!this.focusActions) return;
    const fragment = document.createDocumentFragment();
    this.focusGroups.forEach((group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = group.label;
      button.addEventListener("click", () => this.fitToGroup(group.id));
      fragment.append(button);
    });
    this.focusActions.replaceChildren(fragment);
  }

  clear() {
    this.cancelViewportListener();
    this.clearSelection();
    this.markers.forEach(({ marker }) => { marker.map = null; });
    this.overlays.forEach(({ polyline, casing }) => {
      polyline.setMap(null);
      casing?.setMap(null);
    });
    this.markers.clear();
    this.overlays = [];
  }

  drawRoutes(stops, version) {
    const groups = [];
    let current = null;

    for (let index = 1; index < stops.length; index += 1) {
      const previousStop = stops[index - 1];
      const stop = stops[index];
      const route = stop.routeFromPrevious;
      if (!route || route.draw === false) {
        current = null;
        continue;
      }

      if (route.mode === "connection") {
        current = null;
        this.drawConnection(
          previousStop.location,
          stop.location,
          getRouteColor(route.mode),
          [stop.id]
        );
        continue;
      }

      const canGroup = current
        && current.mode === route.mode
        && route.mode !== "transit"
        && current.lastIndex === index - 1;

      if (canGroup) {
        current.stops.push(stop);
        current.stopIds.push(stop.id);
        current.lastIndex = index;
      } else {
        current = {
          mode: route.mode,
          stops: [previousStop, stop],
          stopIds: [stop.id],
          lastIndex: index
        };
        groups.push(current);
      }
    }

    groups.forEach((group) => this.drawRouteGroup(group, version));
  }

  async drawRouteGroup(group, version) {
    const color = getRouteColor(group.mode);
    const cacheKey = createRouteCacheKey(group);
    const cached = readCachedPath(cacheKey);
    if (cached) {
      this.addPolyline(cached.path, color, group.stopIds);
      this.highlightRoute(this.activeStopId);
      return;
    }

    try {
      if (!this.pendingRoutes.has(cacheKey)) {
        const request = this.computeRoutePath(group, group.mode)
          .then((path) => ({ path, approximate: false }))
          .catch(async (error) => {
            if (!['transit', 'bicycling'].includes(group.mode) || String(error).includes('RESOURCE_EXHAUSTED')) throw error;
            return { path: await this.computeRoutePath(group, 'driving'), approximate: true };
          })
          .then((result) => { writeCachedPath(cacheKey, result); return result; })
          .finally(() => this.pendingRoutes.delete(cacheKey));
        this.pendingRoutes.set(cacheKey, request);
      }
      const result = await this.pendingRoutes.get(cacheKey);
      if (version !== this.renderVersion) return;
      this.addPolyline(result.path, color, group.stopIds);
      this.highlightRoute(this.activeStopId);
    } catch (error) {
      if (version === this.renderVersion) {
        console.warn(
          `${group.stops[0].id} → ${group.stops.at(-1).id} 경로 표시 실패`,
          error
        );
      }
    }
  }

  async computeRoutePath(group, mode) {
    const intermediateStops = group.stops.slice(1, -1);
    const { routes } = await this.Route.computeRoutes({
      origin: group.stops[0].location,
      destination: group.stops.at(-1).location,
      ...(intermediateStops.length
        ? { intermediates: intermediateStops.map((stop) => stop.location) }
        : {}),
      travelMode: getTravelMode(mode),
      ...(mode === 'driving' && group.mode === 'bicycling' ? { routeModifiers: { avoidHighways: true } } : {}),
      ...(mode === "transit"
        ? {
          departureTime: new Date(),
          transitPreference: {
            allowedTransitModes: ["BUS", "SUBWAY", "TRAIN", "RAIL"],
            routingPreference: "FEWER_TRANSFERS"
          }
        }
        : {}),
      fields: ["path"]
    });
    if (!routes?.[0]?.path?.length) throw new Error("경로 결과 없음");
    return routes[0].path.map((point) => ({
      lat: typeof point.lat === "function" ? point.lat() : point.lat,
      lng: typeof point.lng === "function" ? point.lng() : point.lng
    }));
  }

  drawConnection(origin, destination, color, stopIds) {
    this.addPolyline([origin, destination], color, stopIds, true);
  }

  addPolyline(path, color, stopIds) {
    const casing = new google.maps.Polyline({
      map: this.map,
      path,
      strokeColor: "#ffffff",
      strokeOpacity: 0.95,
      strokeWeight: 4,
      zIndex: 2,
      clickable: false
    });
    const polyline = new google.maps.Polyline({
      map: this.map,
      path,
      strokeColor: color,
      strokeOpacity: 0.96,
      strokeWeight: 2.5,
      zIndex: 3,
      clickable: false,
      icons: undefined
    });
    this.overlays.push({ polyline, casing, stopIds, color, dashed: false });
  }

  highlightRoute(stopId) {
    this.overlays.forEach((entry) => {
      const isActive = entry.stopIds.includes(stopId);
      entry.casing?.setOptions({
        strokeOpacity: isActive ? 1 : 0.95,
        strokeWeight: isActive ? 5 : 4,
        zIndex: isActive ? 8 : 2
      });
      entry.polyline.setOptions({
        strokeColor: isActive ? "#d94832" : entry.color,
        strokeOpacity: isActive ? 1 : 0.96,
        strokeWeight: isActive ? 3.5 : 2.5,
        zIndex: isActive ? 9 : 3
      });
    });
  }
}
