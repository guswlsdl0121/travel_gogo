import { createElement } from './dom.js';

export function closeChoiceMenus(root = document) {
  root.querySelectorAll('.choice-control__trigger[aria-expanded="true"]').forEach((trigger) => {
    trigger.setAttribute('aria-expanded', 'false');
    document.getElementById(trigger.getAttribute('aria-controls')).hidden = true;
  });
}

export function renderChoices(container, day, choices, selections, onSelect) {
  const fragment = document.createDocumentFragment();
  for (const stop of day.stops) {
    const group = choices[stop.id];
    if (!group) continue;
    const control = createElement('div', 'choice-control');
    const title = createElement('span', 'choice-control__label', group.label);
    title.id = `choice-label-${stop.id}`;
    const menu = createElement('div', 'choice-control__menu');
    const trigger = createElement('button', 'choice-control__trigger');
    trigger.type = 'button';
    trigger.id = `choice-trigger-${stop.id}`;
    trigger.setAttribute('aria-labelledby', `${title.id} ${trigger.id}`);
    trigger.setAttribute('aria-expanded', 'false');
    const list = createElement('div', 'choice-control__list');
    list.id = `choices-${stop.id}`;
    list.setAttribute('role', 'group');
    list.setAttribute('aria-labelledby', title.id);
    list.hidden = true;
    trigger.setAttribute('aria-controls', list.id);
    const selectedId = selections[stop.id] ?? group.default;
    trigger.textContent = group.options.find((option) => option.id === selectedId)?.name ?? group.options[0].name;
    for (const option of group.options) {
      const item = createElement('button', 'choice-control__option', option.name);
      item.type = 'button';
      item.setAttribute('aria-pressed', String(option.id === selectedId));
      item.classList.toggle('is-selected', option.id === selectedId);
      item.addEventListener('click', () => {
        closeChoiceMenus(container);
        onSelect(stop.id, option.id);
        document.getElementById(trigger.id)?.focus({ preventScroll: true });
      });
      list.append(item);
    }
    trigger.addEventListener('click', () => {
      const open = list.hidden;
      closeChoiceMenus(container);
      list.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeChoiceMenus(container);
        trigger.focus({ preventScroll: true });
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        list.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        const items = [...list.children];
        const current = items.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
        items[next].focus();
      }
    });
    menu.addEventListener('focusout', (event) => {
      if (!menu.contains(event.relatedTarget)) closeChoiceMenus(container);
    });
    menu.append(trigger, list);
    control.append(title, menu);
    fragment.append(control);
  }
  container.replaceChildren(fragment);
  container.hidden = !container.childElementCount;
}
