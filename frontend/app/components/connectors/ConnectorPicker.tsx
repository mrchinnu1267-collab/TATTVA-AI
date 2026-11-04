"use client";

import React, { useState, useEffect } from "react";
import { Plug, Check, Power, ExternalLink } from "lucide-react";
import type { PublicMcpConnector } from "../../lib/mcp/types";

interface ConnectorPickerProps {
  isDark: boolean;
  activeConnectorIds: string[];
  onToggleConnector: (id: string) => void;
  onOpenSettings?: () => void;
}

export default function ConnectorPicker({
  isDark,
  activeConnectorIds,
  onToggleConnector,
  onOpenSettings,
}: ConnectorPickerProps) {
  const [connectors, setConnectors] = useState<PublicMcpConnector[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch("/api/connectors")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.connectors) {
          setConnectors(data.connectors);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-3 text-center text-xs text-neutral-400">
        Loading Claude Connectors...
      </div>
    );
  }

  if (connectors.length === 0) {
    return (
      <div className="p-3 text-center space-y-2">
        <Plug className="w-5 h-5 mx-auto text-neutral-500" />
        <p className="text-xs text-neutral-300 font-semibold">No Connectors Found</p>
        <p className="text-[10px] text-neutral-500">
          Configure remote MCP servers in Settings to extend Claude.
        </p>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 underline cursor-pointer"
          >
            Open Connector Settings
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 max-h-72 overflow-y-auto p-2 space-y-1 text-xs">
      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
        <span>Claude Connectors</span>
        <span className="text-purple-400">{activeConnectorIds.length} active</span>
      </div>

      {connectors.map((c) => {
        const isActive = activeConnectorIds.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggleConnector(c.id)}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
              isActive
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40"
                : isDark
                ? "hover:bg-white/5 text-neutral-300 border border-transparent"
                : "hover:bg-black/5 text-neutral-700 border border-transparent"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{c.name}</span>
                {c.readOnly && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300">
                    RO
                  </span>
                )}
              </div>
              <span className="text-[10px] text-neutral-500 block truncate">{c.url}</span>
            </div>

            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                isActive
                  ? "border-purple-500 bg-purple-600 text-white"
                  : "border-neutral-600 bg-transparent"
              }`}
            >
              {isActive && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>
        );
      })}

      {onOpenSettings && (
        <div className="pt-1 mt-1 border-t border-neutral-800 px-1">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-1 text-center text-[10px] font-semibold text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Manage Connectors</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}
