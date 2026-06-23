/**
 * entity-tool-provider.tsx — React context for EntityToolProvider injection.
 *
 * MCP / function-calling is a PROGRESSIVE ENHANCEMENT. Wrap your app (or a
 * subtree) with <EntityToolProviderContext.Provider> to enable tool execution.
 * When no provider is present, EntityChat / EntityCopilot still render but
 * tool calls appear as unexecuted in the message list.
 *
 * This module also exports useEntityToolProvider() which EntityChat and
 * EntityCopilot use to read the nearest provider. Passing a `toolProvider`
 * prop to those components overrides the context.
 */

import React, { createContext, useContext, type ReactNode } from "react";
import type { EntityToolProvider } from "./types.js";

const EntityToolProviderCtx = createContext<EntityToolProvider | null>(null);

export interface EntityToolProviderProps {
  provider: EntityToolProvider;
  children: ReactNode;
}

/**
 * EntityToolProviderContext — wrap a subtree to make a tool provider available
 * to all EntityChat and EntityCopilot components underneath.
 *
 * @example
 * ```tsx
 * <EntityToolProviderContext provider={myMcpProvider}>
 *   <App />
 * </EntityToolProviderContext>
 * ```
 */
export function EntityToolProviderContext({
  provider,
  children,
}: EntityToolProviderProps): React.ReactElement {
  return (
    <EntityToolProviderCtx.Provider value={provider}>
      {children}
    </EntityToolProviderCtx.Provider>
  );
}

/**
 * useEntityToolProvider — read the nearest injected EntityToolProvider.
 * Returns null when no provider has been injected (MCP is not available).
 */
export function useEntityToolProvider(): EntityToolProvider | null {
  return useContext(EntityToolProviderCtx);
}
