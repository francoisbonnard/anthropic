import React, { useMemo, useRef, useState, useEffect, useCallback, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line, Html } from "@react-three/drei";
import { STOCKS, getStockPriceBounds } from "./stockData";
import { NODES } from "./nodes";

/**
 * 7 layers (0..6)
 * - each layer has: name, meta, color
 */

// Timeline: 04 oct 2022 → 04 oct 2026, sur un layer sous layer0
const TIMELINE_START = new Date(2022, 9, 4); // mois 0-indexé
const TIMELINE_END = new Date(2026, 9, 4);
const TIMELINE_Y = -2.2; // sous level0 (-1.2)
const TIMELINE_Z_MIN = -8;
const TIMELINE_Z_MAX = 8;
const TIMELINE_LENGTH = TIMELINE_Z_MAX - TIMELINE_Z_MIN;
const RING_RADIUS = TIMELINE_LENGTH / 2; // diamètre = longueur timeline
const RING_Y = TIMELINE_Y - 1; // hauteur des cercles AnthropicRing et ShockwaveRing

// Plan StockMarket (YZ) — évolution des cours, timeline synchronisée
const STOCK_PLANE_X = -10;
const STOCK_Y_RANGE = 6; // hauteur du graphique en unités 3D

/** Espacement fixe entre les new nodes (modifiable) */
const SPAWN_NODE_SPACING = 0.4;

function dateToTimelineZ(dateStrOrDate, dilation = 1) {
  const d = dateStrOrDate instanceof Date ? dateStrOrDate : new Date(dateStrOrDate);
  const t = (d - TIMELINE_START) / (TIMELINE_END - TIMELINE_START);
  const effectiveLength = dilation * TIMELINE_LENGTH;
  return TIMELINE_Z_MAX - THREE.MathUtils.clamp(t, 0, 1) * effectiveLength;
}

function getEffectiveTimelineBounds(dilation = 1) {
  const effectiveLength = dilation * TIMELINE_LENGTH;
  return { zMin: TIMELINE_Z_MAX - effectiveLength, zMax: TIMELINE_Z_MAX };
}

function priceToY(price, priceMin, priceMax) {
  const t = (price - priceMin) / (priceMax - priceMin);
  return RING_Y + THREE.MathUtils.clamp(t, 0, 1) * STOCK_Y_RANGE;
}

/**
 * Calcule la portion du cercle occupée par un texte inscrit sur un arc.
 * @param {string} text - Le texte à inscrire
 * @param {number} radius - Rayon du cercle
 * @param {number} fontSize - Taille de police
 * @param {number} startAngle - Angle de départ en radians (0 = droite, sens trigo)
 * @param {number} charWidthRatio - Ratio largeur caractère / fontSize (défaut ~0.48)
 * @param {boolean} reverse - Si true, inverse le sens d'écriture le long de l'arc
 * @returns {{ startAngle, endAngle, arcAngle, startPortion, endPortion, charAngles }}
 */
export function getTextArcPortion(text, radius, fontSize, startAngle = 0, charWidthRatio = 0.48, reverse = false) {
  const charWidth = fontSize * charWidthRatio;
  const totalArcLength = text.length * charWidth;
  const arcAngle = totalArcLength / radius;
  const endAngle = startAngle + arcAngle;
  const twoPi = 2 * Math.PI;
  const charAngles = [...text].map((_, i) =>
    reverse ? endAngle - (i + 0.5) * charWidth / radius : startAngle + (i + 0.5) * charWidth / radius
  );
  return {
    startAngle,
    endAngle,
    arcAngle,
    startPortion: ((startAngle % twoPi) + twoPi) % twoPi / twoPi,
    endPortion: ((endAngle % twoPi) + twoPi) % twoPi / twoPi,
    charAngles,
  };
}

const LAYERS = {
  0: {
    name: "L0 — Protocol & Standards",
    color: "#CA3C66",
    meta:
      "Standards d’interopérabilité (protocoles, formats, conventions, schémas) qui réduisent le coût d’intégration et rendent possible l’écosystème models ↔ agents ↔ tools ↔ data.",
  },
  1: {
    name: "L1 — Foundation Models",
    color: "#DB6A8F",
    meta:
      "Modèles fondamentaux (LLMs, multimodaux) fournissant les capacités cognitives brutes : compréhension, génération, raisonnement, vision, audio. Aucune action directe : uniquement de l'inférence.",
  },
  2: {
    name: "L2 — Agent Systems",
    color: "#E8AABE",
    meta:
      "Interface opérable (cowork, plugins, IDE agents) où l’agent devient une UI de travail et remplace des écrans SaaS par des actions automatisées.",
  },
  3: {
    name: "L3 — Workflow / Product Surface",
    color: "#9AC8EB",
    meta:
      "Interfaces opérables (IDE agents, copilots, cowork, plugins) où l'agent devient l'UI principale et remplace des écrans SaaS par des actions et workflows automatisés. l’agent et le mettent au contact des clients via bundles, marketplaces ou déploiements internes.",
  },
  4: {
    name: "L4 — Distribution & Platforms",
    color: "#4AA3A2",
    meta:
      "Canaux de diffusion (hyperscalers, marketplaces, data platforms, suites internes) qui packagent les agents et les exposent aux clients via bundles, catalogues ou déploiements managés.",
  },
  5: {
    name: "L5 — Enterprise Adoption & Regulated Deployment",
    color: "#B8CBD0",
    meta:
      "Déploiements massifs en environnements entreprise ou régulés avec gouvernance, conformité, sécurité, auditabilité, contrôle des risques et industrialisation.",
  },
  6: {
    name: "L6 — Market Analysis",
    color: "#7A90A4",
    meta:
      "Analyses de marché et signaux (adoption, productivité, risques, pricing, concentration) pour anticiper les gagnants, les shifts de valeur et les dynamiques de commoditisation.",
  },
};

function FinanceHUD({ lang, showStockMarket, setShowStockMarket, stockPlanePosition = 0, setStockPlanePosition }) {
  const [minimized, setMinimized] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: 14,
        width: minimized ? 120 : (showStockMarket ? 240 : 180),
        background: "rgba(0,0,0,0.72)",
        color: "white",
        borderRadius: 14,
        padding: minimized ? "10px 10px 9px" : "12px 12px 10px",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        pointerEvents: "auto",
        backdropFilter: "blur(6px)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: minimized ? 0 : 10,
        }}
      >
        <div style={{ fontWeight: 400, fontSize: 13, letterSpacing: 0.2 }}>
          {T[lang]?.information ?? "Information"}
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
          title={minimized ? (T[lang]?.expand ?? "Expand") : (T[lang]?.minimize ?? "Minimize")}
        >
          {minimized ? "▾" : "▴"}
        </button>
      </div>

      {!minimized && (
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              checked={showStockMarket}
              onChange={(e) => setShowStockMarket(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            {T[lang]?.stockMarket ?? "Stock Market"}
          </div>
          {showStockMarket && setStockPlanePosition && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={stockPlanePosition}
                onChange={(e) => setStockPlanePosition(parseFloat(e.target.value))}
                style={{ flex: 1, minWidth: 80, height: 6, accentColor: "#3b82f6", cursor: "pointer" }}
                title="Position du plan Stock Market"
              />
            </div>
          )}
        </label>
      )}
    </div>
  );
}

const T = {
  fr: {
    layersLegend: "Légende des layers",
    legendMinimal: "Titre seulement",
    legendLayers: "Layers",
    legendFull: "Tout",
    expand: "Développer",
    minimize: "Réduire",
    visibility: "Outils",
    information: "Information",
    axesHelper: "Repère X, Y, Z",
    timelineGuide: "Repère temporel",
    anthropicRing: "AnthropicRing",
    shockwaveRing: "ShockwaveRing",
    gridXZ: "Grille XZ",
    stockMarket: "Stock Market",
    timeDilation: "Dilatation temporelle",
    date: "Date",
    link: "Lien",
    abstract: "Résumé",
    layers: {
      0: { name: "L0 — Protocol & Standards", meta: "Standards d'interopérabilité (protocoles, formats, conventions, schémas) qui réduisent le coût d'intégration et rendent possible l'écosystème models ↔ agents ↔ tools ↔ data." },
      1: { name: "L1 — Foundation Models", meta: "Modèles fondamentaux (LLMs, multimodaux) fournissant les capacités cognitives brutes : compréhension, génération, raisonnement, vision, audio. Aucune action directe : uniquement de l'inférence." },
      2: { name: "L2 — Agent Systems", meta: "Interface opérable (cowork, plugins, IDE agents) où l'agent devient une UI de travail et remplace des écrans SaaS par des actions automatisées." },
      3: { name: "L3 — Workflow / Product Surface", meta: "Interfaces opérables (IDE agents, copilots, cowork, plugins) où l'agent devient l'UI principale et remplace des écrans SaaS par des actions et workflows automatisés." },
      4: { name: "L4 — Distribution & Platforms", meta: "Canaux de diffusion (hyperscalers, marketplaces, data platforms, suites internes) qui packagent les agents et les exposent aux clients via bundles, catalogues ou déploiements managés." },
      5: { name: "L5 — Enterprise Adoption & Regulated Deployment", meta: "Déploiements massifs en environnements entreprise ou régulés avec gouvernance, conformité, sécurité, auditabilité, contrôle des risques et industrialisation." },
      6: { name: "L6 — Market Analysis", meta: "Analyses de marché et signaux (adoption, productivité, risques, pricing, concentration) pour anticiper les gagnants, les shifts de valeur et les dynamiques de commoditisation." },
    },
  },
  en: {
    layersLegend: "Layers legend",
    legendMinimal: "Title only",
    legendLayers: "Layers",
    legendFull: "All",
    expand: "Expand",
    minimize: "Minimize",
    visibility: "Tools",
    information: "Information",
    axesHelper: "X, Y, Z axes",
    timelineGuide: "Timeline guide",
    anthropicRing: "AnthropicRing",
    shockwaveRing: "ShockwaveRing",
    gridXZ: "XZ grid",
    stockMarket: "Stock Market",
    timeDilation: "Time dilation",
    date: "Date",
    link: "Link",
    abstract: "Abstract",
    layers: {
      0: { name: "L0 — Protocol & Standards", meta: "Interoperability standards (protocols, formats, conventions, schemas) that reduce integration costs and enable the models ↔ agents ↔ tools ↔ data ecosystem." },
      1: { name: "L1 — Foundation Models", meta: "Foundation models (LLMs, multimodal) providing raw cognitive capabilities: understanding, generation, reasoning, vision, audio. No direct action: inference only." },
      2: { name: "L2 — Agent Systems", meta: "Operable interface (cowork, plugins, IDE agents) where the agent becomes a work UI and replaces SaaS screens with automated actions." },
      3: { name: "L3 — Workflow / Product Surface", meta: "Operable interfaces (IDE agents, copilots, cowork, plugins) where the agent becomes the main UI and replaces SaaS screens with automated actions and workflows." },
      4: { name: "L4 — Distribution & Platforms", meta: "Distribution channels (hyperscalers, marketplaces, data platforms, internal suites) that package agents and expose them to clients via bundles, catalogs, or managed deployments." },
      5: { name: "L5 — Enterprise Adoption & Regulated Deployment", meta: "Large-scale deployments in enterprise or regulated environments with governance, compliance, security, auditability, risk control, and industrialization." },
      6: { name: "L6 — Market Analysis", meta: "Market analysis and signals (adoption, productivity, risks, pricing, concentration) to anticipate winners, value shifts, and commoditization dynamics." },
    },
  },
};

function VisibilityHUD({ lang, showAxesHelper, setShowAxesHelper, showGrid, setShowGrid, showTimelineGuide, setShowTimelineGuide, showAnthropicRing, setShowAnthropicRing }) {
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
        <div style={{ fontWeight: 400, fontSize: 13, letterSpacing: 0.2 }}>
          {T[lang]?.visibility ?? "Outils"}
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
          title={minimized ? (T[lang]?.expand ?? "Expand") : (T[lang]?.minimize ?? "Minimize")}
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
              checked={showAxesHelper && showGrid}
              onChange={(e) => {
                const v = e.target.checked;
                setShowAxesHelper(v);
                setShowGrid(v);
              }}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            {T[lang]?.axesHelper ?? "Repère X, Y, Z"} / {T[lang]?.gridXZ ?? "Grille XZ"}
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
              checked={showAnthropicRing}
              onChange={(e) => setShowAnthropicRing(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            {T[lang]?.anthropicRing ?? "AnthropicRing"}
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
              checked={showTimelineGuide}
              onChange={(e) => setShowTimelineGuide(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#3b82f6" }}
            />
            {T[lang]?.timelineGuide ?? "Repère temporel"}
          </label>
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>
            Copyright : francois.bonnard@arrow.com
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_LAYER_VISIBILITY = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };

const TIME_DILATION_MIN = 1;
const TIME_DILATION_MAX = 10;

function TimeDilationSlider({ lang, timeDilation, setTimeDilation }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 14,
        minWidth: 200,
        maxWidth: 320,
        background: "rgba(0,0,0,0.72)",
        color: "white",
        borderRadius: 14,
        padding: "12px 16px 10px",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        pointerEvents: "auto",
        backdropFilter: "blur(6px)",
      }}
    >
      <input
        type="range"
        min={TIME_DILATION_MIN}
        max={TIME_DILATION_MAX}
        step={0.1}
        value={timeDilation}
        onChange={(e) => setTimeDilation(parseFloat(e.target.value))}
        style={{
          width: "100%",
          height: 8,
          accentColor: "#3b82f6",
          cursor: "pointer",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, opacity: 0.8, marginTop: 6 }}>
        <span>×1</span>
        <span style={{ fontWeight: 400, fontSize: 12, letterSpacing: 0.2 }}>
          {T[lang]?.timeDilation ?? "Dilatation temporelle"}
        </span>
        <span>×10</span>
      </div>
    </div>
  );
}

const LEGEND_VIEW = { closed: 0, layers: 1, full: 2 };

function LegendHUD({ lang, layerVisibility, setLayerVisibility }) {
  const [view, setView] = useState(LEGEND_VIEW.closed);

  const layerKeys = useMemo(
    () => Object.keys(LAYERS).map(Number).sort((a, b) => b - a),
    []
  );

  const showLayers = view >= LEGEND_VIEW.layers;
  const showFull = view === LEGEND_VIEW.full;

  const cycleView = () => {
    setView((v) => (v === LEGEND_VIEW.closed ? LEGEND_VIEW.layers : v === LEGEND_VIEW.layers ? LEGEND_VIEW.full : LEGEND_VIEW.closed));
  };

  const cycleTitle = view === LEGEND_VIEW.closed
    ? (T[lang]?.legendMinimal ?? "Titre seulement")
    : view === LEGEND_VIEW.layers
      ? (T[lang]?.legendLayers ?? "Layers")
      : (T[lang]?.legendFull ?? "Tout");

  return (
    <div
      style={{
        position: "absolute",
        right: 14,
        bottom: 14,
        width: view === LEGEND_VIEW.closed ? 180 : view === LEGEND_VIEW.layers ? 320 : 480,
        maxWidth: `min(${view === LEGEND_VIEW.closed ? 180 : view === LEGEND_VIEW.layers ? 320 : 480}px, calc(100vw - 28px))`,
        maxHeight: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.72)",
        color: "white",
        borderRadius: 14,
        padding: view === LEGEND_VIEW.closed ? "10px 10px 9px" : "12px 12px 10px",
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
          marginBottom: showLayers ? 10 : 0,
          flexShrink: 0,
        }}
      >
        <div style={{ fontWeight: 400, fontSize: 13, letterSpacing: 0.2 }}>
          {T[lang]?.layersLegend ?? "Layers legend"}
        </div>
        <button
          onClick={cycleView}
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
          title={cycleTitle}
        >
          {view === LEGEND_VIEW.closed ? "▾" : view === LEGEND_VIEW.layers ? "▾▾" : "▴"}
        </button>
      </div>

      {showLayers && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: showFull ? 10 : 7,
            listStyle: "none",
            paddingLeft: 0,
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          {layerKeys.map((k) => {
            const l = LAYERS[k];
            const tl = T[lang]?.layers?.[k];
            const visible = layerVisibility?.[k] ?? true;
            return (
              <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) => setLayerVisibility?.((prev) => ({ ...prev, [k]: e.target.checked }))}
                    style={{ width: showFull ? 24 : 16, height: showFull ? 24 : 16, accentColor: l.color, flex: "0 0 auto" }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 400, fontSize: showFull ? 18 : 12, marginBottom: showFull ? 3 : 0 }}>
                      {tl?.name ?? l?.name ?? `L${k}`}
                    </div>
                    {showFull && (
                      <div style={{ fontSize: 16.5, opacity: 0.9, lineHeight: 1.25 }}>{tl?.meta ?? l?.meta ?? ""}</div>
                    )}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      )}

      {showFull && (
        <div style={{ marginTop: 10, fontSize: 15.75, opacity: 0.75, lineHeight: 1.25, flexShrink: 0 }}>
          Copyright : francois.bonnard@arrow.com
        </div>
      )}
    </div>
  );
}

function lightenColor(hex, percent = 10) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) * (1 + percent / 100)));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) * (1 + percent / 100)));
  const b = Math.min(255, Math.round((num & 0xff) * (1 + percent / 100)));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function shiftHueColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = (h + percent / 100) % 1;
  if (h < 0) h += 1;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const nr = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const ng = Math.round(hue2rgb(p, q, h) * 255);
  const nb = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return "#" + [nr, ng, nb].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const LERP_FACTOR = 0.08;
const FLY_TO_DISTANCE = 6;
const FLY_TO_OFFSET = new THREE.Vector3(4, 3, 4).normalize().multiplyScalar(FLY_TO_DISTANCE);

// Fit frame: vue d'ensemble centrée sur la scène
const FIT_TARGET = [0, 1, 0];
const FIT_CAMERA_OFFSET = new THREE.Vector3(12, 10, 12);

// Année cible sur laquelle la caméra reste focalisée lors du dolly (slider dilatation)
const FOCAL_YEAR = 2025;
const FOCAL_DATE = new Date(FOCAL_YEAR, 9, 4); // 4 oct

function CameraFollowDilation({ timeDilation, controlsRef }) {
  const { camera } = useThree();
  const prevCenterZRef = useRef(null);

  useEffect(() => {
    if (!controlsRef?.current) return;
    const focusZ = dateToTimelineZ(FOCAL_DATE, timeDilation);
    const prevCenterZ = prevCenterZRef.current ?? focusZ;
    const deltaZ = focusZ - prevCenterZ;
    prevCenterZRef.current = focusZ;

    const controls = controlsRef.current;
    controls.target.z += deltaZ;
    camera.position.z += deltaZ;
  }, [timeDilation, controlsRef, camera]);

  return null;
}

function NodeBox({ lang, node, nodeKey, hoveredNodeKey, setHoveredNodeKey, showTimelineGuide, onDoubleClick, onSpawnNodes }) {
  const leaveTimeout = useRef(null);
  const isPointerOverTooltip = useRef(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const hover = hoveredNodeKey === nodeKey;

  const layerBase = LAYERS[node.layer] ?? { color: "#9ca3af" };
  const layerTr = T[lang]?.layers?.[node.layer];
  const baseColor = layerBase.color;
  const nodeColor = node.spawnIndex != null ? shiftHueColor(baseColor, node.spawnIndex * 5) : baseColor;
  const layerInfo = {
    color: nodeColor,
    name: layerTr?.name ?? layerBase?.name ?? "Layer ?",
    meta: layerTr?.meta ?? layerBase?.meta ?? "",
  };

  const numNew = Math.max(0, parseInt(node.numberNewNode, 10) || 0);
  const hasButton = numNew > 0;
  const buttonColor = hasButton ? lightenColor(layerInfo.color, 10) : null;
  const buttonSize = Math.min(node.size[1] * 0.7, 0.35);
  const buttonZ = node.size[2] / 2 + 0.08;

  return (
    <group position={node.pos}>
      {hasButton && (
        <mesh
          position={[0, 0, buttonZ]}
          scale={isButtonHovered ? 1.15 : 1}
          onClick={(e) => {
            e.stopPropagation();
            onSpawnNodes?.(nodeKey, node.pos, numNew, node.layer, node.size, node.NewNodes, node.source?.date);
          }}
          onPointerEnter={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
            setIsButtonHovered(true);
            if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
            leaveTimeout.current = null;
            isPointerOverTooltip.current = false;
            setHoveredNodeKey(nodeKey);
          }}
          onPointerLeave={(e) => {
            document.body.style.cursor = "auto";
            setIsButtonHovered(false);
            if (!isPointerOverTooltip.current) {
              leaveTimeout.current = setTimeout(() => {
                setHoveredNodeKey((prev) => (prev === nodeKey ? null : prev));
              }, 200);
            }
          }}
        >
          <boxGeometry args={[buttonSize, buttonSize, 0.05]} />
          <meshStandardMaterial
            color={isButtonHovered ? lightenColor(buttonColor, 15) : buttonColor}
            metalness={isButtonHovered ? 0.35 : 0.2}
            roughness={isButtonHovered ? 0.5 : 0.65}
            emissive={isButtonHovered ? buttonColor : "#000000"}
            emissiveIntensity={isButtonHovered ? 0.15 : 0}
          />
        </mesh>
      )}
      <mesh
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick?.(node.pos);
        }}
        onPointerEnter={() => {
          if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
          leaveTimeout.current = null;
          isPointerOverTooltip.current = false;
          setHoveredNodeKey(nodeKey);
        }}
        onPointerLeave={() => {
          if (!isPointerOverTooltip.current) {
            leaveTimeout.current = setTimeout(() => {
              setHoveredNodeKey((prev) => (prev === nodeKey ? null : prev));
            }, 200);
          }
        }}
      >
        <boxGeometry args={node.size} />
        <meshStandardMaterial color={layerInfo.color} metalness={0.2} roughness={0.65} />
      </mesh>

      <Text
        position={[0, node.size[1] / 2 + (node.spawnValue ? 0.06 : 0.32), 0]}
        fontSize={0.22}
        maxWidth={2.6}
        anchorX="center"
        anchorY={node.spawnValue ? "bottom" : "middle"}
      >
        {node.label}
      </Text>

      {showTimelineGuide && (
        <Line
          points={[
            [0, 0, 0],
            [0, TIMELINE_Y - node.pos[1], 0],
            [-node.pos[0], TIMELINE_Y - node.pos[1], 0],
          ]}
          color={layerInfo.color}
          lineWidth={1.5}
        />
      )}
      {hover && (
        <Html distanceFactor={10} position={[0, node.size[1] / 2 + 0.7, 0]}>
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(0,0,0,0.78)",
              color: "white",
              borderRadius: 10,
              fontSize: 12,
              width: node.spawnValue ? 320 : 280,
              maxWidth: 320,
              overflow: "hidden",
              boxSizing: "border-box",
              border: `1px solid ${layerInfo.color}`,
            }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              isPointerOverTooltip.current = true;
              if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
              leaveTimeout.current = null;
              setHoveredNodeKey(nodeKey);
            }}
            onPointerLeave={() => {
              isPointerOverTooltip.current = false;
              setHoveredNodeKey((prev) => (prev === nodeKey ? null : prev));
            }}
          >
            {node.spawnValue ? (
              <div style={{ lineHeight: 1.4 }}>{node.spawnValue}</div>
            ) : (
              <>
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
              <div style={{ fontWeight: 400 }}>{layerInfo.name}</div>
            </div>

            {node.source && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 8 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ opacity: 0.8 }}>{T[lang]?.date ?? "Date"}:</span> {node.source.date}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ opacity: 0.8 }}>{T[lang]?.abstract ?? "Abstract"}:</span> {node.source.metric}
                </div>
                {node.source.link && (
                  <div>
                    <span style={{ opacity: 0.8 }}>{T[lang]?.link ?? "Link"}:</span>{" "}
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
                )}
              </div>
            )}
              </>
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

const IMPACT_RING_QUOTE =
  "What is the significance of mankind in the Universe ? the fundamental structure of the Universe is determined by the existence of intelligent observers: the universe is as it is because if it were otherwise, observers could not exist. In its most radical version, the Anthropic Principle asserts: Intelligent information-processing must come into existence in the Universe, and once it comes into existence, it will never die out.";

function CurvedText({ text, radius, y, fontSize = 0.28, startAngle = 0, charWidthRatio = 0.48, color, reverse = false }) {
  const { charAngles } = useMemo(
    () => getTextArcPortion(text, radius, fontSize, startAngle, charWidthRatio, reverse),
    [text, radius, fontSize, startAngle, charWidthRatio, reverse]
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
          rotation={[0, Math.PI - charAngles[i], 0]}
        >
          <Text fontSize={fontSize} anchorX="center" anchorY="middle" color={color}>
            {char}
          </Text>
        </group>
      ))}
    </group>
  );
}

const IMPACT_RING_ROTATION_SPEED = 0.15;

function AnthropicRing({ radius = 6, y = RING_Y }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= IMPACT_RING_ROTATION_SPEED * dt;
  });

  const quoteStartAngle = Math.PI * 0.15;

  return (
    <group ref={ref} position={[0, y, 0]}>
{/*      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[radius, 0.06, 12, 96]} />
        <meshStandardMaterial metalness={0.1} roughness={0.7} color={"#9ca3af"} />
      </mesh>*/}
      <CurvedText
        text={IMPACT_RING_QUOTE}
        radius={radius + 0.5}
        y={0.2}
        fontSize={0.2}
        startAngle={quoteStartAngle}
        color="#f8fafc"
        reverse
      />
    </group>
  );
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function Timeline({ timeDilation = 1 }) {
  const { zMin, zMax } = getEffectiveTimelineBounds(timeDilation);
  const ticks = useMemo(() => {
    const out = [];
    const start = new Date(TIMELINE_START);
    const end = new Date(TIMELINE_END);
    const d = new Date(start);
    while (d <= end) {
      const z = dateToTimelineZ(d, timeDilation);
      const month = d.getMonth();
      const year = d.getFullYear();
      const isYearTick = month === 0 || (year === 2022 && month === 9);
      out.push({
        key: `${year}-${month}`,
        z,
        label: isYearTick ? String(year) : MONTH_NAMES[month],
        isYear: isYearTick,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [timeDilation]);

  return (
    <group position={[0, TIMELINE_Y, 0]}>
      <Line
        points={[[0, 0, zMin], [0, 0, zMax]]}
        color="#64748b"
        lineWidth={1.5}
      />
      {ticks.map(({ key, z, label, isYear }) => (
        <group key={key}>
          <Line
            points={[[0, 0, z], [0, isYear ? 0.15 : 0.08, z]]}
            color="#94a3b8"
            lineWidth={isYear ? 1 : 0.5}
          />
          <Text
            position={[0, isYear ? 0.22 : -0.28, z]}
            fontSize={isYear ? 0.18 : 0.11}
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        </group>
      ))}
    </group>
  );
}

const AXES_LENGTH = 4;
const GRID_SIZE = 20;
const GRID_DIVISIONS = 20;

const SKY_TEXTURE_PATH = new URL("/textures/sky_an_horizon_with_clouds.jpg", import.meta.url).href;

function SkyBackground() {
  const { scene } = useThree();

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(SKY_TEXTURE_PATH, (tex) => {
      const img = tex.image;
      const w = img.width;
      const h = img.height;
      const aspect = w / h;

      // Générer une texture équirectangulaire 2:1 (format VR) à partir de la résolution de l'image
      const outW = Math.min(Math.max(w, 512), 4096);
      const outH = outW / 2; // 2:1 pour VR

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, outW, outH);

      if (aspect >= 2) {
        // Image plus large que 2:1 (bande horizontale) → remplir la largeur, centrer verticalement
        const drawW = outW;
        const drawH = outW / aspect;
        const sy = (outH - drawH) / 2;
        ctx.drawImage(img, 0, 0, w, h, 0, sy, drawW, drawH);
      } else {
        // Image plus haute que 2:1 → remplir la hauteur, centrer horizontalement
        const drawH = outH;
        const drawW = outH * aspect;
        const sx = (outW - drawW) / 2;
        ctx.drawImage(img, 0, 0, w, h, sx, 0, drawW, drawH);
      }

      const vrTexture = new THREE.CanvasTexture(canvas);
      vrTexture.mapping = THREE.EquirectangularReflectionMapping;
      vrTexture.colorSpace = THREE.SRGBColorSpace;
      scene.background = vrTexture;
    });
  }, [scene]);

  return null;
}

function StockMarketPlane({ timeDilation = 1, stockPlanePosition = 0 }) {
  const { min: priceMin, max: priceMax } = useMemo(() => getStockPriceBounds(), []);
  const { zMin, zMax } = getEffectiveTimelineBounds(timeDilation);
  const planeWidth = zMax - zMin;
  const planeX = THREE.MathUtils.lerp(STOCK_PLANE_X, 0, stockPlanePosition);

  const stockCurves = useMemo(() => {
    return Object.entries(STOCKS).map(([name, { color, data }]) => ({
      name,
      color,
      points: data.map(({ date, value }) => [
        planeX,
        priceToY(value, priceMin, priceMax),
        dateToTimelineZ(date, timeDilation),
      ]),
    }));
  }, [priceMin, priceMax, timeDilation, planeX]);
  const planeHeight = STOCK_Y_RANGE;
  const planeCenterZ = (zMin + zMax) / 2;

  return (
    <group position={[0, 0, 0]}>
      {/* Plan semi-transparent YZ (rotation pour plan YZ : normal = X) */}
      <mesh
        position={[planeX, RING_Y + planeHeight / 2, planeCenterZ]}
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
        const [, y, z] = points[0];
        return (
          <Text
            key={name}
            position={[planeX + 0.1, y, z + 0.2]}
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
      {/* Échelle prix (référence Oct 2022) */}
      <Text
        position={[planeX, RING_Y + planeHeight + 0.3, zMax]}
        fontSize={0.14}
        anchorX="center"
        anchorY="middle"
      >
        ${priceMax.toFixed(0)}
      </Text>
      <Text
        position={[planeX, RING_Y - 0.2, zMax]}
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

function SmoothFlyTo({ target, onComplete, controlsRef }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!target || !controlsRef?.current) return;
    const controls = controlsRef.current;
    const targetPos = new THREE.Vector3(...target);
    const cameraPos = targetPos.clone().add(FLY_TO_OFFSET);
    controls.target.lerp(targetPos, LERP_FACTOR);
    camera.position.lerp(cameraPos, LERP_FACTOR);
    if (controls.target.distanceTo(targetPos) < 0.01 && camera.position.distanceTo(cameraPos) < 0.01) {
      controls.target.copy(targetPos);
      camera.position.copy(cameraPos);
      onComplete?.();
    }
  });
  return null;
}

function SmoothFitFrame({ onComplete, controlsRef }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!controlsRef?.current) return;
    const controls = controlsRef.current;
    controls.enabled = false;
    const targetPos = new THREE.Vector3(...FIT_TARGET);
    const cameraPos = targetPos.clone().add(FIT_CAMERA_OFFSET);
    const distTarget = controls.target.distanceTo(targetPos);
    const distCam = camera.position.distanceTo(cameraPos);
    controls.target.lerp(targetPos, LERP_FACTOR);
    camera.position.lerp(cameraPos, LERP_FACTOR);
    if (distTarget < 0.01 && distCam < 0.01) {
      controls.target.copy(targetPos);
      camera.position.copy(cameraPos);
      if (controls._sphericalDelta) controls._sphericalDelta.set(0, 0, 0);
      if (controls._panOffset) controls._panOffset.set(0, 0, 0);
      onComplete?.();
    }
  });
  return null;
}

function Scene({
  lang = "fr",
  showAxesHelper = true,
  showGrid = false,
  showStockMarket = false,
  stockPlanePosition = 0,
  showTimelineGuide = false,
  showAnthropicRing = false,
  showShockwaveRing = false,
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  timeDilation = 1,
  fitFrame = false,
  setFitFrame,
  onFitComplete,
  orbitControlsKey = 0,
  flyToTarget,
  setFlyToTarget,
}) {
  const [hoveredNodeKey, setHoveredNodeKey] = useState(null);
  const [spawnedNodes, setSpawnedNodes] = useState([]);
  const controlsRef = useRef(null);

  const handleSpawnNodes = useCallback((parentKey, parentPos, count, layer, parentSize, newNodesData, parentSourceDate) => {
    setSpawnedNodes((prev) => {
      const existing = prev.filter((sn) => sn.parentKey === parentKey);
      if (existing.length > 0) {
        return prev.filter((sn) => sn.parentKey !== parentKey);
      }
      const [px, py, pz] = parentPos;
      const entries = newNodesData && typeof newNodesData === "object"
        ? Object.entries(newNodesData).slice(0, count)
        : [];
      const startX = px + parentSize[0] + SPAWN_NODE_SPACING;
      const slotWidth = parentSize[0] + SPAWN_NODE_SPACING;
      const newNodes = [];
      for (let i = 0; i < count; i++) {
        const [label, value] = entries[i] || [`+${i + 1}`, ""];
        const x = startX + i * slotWidth;
        newNodes.push({
          key: `${parentKey}-spawn-${Date.now()}-${i}`,
          parentKey,
          pos: [x, py, pz],
          parentSourceDate: parentSourceDate || null,
          spawnIndex: i,
          layer,
          size: [...parentSize],
          label,
          value: value || "",
        });
      }
      return [...prev, ...newNodes];
    });
  }, []);

  const nodesWithPositions = useMemo(() => {
    return NODES.map((n) => {
      const pos = [...n.pos];
      if (n.source?.date) {
        pos[2] = dateToTimelineZ(n.source.date, timeDilation);
      }
      return { ...n, pos };
    });
  }, [timeDilation]);

  return (
    <>
      <SkyBackground />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 10, 6]} intensity={1.1} />

      {showAxesHelper && <AxesHelper />}
      {showGrid && <GridXZ />}
      {showStockMarket && <StockMarketPlane timeDilation={timeDilation} stockPlanePosition={stockPlanePosition} />}
      <Timeline timeDilation={timeDilation} />
      {showAnthropicRing && <AnthropicRing radius={RING_RADIUS} y={RING_Y} />}
      {showShockwaveRing && <ShockwaveRing radius={RING_RADIUS} y={RING_Y} />}

      {nodesWithPositions
        .map((n, i) => ({ n, i }))
        .filter(({ n }) => layerVisibility[n.layer] !== false)
        .map(({ n, i }) => (
          <NodeBox
            key={`${n.id}-${i}`}
            lang={lang}
            node={n}
            nodeKey={`${n.id}-${i}`}
            hoveredNodeKey={hoveredNodeKey}
            setHoveredNodeKey={setHoveredNodeKey}
            showTimelineGuide={showTimelineGuide}
            onDoubleClick={(pos) => setFlyToTarget(pos)}
            onSpawnNodes={handleSpawnNodes}
          />
        ))}

      {spawnedNodes
        .filter((sn) => layerVisibility[sn.layer] !== false)
        .map((sn) => {
          const z = sn.parentSourceDate ? dateToTimelineZ(sn.parentSourceDate, timeDilation) : sn.pos[2];
          const pos = [sn.pos[0], sn.pos[1], z];
          return (
            <NodeBox
              key={sn.key}
              lang={lang}
              node={{ id: sn.label, layer: sn.layer, pos, size: sn.size, label: sn.label, spawnValue: sn.value, spawnIndex: sn.spawnIndex }}
              nodeKey={sn.key}
              hoveredNodeKey={hoveredNodeKey}
              setHoveredNodeKey={setHoveredNodeKey}
              showTimelineGuide={showTimelineGuide}
              onDoubleClick={(pos) => setFlyToTarget(pos)}
            />
          );
        })}

      <OrbitControls key={orbitControlsKey} ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} />
      <CameraFollowDilation timeDilation={timeDilation} controlsRef={controlsRef} />
      {flyToTarget && !fitFrame && (
        <SmoothFlyTo
          target={flyToTarget}
          controlsRef={controlsRef}
          onComplete={() => setFlyToTarget(null)}
        />
      )}
      {fitFrame && (
        <SmoothFitFrame
          controlsRef={controlsRef}
          onComplete={onFitComplete ?? (() => setFitFrame?.(false))}
        />
      )}
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState("en");
  const [showAxesHelper, setShowAxesHelper] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showTimelineGuide, setShowTimelineGuide] = useState(true);
  const [showAnthropicRing, setShowAnthropicRing] = useState(false);
  const [showStockMarket, setShowStockMarket] = useState(true);
  const [stockPlanePosition, setStockPlanePosition] = useState(0);
  const [layerVisibility, setLayerVisibility] = useState(DEFAULT_LAYER_VISIBILITY);
  const [timeDilation, setTimeDilation] = useState(1);
  const [fitFrame, setFitFrame] = useState(false);
  const [orbitControlsKey, setOrbitControlsKey] = useState(0);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const lastPointerMissRef = useRef(0);

  const handlePointerMissed = () => {
    const now = Date.now();
    if (now - lastPointerMissRef.current < 400) {
      setFlyToTarget(null);
      setFitFrame(true);
      lastPointerMissRef.current = 0;
    } else {
      lastPointerMissRef.current = now;
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          zIndex: 10,
          display: "flex",
          gap: 4,
          background: "rgba(0,0,0,0.72)",
          borderRadius: 10,
          padding: "4px 6px",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          onClick={() => setLang("fr")}
          style={{
            appearance: "none",
            border: "none",
            background: lang === "fr" ? "rgba(255,255,255,0.2)" : "transparent",
            color: "white",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Français
        </button>
        <button
          onClick={() => setLang("en")}
          style={{
            appearance: "none",
            border: "none",
            background: lang === "en" ? "rgba(255,255,255,0.2)" : "transparent",
            color: "white",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          English
        </button>
      </div>
      <Canvas
        camera={{ position: [9, 6, 10], fov: 45 }}
        onPointerMissed={handlePointerMissed}
      >
        <Suspense fallback={null}>
          <Scene
          lang={lang}
          showAxesHelper={showAxesHelper}
          showGrid={showGrid}
          showStockMarket={showStockMarket}
          stockPlanePosition={stockPlanePosition}
          showTimelineGuide={showTimelineGuide}
          showAnthropicRing={showAnthropicRing}
          layerVisibility={layerVisibility}
          timeDilation={timeDilation}
          fitFrame={fitFrame}
          setFitFrame={setFitFrame}
          onFitComplete={() => {
            setFitFrame(false);
            setOrbitControlsKey((k) => k + 1);
          }}
          orbitControlsKey={orbitControlsKey}
          flyToTarget={flyToTarget}
          setFlyToTarget={setFlyToTarget}
        />
        </Suspense>
      </Canvas>

      <FinanceHUD
        lang={lang}
        showStockMarket={showStockMarket}
        setShowStockMarket={setShowStockMarket}
        stockPlanePosition={stockPlanePosition}
        setStockPlanePosition={setStockPlanePosition}
      />
      <VisibilityHUD
        lang={lang}
        showAxesHelper={showAxesHelper}
        setShowAxesHelper={setShowAxesHelper}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showTimelineGuide={showTimelineGuide}
        setShowTimelineGuide={setShowTimelineGuide}
        showAnthropicRing={showAnthropicRing}
        setShowAnthropicRing={setShowAnthropicRing}
      />
      <TimeDilationSlider lang={lang} timeDilation={timeDilation} setTimeDilation={setTimeDilation} />
      <LegendHUD lang={lang} layerVisibility={layerVisibility} setLayerVisibility={setLayerVisibility} />
    </div>
  );
}