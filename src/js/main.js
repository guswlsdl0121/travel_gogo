import { loadTripData } from './data/load.js';
import { resolveDayPlan } from './data/resolve.js';
import { TripMap } from './map/trip-map.js';
import { TripView } from './ui/trip-view.js';
import { closeChoiceMenus } from './ui/choices.js';
import { readSelection, writeSelection } from './state/url.js';

const state = { data: null, day: null, planId: 'main', choices: {}, stopId: null, mapReady: false };
const view = new TripView({ onDaySelect: selectDay, onPlanSelect: selectPlan, onChoiceSelect: selectChoice, onStopSelect: selectStop });
const tripMap = new TripMap(document.querySelector('#map'), selectStop, clearSelection);

async function bootstrap() {
  try {
    state.data = await loadTripData();
    view.renderTrip(state.data.trip, state.data.days);
    const selection = readSelection(state.data.days);
    state.choices = selection.choices;
    selectDay(selection.dayId, selection.planId);
    try {
      await tripMap.initialize(window.TRIP_CONFIG?.googleMapsApiKey);
      state.mapReady = true;
      renderMap(state.stopId);
      if (state.stopId) tripMap.focusStop(state.stopId, true, 17);
    } catch (error) {
      view.showMapFallback(error.message);
    }
  } catch (error) {
    view.showError(error);
  }
}

function selectDay(dayId, planId) {
  const day = state.data.days.find((candidate) => candidate.id === dayId);
  if (!day) return;
  const definition = state.data.planDefinitions[dayId];
  state.planId = definition?.plans.some((plan) => plan.id === planId) ? planId : (definition?.default ?? 'main');
  state.day = resolveDayPlan(day, state.planId, state.data.planDefinitions, state.data.choiceDefinitions, state.choices);
  state.stopId = null;
  renderView();
  document.querySelector('.itinerary-panel').scrollTop = 0;
  if (state.mapReady) renderMap();
}

function renderView() {
  view.renderDay(state.day, state.data.planDefinitions[state.day.id]?.plans ?? [], state.planId, state.data.choiceDefinitions, state.choices);
  writeSelection(state.day.id, state.planId, state.choices);
}

function renderMap(focusStopId = null) {
  tripMap.renderDay(state.day, state.data.focusGroups[state.day.id] ?? [], focusStopId);
}

function selectPlan(planId) {
  if (state.day) selectDay(state.day.id, planId);
}

function selectChoice(stopId, choiceId) {
  if (!state.day) return;
  const group = state.data.choiceDefinitions[stopId];
  if (!group?.options.some((option) => option.id === choiceId)) return;
  const previous = state.choices[stopId] ?? group.default;
  state.choices[stopId] = choiceId;
  if (previous !== choiceId) {
    const day = state.data.days.find((day) => day.id === state.day.id);
    state.day = resolveDayPlan(day, state.planId, state.data.planDefinitions, state.data.choiceDefinitions, state.choices);
    renderView();
    if (state.mapReady) renderMap(stopId);
  }
  writeSelection(state.day.id, state.planId, state.choices);
  selectStop(stopId);
}

function selectStop(stopId) {
  if (!state.day?.stops.some((stop) => stop.id === stopId)) return;
  state.stopId = stopId;
  view.setActiveStop(stopId);
  if (state.mapReady) tripMap.focusStop(stopId, true, 17);
}

function clearSelection() {
  state.stopId = null;
  view.setActiveStop(null, false);
  tripMap.clearSelection();
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('.choice-control')) closeChoiceMenus();
  if (!event.target.closest('#map, .stop, .choice-control')) clearSelection();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeChoiceMenus();
    clearSelection();
  }
});
window.matchMedia('(max-width: 900px)').addEventListener('change', clearSelection);
document.querySelector('#fit-map').addEventListener('click', () => tripMap.fitToDay(true));
document.querySelector('#map-size-toggle').addEventListener('click', (event) => {
  const expanded = document.querySelector('.workspace').classList.toggle('is-map-expanded');
  event.currentTarget.setAttribute('aria-pressed', String(expanded));
  event.currentTarget.textContent = expanded ? '일정 넓게' : '지도 넓게';
});

bootstrap();
