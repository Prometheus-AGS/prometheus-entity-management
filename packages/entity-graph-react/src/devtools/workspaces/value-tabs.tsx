import React from "react";

export interface EntityValueTabsProps<T extends string> {
  readonly tabs: readonly T[];
  readonly value: T;
  readonly onChange: (tab: T) => void;
  /** Number of changed fields, shown on the `diff` tab. */
  readonly diffCount: number;
  /** id of the tabpanel the tabs control; the panel is rendered by the caller. */
  readonly panelId: string;
}

export function valueTabId(panelId: string, tab: string): string {
  return `${panelId}-tab-${tab}`;
}

/**
 * ARIA tabs for the entity value projection (original / patch / live / diff): one Tab stop via a
 * roving tabindex, arrow keys and Home/End move the active tab, and each tab is wired to the
 * caller's panel through aria-controls. Mirrors the workspace tabs in inspector-shell.tsx.
 */
export function EntityValueTabs<T extends string>({ tabs, value, onChange, diffCount, panelId }: EntityValueTabsProps<T>) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex = event.key === "ArrowRight"
      ? (index + 1) % tabs.length
      : event.key === "ArrowLeft"
        ? (index - 1 + tabs.length) % tabs.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : null;
    if (nextIndex === null) return;
    event.preventDefault();
    onChange(tabs[nextIndex]);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div className="pem-value-tabs" role="tablist" aria-label="Entity value projection">
      {tabs.map((tab, index) => {
        const selected = tab === value;
        return (
          <button
            type="button"
            role="tab"
            key={tab}
            id={valueTabId(panelId, tab)}
            ref={(element) => { refs.current[index] = element; }}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab}
            {tab === "diff" && diffCount > 0 ? <span className="pem-value-tab-count">{diffCount}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
