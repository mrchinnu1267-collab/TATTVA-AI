import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { aiOrchestrator } = jiti("../app/lib/ai-orchestrator/index.ts");

(async () => {
  const continuityConversation = [
    { role: "user", content: "We are designing a new project codenamed 'Project Hyperion'." },
    { role: "assistant", content: "Understood. Project Hyperion initiated." },
    { role: "user", content: "Rule Alpha: The primary database must be ScyllaDB for ultra-high throughput writes." },
    { role: "assistant", content: "Constraint recorded: ScyllaDB for primary high-throughput persistence." },
    { role: "user", content: "Rule Beta: The authentication mechanism must be Ed25519 asymmetric signatures." },
    { role: "assistant", content: "Constraint recorded: Ed25519 asymmetric signature authentication." },
    { role: "user", content: "Our principal architect is named Vikram." },
    { role: "assistant", content: "Noted. Principal architect Vikram logged." },
    { role: "user", content: "What is Redis used for?" },
    { role: "assistant", content: "Redis is an in-memory key-value data structure store used as a database, cache, and message broker." },
    { role: "user", content: "What is Apache Kafka?" },
    { role: "assistant", content: "Kafka is a distributed event streaming platform capable of handling trillions of events a day." },
    { role: "user", content: "What is gRPC?" },
    { role: "assistant", content: "gRPC is a high-performance open-source RPC framework utilizing Protocol Buffers over HTTP/2." },
    { role: "user", content: "Explain protobuf serialization." },
    { role: "assistant", content: "Protocol Buffers serialize structured data into compact binary payloads." },
    { role: "user", content: "What is consistent hashing?" },
    { role: "assistant", content: "Consistent hashing minimizes reorganization when nodes are added or removed in a distributed cluster." },
    { role: "user", content: "Explain bloom filters." },
    { role: "assistant", content: "A Bloom filter is a space-efficient probabilistic data structure testing set membership." },
    { role: "user", content: "What is an LSM Tree?" },
    { role: "assistant", content: "Log-Structured Merge-tree optimizes writes by appending to a memtable before flushing to immutable SSTables." },
    { role: "user", content: "Explain Write-Ahead Logging (WAL)." },
    { role: "assistant", content: "WAL ensures atomicity and durability by appending state mutations to disk before writing to data files." },
    { role: "user", content: "What is vector quantization?" },
    { role: "assistant", content: "Vector quantization compresses high-dimensional vectors into discrete codebook indices." },
    { role: "user", content: "Explain HNSW indexing." },
    { role: "assistant", content: "Hierarchical Navigable Small World graphs provide sub-linear approximate nearest neighbor search." },
    { role: "user", content: "What is OpenTelemetry distributed tracing?" },
    { role: "assistant", content: "OpenTelemetry tracks request lifecycles across microservices using spans and context propagation." },
    { role: "user", content: "What is a circuit breaker in distributed systems?" },
    { role: "assistant", content: "Circuit breakers prevent cascading outages by failing fast when an upstream dependency degrades." },
    { role: "user", content: "Explain zero-copy networking." },
    { role: "assistant", content: "Zero-copy avoids CPU memory copying between kernel buffers and user-space sockets." },
    { role: "user", content: "What is TCP slow start?" },
    { role: "assistant", content: "TCP slow start probes network capacity by doubling congestion window size each RTT." },
    { role: "user", content: "What is BGP routing?" },
    { role: "assistant", content: "Border Gateway Protocol routes traffic between autonomous systems across the global Internet." },
    {
      role: "user",
      content: "Final Verification Check: Please recall our exact project codename, Rule Alpha (database), Rule Beta (auth mechanism), and our principal architect's name from our opening turns.",
    },
  ];

  const res = await aiOrchestrator.processRequest({
    messages: continuityConversation,
    context: { userId: "test" },
  });

  console.log("MODEL USED:", res.modelUsed);
  console.log("RESPONSE CONTENT:\n", res.content);

  const t = res.content || "";
  const recalledHyperion = /hyperion/i.test(t);
  const recalledScylla = /scylladb|scylla/i.test(t);
  const recalledEd25519 = /ed25519/i.test(t);
  const recalledVikram = /vikram/i.test(t);

  console.log("RECALL RESULTS:");
  console.log("  - Hyperion:", recalledHyperion);
  console.log("  - ScyllaDB:", recalledScylla);
  console.log("  - Ed25519 :", recalledEd25519);
  console.log("  - Vikram  :", recalledVikram);
})();
