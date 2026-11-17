"use client";

import React, { useState, useEffect } from "react";
import { KnowledgeNode, KnowledgeEdge, Subgraph, Contradiction, TraversalPath } from "../../lib/knowledge-graph/types";

interface KnowledgeGraphExplorerProps {
  initialSeed?: string;
  className?: string;
}

export function KnowledgeGraphExplorer({ initialSeed = "React", className = "" }: KnowledgeGraphExplorerProps) {
  const [seedNode, setSeedNode] = useState(initialSeed);
  const [depth, setDepth] = useState(2);
  const [subgraph, setSubgraph] = useState<Subgraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingestion Modal State
  const [showIngest, setShowIngest] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Path Finder State
  const [pathSource, setPathSource] = useState("");
  const [pathTarget, setPathTarget] = useState("");
  const [traversalResult, setTraversalResult] = useState<TraversalPath | null>(null);
  const [pathLoading, setPathLoading] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchGraph = async (seed: string, d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-graph?seed=${encodeURIComponent(seed)}&depth=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.subgraph) {
        setSubgraph(data.subgraph);
        if (data.subgraph.nodes.length > 0) {
          const matched = data.subgraph.nodes.find(
            (n: KnowledgeNode) => n.name.toLowerCase() === seed.toLowerCase()
          ) || data.subgraph.nodes[0];
          setSelectedNode(matched);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load graph");
    } finally {
      setLoading(false);
    }
  };

  const fetchContradictions = async () => {
    try {
      const res = await fetch(`/api/knowledge-graph/contradictions`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setContradictions(data.contradictions || []);
        }
      }
    } catch (e) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchGraph(seedNode, depth);
    fetchContradictions();
  }, []);

  const handleIngest = async () => {
    if (!ingestText.trim()) return;
    setIngestLoading(true);
    setIngestSuccess(null);
    try {
      const res = await fetch("/api/knowledge-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: ingestText }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestSuccess(
          `Successfully ingested! Created ${data.result.nodesCreated} nodes, ${data.result.edgesCreated} edges.`
        );
        setIngestText("");
        fetchGraph(seedNode, depth);
        fetchContradictions();
      } else {
        setError(data.error || "Ingestion failed");
      }
    } catch (err: any) {
      setError(err.message || "Ingestion request failed");
    } finally {
      setIngestLoading(false);
    }
  };

  const handleFindPath = async () => {
    if (!pathSource.trim() || !pathTarget.trim()) return;
    setPathLoading(true);
    setTraversalResult(null);
    try {
      const res = await fetch("/api/knowledge-graph/traverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: pathSource, target: pathTarget }),
      });
      const data = await res.json();
      if (data.success && data.found) {
        setTraversalResult(data.path);
      } else {
        setTraversalResult(null);
        setError(`No path found between ${pathSource} and ${pathTarget}.`);
      }
    } catch (err: any) {
      setError(err.message || "Path finding failed");
    } finally {
      setPathLoading(false);
    }
  };

  const filteredNodes = subgraph?.nodes.filter((n) => {
    if (typeFilter === "all") return true;
    return n.type === typeFilter;
  }) || [];

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl border border-slate-800 p-4 space-y-4 ${className}`}>
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-teal-400">Knowledge Graph</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
            Tenant Isolated
          </span>
          {contradictions.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
              {contradictions.length} Contradiction{contradictions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search entity..."
            value={seedNode}
            onChange={(e) => setSeedNode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchGraph(seedNode, depth)}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-teal-500"
          />
          <button
            onClick={() => fetchGraph(seedNode, depth)}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition"
          >
            {loading ? "Exploring..." : "Explore"}
          </button>
          <button
            onClick={() => setShowIngest(!showIngest)}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            + Ingest Content
          </button>
        </div>
      </div>

      {/* Ingestion Panel */}
      {showIngest && (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300">Ingest Knowledge Text or Documentation</span>
            <button onClick={() => setShowIngest(false)} className="text-xs text-slate-500 hover:text-slate-300">
              Close
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="Paste technical documentation, architectural notes, or release statements..."
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
            className="w-full text-xs p-2 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-teal-500 text-slate-200"
          />
          <div className="flex items-center justify-between">
            {ingestSuccess && <span className="text-xs text-emerald-400">{ingestSuccess}</span>}
            <button
              onClick={handleIngest}
              disabled={ingestLoading || !ingestText.trim()}
              className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded font-medium"
            >
              {ingestLoading ? "Extracting Entities..." : "Extract & Ingest"}
            </button>
          </div>
        </div>
      )}

      {/* Traversal / Path Finder Panel */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900/50 rounded-lg text-xs">
        <span className="text-slate-400">Pathfinder:</span>
        <input
          type="text"
          placeholder="Source (e.g. Next.js)"
          value={pathSource}
          onChange={(e) => setPathSource(e.target.value)}
          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-teal-500 w-32"
        />
        <span className="text-slate-500">to</span>
        <input
          type="text"
          placeholder="Target (e.g. PostgreSQL)"
          value={pathTarget}
          onChange={(e) => setPathTarget(e.target.value)}
          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-teal-500 w-32"
        />
        <button
          onClick={handleFindPath}
          disabled={pathLoading || !pathSource || !pathTarget}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded border border-slate-700"
        >
          {pathLoading ? "Tracing..." : "Find Path"}
        </button>
        {traversalResult && (
          <span className="text-teal-300 font-medium ml-2">
            ✓ {traversalResult.explanation}
          </span>
        )}
      </div>

      {/* Main Content Area: Nodes Grid & Details Pane */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Node Explorer Cards */}
        <div className="md:col-span-2 flex flex-col space-y-2 overflow-y-auto max-h-96 pr-2">
          {/* Filters */}
          <div className="flex items-center space-x-2 text-xs text-slate-400 pb-1">
            <span>Filter:</span>
            {["all", "framework", "language", "database", "architecture", "tool"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded capitalize ${
                  typeFilter === t ? "bg-teal-700 text-white font-medium" : "hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredNodes.map((n) => {
              const isSelected = selectedNode?.id === n.id;
              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedNode(n)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-teal-950/60 border-teal-500 shadow-lg shadow-teal-950/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-100 truncate">{n.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {n.description || "Identified knowledge entity"}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>Conf: {(n.confidence * 100).toFixed(0)}%</span>
                    {n.properties?.version && <span>v{n.properties.version}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredNodes.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No entities found matching the current filter. Try ingesting content or exploring another entity.
            </div>
          )}
        </div>

        {/* Selected Entity Details & Relations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col space-y-3 overflow-y-auto max-h-96">
          {selectedNode ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-teal-300">{selectedNode.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                    {selectedNode.type}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{selectedNode.description}</p>
                {selectedNode.aliases.length > 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    <span className="text-slate-500">Aliases:</span> {selectedNode.aliases.join(", ")}
                  </p>
                )}
              </div>

              {/* Connected Relationships */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Connected Relationships</span>
                {subgraph?.edges
                  .filter((e) => e.sourceNodeId === selectedNode.id || e.targetNodeId === selectedNode.id)
                  .map((e) => {
                    const isSource = e.sourceNodeId === selectedNode.id;
                    const otherNodeId = isSource ? e.targetNodeId : e.sourceNodeId;
                    const otherNode = subgraph.nodes.find((n) => n.id === otherNodeId);
                    return (
                      <div key={e.id} className="p-2 bg-slate-950 rounded border border-slate-850 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-teal-400 font-medium">
                            {isSource ? `→ [${e.relation}] →` : `← [${e.relation}] ←`} {otherNode?.name || "Unknown"}
                          </span>
                          <span className="text-[10px] text-slate-500">{(e.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {e.evidenceSnippet && (
                          <p className="text-[10px] text-slate-400 italic">"{e.evidenceSnippet}"</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select an entity to view relationships, properties, and evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
