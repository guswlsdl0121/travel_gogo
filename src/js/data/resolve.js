export function resolveDayPlan(day, planId = "main", definitions = {}, choices = {}, selections = {}) {
  const definition = definitions[day.id];
  const plan = definition?.plans?.find((candidate) => candidate.id === planId)
    ?? definition?.plans?.find((candidate) => candidate.id === definition.default)
    ?? { id: "main", label: "기본 코스", sequence: day.stops.map((stop) => stop.id) };
  const catalog = new Map(day.stops.map((stop) => [stop.id, stop]));
  Object.values(definition?.stops ?? {}).forEach((stop) => catalog.set(stop.id, stop));
  const sequence = plan.sequence ?? day.stops.map((stop) => stop.id);
  const overrides = plan.routeOverrides ?? {};
  const stops = sequence.map((id) => {
    const stop = catalog.get(id);
    if (!stop) throw new TypeError(`${day.id} plan '${plan.id}'이 존재하지 않는 stop '${id}'를 참조합니다.`);
    const route = overrides[id] ?? stop.routeFromPrevious;
    const choiceGroup = choices[id];
    const selectedChoiceId = selections[id] ?? choiceGroup?.default;
    const selectedChoice = choiceGroup?.options?.find((option) => option.id === selectedChoiceId);
    const resolvedStop = selectedChoice
      ? {
        ...stop,
        name: selectedChoice.name,
        description: selectedChoice.description ?? stop.description,
        details: selectedChoice.tags?.length ? selectedChoice.tags : stop.details,
        location: selectedChoice.location,
        choiceGroupId: id,
        selectedChoiceId: selectedChoice.id,
        source: selectedChoice.source,
        menu: selectedChoice.menu ?? inferMenu(selectedChoice),
        bestFor: selectedChoice.bestFor ?? inferBestFor(selectedChoice, choiceGroup)
      }
      : stop;
    return { ...resolvedStop, routeFromPrevious: route ? { ...route } : undefined };
  });
  return { ...day, stops, activePlan: plan };
}

function inferMenu(option) {
  const tags = option.tags ?? [];
  const name = option.name ?? "";
  if (tags.includes("라멘")) return "돈코츠 라멘";
  if (tags.includes("우동")) return "하카타 우동";
  if (tags.includes("소바")) return "자루소바 또는 따뜻한 소바";
  if (tags.includes("모츠나베")) return "모츠나베";
  if (tags.includes("미즈타키")) return "닭 육수 미즈타키";
  if (tags.includes("야키토리")) return "닭껍질·닭꼬치 모둠";
  if (tags.includes("명란")) return "명란 정식 또는 명란 덮밥";
  if (tags.includes("고마사바")) return "고마사바 정식";
  if (tags.includes("해산물")) return "회정식 또는 도미차즈케";
  if (tags.includes("화과자")) return "계절 화과자와 녹차";
  if (tags.includes("베이커리")) return "크루아상·사워도우·샌드위치";
  if (tags.includes("롤케이크")) return "P롤 롤케이크";
  if (tags.includes("팬케이크")) return "팬케이크와 커피";
  if (tags.includes("커피")) return "스페셜티 커피와 구움과자";
  if (tags.includes("디저트")) return "계절 디저트와 음료";
  if (name.includes("시장")) return "시장 간식과 해산물";
  return "대표 메뉴는 방문 당일 메뉴판 확인";
}

function inferBestFor(option, group) {
  const tags = option.tags ?? [];
  if (tags.includes("예약")) return "예약했거나 대기 시간을 감수할 때";
  if (tags.includes("테이크아웃")) return "공항 이동 전 빠르게 먹을 때";
  if (tags.includes("빠른 식사") || tags.includes("역세권")) return "열차 시간 전 빠르게 먹을 때";
  if (tags.includes("해변") || tags.includes("바다")) return "후쿠츠 해안 산책과 함께";
  if (tags.includes("호수")) return "긴린코 풍경을 보며 쉬고 싶을 때";
  if (tags.includes("야타이")) return "저녁에 현지 분위기를 즐길 때";
  if (tags.includes("카페") || tags.includes("커피")) return "걷다가 쉬는 시간이 필요할 때";
  if (tags.includes("명물") || tags.includes("기념품")) return "가벼운 간식과 선물을 함께 고를 때";
  return `${group?.label ?? "식사"} 대기나 영업 상황이 바뀌었을 때`;
}

