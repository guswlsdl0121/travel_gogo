import { validateTripData } from './validate.js';

const FILES = { trip: 'trip.json', planDefinitions: 'plans.json', choiceDefinitions: 'choices.json', focusGroups: 'focus-groups.json' };

export async function loadTripData() {
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, file]) => {
    const response = await fetch(new URL('../../data/' + file, import.meta.url), { cache: 'no-store' });
    if (!response.ok) throw new Error(file + ' 로딩 실패 (' + response.status + ')');
    return [key, await response.json()];
  }));
  const { trip, ...definitions } = Object.fromEntries(entries);
  const data = { ...trip, ...definitions };
  validateTripData(data);
  return data;
}
