import { useState } from "react";
import { Server, Database, Layers, ShieldCheck, Activity, BrainCircuit, ExternalLink, ArrowRight } from "lucide-react";

interface ArchNode {
  id: string;
  name: string;
  type: "inbound" | "gateway" | "app" | "cache" | "database" | "ai";
  description: string;
  metrics: string;
  ports: string;
  tech: string;
  details: string[];
}

export default function ArchitectureMap() {
  const [selectedNode, setSelectedNode] = useState<string>("app");

  const nodes: ArchNode[] = [
    {
      id: "client",
      name: "React SPA Client",
      type: "inbound",
      tech: "React 19, Tailwind CSS, Lucide, Recharts",
      ports: "80 / 443 -> 3000",
      metrics: "Load Time: ~1.2s | Client State: Local/Context",
      description: "Rich SPA interface utilizing custom e-signature pads, fingerprint simulators, and a robust status tracking engine.",
      details: [
        "Resolves tenant subdomains (e.g. tenant-a.notary.saas) to inject branding.",
        "Draws custom canvas biometric signatures and exports standard vectors.",
        "Polls REST endpoints & opens WebSocket connections for live Queue Calling.",
        "Securely stores JWT in HttpOnly Cookies or secure sessionStorage."
      ]
    },
    {
      id: "gateway",
      name: "Nginx Gateway Router",
      type: "gateway",
      tech: "Nginx Docker Image",
      ports: "80 / 443 (External)",
      metrics: "Conns: 5K/sec | RAM: 120MB",
      description: "Reverse-proxy handling SSL termination, multi-tenant subdomain redirection, and rate-limiting rules.",
      details: [
        "Routes requests recursively: extracts host (tenant) from request header.",
        "Proxies static SPA files directly and shifts /api endpoints to the Spring Boot cluster.",
        "Implements IP rate limiting (limit_req) to thwart massive ticketing script attacks."
      ]
    },
    {
      id: "app",
      name: "Spring Boot App Cluster",
      type: "app",
      tech: "Java 21, Spring Boot 3.4, Spring Security",
      ports: "8080 (Internal)",
      metrics: "Heap: 1.2GB / 2.0GB | App Instances: Statelessly Scalable (3x)",
      description: "Stateful-free secure API gateways. Implements JWT filters, tenant-context interceptors, OCR processing pipelines, and event dispatchers.",
      details: [
        "Interceptors parse 'X-Tenant-ID' or HTTP host headers on every input request.",
        "Stores tenant scope in custom ThreadLocal 'TenantContext' for thread safety.",
        "Secures APIs with Spring Security + JWT authentication filters, guarding tenant boundaries.",
        "Coordinates document signing, audit trailing, and queue workflows asynchronously."
      ]
    },
    {
      id: "redis",
      name: "Redis Caching & Messager",
      type: "cache",
      tech: "Redis 7.2 Secure Cluster",
      ports: "6379 (Internal)",
      metrics: "Hit Rate: 94.6% | Eviction: Volatile-LRU | Mem: 256MB",
      description: "High-speed caching proxy. Stores live tickets, active teller counters, and hosts token-bucket rate limit lists.",
      details: [
        "Caches active queue tickets for real-time dashboard renders (bypassing persistent DB lookups).",
        "Acts as a Redis Pub/Sub broker to dispatch vocal ticket call alerts to receptionist dashboards.",
        "Locks concurrent check-ins via Redis distributed lock (Redlock) to eliminate double-booking."
      ]
    },
    {
      id: "database",
      name: "PostgreSQL Database Engine",
      type: "database",
      tech: "PostgreSQL 16 Multi-Tenant Schema",
      ports: "5432 (Internal)",
      metrics: "Active Pools: 45/100 | TPS: ~800 | DB Size: 4.8 GB",
      description: "Durable multi-tenant isolated database. Each tenant maps to a dedicated logical PostgreSQL schema or leverages row-level partitioning.",
      details: [
        "Spring Boot Dynamic Routing DataSource evaluates active TenantContext on every JPA transaction query.",
        "Isolates tables per schema to satisfy strict data residency compliance (GDPR, HIPAA).",
        "Indexes document hash fields, date ranges, and biometric minutiae arrays for 10ms audit lookups."
      ]
    },
    {
      id: "ai",
      name: "Google Gemini AI Cluster",
      type: "ai",
      tech: "@google/genai Cloud Service",
      ports: "HTTPS Outgoing",
      metrics: "Token Latency: ~400ms | Accuracy: Legal Grade",
      description: "Processes document structural OCR parsing, draft generation (power of attorney, contracts), and technical AI query support.",
      details: [
        "Parses passport and driver license photos into strict multi-tenant JSON schemas.",
        "Generates highly structured Markdown drafts of affidavits under state jurisdictions.",
        "Validates QR-checksums and flags compliance risks inside legal templates."
      ]
    }
  ];

  const currentNode = nodes.find(n => n.id === selectedNode) || nodes[2];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl overflow-hidden h-full flex flex-col" id="architecture-map">
      <div className="mb-6">
        <h3 className="text-xl font-sans font-medium tracking-tight text-white flex items-center gap-2">
          <Layers className="text-cyan-400 w-5 h-5" />
          Interactive System Topology
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Click infrastructure components to inspect standard port maps, container specs, and multi-tenant code loops.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        {/* SVG Map (Left 3 cols) */}
        <div className="lg:col-span-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative min-h-[350px]">
          {/* Legend */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Client</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Router</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Core App</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Cache</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Database</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Cloud AI</span>
          </div>

          <div className="w-full max-w-md h-full relative flex flex-col justify-between items-center py-6 gap-3">
            {/* INBOUND (Client) */}
            <button
              id="node-client"
              onClick={() => setSelectedNode("client")}
              className={`w-44 px-3 py-2 rounded-lg border flex items-center gap-2.5 transition-all outline-none ${
                selectedNode === "client" 
                  ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/20 scale-[1.03] shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/50"
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-medium font-sans">React Client SPA</p>
                <p className="text-[9px] font-mono opacity-65">Port: 80/443</p>
              </div>
            </button>

            {/* Ingress Gateway Router */}
            <div className="text-slate-600 animate-pulse text-[10px] flex items-center justify-center gap-1">
              <span>Tenant Subdomains Resolving</span>
              <ArrowRight className="w-3 h-3 rotate-90" />
            </div>

            <button
              id="node-gateway"
              onClick={() => setSelectedNode("gateway")}
              className={`w-44 px-3 py-2 rounded-lg border flex items-center gap-2.5 transition-all outline-none ${
                selectedNode === "gateway" 
                  ? "bg-amber-500/15 border-amber-400 text-amber-300 ring-2 ring-amber-500/20 scale-[1.03] shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-medium font-sans">Nginx Gateway</p>
                <p className="text-[9px] font-mono opacity-65">Docker: Proxy</p>
              </div>
            </button>

            {/* Arrow Gateway -> App */}
            <div className="text-slate-600 animate-pulse text-[10px] flex items-center justify-center gap-1">
              <span>Token Interceptor / Session Path</span>
              <ArrowRight className="w-3 h-3 rotate-90" />
            </div>

            {/* Core Application */}
            <button
              id="node-app"
              onClick={() => setSelectedNode("app")}
              className={`w-48 px-4 py-2.5 rounded-lg border flex items-center gap-3 transition-all outline-none ${
                selectedNode === "app" 
                  ? "bg-blue-500/20 border-blue-400 text-blue-300 ring-2 ring-blue-500/20 scale-[1.03] shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-blue-500/50"
              }`}
            >
              <Server className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-semibold font-sans">Spring Boot Core</p>
                <p className="text-[9px] font-mono opacity-65">JVM Container | Port: 8080</p>
              </div>
            </button>

            {/* Dual Fork Database & Cache */}
            <div className="w-full flex justify-between items-center px-4 max-w-sm mt-1">
              <div className="text-slate-600 flex flex-col items-center flex-1">
                <p className="text-[8px] font-mono mb-0.5">Sessions/Rate Limiting</p>
                <ArrowRight className="w-3 h-3 rotate-[135deg]" />
              </div>
              <div className="text-slate-600 flex flex-col items-center flex-1">
                <p className="text-[8px] font-mono mb-0.5">Audit/OCR Requests</p>
                <ArrowRight className="w-3 h-3 rotate-[90deg]" />
              </div>
              <div className="text-slate-600 flex flex-col items-center flex-1">
                <p className="text-[8px] font-mono mb-0.5">Physical Isolation Schema</p>
                <ArrowRight className="w-3 h-3 rotate-[45deg]" />
              </div>
            </div>

            {/* Side-by-side elements */}
            <div className="w-full flex justify-between items-center gap-2 max-w-md">
              {/* Redis Cache */}
              <button
                id="node-redis"
                onClick={() => setSelectedNode("redis")}
                className={`flex-1 px-2 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all outline-none text-[11px] ${
                  selectedNode === "redis" 
                    ? "bg-rose-500/15 border-rose-400 text-rose-300 ring-2 ring-rose-500/20 scale-[1.03] shadow-[0_0_15px_rgba(244,63,94,0.1)]" 
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-rose-500/50"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div className="text-left overflow-hidden">
                  <p className="font-sans font-medium truncate">Redis Caching</p>
                  <p className="text-[8px] font-mono opacity-65">Port: 6379</p>
                </div>
              </button>

              {/* Gemini AI */}
              <button
                id="node-ai"
                onClick={() => setSelectedNode("ai")}
                className={`flex-1 px-2 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all outline-none text-[11px] ${
                  selectedNode === "ai" 
                    ? "bg-indigo-500/15 border-indigo-400 text-indigo-300 ring-2 ring-indigo-500/20 scale-[1.03] shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/50"
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div className="text-left overflow-hidden">
                  <p className="font-sans font-medium truncate">Gemini AI</p>
                  <p className="text-[8px] font-mono opacity-65">REST Cloud</p>
                </div>
              </button>

              {/* DB SQL */}
              <button
                id="node-database"
                onClick={() => setSelectedNode("database")}
                className={`flex-1 px-2 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all outline-none text-[11px] ${
                  selectedNode === "database" 
                    ? "bg-purple-500/20 border-purple-400 text-purple-300 ring-2 ring-purple-500/20 scale-[1.03] shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/50"
                }`}
              >
                <Database className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="text-left overflow-hidden">
                  <p className="font-sans font-medium truncate">Postgres SQL</p>
                  <p className="text-[8px] font-mono opacity-65">Port: 5432</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Node Specs Description (Right 2 cols) */}
        <div className="lg:col-span-2 flex flex-col justify-between h-full bg-slate-950/40 border border-slate-800/80 rounded-xl p-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-lg ${
                currentNode.type === "inbound" ? "bg-emerald-505/10 border border-emerald-500/30 text-emerald-400" :
                currentNode.type === "gateway" ? "bg-amber-500/10 border border-amber-500/30 text-amber-400" :
                currentNode.type === "app" ? "bg-blue-500/10 border border-blue-500/30 text-blue-400" :
                currentNode.type === "cache" ? "bg-rose-500/10 border border-rose-500/30 text-rose-400" :
                currentNode.type === "database" ? "bg-purple-500/10 border border-purple-500/30 text-purple-400" :
                "bg-indigo-500/10 border border-indigo-500/30 text-indigo-400"
              }`}>
                {currentNode.type === "inbound" && <Activity className="w-5 h-5" />}
                {currentNode.type === "gateway" && <ShieldCheck className="w-5 h-5" />}
                {currentNode.type === "app" && <Server className="w-5 h-5" />}
                {currentNode.type === "cache" && <Layers className="w-5 h-5" />}
                {currentNode.type === "database" && <Database className="w-5 h-5" />}
                {currentNode.type === "ai" && <BrainCircuit className="w-5 h-5" />}
              </span>
              <div>
                <h4 className="text-base font-sans font-medium text-white">{currentNode.name}</h4>
                <p className="text-xs font-mono text-slate-400">{currentNode.tech}</p>
              </div>
            </div>

            <hr className="border-slate-800" />

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800/60 p-2.5 rounded">
                <span className="text-[10px] text-slate-500 block font-mono">PORTS</span>
                <span className="font-mono text-slate-300 font-medium">{currentNode.ports || "N/A"}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-2.5 rounded">
                <span className="text-[10px] text-slate-500 block font-mono">LIVE TELEMETRY</span>
                <span className="font-mono text-slate-300 font-medium truncate block">{currentNode.metrics}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 hover:bg-slate-900 transition-colors p-3 rounded-lg border border-slate-800/50">
              {currentNode.description}
            </p>

            <div className="space-y-2">
              <h5 className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold">SAAS OPERATION LOOP & HOOKS</h5>
              <ul className="text-xs space-y-2 text-slate-300">
                {currentNode.details.map((detail, index) => (
                  <li key={index} className="flex gap-2 items-start leading-relaxed p-1 hover:bg-slate-900/40 rounded transition-colors">
                    <span className="text-cyan-400 select-none">✦</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> Connected
            </span>
            <span className="font-mono">Node ID: {currentNode.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
