const DAY_ID_PATTERN = /^\d{2}$/;
const STOP_ID_PATTERN = /^(\d{2})-(\d{2})$/;
const SUPPORTED_ROUTE_MODES = new Set([
  "walking",
  "transit",
  "bicycling",
  "driving",
  "connection"
]);

export function validateTripData(data) {
  if (!data?.trip || !Array.isArray(data.days) || data.days.length === 0) {
    throw new TypeError("trip.json에는 trip 정보와 하나 이상의 days가 필요합니다.");
  }

  const dayIds = new Set();
  const stopIds = new Set();

  data.days.forEach((day) => {
    if (!DAY_ID_PATTERN.test(day.id)) {
      throw new TypeError(`일차 ID '${day.id}'는 01 형식이어야 합니다.`);
    }
    if (dayIds.has(day.id)) {
      throw new TypeError(`중복 일차 ID: ${day.id}`);
    }
    if (!Array.isArray(day.stops) || day.stops.length === 0) {
      throw new TypeError(`${day.id}일차에는 하나 이상의 코스가 필요합니다.`);
    }
    dayIds.add(day.id);

    day.stops.forEach((stop, index) => {
      const match = STOP_ID_PATTERN.exec(stop.id);
      const expectedSequence = String(index + 1).padStart(2, "0");
      if (!match || match[1] !== day.id || match[2] !== expectedSequence) {
        throw new TypeError(`${stop.id}는 ${day.id}-${expectedSequence} 형식이어야 합니다.`);
      }
      if (stopIds.has(stop.id)) {
        throw new TypeError(`중복 코스 ID: ${stop.id}`);
      }
      if (!stop.name || !stop.time || !isValidLocation(stop.location)) {
        throw new TypeError(`${stop.id}에 이름, 시간, 올바른 좌표가 필요합니다.`);
      }
      if (stop.routeFromPrevious && !SUPPORTED_ROUTE_MODES.has(stop.routeFromPrevious.mode)) {
        throw new TypeError(`${stop.id}의 이동 방식이 지원되지 않습니다.`);
      }
      stopIds.add(stop.id);
    });
  });

  Object.entries(data.planDefinitions ?? {}).forEach(([dayId, definition]) => {
    if (!dayIds.has(dayId)) throw new TypeError(`plan이 존재하지 않는 날짜 '${dayId}'를 참조합니다.`);
    const planIds = new Set();
    const day = data.days.find((day) => day.id === dayId);
    const catalog = new Set([...day.stops.map((stop) => stop.id), ...Object.values(definition.stops ?? {}).map((stop) => stop.id)]);
    (definition.plans ?? []).forEach((plan) => {
      if (!plan.id || planIds.has(plan.id)) throw new TypeError(`${dayId} plan ID가 중복되었습니다.`);
      planIds.add(plan.id);
      if (plan.sequence && !Array.isArray(plan.sequence)) throw new TypeError(`${dayId}/${plan.id} sequence가 배열이어야 합니다.`);
      if (plan.sequence && (!plan.sequence.length || new Set(plan.sequence).size !== plan.sequence.length || plan.sequence.some((id) => !catalog.has(id)))) {
        throw new TypeError(`${dayId}/${plan.id} sequence에 중복 또는 없는 장소가 있습니다.`);
      }
      Object.keys(plan.routeOverrides ?? {}).forEach((stopId) => {
        if (!plan.sequence?.includes(stopId)) throw new TypeError(`${dayId}/${plan.id} routeOverride가 sequence 밖에 있습니다: ${stopId}`);
      });
    });
    if (definition.default && !planIds.has(definition.default)) throw new TypeError(`${dayId} 기본 plan이 없습니다.`);
    Object.values(definition.stops ?? {}).forEach((stop) => {
      if (!stop.id || !isValidLocation(stop.location)) throw new TypeError(`${dayId} plan stop의 ID 또는 좌표가 올바르지 않습니다.`);
      stopIds.add(stop.id);
    });
  });

  Object.entries(data.choiceDefinitions ?? {}).forEach(([stopId, group]) => {
    if (!stopIds.has(stopId) || !group.label || !Array.isArray(group.options) || group.options.length < 2) {
      throw new TypeError(`선택 슬롯 '${stopId}'의 구조가 올바르지 않습니다.`);
    }
    const optionIds = new Set();
    group.options.forEach((option) => {
      if (!option.id || optionIds.has(option.id) || !option.name || !isValidLocation(option.location)) {
        throw new TypeError(`선택 슬롯 '${stopId}'의 장소 옵션이 올바르지 않습니다.`);
      }
      optionIds.add(option.id);
    });
    if (!optionIds.has(group.default)) throw new TypeError(`선택 슬롯 '${stopId}'의 기본 옵션이 없습니다.`);
  });
  Object.entries(data.focusGroups ?? {}).forEach(([dayId, groups]) => {
    const day = data.days.find((day) => day.id === dayId);
    if (!day || !Array.isArray(groups)) throw new TypeError(`확대 보기 날짜가 올바르지 않습니다: ${dayId}`);
    const ids = new Set(day.stops.map((stop) => stop.id));
    const groupIds = new Set();
    groups.forEach((group) => {
      if (!group.id || groupIds.has(group.id) || !group.label || !group.stopIds?.length || group.stopIds.some((id) => !ids.has(id))) {
        throw new TypeError(`확대 보기 장소가 올바르지 않습니다: ${dayId}/${group.id}`);
      }
      groupIds.add(group.id);
    });
  });
}

function isValidLocation(location) {
  return Number.isFinite(location?.lat)
    && Number.isFinite(location?.lng)
    && Math.abs(location.lat) <= 90
    && Math.abs(location.lng) <= 180;
}
