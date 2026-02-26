/**
 * Nœuds de la timeline (événements, produits, partenariats).
 * Chaque nœud a : id, layer, label, pos [x,y,z], size [w,h,d], optionnellement source, numberNewNode, NewNodes.
 * numberNewNode : si > 0, affiche un bouton ; au clic, génère ce nombre de nouveaux nodes sur l'axe X.
 * NewNodes : objet { clé: valeur } ; chaque nouveau node affiche la clé et au survol montre la valeur.
 */

const level0 = -1.2;
const level1 = 0;
const level2 = 1.35;
const level3 = 2.0;
const level4 = 3.0;
const level5 = 4.0;
const level6 = 5.0;

export const NODES = [
  // L0 — Protocol / Standards
  {
    id: "mcp",
    layer: 0,
    label: "MCP / AAIF\n(standard layer)",
    pos: [4, level0, 0],
    size: [2.4, 0.35, 1.2],
    source: {
      date: "2025-12-09",
      link: "https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation",
      metric: "Linux Foundation Announces the Formation of the Agentic AI Foundation (AAIF), Anchored by New Project Contributions Including Model Context Protocol (MCP), goose and AGENTS",
    },
  },
  {
    id: "mcp",
    layer: 0,
    label: "MCP",
    pos: [0, level0, 0],
    size: [2.4, 0.35, 1.2],
    numberNewNode: 3,
    source: {
      date: "2024-11-25",
      link: "https://www.anthropic.com/news/model-context-protocol",
      metric: "Introducing the Model Context Protocol",
    },
  },

  // L1 — Foundation Models
  {
    id: "Claude 3 Opus",
    layer: 1,
    label: "Claude 3 Opus",
    pos: [0, 0, 0],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2024-03-01",
      link: "",
      metric: "Claude 3 Opus",
    },
  },
  {
    id: "Claude 3.5 Sonnet",
    layer: 1,
    label: "Claude 3.5 Sonnet",
    pos: [0, 0, 0],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2024-06-01",
      link: "",
      metric: "Claude 3.5 Sonnet",
    },
  },
  {
    id: "Claude 4.5 Sonnet",
    layer: 1,
    label: "Claude 4.5 Sonnet",
    pos: [0, 0, 0],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2025-09-01",
      link: "",
      metric: "Claude 4.5 Sonnet",
    },
  },
  {
    id: "Claude 4.5 Opus",
    layer: 1,
    label: "Claude 4.5 Opus",
    pos: [0, 0, 0],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2025-11-01",
      link: "",
      metric: "Claude 4.5 Opus",
    },
  },
  {
    id: "Claude 4.6 Opus",
    layer: 1,
    label: "Claude 4.6 Opus",
    pos: [0, 0, 0],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2026-02-16",
      link: "https://www.reddit.com/r/accelerate/comments/1qws41b/opus_46_benchmarks/",
      metric: "SaaS Apocalypse",
    },
  },

  // L3
  { id: "ccode", layer: 3, label: "Claude Code", pos: [-2.8, level3, -0.8], size: [1.4, 0.4, 0.9],
    numberNewNode: 0,
    source: {
      date: "2025-10-20",
      link: "https://mlq.ai/news/anthropic-launches-claude-code-on-the-web/",
      metric: "Anthropic Launches Claude Code on the Web",
    },
  },
// L2
  {
    id: "cowork",
    layer: 2,
    numberNewNode: 12,
    NewNodes: {
      "Productivity": "Manage tasks, calendars, daily workflows, and personal context. Integrates with Slack, Notion, Asana, Linear, Jira, Monday, ClickUp, Microsoft 365.",
      "Sales": "Research prospects, prep deals, and follow your sales process. Connects Claude to your CRM and knowledge base.",
      "Legal": "Contract review with clause-by-clause flagging (GREEN/YELLOW/RED). Rapid NDA pre-screening.",
      "Finance": "Analyze financials, build models, and track key metrics.",
      "Marketing": "Draft content, plan campaigns, manage launches.",
      "Support": "Customer service workflows and response drafting.",
      "Data Analysis": "Query data, build dashboards, generate insights.",
      "Research": "Deep research synthesis and competitive analysis.",
      "Enterprise Search": "Find information across company tools and docs.",
      "Product": "Feature specs, user research synthesis, roadmap planning.",
      "Plugin Create": "Create and customize new plugins from scratch.",  
    },   
    label: "Cowork + Plugins\n(open-source)",
    pos: [1, level2, 0],
    size: [2.2, 0.5, 1.2],
    source: {
      date: "2026-01-12",
      link: "https://www.the-ai-corner.com/p/claude-cowork-the-tool-that-triggered",
      metric: "SaaS Apocalypse",
    },
  },

  // L4 — Distribution & Platforms
  {
    id: "snow",
    layer: 4,
    label: "Snowflake\n$200M",
    pos: [-2.9, level4, -0.6],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2025-12-04",
      link: "https://techcrunch.com/2025/12/04/anthropic-signs-200m-deal-to-bring-its-llms-to-snowflakes-customers/",
      metric: "Anthropic signs $200M deal to bring its LLMs to Snowflake's customers",
    },
  },
  {
    id: "msft",
    layer: 4,
    label: "Microsoft internal\n(Claude Code)",
    pos: [4, level4, 0.9],
    size: [1.8, 0.45, 1.1],
    source: {
      date: "2026-01-26",
      link: "https://www.webpronews.com/microsofts-claude-code-gamble-pitting-rival-ai-against-its-own-copilot-empire/",
      metric: "Microsoft's Claude Code Gamble: Pitting Rival AI Against Its Own Copilot Empire",
    },
  },

  // L6 — Enterprise Adoption & Regulated Deployment
  {
    id: "deloitte",
    layer: 5,
    label: "Deloitte\n470k seats",
    pos: [-1.6, level5, 1.6],
    size: [1.8, 0.5, 1.1],
    source: {
      date: "2025-10-25",
      link: "https://www.cnbc.com/2025/10/06/anthropic-deloitte-enterprise-ai.html",
      metric: "Anthropic lands its biggest enterprise deployment ever with Deloitte deal",
    },
  },
  {
    id: "cognizant",
    layer: 5,
    label: "Cognizant\n350k seats",
    pos: [1.8, level5, 1.6],
    size: [1.9, 0.5, 1.1],
    source: {
      date: "2025-11-04",
      link: "https://www.anthropic.com/news/cognizant-partnership",
      metric: "Cognizant will make Claude available to 350,000 employees, accelerating enterprise AI adoption and internal transformation",
    },
  },
  {
    id: "dod",
    layer: 5,
    label: "DoD\n$200M ceiling",
    pos: [0.0, level5, -2.0],
    size: [2.1, 0.55, 1.1],
    source: {
      date: "2025-07-14",
      link: "https://www.cnbc.com/2025/07/14/anthropic-google-openai-xai-granted-up-to-200-million-from-dod.html",
      metric: "Anthropic, Google, OpenAI and xAI granted up to $200 million for AI work from Defense Department",
    },
  },

  // L5 — Market Analysis
  {
    id: "gartner",
    layer: 6,
    label: "2027 : 40% agentic AI projects cancelled",
    pos: [-2.5, level6, 0],
    size: [2.0, 0.45, 1.0],
    source: {
      date: "2025-06-25",
      link: "https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027",
      metric: "40% projets IA agentique annulés d'ici 2027",
    },
  },
  {
    id: "goldman",
    layer: 6,
    label: "Goldman Sachs : Agents to boost productivity",
    pos: [2.5, level6, 0],
    size: [2.2, 0.45, 1.0],
    source: {
      date: "2025-07-03",
      link: "https://www.goldmansachs.com/insights/articles/ai-agents-to-boost-productivity-and-size-of-software-market",
      metric: "AI Agents to Boost Productivity and Size of Software Market",
    },
  },
  {
    id: "SaaS Apocalypse",
    layer: 6,
    label: "SaaS Apocalypse",
    pos: [0, level6, 0],
    size: [1.6, 0.45, 1.0],
    source: {
      date: "2026-02-03",
      link: "https://xpert.digital/en/saas-apocalypse-on-wall-street/",
      metric: "SaaS Apocalypse",
    },
  },
];
