import { createElement } from './dom.js';
import { formatPeriod, formatShortDate, formatFullDate } from './dates.js';
import { renderChoices } from './choices.js';

export class TripView {
  constructor({ onDaySelect, onPlanSelect, onChoiceSelect, onStopSelect }) {
    this.onDaySelect = onDaySelect;
    this.onPlanSelect = onPlanSelect;
    this.onChoiceSelect = onChoiceSelect;
    this.onStopSelect = onStopSelect;
    this.elements = {
      tripLabel: document.querySelector("#trip-label"),
      tripTitle: document.querySelector("#trip-title"),
      tripPeriod: document.querySelector("#trip-period"),
      tabs: document.querySelector("#day-tabs"),
      planTabs: document.querySelector("#plan-tabs"),
      choiceControls: document.querySelector("#choice-controls"),
      dayNumber: document.querySelector("#day-number"),
      dayTitle: document.querySelector("#day-title"),
      dayDate: document.querySelector("#day-date"),
      daySummary: document.querySelector("#day-summary"),
      timeline: document.querySelector("#timeline"),
      mapArea: document.querySelector("#map-area"),
      mapFallback: document.querySelector("#map-fallback"),
      appError: document.querySelector("#app-error")
    };
  }

  renderTrip(trip, days) {
    this.elements.tripLabel.textContent = trip.label;
    this.elements.tripTitle.textContent = trip.title;
    this.elements.tripPeriod.textContent = `${formatPeriod(trip.startDate, trip.endDate)} · ${trip.duration}`;
    this.renderTabs(days);
  }

  renderTabs(days) {
    const fragment = document.createDocumentFragment();
    days.forEach((day) => {
      const button = createElement("button", "day-tab");
      button.type = "button";
      button.dataset.dayId = day.id;
      button.style.setProperty("--day-color", day.color);
      button.append(
        createElement("span", "day-tab__number", `DAY ${day.id}`),
        createElement("span", "day-tab__date", formatShortDate(day.date))
      );
      button.addEventListener("click", () => this.onDaySelect(day.id));
      fragment.append(button);
    });
    this.elements.tabs.replaceChildren(fragment);
  }

  renderDay(day, plans = [], activePlanId = "main", choices = {}, selectedChoices = {}) {
    document.documentElement.style.setProperty("--accent", day.color);
    this.elements.dayNumber.textContent = `DAY ${day.id}`;
    this.elements.dayTitle.textContent = day.title;
    this.elements.dayDate.textContent = formatFullDate(day.date);
    this.elements.daySummary.textContent = day.summary;
    this.elements.mapArea.textContent = day.area;
    this.renderPlans(plans, activePlanId, day.activePlan);
    renderChoices(this.elements.choiceControls, day, choices, selectedChoices, this.onChoiceSelect);

    this.elements.tabs.querySelectorAll(".day-tab").forEach((tab) => {
      const isActive = tab.dataset.dayId === day.id;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-current", isActive ? "date" : "false");
    });

    const fragment = document.createDocumentFragment();
    day.stops.forEach((stop, index) => {
      if (stop.routeFromPrevious) {
        fragment.append(renderTransfer(stop.routeFromPrevious.label));
      }
      fragment.append(this.renderStop(stop, index + 1));
    });
    this.elements.timeline.replaceChildren(fragment);
  }

  renderPlans(plans, activePlanId, activePlan) {
    const fragment = document.createDocumentFragment();
    const choices = plans.length > 1 ? plans : [];
    this.elements.planTabs.hidden = choices.length === 0;
    choices.forEach((plan) => {
      const button = createElement("button", "plan-tab", plan.label);
      button.type = "button";
      button.classList.toggle("is-active", plan.id === activePlanId);
      button.setAttribute("aria-pressed", String(plan.id === activePlanId));
      if (plan.description) button.title = plan.description;
      button.addEventListener("click", () => this.onPlanSelect(plan.id));
      fragment.append(button);
    });
    this.elements.planTabs.replaceChildren(fragment);
    this.elements.planTabs.setAttribute("aria-label", activePlan?.description ?? "대체 일정 선택");
  }

  renderStop(stop, sequence) {
    const article = createElement("article", "stop");
    article.dataset.stopId = stop.id;

    const button = createElement("button", "stop__button");
    button.type = "button";
    button.setAttribute("aria-label", `${stop.name} 지도에서 보기`);

    const sequenceElement = createElement("span", "stop__sequence", String(sequence));
    const content = createElement("span", "stop__content");
    const header = createElement("span", "stop__header");
    const identity = createElement("span", "stop__identity");
    identity.append(
      createElement("span", "stop__id", stop.displayId ?? stop.id),
      createElement("strong", "stop__name", stop.name)
    );
    header.append(identity, createElement("time", "stop__time", stop.time));
    content.append(header, createElement("span", "stop__description", stop.description));

    if (stop.menu) content.append(createElement("span", "stop__details", `대표 메뉴: ${stop.menu}`));
    if (stop.bestFor) content.append(createElement("span", "stop__details", `추천 상황: ${stop.bestFor}`));

    if (stop.details?.length) {
      content.append(createElement("span", "stop__details", stop.details.join(" · ")));
    }

    button.append(sequenceElement, content);
    button.addEventListener("click", () => this.onStopSelect(stop.id));
    article.append(button);
    if (stop.source) {
      const source = createElement('a', 'stop__source', '공식 정보 보기 ↗');
      source.href = stop.source;
      source.target = '_blank';
      source.rel = 'noreferrer';
      article.append(source);
    }
    return article;
  }

  setActiveStop(stopId, shouldScroll = true) {
    this.elements.timeline.querySelectorAll(".stop").forEach((stop) => {
      const isActive = stop.dataset.stopId === stopId;
      stop.classList.toggle("is-active", isActive);
      stop.querySelector("button").setAttribute("aria-pressed", String(isActive));
      if (isActive && shouldScroll) {
        const panel = this.elements.timeline.closest('.itinerary-panel');
        panel.scrollTo({ top: panel.scrollTop + stop.getBoundingClientRect().top - panel.getBoundingClientRect().top - 12, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
    });
  }

  showMapFallback(message = "지도를 불러오지 못했습니다.") {
    this.elements.mapFallback.querySelector("strong").textContent = message;
    this.elements.mapFallback.hidden = false;
  }

  showError(error) {
    this.elements.appError.textContent = error.message;
    this.elements.appError.hidden = false;
  }
}

function renderTransfer(label) {
  const transfer = createElement("div", "transfer");
  transfer.append(createElement("span", "transfer__line"), createElement("span", "transfer__label", label));
  return transfer;
}
