import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Html } from "@react-three/drei";
import { STOCKS, getStockPriceBounds } from "./stockData";

/**
 * 6 layers (0..5)
 * - each layer has: name, meta, color
 */

const level0 = -1.2;
const level1 = 0;
const level2 = 1.35;
const level3 = 2.0;
const level4 = 3.0;
const level5 = 4.0;

// Timeline: 04 oct 2022 → 04 oct 2026, sur un layer sous layer0
const TIMELINE_START = new Date(2022, 9, 4); // mois 0-indexé
const TIMELINE_END = new Date(2026, 9, 4);
const TIMELINE_Y = -2.2; // sous level0 (-1.2)
const TIMELINE_Z_MIN = -8;
const TIMELINE_Z_MAX = 8;
const TIMELINE_LENGTH = TIMELINE_Z_MAX - TIMELINE_Z_MIN;
const RING_RADIUS = TIMELINE_LENGTH / 2; // diamètre = longueur timeline
const RING_Y = TIMELINE_Y - 1; // hauteur des cercles ImpactRing et ShockwaveRing

// Plan StockMarket (YZ) — évolution des cours, timeline synchronisée
const STOCK_PLANE_X = -10;
const STOCK_Y_RANGE = 6; // hauteur du graphique en unités 3D

function dateToTimelineZ(dateStrOrDate) {
  const d = dateStrOrDate instanceof Date ? dateStrOrDate : new Date(dateStrOrDate);
  const t = (d - TIMELINE_START) / (TIMELINE_END - TIMELINE_START);
  return TIMELINE_Z_MAX - THREE.MathUtils.clamp(t, 0, 1) * (TIMELINE_Z_MAX - TIMELINE_Z_MIN);
}

function priceToY(price, priceMin, priceMax) {
  const t = (price - priceMin) / (priceMax - priceMin);
  return RING_Y + THREE.MathUtils.clamp(t, 0, 1) * STOCK_Y_RANGE;
}

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
  5: {
    name: "L5 — Market Analysis",
    color: "#06b6d4",
    meta:
      "Analyses de marché et prédictions sur l'adoption, la productivité et les risques des projets IA agentique.",
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

  {
    id: "mcp",
    layer: 0,
    label: "MCP",
    pos: [0, level0, 0],
    size: [2.4, 0.35, 1.2],
    source: {
        date: "2024-11-25",
        link: "https://www.anthropic.com/news/model-context-protocol",
        metric: "Introducing the Model Context Protocol"
      },
  },
  // L1 — Core AI runtime
  { id: "Claude 3 Opus", layer: 1, label: "Claude 3 Opus", pos: [0, 0, 0], size: [1.6, 0.45, 1.0],
    source: {
      date: "2024-03-01",
      link: "",
      metric: "Claude 3 Opus"
    },
   },
  { id: "Claude 3.5 Sonnet", layer: 1, label: "Claude 3.5 Sonnet", pos: [0, 0, 0], size: [1.6, 0.45, 1.0],
    source: {
      date: "2024-06-01",
      link: "",
      metric: "Claude 3.5 Sonnet"
    },
   },
  { id: "Claude 4.5 Sonnet", layer: 1, label: "Claude 4.5 Sonnet", pos: [0, 0, 0], size: [1.6, 0.45, 1.0],
    source: {
      date: "2025-09-01",
      link: "",
      metric: "Claude 4.5 Sonnet"
    },
   },
  { id: "Claude 4.5 Opus", layer: 1, label: "Claude 4.5 Opus", pos: [0, 0, 0], size: [1.6, 0.45, 1.0],
    source: {
      date: "2025-11-01",
      link: "",
      metric: "Claude 4.5 Opus"
    },
   },
   { id: "Claude 4.6 Opus", layer: 1, label: "Claude 4.6 Opus", pos: [0, 0, 0], size: [1.6, 0.45, 1.0],
    source: {
      date: "2026-02-16",
      link: "https://xpert.digital/en/saas-apocalypse-on-wall-street/",
      metric: "SaaS Apocalypse"
    },
   },


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

  // L5 — Market Analysis
  {
    id: "gartner",
    layer: 5,
    label: "2027 : 40% agentic AI projects cancelled",
    pos: [-2.5, level5, 0],
    size: [2.0, 0.45, 1.0],
    source: {
      date: "2025-06-25",
      link: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027",
      metric: "40% projets IA agentique annulés d'ici 2027",
    },
  },
  {
    id: "goldman",
    layer: 5,
    label: "Goldman Sachs : Agents to boost productivity",
    pos: [2.5, level5, 0],
    size: [2.2, 0.45, 1.0],
    source: {
      date: "2025-07-03",
      link: "https://www.goldmansachs.com/insights/articles/ai-agents-to-boost-productivity-and-size-of-software-market",
      metric: "AI Agents to Boost Productivity and Size of Software Market",
    },
  },
];

function VisibilityHUD({ showAxesHelper, setShowAxesHelper, showGrid, setShowGrid, showStockMarket, setShowStockMarket }) {
  const [minimized, setMinimized] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        bottom: 14,
        width: minimized ? 180 : 220,
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
          Visibilité
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

      {!minimized && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={showAxesHelper}
              onChange={(e) => setShowAxesHelper(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            Repère X, Y, Z
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            Grille XZ
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={showStockMarket}
              onChange={(e) => setShowStockMarket(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            Stock Market
          </label>
        </div>
      )}
    </div>
  );
}

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

function ShockwaveRing({ radius = 6, y = RING_Y }) {
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

function ImpactRing({ radius = 6, y = RING_Y }) {
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

function Timeline() {
  const ticks = useMemo(() => {
    const out = [];
    for (let y = 2022; y <= 2026; y++) {
      const d = new Date(y, 9, 4);
      const z = dateToTimelineZ(d);
      out.push({ year: y, z });
    }
    return out;
  }, []);

  return (
    <group position={[0, TIMELINE_Y, 0]}>
      <Line
        points={[[0, 0, TIMELINE_Z_MIN], [0, 0, TIMELINE_Z_MAX]]}
        color="#64748b"
        lineWidth={1.5}
      />
      {ticks.map(({ year, z }) => (
        <group key={year}>
          <Line points={[[0, 0, z], [0, 0.15, z]]} color="#94a3b8" lineWidth={1} />
          <Text position={[0, -0.35, z]} fontSize={0.18} anchorX="center" anchorY="middle">
            {year}
          </Text>
        </group>
      ))}
      <Text position={[0, 0.25, TIMELINE_Z_MAX + 0.5]} fontSize={0.16} anchorX="center" anchorY="middle">
        Oct 2022
      </Text>
      <Text position={[0, 0.25, TIMELINE_Z_MIN - 0.5]} fontSize={0.16} anchorX="center" anchorY="middle">
        Oct 2026
      </Text>
    </group>
  );
}

const AXES_LENGTH = 4;
const GRID_SIZE = 20;
const GRID_DIVISIONS = 20;

function StockMarketPlane() {
  const { min: priceMin, max: priceMax } = useMemo(() => getStockPriceBounds(), []);

  const stockCurves = useMemo(() => {
    return Object.entries(STOCKS).map(([name, { color, data }]) => ({
      name,
      color,
      points: data.map(({ date, value }) => [
        STOCK_PLANE_X,
        priceToY(value, priceMin, priceMax),
        dateToTimelineZ(date),
      ]),
    }));
  }, [priceMin, priceMax]);

  const planeWidth = TIMELINE_Z_MAX - TIMELINE_Z_MIN;
  const planeHeight = STOCK_Y_RANGE;

  return (
    <group position={[0, 0, 0]}>
      {/* Plan semi-transparent YZ (rotation pour plan YZ : normal = X) */}
      <mesh
        position={[STOCK_PLANE_X, RING_Y + planeHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[planeWidth, planeHeight]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Courbes par stock */}
      {stockCurves.map(({ name, color, points }) => (
        <Line key={name} points={points} color={color} lineWidth={2} />
      ))}
      {/* Labels (noms des stocks) — au début de chaque courbe, dans le plan YZ (normale X) */}
      {stockCurves.map(({ name, color, points }) => {
        const [x, y, z] = points[0];
        return (
          <Text
            key={name}
            position={[x+0.1, y-0.2, z]}
            rotation={[0, +Math.PI / 2, 0]}
            fontSize={0.18}
            anchorX="right"
            anchorY="middle"
            color={color}
          >
            {name}
          </Text>
        );
      })}
      {/* Échelle prix */}
      <Text
        position={[STOCK_PLANE_X, RING_Y + planeHeight + 0.3, TIMELINE_Z_MAX]}
        fontSize={0.14}
        anchorX="center"
        anchorY="middle"
      >
        ${priceMax.toFixed(0)}
      </Text>
      <Text
        position={[STOCK_PLANE_X, RING_Y - 0.2, TIMELINE_Z_MAX]}
        fontSize={0.14}
        anchorX="center"
        anchorY="middle"
      >
        ${priceMin.toFixed(0)}
      </Text>
    </group>
  );
}

function GridXZ() {
  const grid = useMemo(
    () => new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, "#64748b", "#94a3b8"),
    []
  );
  return <primitive object={grid} position={[0, RING_Y, 0]} />;
}

function AxesHelper() {
  return (
    <group position={[0, 0, 0]}>
      <Line points={[[0, 0, 0], [AXES_LENGTH, 0, 0]]} color="#e11d48" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, AXES_LENGTH, 0]]} color="#22c55e" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, AXES_LENGTH]]} color="#3b82f6" lineWidth={2} />
      <Text position={[AXES_LENGTH + 0.3, 0, 0]} fontSize={0.25} anchorX="left" anchorY="middle" color="#e11d48">
        X
      </Text>
      <Text position={[0, AXES_LENGTH + 0.3, 0]} fontSize={0.25} anchorX="center" anchorY="bottom" color="#22c55e">
        Y
      </Text>
      <Text position={[0, 0, AXES_LENGTH + 0.3]} fontSize={0.25} anchorX="center" anchorY="middle" color="#3b82f6">
        Z
      </Text>
    </group>
  );
}

function Scene({ showAxesHelper = true, showGrid = false, showStockMarket = false }) {
  const nodesWithPositions = useMemo(() => {
    return NODES.map((n) => {
      const pos = [...n.pos];
      if (n.source?.date) {
        pos[2] = dateToTimelineZ(n.source.date);
      }
      return { ...n, pos };
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 6]} intensity={1.1} />

      {showAxesHelper && <AxesHelper />}
      {showGrid && <GridXZ />}
      {showStockMarket && <StockMarketPlane />}
      <Timeline />
      <ImpactRing radius={RING_RADIUS} y={RING_Y} />
      <ShockwaveRing radius={RING_RADIUS} y={RING_Y} />

      {nodesWithPositions.map((n) => (
        <NodeBox key={n.id} node={n} />
      ))}

      <OrbitControls makeDefault />
    </>
  );
}

export default function App() {
  const [showAxesHelper, setShowAxesHelper] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showStockMarket, setShowStockMarket] = useState(false);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas camera={{ position: [9, 6, 10], fov: 45 }}>
        <Scene showAxesHelper={showAxesHelper} showGrid={showGrid} showStockMarket={showStockMarket} />
      </Canvas>

      <VisibilityHUD
        showAxesHelper={showAxesHelper}
        setShowAxesHelper={setShowAxesHelper}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showStockMarket={showStockMarket}
        setShowStockMarket={setShowStockMarket}
      />
      <LegendHUD />
    </div>
  );
}