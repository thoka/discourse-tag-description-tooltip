/* global settings */
import { triggerEvent, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { cloneJSON } from "discourse/lib/object";
import discoveryFixtures from "discourse/tests/fixtures/discovery-fixtures";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { resetTagDescriptionCache } from "../../discourse/lib/tag-descriptions";

const TOOLTIP = ".fk-d-tooltip__content";

function tag(name) {
  return `.topic-list-item .discourse-tag[data-tag-name="${name}"]`;
}

acceptance("Tag description tooltip", function (needs) {
  const infoRequests = {};

  needs.user();
  needs.settings({ tagging_enabled: true });
  needs.hooks.beforeEach(() => {
    resetTagDescriptionCache();
    Object.keys(infoRequests).forEach((key) => delete infoRequests[key]);
  });

  needs.pretender((server, helper) => {
    server.get("/latest.json", () => {
      const json = cloneJSON(discoveryFixtures["/latest.json"]);
      const topic = json.topic_list.topics[0];
      topic.tags = ["described", "evil", "fetched", "empty"];
      topic.tags_descriptions = {
        described: "A tag with a description",
        evil: `<b>bold</b> & "quoted"`,
      };
      return helper.response(json);
    });

    const info = (name, description) => {
      server.get(`/tag/${name}/info.json`, () => {
        infoRequests[name] = (infoRequests[name] || 0) + 1;
        return helper.response({
          tag_info: { id: 1, name, slug: name, description },
        });
      });
    };
    info("fetched", "Loaded from the server");
    info("empty", "");
    info("described", "Full text from the server");
  });

  test("shows the description on hover of a topic list tag", async function (assert) {
    await visit("/latest");
    await triggerEvent(tag("described"), "mouseover");

    assert.dom(TOOLTIP).hasText("A tag with a description");
    assert.dom(tag("described")).doesNotHaveAttribute("title");
    assert.strictEqual(infoRequests.described, undefined, "makes no request");

    await triggerEvent(tag("described"), "mouseout");
    assert.dom(TOOLTIP).doesNotExist("closes on mouseout");
  });

  test("shows the description on keyboard focus", async function (assert) {
    await visit("/latest");
    await triggerEvent(tag("described"), "focusin");
    assert.dom(TOOLTIP).hasText("A tag with a description");

    await triggerEvent(tag("described"), "focusout");
    assert.dom(TOOLTIP).doesNotExist("closes on focusout");
  });

  test("shows HTML in a description as plain text", async function (assert) {
    await visit("/latest");
    await triggerEvent(tag("evil"), "mouseover");

    assert.dom(TOOLTIP).hasText(`bold & "quoted"`);
    assert.dom(`${TOOLTIP} b`).doesNotExist("renders no HTML element");
    assert.dom(tag("evil")).doesNotHaveAttribute("title");
  });

  test("loads a missing description once", async function (assert) {
    await visit("/latest");
    await triggerEvent(tag("fetched"), "mouseover");
    assert.dom(TOOLTIP).hasText("Loaded from the server");

    await triggerEvent(tag("fetched"), "mouseout");
    await triggerEvent(tag("fetched"), "mouseover");
    assert.dom(TOOLTIP).hasText("Loaded from the server");
    assert.strictEqual(infoRequests.fetched, 1, "makes one request");
  });

  test("shows no tooltip for an empty description", async function (assert) {
    await visit("/latest");
    await triggerEvent(tag("empty"), "mouseover");

    assert.strictEqual(infoRequests.empty, 1, "asks the server once");
    assert.dom(TOOLTIP).doesNotExist();
  });

  test("loads the full description with the setting", async function (assert) {
    settings.full_description_on_hover = true;
    try {
      await visit("/latest");
      await triggerEvent(tag("described"), "mouseover");

      assert.dom(TOOLTIP).hasText("Full text from the server");
      assert.strictEqual(infoRequests.described, 1, "makes one request");
    } finally {
      settings.full_description_on_hover = false;
    }
  });
});
