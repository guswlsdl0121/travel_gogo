// Browser contract fixture. No external Maps or paid Routes calls are made.
window.__maps = { requests: 0, fits: 0, markers: [], circles: [], zoom: 13 };
class EventTargetStub {
  constructor() { this.listeners = {}; }
  addListener(name, fn) {
    (this.listeners[name] ??= new Set()).add(fn);
    return { remove: () => this.listeners[name].delete(fn) };
  }
  emit(name) { this.listeners[name]?.forEach((fn) => fn()); }
}
class MapStub extends EventTargetStub {
  constructor(element) {
    super();
    this.element = element;
    window.__maps.map = this;
    element.style.background = '#e7ece8';
    element.addEventListener('click', (event) => { if (event.target === element) this.emit('click'); });
  }
  panTo(location) { window.__maps.center = location; }
  setZoom(zoom) { window.__maps.zoom = zoom; }
  getZoom() { return window.__maps.zoom; }
  fitBounds() { window.__maps.fits++; setTimeout(() => this.emit('idle'), 20); }
}
class MarkerStub extends EventTargetStub {
  constructor(options) {
    super();
    Object.assign(this, options);
    this.map = options.map;
    options.content.style.position = 'absolute';
    options.content.style.left = `${20 + (window.__maps.markers.length % 6) * 45}px`;
    options.content.style.top = `${85 + (window.__maps.markers.length % 3) * 45}px`;
    options.map.element.append(options.content);
    options.content.addEventListener('click', () => this.emit('click'));
    window.__maps.markers.push(this);
  }
  set map(map) { this._map = map; if (!map) this.content?.remove(); }
  get map() { return this._map; }
}
class BoundsStub {
  constructor() { this.points = []; }
  extend(point) { this.points.push(point); }
  isEmpty() { return !this.points.length; }
}
class InfoStub extends EventTargetStub {
  setContent(content) { this.content = content; }
  open() { window.__maps.infoOpen = true; }
  close() { window.__maps.infoOpen = false; }
}
class CircleStub {
  constructor(options) { Object.assign(this, options); window.__maps.circles.push(this); }
  setCenter(center) { this.center = center; }
  setRadius(radius) { this.radius = radius; }
  setMap(map) { this.map = map; }
}
window.google = { maps: {
  Map: MapStub, LatLngBounds: BoundsStub, InfoWindow: InfoStub, Circle: CircleStub,
  marker: { AdvancedMarkerElement: MarkerStub },
  Polyline: class { setMap() {} setOptions() {} },
  event: { addListenerOnce(target, name, fn) {
    const listener = target.addListener(name, () => { listener.remove(); fn(); });
    return listener;
  } },
  importLibrary: async () => ({ Route: { computeRoutes: async (request) => {
    window.__maps.requests++;
    await new Promise((resolve) => setTimeout(resolve, 40));
    return { routes: [{ path: [request.origin, ...(request.intermediates ?? []), request.destination] }] };
  } } })
} };
