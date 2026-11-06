/* global settings */
import { apiInitializer } from "discourse/lib/api";
import { defaultRenderTag } from "discourse/lib/render-tag";
import { escapeExpression } from "discourse/lib/utilities";
import { fetchTagDescription, plainDescription } from "../lib/tag-descriptions";

const TAG_SELECTOR = ".discourse-tag";
// Places where the tag is not the target of pointer events:
// - a row of the tag chooser: select-kit sets `pointer-events: none` on the
//   children of a row, so the row gets the events and the tag inside does not.
// - a tag link in the sidebar: it has no `.discourse-tag` element, and its
//   wrapper carries the tag name.
const CHOOSER_ROW_SELECTOR = ".select-kit-row";
const SIDEBAR_TAG_SELECTOR = ".sidebar-section-link-wrapper[data-tag-name]";
const IDENTIFIER = "tag-description";

// Wrap the core renderer and add the description as an escaped data
// attribute. Core removed the title attribute for accessibility, so this
// component never sets a title.
export function renderTagWithDescription(tag, params) {
  const html = defaultRenderTag(tag, params);
  const text = plainDescription(params?.description);
  if (!text) {
    return html;
  }
  return html.replace(
    /^<([a-z]+)/,
    `<$1 data-tag-description="${escapeExpression(text)}"`
  );
}

// The services of the current app instance. Each boot of the app (also each
// test) replaces them, while the document listeners stay the same.
let services = null;
let currentTrigger = null;
let listening = false;

function alive() {
  return services && !services.tooltip.isDestroyed;
}

function close() {
  currentTrigger = null;
  if (alive()) {
    services.tooltip.close(IDENTIFIER);
  }
}

// The trigger is the element that gets the pointer and focus events and that
// anchors the tooltip. Return null if the target is not inside a tag.
export function findTrigger(target) {
  if (!target?.closest) {
    return null;
  }
  const tag = target.closest(TAG_SELECTOR);
  if (tag) {
    return tag;
  }
  const row = target.closest(CHOOSER_ROW_SELECTOR);
  if (row?.querySelector(TAG_SELECTOR)) {
    return row;
  }
  return target.closest(SIDEBAR_TAG_SELECTOR);
}

// The element of the trigger that carries the tag data attributes.
function tagElement(trigger) {
  return trigger.matches(TAG_SELECTOR)
    ? trigger
    : trigger.querySelector(TAG_SELECTOR) || trigger;
}

async function descriptionFor(trigger) {
  const { tagName, tagDescription } = tagElement(trigger).dataset;
  const known = tagDescription || "";
  const { themeSettings } = services;
  const wantsFetch = themeSettings.full_description_on_hover || !known;
  if (!wantsFetch || !themeSettings.enable_fallback_fetch) {
    return known;
  }
  const fetched = await fetchTagDescription(tagName);
  return fetched || known;
}

async function open(trigger) {
  if (trigger === currentTrigger) {
    return;
  }
  currentTrigger = trigger;
  const text = await descriptionFor(trigger);
  // The pointer or the focus may have moved on while the request ran.
  if (currentTrigger !== trigger || !alive()) {
    return;
  }
  if (!text) {
    services.tooltip.close(IDENTIFIER);
    return;
  }
  // A plain string: the tooltip renders it as text, never as HTML.
  services.tooltip.show(trigger, { identifier: IDENTIFIER, content: text });
}

function onEnter(event) {
  if (!alive()) {
    return;
  }
  // Version 1 is for desktop only: on touch, a tap on a tag follows the
  // link. Check at event time, because the site does not know the view yet
  // while the initializer runs.
  if (services.site.mobileView || services.capabilities.touchFirst) {
    return;
  }
  const trigger = findTrigger(event.target);
  if (trigger && tagElement(trigger).dataset.tagName) {
    open(trigger);
  }
}

function onLeave(event) {
  if (!currentTrigger) {
    return;
  }
  const next = event.relatedTarget;
  if (next && currentTrigger.contains(next)) {
    return;
  }
  if (findTrigger(event.target) === currentTrigger) {
    close();
  }
}

export default apiInitializer((api) => {
  api.replaceTagRenderer(renderTagWithDescription);

  services = {
    site: api.container.lookup("service:site"),
    capabilities: api.container.lookup("service:capabilities"),
    tooltip: api.container.lookup("service:tooltip"),
    themeSettings: settings,
  };
  currentTrigger = null;

  // A click on a tag leaves the page, so the trigger leaves the page too.
  api.onPageChange(() => {
    if (currentTrigger) {
      close();
    }
  });

  if (!listening) {
    listening = true;
    document.addEventListener("mouseover", onEnter);
    document.addEventListener("focusin", onEnter);
    document.addEventListener("mouseout", onLeave);
    document.addEventListener("focusout", onLeave);
  }
});
