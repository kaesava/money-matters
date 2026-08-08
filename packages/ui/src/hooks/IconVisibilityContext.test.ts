import { describe, it, expect } from "vitest";
import React from "react";
import { IconVisibilityProvider, IconVisibilityProviderProps, useIconVisibility } from "./IconVisibilityContext";

describe("IconVisibilityContext", () => {
  it("exports IconVisibilityProvider and useIconVisibility correctly", () => {
    expect(IconVisibilityProvider).toBeDefined();
    expect(useIconVisibility).toBeDefined();
  });

  it("creates provider element with initialShowIcons prop", () => {
    const element = React.createElement(
      IconVisibilityProvider,
      { initialShowIcons: false },
      React.createElement("div", null, "Child")
    ) as React.ReactElement<IconVisibilityProviderProps>;

    expect(element.props.initialShowIcons).toBe(false);
  });
});
