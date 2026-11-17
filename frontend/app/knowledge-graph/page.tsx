import { KnowledgeGraphExplorer } from "../components/knowledge-graph/knowledge-graph-explorer";

export const metadata = {
  title: "Knowledge Graph Engine | TATTVA AI",
  description: "Explore multi-tenant concept graphs, semantic relationships, and entity connectivity.",
};

export default function KnowledgeGraphPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 space-y-6">
      <header className="flex flex-col space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
          <span className="bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
            Knowledge Graph Engine
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono">
            v1.0
          </span>
        </h1>
        <p className="text-sm text-slate-400">
          Discover cross-document relationships, traverse architectural dependencies, and identify factual contradictions.
        </p>
      </header>

      <main className="flex-1">
        <KnowledgeGraphExplorer initialSeed="React" className="h-[750px]" />
      </main>
    </div>
  );
}
