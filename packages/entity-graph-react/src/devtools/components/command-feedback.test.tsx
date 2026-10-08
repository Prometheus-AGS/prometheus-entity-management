import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommandFeedback } from "./command-feedback";

/**
 * One element used to flip between role="alert" and role="status" (with aria-live="polite" on
 * both, which contradicts alert's implicit assertive live region). Assistive tech does not
 * reliably announce a role change, so notices and errors now live in two stable regions.
 */
describe("CommandFeedback", () => {
  afterEach(cleanup);

  it("announces pending work and notices in a polite status region", () => {
    render(<CommandFeedback pending="Rewinding" error={null} notice={null} onDismiss={() => {}} />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("Rewinding");
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("announces errors in an alert that is always present in the tree", () => {
    const { rerender } = render(<CommandFeedback pending={null} error={null} notice={null} onDismiss={() => {}} />);
    expect(screen.getByRole("alert").textContent).toBe("");
    rerender(<CommandFeedback pending={null} error="Restore refused: entity changed" notice={null} onDismiss={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Restore refused");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("offers a dismiss control only when there is something to dismiss", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<CommandFeedback pending={null} error={null} notice={null} onDismiss={onDismiss} />);
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
    rerender(<CommandFeedback pending={null} error={null} notice="Snapshot restored" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
