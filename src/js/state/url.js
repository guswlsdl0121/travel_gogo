export function readSelection(days) {
  const params = new URLSearchParams(window.location.search);
  const dayId = (params.get('day') ?? days[0].id).padStart(2, '0');
  return {
    dayId: days.some((day) => day.id === dayId) ? dayId : days[0].id,
    planId: params.get('plan') ?? 'main',
    choices: Object.fromEntries([...params].filter(([key]) => key.startsWith('choice.')).map(([key, value]) => [key.slice(7), value]))
  };
}

export function writeSelection(dayId, planId, choices) {
  const url = new URL(window.location.href);
  url.searchParams.set('day', dayId);
  if (planId === 'main') url.searchParams.delete('plan');
  else url.searchParams.set('plan', planId);
  [...url.searchParams.keys()].filter((key) => key.startsWith('choice.')).forEach((key) => url.searchParams.delete(key));
  Object.entries(choices).filter(([id]) => id.startsWith(dayId + '-')).forEach(([id, choice]) => url.searchParams.set('choice.' + id, choice));
  history.replaceState({}, '', url);
}
