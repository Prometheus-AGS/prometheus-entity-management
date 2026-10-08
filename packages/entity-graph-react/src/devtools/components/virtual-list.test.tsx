import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InspectorVirtualList } from "./virtual-list";
import { ENTITY_GRAPH_DEVTOOLS_STYLES } from "../styles";

describe("InspectorVirtualList", () => {
  afterEach(cleanup);

  it("passes the item index to renderItem so rows never search the array for their position", () => {
    const items = ["a", "b", "c"];
    render(
      <InspectorVirtualList
        items={items}
        getKey={(item) => item}
        ariaLabel="letters"
        renderItem={(item, index) => <span>{`${index + 1}:${item}`}</span>}
      />,
    );
    expect(screen.getByRole("list", { name: "letters" }).textContent).toBe("1:a2:b3:c");
  });

  it("bounds the membership scroll list so the virtualizer has a viewport", () => {
    // jsdom applies no Shadow DOM stylesheet, so assert the rule exists in the sheet itself.
    const rule = ENTITY_GRAPH_DEVTOOLS_STYLES.match(/\.pem-membership\s+\.pem-scroll-list\s*\{([^}]*)\}/);
    expect(rule, "a .pem-membership .pem-scroll-list rule").not.toBeNull();
    expect(rule?.[1]).toMatch(/max-height\s*:/);
  });
});
