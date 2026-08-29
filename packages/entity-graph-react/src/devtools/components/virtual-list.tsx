import { useCallback, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface InspectorVirtualListProps<T> {
  items: readonly T[];
  getKey(item: T): string | number;
  estimateSize?: number;
  ariaLabel: string;
  className?: string;
  renderItem(item: T): ReactNode;
}

export function InspectorVirtualList<T>({
  items,
  getKey,
  estimateSize = 36,
  ariaLabel,
  className = "",
  renderItem,
}: InspectorVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const getItemKey = useCallback(
    (index: number) => getKey(items[index] as T),
    [getKey, items],
  );
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    getItemKey,
    overscan: 8,
    enabled: items.length > 50,
  });

  if (items.length <= 50) {
    return (
      <div className={`pem-scroll-list ${className}`} role="list" aria-label={ariaLabel}>
        {items.map((item) => <div role="listitem" key={getKey(item)}>{renderItem(item)}</div>)}
      </div>
    );
  }

  return (
    <div ref={parentRef} className={`pem-scroll-list ${className}`} role="list" aria-label={ariaLabel}>
      <div className="pem-virtual-space" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index] as T;
          return (
            <div
              role="listitem"
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="pem-virtual-row"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              {renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
