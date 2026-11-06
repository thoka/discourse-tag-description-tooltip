import { ajax } from "discourse/lib/ajax";

// One entry per lower-case tag name. The value is a promise of the plain
// text description ("" when the tag has none or the request failed).
// The promise goes into the map before the request ends, so that two fast
// hovers over the same tag make only one request.
const cache = new Map();

// Core sends tag descriptions as raw Markdown text. Remove HTML tags like
// core did before it dropped the title attribute. The result is plain text:
// the caller must put it into the page as text, never as HTML.
export function plainDescription(description) {
  if (typeof description !== "string") {
    return "";
  }
  return description.replace(/<.+?>/g, "").trim();
}

export function fetchTagDescription(tagName) {
  const key = String(tagName || "").toLowerCase();
  if (!key) {
    return Promise.resolve("");
  }
  if (!cache.has(key)) {
    // The same path encoding as core uses for tag links.
    const path = encodeURIComponent(key).replaceAll(".", "%2E");
    cache.set(
      key,
      ajax(`/tag/${path}/info.json`)
        .then((result) => plainDescription(result?.tag_info?.description))
        .catch(() => "")
    );
  }
  return cache.get(key);
}

// For tests only.
export function resetTagDescriptionCache() {
  cache.clear();
}
