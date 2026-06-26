import type { AnalyticsEvent, Configurator, ExperienceType, MatchType, Product, Quiz } from "@/lib/types";
import { extractIntentTokens, formatCurrency, getEventExperienceType } from "@/lib/utils";

export type DecisionGraphNodeType = "product" | "signal" | "question" | "answer" | "configurator" | "option" | "shopper_term";
export type DecisionGraphStatus = "pass" | "warn" | "fail";

export type DecisionGraphNode = {
  id: string;
  type: DecisionGraphNodeType;
  label: string;
  detail: string;
  status: DecisionGraphStatus;
  weight: number;
};

export type DecisionGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: "product_signal" | "answer_rule" | "question_flow" | "configurator_product" | "compatibility" | "shopper_language";
  status: DecisionGraphStatus;
};

export type DecisionGraphLane = {
  id: "catalog" | "finder" | "configurator" | "language";
  label: string;
  score: number;
  status: "ready" | "review" | "blocked";
  detail: string;
};

export type DecisionRuleAudit = {
  id: string;
  quizName: string;
  questionTitle: string;
  answerLabel: string;
  matchType: MatchType;
  matchValue: string;
  status: DecisionGraphStatus;
  linkedSignals: string[];
  linkedProducts: string[];
  detail: string;
};

export type DecisionConfiguratorAudit = {
  id: string;
  configuratorName: string;
  optionLabel: string;
  status: DecisionGraphStatus;
  linkedProductName?: string;
  incompatibleOptions: string[];
  detail: string;
};

export type DecisionTermAudit = {
  term: string;
  count: number;
  status: DecisionGraphStatus;
  matchingProducts: string[];
  sources: ExperienceType[];
  examples: string[];
  detail: string;
};

export type DecisionGraphAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  severity: "critical" | "high" | "medium" | "low";
  href: string;
  label: string;
};

export type DecisionGraphReport = {
  status: "healthy" | "needs-review" | "blocked";
  score: number;
  summary: {
    products: number;
    signals: number;
    edges: number;
    finderRules: number;
    connectedRules: number;
    configuratorOptions: number;
    productLinkedOptions: number;
    unresolvedLanguageTerms: number;
  };
  lanes: DecisionGraphLane[];
  nodes: DecisionGraphNode[];
  edges: DecisionGraphEdge[];
  ruleAudits: DecisionRuleAudit[];
  configuratorAudits: DecisionConfiguratorAudit[];
  termAudits: DecisionTermAudit[];
  actions: DecisionGraphAction[];
  hotspots: DecisionGraphNode[];
};

type SignalRecord = {
  id: string;
  type: "category" | "buyer_need" | "tag" | "feature" | "budget";
  key: string;
  label: string;
  productIds: Set<string>;
};

type ObservedTerm = {
  term: string;
  count: number;
  sources: Set<ExperienceType>;
  examples: Set<string>;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9.£$ ]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleize(value: string) {
  const normalized = normalize(value);
  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Untitled";
}

function nodeStatus(score: number): DecisionGraphLane["status"] {
  if (score >= 80) return "ready";
  if (score >= 55) return "review";
  return "blocked";
}

function graphStatus(score: number): DecisionGraphReport["status"] {
  if (score >= 82) return "healthy";
  if (score >= 58) return "needs-review";
  return "blocked";
}

function addNode(map: Map<string, DecisionGraphNode>, node: DecisionGraphNode) {
  const existing = map.get(node.id);
  if (!existing || node.weight > existing.weight || existing.status !== "fail") map.set(node.id, node);
}

function addEdge(map: Map<string, DecisionGraphEdge>, edge: Omit<DecisionGraphEdge, "id">) {
  const id = `${edge.kind}:${edge.source}->${edge.target}:${edge.label}`;
  map.set(id, { id, ...edge });
}

function signalId(type: SignalRecord["type"], value: string) {
  return `signal:${type}:${normalize(value)}`;
}

function productText(product: Product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...product.features,
    ...product.tags,
    ...(product.buyer_needs || []),
  ].join(" "));
}

function productHasMeaningfulSignals(product: Product) {
  return Boolean(product.category?.trim())
    && (product.tags.length + product.features.length + (product.buyer_needs || []).length >= 3)
    && Boolean((product.search_text || product.description).trim());
}

function addSignal(signals: Map<string, SignalRecord>, type: SignalRecord["type"], value: string, productId: string) {
  const key = normalize(value);
  if (!key) return;
  const id = signalId(type, key);
  const existing = signals.get(id) || { id, type, key, label: titleize(value), productIds: new Set<string>() };
  existing.productIds.add(productId);
  signals.set(id, existing);
}

function buildSignals(products: Product[]) {
  const signals = new Map<string, SignalRecord>();
  for (const product of products) {
    addSignal(signals, "category", product.category || "Uncategorized", product.id);
    for (const tag of product.tags) addSignal(signals, "tag", tag, product.id);
    for (const need of product.buyer_needs || []) addSignal(signals, "buyer_need", need, product.id);
    for (const feature of product.features) addSignal(signals, "feature", feature, product.id);
  }
  return signals;
}

function productsForRule(products: Product[], matchType: MatchType, matchValue: string) {
  const value = normalize(matchValue);
  if (matchType === "none") return products;
  if (matchType === "budget_max") {
    const budget = Number(value.replace(/[£$]/g, ""));
    return Number.isFinite(budget) && budget > 0 ? products.filter((product) => product.price <= budget) : [];
  }
  if (!value) return [];
  return products.filter((product) => {
    if (matchType === "category") return normalize(product.category) === value;
    if (matchType === "tag") {
      return [...product.tags, ...(product.buyer_needs || [])].some((signal) => normalize(signal) === value);
    }
    if (matchType === "feature") {
      return product.features.some((feature) => {
        const normalizedFeature = normalize(feature);
        return normalizedFeature === value || normalizedFeature.includes(value) || value.includes(normalizedFeature);
      });
    }
    return false;
  });
}

function signalsForRule(signals: Map<string, SignalRecord>, matchType: MatchType, matchValue: string, products: Product[]) {
  if (matchType === "none") return [];
  if (matchType === "budget_max") return [{
    id: signalId("budget", matchValue),
    type: "budget" as const,
    key: normalize(matchValue),
    label: `Budget ≤ ${formatCurrency(Number(matchValue) || 0)}`,
    productIds: new Set(productsForRule(products, matchType, matchValue).map((product) => product.id)),
  }];
  const value = normalize(matchValue);
  if (!value) return [];
  return [...signals.values()].filter((signal) => {
    if (matchType === "category") return signal.type === "category" && signal.key === value;
    if (matchType === "tag") return (signal.type === "tag" || signal.type === "buyer_need") && signal.key === value;
    if (matchType === "feature") return signal.type === "feature" && (signal.key === value || signal.key.includes(value) || value.includes(signal.key));
    return false;
  });
}

function observedTerms(events: AnalyticsEvent[]) {
  const map = new Map<string, ObservedTerm>();
  for (const event of events) {
    const source = getEventExperienceType(event);
    const query = typeof event.metadata?.query === "string" ? event.metadata.query : "";
    const metadataTerms = Array.isArray(event.metadata?.terms) ? event.metadata.terms.filter((term): term is string => typeof term === "string") : [];
    const answerTerms = Array.isArray(event.metadata?.answers)
      ? event.metadata.answers.flatMap((answer) => extractIntentTokens(typeof answer === "string" ? answer : typeof answer?.answer === "string" ? answer.answer : ""))
      : [];
    const tokens = [...new Set([...metadataTerms, ...answerTerms, ...extractIntentTokens(query)].map(normalize).filter((term) => term.length > 2))];
    for (const term of tokens) {
      const existing = map.get(term) || { term, count: 0, sources: new Set<ExperienceType>(), examples: new Set<string>() };
      existing.count += 1;
      existing.sources.add(source);
      if (query) existing.examples.add(query);
      map.set(term, existing);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
}

function buildActions(report: Omit<DecisionGraphReport, "actions" | "hotspots">): DecisionGraphAction[] {
  const actions: DecisionGraphAction[] = [];
  const failedRule = report.ruleAudits.find((audit) => audit.status === "fail");
  const weakRuleCount = report.ruleAudits.filter((audit) => audit.status !== "pass").length;
  const missingConfig = report.configuratorAudits.find((audit) => audit.status === "fail");
  const missingTerm = report.termAudits.find((audit) => audit.status === "fail");

  if (!report.summary.products) {
    actions.push({
      id: "add-catalog-products",
      title: "Add active catalog products",
      detail: "The decision graph cannot prove recommendations until it can connect real products to signals and rules.",
      evidence: "No active products are available in the workspace.",
      severity: "critical",
      href: "/dashboard/products",
      label: "Add products",
    });
  }

  if (failedRule) {
    actions.push({
      id: "repair-unmapped-answer-rule",
      title: `Repair unmapped answer: “${failedRule.answerLabel}”`,
      detail: `${weakRuleCount} finder answer rule${weakRuleCount === 1 ? "" : "s"} do not connect cleanly to catalog signals.`,
      evidence: `${failedRule.quizName} → ${failedRule.questionTitle} uses ${failedRule.matchType}:${failedRule.matchValue || "blank"}.`,
      severity: "critical",
      href: "/dashboard/quizzes",
      label: "Fix finder rules",
    });
  }

  if (missingConfig) {
    actions.push({
      id: "repair-configurator-links",
      title: "Repair configurator product links",
      detail: "Configurator choices should point at active products so bundle totals, compatibility and buy clicks stay trustworthy.",
      evidence: `${missingConfig.configuratorName} → ${missingConfig.optionLabel}: ${missingConfig.detail}`,
      severity: "high",
      href: "/dashboard/configurators",
      label: "Fix configurator",
    });
  }

  if (missingTerm) {
    actions.push({
      id: "map-unresolved-shopper-language",
      title: `Map shopper language: “${missingTerm.term}”`,
      detail: "Observed shopper language is not represented in the catalog graph, which weakens semantic search and advisor recovery.",
      evidence: missingTerm.examples[0] ? `Example query: “${missingTerm.examples[0]}”.` : `${missingTerm.count} observed signal${missingTerm.count === 1 ? "" : "s"}.`,
      severity: "high",
      href: "/dashboard/products",
      label: "Enrich catalog",
    });
  }

  if (report.lanes.some((lane) => lane.id === "catalog" && lane.status !== "ready")) {
    actions.push({
      id: "strengthen-catalog-signals",
      title: "Strengthen catalog signal coverage",
      detail: "Products need buyer needs, tags, features and semantic text before AI explanations and semantic matching are convincing.",
      evidence: `${report.summary.signals} graph signals for ${report.summary.products} active products.`,
      severity: "medium",
      href: "/dashboard/products",
      label: "Run enrichment",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "run-graph-preflight",
      title: "Run launch preflight against this graph",
      detail: "The decision graph is connected enough for deeper production checks across recommendation QA, analytics and embedded runtime.",
      evidence: `Decision graph score is ${report.score}% with ${report.summary.edges} verified relationships.`,
      severity: "low",
      href: "/dashboard/preflight",
      label: "Run preflight",
    });
  }

  return actions;
}

export function buildDecisionGraph({ products, quizzes, configurators, events }: { products: Product[]; quizzes: Quiz[]; configurators: Configurator[]; events: AnalyticsEvent[] }): DecisionGraphReport {
  const activeProducts = products.filter((product) => product.active);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const signals = buildSignals(activeProducts);
  const nodes = new Map<string, DecisionGraphNode>();
  const edges = new Map<string, DecisionGraphEdge>();

  for (const product of activeProducts) {
    addNode(nodes, {
      id: `product:${product.id}`,
      type: "product",
      label: product.name,
      detail: `${product.category || "Uncategorized"} · ${formatCurrency(product.price)}`,
      status: productHasMeaningfulSignals(product) ? "pass" : "warn",
      weight: 4,
    });
  }

  for (const signal of signals.values()) {
    addNode(nodes, {
      id: signal.id,
      type: "signal",
      label: signal.label,
      detail: `${titleize(signal.type)} signal across ${signal.productIds.size} product${signal.productIds.size === 1 ? "" : "s"}`,
      status: signal.productIds.size >= 2 ? "pass" : "warn",
      weight: signal.productIds.size,
    });
    for (const productId of signal.productIds) {
      addEdge(edges, {
        source: `product:${productId}`,
        target: signal.id,
        label: signal.type.replace("_", " "),
        kind: "product_signal",
        status: signal.productIds.size >= 2 ? "pass" : "warn",
      });
    }
  }

  const ruleAudits: DecisionRuleAudit[] = [];
  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const questionNodeId = `question:${question.id}`;
      addNode(nodes, {
        id: questionNodeId,
        type: "question",
        label: question.title,
        detail: `${quiz.name} · ${question.options.length} answers`,
        status: question.options.length >= 2 ? "pass" : "warn",
        weight: 3,
      });

      for (const option of question.options) {
        const answerNodeId = `answer:${option.id}`;
        const matchingProducts = productsForRule(activeProducts, option.match_type, option.match_value);
        const linkedSignals = signalsForRule(signals, option.match_type, option.match_value, activeProducts);
        const status: DecisionGraphStatus = option.match_type === "none"
          ? "pass"
          : option.match_type === "budget_max"
            ? matchingProducts.length ? "pass" : "fail"
            : linkedSignals.length && matchingProducts.length ? "pass" : linkedSignals.length || matchingProducts.length ? "warn" : "fail";

        addNode(nodes, {
          id: answerNodeId,
          type: "answer",
          label: option.label,
          detail: option.match_type === "none" ? "Preference answer" : `${option.match_type}:${option.match_value || "blank"}`,
          status,
          weight: 2,
        });
        addEdge(edges, {
          source: questionNodeId,
          target: answerNodeId,
          label: "answer",
          kind: "question_flow",
          status,
        });
        if (option.next_question_id) {
          addEdge(edges, {
            source: answerNodeId,
            target: `question:${option.next_question_id}`,
            label: "branches to",
            kind: "question_flow",
            status: "pass",
          });
        }
        for (const signal of linkedSignals) {
          addNode(nodes, {
            id: signal.id,
            type: "signal",
            label: signal.label,
            detail: `${titleize(signal.type)} signal across ${signal.productIds.size} product${signal.productIds.size === 1 ? "" : "s"}`,
            status: status === "fail" ? "fail" : signal.productIds.size >= 2 ? "pass" : "warn",
            weight: signal.productIds.size || 1,
          });
          addEdge(edges, {
            source: answerNodeId,
            target: signal.id,
            label: option.match_type,
            kind: "answer_rule",
            status,
          });
        }

        ruleAudits.push({
          id: option.id,
          quizName: quiz.name,
          questionTitle: question.title,
          answerLabel: option.label,
          matchType: option.match_type,
          matchValue: option.match_value,
          status,
          linkedSignals: linkedSignals.map((signal) => signal.label),
          linkedProducts: matchingProducts.map((product) => product.name),
          detail: option.match_type === "none"
            ? "Preference-only answer keeps products eligible."
            : matchingProducts.length
              ? `Connects to ${matchingProducts.length} active product${matchingProducts.length === 1 ? "" : "s"}.`
              : "No active product currently satisfies this rule.",
        });
      }
    }
  }

  const configuratorAudits: DecisionConfiguratorAudit[] = [];
  for (const configurator of configurators) {
    const configuratorNodeId = `configurator:${configurator.id}`;
    addNode(nodes, {
      id: configuratorNodeId,
      type: "configurator",
      label: configurator.name,
      detail: `${configurator.steps.length} steps · ${configurator.published ? "Published" : "Draft"}`,
      status: configurator.steps.length >= 2 ? "pass" : "warn",
      weight: 3,
    });

    const optionNames = new Map(configurator.steps.flatMap((step) => step.options.map((option) => [option.id, option.label] as const)));
    for (const step of configurator.steps) {
      for (const option of step.options) {
        const optionNodeId = `option:${option.id}`;
        const linkedProduct = option.product_id ? productsById.get(option.product_id) : undefined;
        const status: DecisionGraphStatus = option.product_id ? linkedProduct?.active ? "pass" : "fail" : option.incompatible_option_ids.length ? "pass" : "warn";
        addNode(nodes, {
          id: optionNodeId,
          type: "option",
          label: option.label,
          detail: option.product_id ? linkedProduct ? `Links to ${linkedProduct.name}` : "Linked product is missing" : "No direct product link",
          status,
          weight: option.product_id ? 3 : 1,
        });
        addEdge(edges, {
          source: configuratorNodeId,
          target: optionNodeId,
          label: "option",
          kind: "question_flow",
          status,
        });
        if (linkedProduct) {
          addEdge(edges, {
            source: optionNodeId,
            target: `product:${linkedProduct.id}`,
            label: "linked product",
            kind: "configurator_product",
            status,
          });
        }
        for (const incompatibleId of option.incompatible_option_ids) {
          addEdge(edges, {
            source: optionNodeId,
            target: `option:${incompatibleId}`,
            label: "incompatible",
            kind: "compatibility",
            status: optionNames.has(incompatibleId) ? "pass" : "fail",
          });
        }
        configuratorAudits.push({
          id: option.id,
          configuratorName: configurator.name,
          optionLabel: option.label,
          status,
          linkedProductName: linkedProduct?.name,
          incompatibleOptions: option.incompatible_option_ids.map((id) => optionNames.get(id) || id),
          detail: option.product_id
            ? linkedProduct?.active ? `Product-linked to ${linkedProduct.name}.` : "Linked product is missing or inactive."
            : option.incompatible_option_ids.length ? "Compatibility-only option; no product link required." : "No product link or compatibility rule yet.",
        });
      }
    }
  }

  const productTexts = activeProducts.map((product) => ({ product, text: productText(product) }));
  const termAudits: DecisionTermAudit[] = observedTerms(events).map((observed) => {
    const matchingProducts = productTexts.filter((entry) => entry.text.includes(observed.term)).map((entry) => entry.product.name);
    const status: DecisionGraphStatus = matchingProducts.length >= 2 ? "pass" : matchingProducts.length === 1 ? "warn" : "fail";
    const termNodeId = `term:${observed.term}`;
    addNode(nodes, {
      id: termNodeId,
      type: "shopper_term",
      label: titleize(observed.term),
      detail: `${observed.count} observed signal${observed.count === 1 ? "" : "s"} · ${matchingProducts.length} matching products`,
      status,
      weight: observed.count,
    });
    const matchingSignal = [...signals.values()].find((signal) => signal.key === observed.term || signal.key.includes(observed.term) || observed.term.includes(signal.key));
    if (matchingSignal) {
      addEdge(edges, {
        source: termNodeId,
        target: matchingSignal.id,
        label: "maps to",
        kind: "shopper_language",
        status,
      });
    }
    return {
      term: observed.term,
      count: observed.count,
      status,
      matchingProducts,
      sources: [...observed.sources],
      examples: [...observed.examples].slice(0, 3),
      detail: matchingProducts.length ? `Covered by ${matchingProducts.slice(0, 3).join(", ")}.` : "No active product language covers this shopper term.",
    };
  });

  const meaningfulProducts = activeProducts.filter(productHasMeaningfulSignals).length;
  const catalogScore = activeProducts.length ? Math.round((meaningfulProducts / activeProducts.length) * 72 + Math.min(28, signals.size * 3)) : 0;
  const finderRuleCount = ruleAudits.filter((audit) => audit.matchType !== "none").length;
  const connectedRules = ruleAudits.filter((audit) => audit.matchType !== "none" && audit.status === "pass").length;
  const finderScore = finderRuleCount ? Math.round((connectedRules / finderRuleCount) * 100) : 0;
  const configuratorOptions = configuratorAudits.length;
  const productLinkedOptions = configuratorAudits.filter((audit) => audit.linkedProductName).length;
  const configuratorScore = configuratorOptions ? Math.round((configuratorAudits.filter((audit) => audit.status === "pass").length / configuratorOptions) * 100) : 0;
  const coveredTerms = termAudits.filter((audit) => audit.status !== "fail").length;
  const languageScore = termAudits.length ? Math.round((coveredTerms / termAudits.length) * 100) : 70;
  const lanes: DecisionGraphLane[] = [
    {
      id: "catalog",
      label: "Catalog signal graph",
      score: Math.min(100, catalogScore),
      status: nodeStatus(catalogScore),
      detail: `${meaningfulProducts}/${activeProducts.length} active products have rich matching language.`,
    },
    {
      id: "finder",
      label: "Finder rule graph",
      score: finderScore,
      status: nodeStatus(finderScore),
      detail: `${connectedRules}/${finderRuleCount} deterministic answer rules connect to active catalog facts.`,
    },
    {
      id: "configurator",
      label: "Configurator graph",
      score: configuratorScore,
      status: nodeStatus(configuratorScore),
      detail: `${productLinkedOptions}/${configuratorOptions} configurator options link to products; compatibility rules add guardrails.`,
    },
    {
      id: "language",
      label: "Shopper language graph",
      score: languageScore,
      status: nodeStatus(languageScore),
      detail: termAudits.length ? `${coveredTerms}/${termAudits.length} observed shopper terms map to product language.` : "No shopper language events yet; use Search Lab and public embeds to collect terms.",
    },
  ];
  const score = Math.round(lanes.reduce((sum, lane) => sum + lane.score, 0) / lanes.length);
  const partialReport = {
    status: graphStatus(score),
    score,
    summary: {
      products: activeProducts.length,
      signals: signals.size,
      edges: edges.size,
      finderRules: finderRuleCount,
      connectedRules,
      configuratorOptions,
      productLinkedOptions,
      unresolvedLanguageTerms: termAudits.filter((audit) => audit.status === "fail").length,
    },
    lanes,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    ruleAudits,
    configuratorAudits,
    termAudits,
  };

  const hotspots = partialReport.nodes
    .filter((node) => node.type === "signal" || node.type === "shopper_term")
    .sort((a, b) => (a.status === "fail" ? -1 : b.status === "fail" ? 1 : b.weight - a.weight || a.label.localeCompare(b.label)))
    .slice(0, 14);

  return {
    ...partialReport,
    actions: buildActions(partialReport),
    hotspots,
  };
}
