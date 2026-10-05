import { readFile } from "node:fs/promises";
import { validateTripData } from "../src/js/data/validate.js";

const fileUrl = new URL("../src/data/trip.json", import.meta.url);
const data = JSON.parse(await readFile(fileUrl, "utf8"));
for (const [key, name] of Object.entries({ planDefinitions: 'plans', choiceDefinitions: 'choices', focusGroups: 'focus-groups' })) {
  data[key] = JSON.parse(await readFile(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
}

validateTripData(data);

const stopCount = data.days.reduce((total, day) => total + day.stops.length, 0);
console.log(`trip.json valid: ${data.days.length} days, ${stopCount} stops`);
