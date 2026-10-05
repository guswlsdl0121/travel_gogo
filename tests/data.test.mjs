import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateTripData } from '../src/js/data/validate.js';
import { resolveDayPlan } from '../src/js/data/resolve.js';
import { createRouteCacheKey } from '../src/js/map/routes.js';

const read = async (name) => JSON.parse(await readFile(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const data = { ...await read('trip'), planDefinitions: await read('plans'), choiceDefinitions: await read('choices'), focusGroups: await read('focus-groups') };

test('all plans and food alternatives resolve without mutating the catalog', () => {
  validateTripData(data);
  const original = JSON.stringify(data);
  for (const day of data.days) {
    for (const plan of data.planDefinitions[day.id]?.plans ?? [{ id: 'main' }]) {
      const resolved = resolveDayPlan(day, plan.id, data.planDefinitions, data.choiceDefinitions);
      assert.ok(resolved.stops.length);
      for (const stop of resolved.stops) {
        for (const option of data.choiceDefinitions[stop.id]?.options ?? []) {
          const selected = resolveDayPlan(day, plan.id, data.planDefinitions, data.choiceDefinitions, { [stop.id]: option.id });
          assert.deepEqual(selected.stops.map((stop) => stop.id), resolved.stops.map((stop) => stop.id));
          assert.deepEqual(selected.stops.find((item) => item.id === stop.id).location, option.location);
        }
      }
    }
  }
  assert.equal(JSON.stringify(data), original);
});

test('invalid plan, option slot and focus references are rejected', () => {
  for (const corrupt of [
    (copy) => { copy.planDefinitions['02'].plans[1].sequence.push('02-99'); },
    (copy) => { copy.choiceDefinitions['99-01'] = Object.values(copy.choiceDefinitions)[0]; },
    (copy) => { copy.focusGroups['01'][0].stopIds.push('01-99'); }
  ]) {
    const copy = structuredClone(data);
    corrupt(copy);
    assert.throws(() => validateTripData(copy));
  }
});

test('route cache depends on ordered geometry and mode, not labels', () => {
  const route = { mode: 'walking', stops: data.days[0].stops.slice(5, 8) };
  assert.equal(createRouteCacheKey(route), createRouteCacheKey({ ...route, stops: route.stops.map((stop) => ({ ...stop, name: 'renamed' })) }));
  assert.notEqual(createRouteCacheKey(route), createRouteCacheKey({ ...route, mode: 'driving' }));
  assert.notEqual(createRouteCacheKey(route), createRouteCacheKey({ ...route, stops: [...route.stops].reverse() }));
});
