import { setupTest } from "ember-qunit";
import { module, test } from "qunit";
import { renderTagWithDescription } from "../../discourse/api-initializers/tag-description-tooltip";
import { plainDescription } from "../../discourse/lib/tag-descriptions";

module("Unit | Tag description tooltip", function (hooks) {
  setupTest(hooks);

  test("plainDescription removes HTML tags", function (assert) {
    assert.strictEqual(plainDescription("<b>bold</b> text "), "bold text");
    assert.strictEqual(plainDescription("a < b"), "a < b");
    assert.strictEqual(plainDescription(undefined), "");
  });

  test("the renderer adds an escaped data attribute and no title", function (assert) {
    const html = renderTagWithDescription("foo", {
      description: `say "hi" & <i>wave</i>`,
    });
    assert.true(
      html.startsWith(
        `<a data-tag-description="say &quot;hi&quot; &amp; wave" href=`
      ),
      html
    );
    assert.false(html.includes("title"), "sets no title");
  });

  test("the renderer keeps a tag without description unchanged", function (assert) {
    const html = renderTagWithDescription("foo", {});
    assert.false(html.includes("data-tag-description"), html);
  });
});
