export class DeviceLocation {
  constructor({ onPosition, onHeading, onError }) {
    this.onPosition = onPosition;
    this.onHeading = onHeading;
    this.onError = onError;
    this.watchId = null;
    this.heading = null;
    this.lastCoords = null;
    this.handleOrientation = this.handleOrientation.bind(this);
  }

  get isTracking() { return this.watchId !== null; }

  start() {
    if (this.isTracking) return true;
    if (!navigator.geolocation) {
      this.onError('이 브라우저는 위치 기능을 지원하지 않습니다.', true);
      return false;
    }

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePosition(position),
        (error) => this.handleError(error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
      // Request sensor access while the location button's user gesture is still active.
      this.requestOrientation();
      return true;
    } catch {
      this.onError('위치 추적을 시작하지 못했습니다.', true);
      return false;
    }
  }

  async requestOrientation() {
    if (typeof DeviceOrientationEvent === 'undefined') return;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        if (await DeviceOrientationEvent.requestPermission() !== 'granted') return;
      }
      if (!this.isTracking) return;
      window.addEventListener('deviceorientation', this.handleOrientation);
      window.addEventListener('deviceorientationabsolute', this.handleOrientation);
    } catch {
      // Location tracking still works when the compass is unavailable.
    }
  }

  handlePosition(position) {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    this.lastCoords = {
      lat: latitude,
      lng: longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null
    };
    const travelHeading = Number.isFinite(heading) && speed > 0.5 ? heading : null;
    this.onPosition(this.lastCoords, this.heading ?? travelHeading);
  }

  handleOrientation(event) {
    const compassHeading = event.webkitCompassHeading;
    const heading = Number.isFinite(compassHeading) && compassHeading >= 0
      ? compassHeading
      : event.absolute && Number.isFinite(event.alpha) ? (360 - event.alpha) % 360 : null;
    if (heading === null) return;
    this.heading = heading;
    this.onHeading(heading);
  }

  handleError(error) {
    if (error.code === 1) {
      this.stop();
      this.onError('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.', true);
      return;
    }
    this.onError(error.code === 3 ? '위치를 확인하는 중입니다. 잠시 후 다시 시도해 주세요.' : '현재 위치를 확인할 수 없습니다.', false);
  }

  stop() {
    if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
    this.watchId = null;
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.removeEventListener('deviceorientationabsolute', this.handleOrientation);
    this.heading = null;
    this.lastCoords = null;
  }
}
