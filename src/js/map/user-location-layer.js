export class UserLocationLayer {
  constructor(map) {
    this.map = map;
    this.marker = null;
    this.circle = null;
    this.content = null;
    this.position = null;
  }

  update(coords, heading) {
    const position = { lat: coords.lat, lng: coords.lng };
    this.position = position;
    if (!this.marker) {
      const content = document.createElement('div');
      content.className = 'user-location-marker';
      content.setAttribute('aria-label', '현재 위치');
      const direction = document.createElement('span');
      direction.className = 'user-location-marker__direction';
      const dot = document.createElement('span');
      dot.className = 'user-location-marker__dot';
      content.append(direction, dot);
      this.content = content;
      this.marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position,
        content,
        title: '현재 위치',
        anchorLeft: '-50%',
        anchorTop: '-50%',
        zIndex: 1000002
      });
      this.circle = new google.maps.Circle({
        map: this.map,
        center: position,
        radius: coords.accuracy ?? 0,
        fillColor: '#1a73e8',
        fillOpacity: 0.1,
        strokeColor: '#1a73e8',
        strokeOpacity: 0.35,
        strokeWeight: 1,
        clickable: false,
        zIndex: 1
      });
    } else {
      this.marker.position = position;
      this.circle.setCenter(position);
      this.circle.setRadius(coords.accuracy ?? 0);
    }
    this.setHeading(heading);
  }

  setHeading(heading) {
    if (!this.content) return;
    const valid = Number.isFinite(heading);
    this.content.classList.toggle('has-heading', valid);
    if (valid) this.content.style.setProperty('--user-heading', `${heading}deg`);
  }

  focus() {
    if (!this.position) return false;
    this.map.panTo(this.position);
    if (this.map.getZoom() < 16) this.map.setZoom(16);
    return true;
  }

  clear() {
    if (this.marker) this.marker.map = null;
    this.circle?.setMap(null);
    this.marker = null;
    this.circle = null;
    this.content = null;
    this.position = null;
  }
}
