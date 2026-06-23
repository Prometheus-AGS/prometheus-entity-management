import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEntityExplorer } from "../context";
import { type DevtoolsEvent } from "@prometheus-ags/entity-graph-core";

const MAX_EVENTS = 500;

export function EventsTab() {
  const { bus } = useEntityExplorer();

  // Event buffer lives outside React state to avoid re-rendering the full list on each event.
  // We only push new events into state for visible rendering.
  const bufferRef = useRef<DevtoolsEvent[]>([]);
  const [displayEvents, setDisplayEvents] = useState<DevtoolsEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Keep ref in sync with state for use in callbacks without stale closure
  autoScrollRef.current = autoScroll;

  const flushToDisplay = useCallback(() => {
    setDisplayEvents([...bufferRef.current]);
    setNewCount(0);
  }, []);

  useEffect(() => {
    // Seed from buffer history (synchronous replay via bus.subscribe)
    const unsub = bus.subscribe((event) => {
      // Add to buffer (ring — drop oldest if full)
      if (bufferRef.current.length >= MAX_EVENTS) {
        bufferRef.current = bufferRef.current.slice(-(MAX_EVENTS - 1));
      }
      bufferRef.current = [event, ...bufferRef.current]; // newest first

      if (autoScrollRef.current) {
        setDisplayEvents([...bufferRef.current]);
        setNewCount(0);
      } else {
        setNewCount((n) => n + 1);
      }
    });

    // Flush the replayed buffer into display
    setDisplayEvents([...bufferRef.current]);

    return unsub;
  }, [bus, flushToDisplay]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    // If user has scrolled down (away from top, since newest is at top)
    if ((e.currentTarget as HTMLDivElement).scrollTop > 8) {
      setAutoScroll(false);
    }
  }

  function handleResume() {
    setAutoScroll(true);
    setDisplayEvents([...bufferRef.current]);
    setNewCount(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  return (
    <div ref={scrollRef} style={{ height: "100%", overflow: "auto" }} onScroll={handleScroll}>
      {!autoScroll && newCount > 0 && (
        <div className="ee-resume-banner" role="button" tabIndex={0} onClick={handleResume}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleResume()}>
          {newCount} new event{newCount !== 1 ? "s" : ""} — click to resume
        </div>
      )}
      {displayEvents.length === 0 && (
        <div style={{ padding: 12, color: "var(--ee-text-muted)", fontSize: 11 }}>
          Waiting for events…
        </div>
      )}
      {displayEvents.map((event, i) => (
        <div key={i} className="ee-event-row">
          <span className="ee-event-kind" data-kind={event.kind}>{event.kind}</span>
          {"type" in event && <span style={{ color: "var(--ee-text-muted)" }}>{event.type}</span>}
          {"id" in event && <span>{event.id}</span>}
          {"key" in event && <span style={{ color: "var(--ee-text-muted)" }}>{event.key}</span>}
          <span style={{ marginLeft: "auto", color: "var(--ee-text-muted)", fontSize: 10 }}>
            {new Date(event.at).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}
