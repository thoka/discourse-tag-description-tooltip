import { click, triggerEvent, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { cloneJSON } from "discourse/lib/object";
import discoveryFixtures from "discourse/tests/fixtures/discovery-fixtures";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import { resetTagDescriptionCache } from "../../discourse/lib/tag-descriptions";

const TOOLTIP = ".fk-d-tooltip__content";

// The places where a tag shows outside the topic list. In the tag chooser and
// in the sidebar, the browser sends the pointer events to an element around
// the tag, so the tests send them there too.
acceptance("Tag description tooltip - other places", function (needs) {
  needs.user({
    sidebar_tags: [{ id: 192, name: "Upper", slug: "upper", pm_only: false }],
    display_sidebar_tags: true,
  });
  needs.site({ can_tag_topics: true });
  needs.settings({
    tagging_enabled: true,
    navigation_menu: "sidebar",
    desktop_category_page_style: "categories_and_latest_topics",
  });
  needs.hooks.beforeEach(() => resetTagDescriptionCache());

  needs.pretender((server, helper) => {
    // The shape that the server sends: tags as objects with an id, and no
    // descriptions for the topics of the categories page.
    server.get("/categories_and_latest", () => {
      const json = cloneJSON(discoveryFixtures["/categories_and_latest.json"]);
      const topic = json.topic_list.topics[0];
      topic.tags = [{ id: 192, name: "Upper", slug: "upper" }];
      delete topic.tags_descriptions;
      return helper.response(json);
    });

    const info = (name, description) => {
      server.get(`/tag/${name}/info.json`, () =>
        helper.response({ tag_info: { id: 1, name, slug: name, description } })
      );
    };
    info("upper", "Loaded for an upper case tag");
    info("monkey", "Loaded for a chooser row");
  });

  test("shows the description on the categories page", async function (assert) {
    await visit("/categories");
    const tag = `#main-outlet .discourse-tag[data-tag-name="upper"]`;
    assert.dom(tag).exists("the categories page shows the tag");

    await triggerEvent(tag, "mouseover");
    assert.dom(TOOLTIP).hasText("Loaded for an upper case tag");
  });

  test("shows the description on a row of the tag chooser", async function (assert) {
    await visit("/");
    await click("#create-topic");
    const chooser = selectKit(".mini-tag-chooser");
    await chooser.expand();

    // select-kit sets `pointer-events: none` on the children of a row.
    const row = `.mini-tag-chooser .select-kit-row[data-name="monkey"]`;
    await triggerEvent(row, "mouseover");
    assert.dom(TOOLTIP).hasText("Loaded for a chooser row");

    await triggerEvent(row, "mouseout");
    assert.dom(TOOLTIP).doesNotExist("closes on mouseout");
  });

  test("shows the description on a sidebar tag", async function (assert) {
    await visit("/");
    const link = `.sidebar-section-link-wrapper[data-tag-name="Upper"] a`;
    await triggerEvent(link, "mouseover");
    assert.dom(TOOLTIP).hasText("Loaded for an upper case tag");

    await triggerEvent(link, "mouseout");
    assert.dom(TOOLTIP).doesNotExist("closes on mouseout");
  });
});
