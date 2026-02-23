import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Html } from "@react-three/drei";
import { getTextArcPortion } from "./AppLayerTimeLine";

const NODES = [
  // Y0 — Protocol / Standards
  { id: "mcp", label: "MCP / AAIF\n(standard layer)", pos: [0, -1.2, 0], size: [2.4, 0.35, 1.2],
    source: {
      date: "2025-12-09",
      link: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation",
      metric: "Linux Foundation Announces the Formation of the Agentic AI Foundation (AAIF), Anchored by New Project Contributions Including Model Context Protocol (MCP), goose and AGENTS"
    }
   },

  // Y1 — Anthropic runtime/products
  { id: "claude", label: "Claude\n(models)", pos: [0, 0, 0], size: [1.6, 0.45, 1.0] },
  { id: "cowork", label: "Cowork + Plugins\n(open-source)", pos: [0, 1.35, 0], size: [2.2, 0.5, 1.2] },
  { id: "ccode", label: "Claude Code", pos: [-2.8, 1.1, -0.8], size: [1.4, 0.4, 0.9] },

  // Y2 — Distribution
  { id: "snow", label: "Snowflake\n$200M", pos: [2.9, 2.0, -0.6], size: [1.6, 0.45, 1.0],     
    source: {
    date: "2025-12-04",
    link: "https://techcrunch.com/2025/12/04/anthropic-signs-200m-deal-to-bring-its-llms-to-snowflakes-customers/",
    metric: "Anthropic signs $200M deal to bring its LLMs to Snowflake’s customers"
  } },
  { id: "msft", label: "Microsoft internal\n(Claude Code)", pos: [-3.2, 2.0, 0.9], size: [1.8, 0.45, 1.1],
    source: {
      date: "2026-01-26",
      link: "https://www.webpronews.com/microsofts-claude-code-gamble-pitting-rival-ai-against-its-own-copilot-empire/",
      metric: "Microsoft’s Claude Code Gamble: Pitting Rival AI Against Its Own Copilot Empire"
    }
   },

  // Y3 — Adoption
  { id: "deloitte", label: "Deloitte\n470k seats", pos: [-1.6, 3.0, 1.6], size: [1.8, 0.5, 1.1],
    source: {
      date: "2025-10-25",
      link: "https://www.cnbc.com/2025/10/06/anthropic-deloitte-enterprise-ai.html",
      metric: "Anthropic lands its biggest enterprise deployment ever with Deloitte deal"
    }
   },
  { id: "cognizant", label: "Cognizant\n350k seats", pos: [1.8, 3.0, 1.6], size: [1.9, 0.5, 1.1],
    source: {
      date: "2025-11-04",
      link: "https://www.anthropic.com/news/cognizant-partnership",
      metric: "Cognizant will make Claude available to 350,000 employees, accelerating enterprise AI adoption and internal transformation"
    }
   },
  { id: "dod", label: "DoD\n$200M ceiling", pos: [0.0, 3.3, -2.0], size: [2.1, 0.55, 1.1],
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

function NodeBox({ node }) {
  const [hover, setHover] = useState(false);
  const leaveTimeout = useRef(null);
  const isPointerOverTooltip = useRef(false);
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
        <meshStandardMaterial metalness={0.2} roughness={0.65} />
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
              padding: "8px 10px",
              background: "rgba(0,0,0,0.75)",
              color: "white",
              borderRadius: 8,
              fontSize: 12,
              width: 220,
              overflow: "hidden",
              boxSizing: "border-box"
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
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{node.id}</div>
            {node.source && (
              <div>
                <div>Date: {node.source.date}</div>
                <div style={{ marginBottom: 4 }}>
                  Link:{" "}
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
                      wordBreak: "break-all"
                    }}
                  >
                    {node.source.link}
                  </a>
                </div>
                <div>Metric: {node.source.metric}</div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function ShockwaveRing({ radius = 6, y = 1.3 }) {
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

function CurvedText({ text, radius, y, fontSize = 0.18, startAngle = 0, charWidthRatio = 0.48 }) {
  const { charAngles } = useMemo(
    () => getTextArcPortion(text, radius, fontSize, startAngle, charWidthRatio),
    [text, radius, fontSize, startAngle, charWidthRatio]
  );

  return (
    <group>
      {[...text].map((char, i) => (
        <group
          key={i}
          position={[
            Math.cos(charAngles[i]) * radius,
            y,
            Math.sin(charAngles[i]) * radius,
          ]}
          rotation={[0, -charAngles[i], 0]}
        >
          <Text fontSize={fontSize} anchorX="center" anchorY="middle">
            {char}
          </Text>
        </group>
      ))}
    </group>
  );
}

const IMPACT_RING_QUOTE = "the fundamental structure of the Universe is determined by the existence of intelligent observers";

function ImpactRing({ radius = 6, y = 1.3 }) {
  const sectors = useMemo(() => ([
    { label: "Legal / Info", angle: 0.3 },
    { label: "Ads / Agency", angle: 1.6 },
    { label: "BPO / CX", angle: 3.0 },
    { label: "IT Services", angle: 4.5 },
  ]), []);

  const quoteStartAngle = Math.PI * 0.15;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
        <torusGeometry args={[radius, 0.06, 12, 96]} />
        <meshStandardMaterial metalness={0.1} roughness={0.7} />
      </mesh>

      <CurvedText
        text={IMPACT_RING_QUOTE}
        radius={radius + 0.5}
        y={y + 0.2}
        fontSize={0.14}
        startAngle={quoteStartAngle}
      />

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
        <Line
          key={`${a}-${b}`}
          points={[nodesById[a].pos, nodesById[b].pos]}
          lineWidth={1}
        />
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 6]} intensity={1.1} />

      <ImpactRing />
      <ShockwaveRing />

      <Edges nodesById={nodesById} />
      {NODES.map((n) => <NodeBox key={n.id} node={n} />)}

      <OrbitControls makeDefault />
    </>
  );
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [9, 6, 10], fov: 45 }}>
        <Scene />
      </Canvas>
    </div>
  );
}