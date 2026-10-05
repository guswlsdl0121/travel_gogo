export function createPin(number, color, name) {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "map-pin";
  pin.style.setProperty("--pin-color", color);
  pin.style.setProperty("--pin-active-color", "#e11d48");
  pin.setAttribute("aria-label", `${number}. ${name}`);
  pin.textContent = String(number);
  return pin;
}

export function createInfoWindow(stop, onClose) {
  const content = document.createElement("div");
  content.className = "map-info";
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'map-info__close';
  close.textContent = '×';
  close.setAttribute('aria-label', '장소 설명 닫기');
  close.addEventListener('click', onClose);
  content.append(close);
  const id = document.createElement("span");
  id.textContent = stop.id;
  const title = document.createElement("strong");
  title.textContent = stop.name;
  const detail = document.createElement("p");
  detail.textContent = `${stop.time} · ${stop.description}`;
  content.append(id, title, detail);
  if (stop.details?.length) {
    const details = document.createElement("p");
    details.className = 'map-info__context';
    details.textContent = stop.details.join(" · ");
    content.append(details);
  }
  if (stop.menu || stop.bestFor) {
    const context = document.createElement("p");
    context.className = 'map-info__context';
    context.textContent = [stop.menu && `대표 메뉴: ${stop.menu}`, stop.bestFor && `추천: ${stop.bestFor}`].filter(Boolean).join(" · ");
    content.append(context);
  }
  if (stop.source) {
    const source = document.createElement("a");
    source.href = stop.source;
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = "공식 정보 보기";
    content.append(source);
  }
  return content;
}
