import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Html } from "@react-three/drei";

/**
 * 5 layers (0..4)
 * - each layer has: name, meta, color
 */
const level0 = -1.2;
const level1 = 0;
const level2 = 1.35;
const level3 = 2.0;
const level4 = 3.0;

const LAYERS = {
  0: {
    name: "L0 — Protocol & Standards",
    color: "#22c55e",
    meta:
      "Standards d’interopérabilité (protocoles, formats, conventions) qui réduisent le coût d’intégration et déverrouillent l’écosystème agent↔tools↔data.",
  },
  1: {
    name: "L1 — Model & Agent Runtime (Core AI)",
    color: "#60a5fa",
    meta:
      "Capacités fondamentales : modèles, exécution agentique, raisonnement, orchestration. Le moteur qui transforme un intent en plan + actions.",
  },
  2: {
    name: "L2 — Tooling & Workflow Surface (Product Layer)",
    color: "#f59e0b",
    meta:
      "Interface opérable (cowork, plugins, IDE agents) où l’agent devient une UI de travail et remplace des écrans SaaS par des actions automatisées.",
  },
  3: {
    name: "L3 — Distribution & Platforms",
    color: "#a78bfa",
    meta:
      "Canaux de diffusion (data platforms, hyperscalers, suites internes) qui packagent l’agent et le mettent au contact des clients via bundles, marketplaces ou déploiements internes.",
  },
  4: {
    name: "L4 — Enterprise Adoption & Regulated Deployment",
    color: "#ef4444",
    meta:
      "Déploiements massifs (SI/consulting, grands comptes, défense/régulé) avec gouvernance, conformité, sécurité, contrôle des risques et industrialisation.",
  },
};

const NODES = [
  // L0 — Protocol / Standards
  {
    id: "mcp",
    layer: 0,
    label: "MCP / AAIF\n(standard layer)",
    pos: [0, level0, 0],
    size: [2.4, 0.35, 1.2],
    source: {
        date: "2025-12-09",
        link: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation",
        metric: "Linux Foundation Announces the Formation of the Agentic AI Foundation (AAIF), Anchored by New Project Contributions Including Model Context Protocol (MCP), goose and AGENTS"
      },
  },

  // L1 — Core AI runtime
  { id: "claude", layer: 1, label: "Claude\n(models)", pos: [0, 0, 0], size: [1.6, 0.45, 1.0] },
  { id: "ccode", layer: 1, label: "Claude Code", pos: [-2.8, 1.1, -0.8], size: [1.4, 0.4, 0.9] },

  // L2 — Tooling / workflow UI
  { id: "cowork", layer: 2, label: "Cowork + Plugins\n(open-source)", pos: [0, 1.35, 0], size: [2.2, 0.5, 1.2] },

  // L3 — Distribution
  { id: "snow", layer: 3, label: "Snowflake\n$200M", pos: [2.9, 2.0, -0.6], size: [1.6, 0.45, 1.0],
    source: {
        date: "2025-12-04",
        link: "https://techcrunch.com/2025/12/04/anthropic-signs-200m-deal-to-bring-its-llms-to-snowflakes-customers/",
        metric: "Anthropic signs $200M deal to bring its LLMs to Snowflake’s customers"
      } 
   },
  { id: "msft", layer: 3, label: "Microsoft internal\n(Claude Code)", pos: [-3.2, 2.0, 0.9], size: [1.8, 0.45, 1.1],
    source: {
        date: "2026-01-26",
        link: "https://www.webpronews.com/microsofts-claude-code-gamble-pitting-rival-ai-against-its-own-copilot-empire/",
        metric: "Microsoft’s Claude Code Gamble: Pitting Rival AI Against Its Own Copilot Empire"
      }
   },

  // L4 — Adoption / Regulated deployment
  { id: "deloitte", layer: 4, label: "Deloitte\n470k seats", pos: [-1.6, 3.0, 1.6], size: [1.8, 0.5, 1.1],
    source: {
        date: "2025-10-25",
        link: "https://www.cnbc.com/2025/10/06/anthropic-deloitte-enterprise-ai.html",
        metric: "Anthropic lands its biggest enterprise deployment ever with Deloitte deal"
      }
   },
  { id: "cognizant", layer: 4, label: "Cognizant\n350k seats", pos: [1.8, 3.0, 1.6], size: [1.9, 0.5, 1.1],
    source: {
        date: "2025-11-04",
        link: "https://www.anthropic.com/news/cognizant-partnership",
        metric: "Cognizant will make Claude available to 350,000 employees, accelerating enterprise AI adoption and internal transformation"
      }
   },
  { id: "dod", layer: 4, label: "DoD\n$200M ceiling", pos: [0.0, 3.3, -2.0], size: [2.1, 0.55, 1.1],
    source: {
        date: "2025-07-14",
        link: "https://www.cnbc.com/2025/07/14/anthropic-google-openai-xai-granted-up-to-200-million-from-dod.html",
        metric: "Anthropic, Google, OpenAI and xAI granted up to $200 million for AI work from Defense Department"
      }
   },
];

const EDGES = [
  ["mcp", "claude"],
  ["claude", "cowork"],
  ["claude", "ccode"],
  ["cowork", "snow"],
  ["ccode", "msft"],
  ["cowork", "deloitte"],
  ["cowork", "cognizant"],
  ["claude", "dod"],
];

function LegendHUD() {
  const [minimized, setMinimized] = useState(false);

  // Inverse order: L4 top ... L0 bottom
  const layerKeys = useMemo(
    () => Object.keys(LAYERS).map(Number).sort((a, b) => b - a),
    []
  );

  return (
    <div
      style={{
        position: "absolute",
        right: 14,
        bottom: 14,
        width: minimized ? 240 : 380,
        maxWidth: `min(${minimized ? 240 : 380}px, calc(100vw - 28px))`,
        background: "rgba(0,0,0,0.72)",
        color: "white",
        borderRadius: 14,
        padding: minimized ? "10px 10px 9px" : "12px 12px 10px",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        pointerEvents: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: minimized ? 6 : 10,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.2 }}>
          Layers legend
        </div>

        <button
          onClick={() => setMinimized((v) => !v)}
          style={{
            appearance: "none",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            borderRadius: 10,
            padding: "6px 9px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            lineHeight: 1,
          }}
          title={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? "▾" : "▴"}
        </button>
      </div>

      {/* Minimized = compact list (color + label only). Expanded = label + meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: minimized ? 7 : 10 }}>
        {layerKeys.map((k) => {
          const l = LAYERS[k];
          return (
            <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: l.color,
                  marginTop: 4,
                  flex: "0 0 auto",
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.12)",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: minimized ? 0 : 3 }}>
                  {l.name}
                </div>
                {!minimized && (
                  <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.25 }}>{l.meta}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!minimized && (
        <div style={{ marginTop: 10, fontSize: 10.5, opacity: 0.75, lineHeight: 1.25 }}>
          Copyright : francois.bonnard@arrow.com
        </div>
      )}
    </div>
  );
}

function NodeBox({ node }) {
  const [hover, setHover] = useState(false);
  const leaveTimeout = useRef(null);
  const isPointerOverTooltip = useRef(false);

  const layerInfo = LAYERS[node.layer] ?? { name: "Layer ?", color: "#9ca3af", meta: "" };

  return (
    <group position={node.pos}>
      <mesh
        onPointerEnter={() => {
          if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
          isPointerOverTooltip.current = false;
          setHover(true);
        }}
        onPointerLeave={() => {
          if (!isPointerOverTooltip.current) {
            leaveTimeout.current = setTimeout(() => setHover(false), 200);
          }
        }}
      >
        <boxGeometry args={node.size} />
        <meshStandardMaterial color={layerInfo.color} metalness={0.2} roughness={0.65} />
      </mesh>

      <Text
        position={[0, node.size[1] / 2 + 0.32, 0]}
        fontSize={0.22}
        maxWidth={2.6}
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>

      {hover && (
        <Html distanceFactor={10} position={[0, node.size[1] / 2 + 0.7, 0]}>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(0,0,0,0.78)",
              color: "white",
              borderRadius: 10,
              fontSize: 12,
              width: 280,
              overflow: "hidden",
              boxSizing: "border-box",
              border: `1px solid ${layerInfo.color}`,
            }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              isPointerOverTooltip.current = true;
              if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
              setHover(true);
            }}
            onPointerLeave={() => {
              isPointerOverTooltip.current = false;
              setHover(false);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: layerInfo.color,
                  flex: "0 0 auto",
                }}
              />
              <div style={{ fontWeight: 800, fontSize: 13 }}>{node.id}</div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{layerInfo.name}</div>
              <div style={{ opacity: 0.92, lineHeight: 1.25 }}>{layerInfo.meta}</div>
            </div>

            {node.source && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 8 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ opacity: 0.8 }}>Date:</span> {node.source.date}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ opacity: 0.8 }}>Link:</span>{" "}
                  <a
                    href={node.source.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#7dd3fc",
                      textDecoration: "underline",
                      cursor: "pointer",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-all",
                    }}
                  >
                    {node.source.link}
                  </a>
                </div>
                <div>
                  <span style={{ opacity: 0.8 }}>Metric:</span> {node.source.metric}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function ShockwaveRing({ radius = 6, y = level0 }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    const t = (ref.current.userData.t = (ref.current.userData.t || 0) + dt);
    const s = 1 + (t % 2.2) * 0.9;
    ref.current.scale.set(s, 1, s);
    ref.current.material.opacity = THREE.MathUtils.clamp(0.35 - (s - 1) * 0.22, 0, 0.35);
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <ringGeometry args={[radius - 0.08, radius + 0.08, 64]} />
      <meshBasicMaterial transparent opacity={0.25} />
    </mesh>
  );
}

function ImpactRing({ radius = 6, y = level0 }) {
  const sectors = useMemo(
    () => [
      { label: "Legal / Info", angle: 0.3 },
      { label: "Ads / Agency", angle: 1.6 },
      { label: "BPO / CX", angle: 3.0 },
      { label: "IT Services", angle: 4.5 },
    ],
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
        <torusGeometry args={[radius, 0.06, 12, 96]} />
        <meshStandardMaterial metalness={0.1} roughness={0.7} color={"#9ca3af"} />
      </mesh>

      {sectors.map((s) => (
        <Text
          key={s.label}
          position={[
            Math.cos(s.angle) * (radius + 0.9),
            y + 0.25,
            Math.sin(s.angle) * (radius + 0.9),
          ]}
          fontSize={0.22}
          anchorX="center"
          anchorY="middle"
        >
          {s.label}
        </Text>
      ))}
    </group>
  );
}

function Edges({ nodesById }) {
  return (
    <>
      {EDGES.map(([a, b]) => (
        <Line key={`${a}-${b}`} points={[nodesById[a].pos, nodesById[b].pos]} lineWidth={1} />
      ))}
    </>
  );
}

function Scene() {
  const nodesById = useMemo(() => {
    const m = {};
    for (const n of NODES) m[n.id] = n;
    return m;
  }, []);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 6]} intensity={1.1} />

      <ImpactRing />
      <ShockwaveRing />

      <Edges nodesById={nodesById} />
      {NODES.map((n) => (
        <NodeBox key={n.id} node={n} />
      ))}

      <OrbitControls makeDefault />
    </>
  );
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas camera={{ position: [9, 6, 10], fov: 45 }}>
        <Scene />
      </Canvas>

      {/* HUD overlay */}
      <LegendHUD />
    </div>
  );
}