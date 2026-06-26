import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export const DEMO_USER_ID = "demo-user";

const now = new Date().toISOString();

export const demoProducts: Product[] = [
  {
    id: "prod_trail",
    user_id: DEMO_USER_ID,
    name: "Terra Trail Runner",
    price: 128,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85",
    category: "Running shoes",
    description: "A cushioned all-terrain runner built for long weekend miles and mixed surfaces.",
    features: ["High cushioning", "Trail grip", "Water resistant"],
    tags: ["trail", "long-distance", "outdoors"],
    product_url: "https://example.com/products/terra-trail",
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "prod_city",
    user_id: DEMO_USER_ID,
    name: "Aero City Knit",
    price: 94,
    image_url: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1000&q=85",
    category: "Everyday shoes",
    description: "A breathable, lightweight knit for commutes, travel and everyday movement.",
    features: ["Lightweight", "Breathable", "Flexible sole"],
    tags: ["city", "travel", "everyday"],
    product_url: "https://example.com/products/aero-city",
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "prod_speed",
    user_id: DEMO_USER_ID,
    name: "Pulse Tempo Pro",
    price: 165,
    image_url: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=85",
    category: "Running shoes",
    description: "A responsive road shoe tuned for tempo sessions, race day and faster efforts.",
    features: ["Energy return", "Lightweight", "Road grip"],
    tags: ["speed", "road", "race"],
    product_url: "https://example.com/products/pulse-tempo",
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "prod_cloud",
    user_id: DEMO_USER_ID,
    name: "Cloud Rest Walker",
    price: 78,
    image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85",
    category: "Everyday shoes",
    description: "A soft, stable walking shoe made for comfort through long days on your feet.",
    features: ["High cushioning", "Stable base", "Wide fit"],
    tags: ["comfort", "walking", "everyday"],
    product_url: "https://example.com/products/cloud-rest",
    active: true,
    created_at: now,
    updated_at: now,
  },
];

export const demoQuiz: Quiz = {
  id: "quiz_footwear",
  user_id: DEMO_USER_ID,
  name: "Find your perfect pair",
  slug: "perfect-pair",
  welcome_title: "Let’s find your next favourite pair.",
  welcome_message: "Four quick questions. Thoughtful recommendations. No endless scrolling.",
  published: true,
  recommendation_overrides: [
    { id: "override_trail_boost", product_id: "prod_trail", action: "boost", weight: 2, note: "Seasonal trail campaign boost" },
  ],
  created_at: now,
  updated_at: now,
  questions: [
    {
      id: "q_use",
      quiz_id: "quiz_footwear",
      title: "Where will you wear them most?",
      helper_text: "Choose the setting that looks most like your week.",
      position: 0,
      options: [
        { id: "o_trail", question_id: "q_use", label: "Trails & outdoors", match_type: "tag", match_value: "trail", weight: 5, position: 0 },
        { id: "o_road", question_id: "q_use", label: "Road running", match_type: "category", match_value: "Running shoes", weight: 3, position: 1 },
        { id: "o_city", question_id: "q_use", label: "City & everyday", match_type: "tag", match_value: "everyday", weight: 5, next_question_id: "q_budget", position: 2 },
      ],
    },
    {
      id: "q_feel",
      quiz_id: "quiz_footwear",
      title: "What matters most underfoot?",
      helper_text: "We’ll prioritise this in your match.",
      position: 1,
      options: [
        { id: "o_soft", question_id: "q_feel", label: "Soft cushioning", match_type: "feature", match_value: "High cushioning", weight: 3, position: 0 },
        { id: "o_light", question_id: "q_feel", label: "Light and nimble", match_type: "feature", match_value: "Lightweight", weight: 3, position: 1 },
        { id: "o_stable", question_id: "q_feel", label: "Stable support", match_type: "feature", match_value: "Stable base", weight: 3, position: 2 },
      ],
    },
    {
      id: "q_budget",
      quiz_id: "quiz_footwear",
      title: "What’s your comfortable budget?",
      helper_text: "We’ll only suggest products within your range.",
      position: 2,
      options: [
        { id: "o_100", question_id: "q_budget", label: "Up to £100", match_type: "budget_max", match_value: "100", weight: 5, position: 0 },
        { id: "o_140", question_id: "q_budget", label: "Up to £140", match_type: "budget_max", match_value: "140", weight: 5, position: 1 },
        { id: "o_any", question_id: "q_budget", label: "Show me the best match", match_type: "none", match_value: "", weight: 1, position: 2 },
      ],
    },
  ],
};

export const demoConfigurator: Configurator = {
  id: "config_trail_kit",
  user_id: DEMO_USER_ID,
  name: "Trail kit configurator",
  slug: "trail-kit",
  title: "Build your weekend trail kit.",
  subtitle: "Choose a base shoe, match it to the conditions, then add comfort extras that fit the setup.",
  hero_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85",
  base_price: 0,
  published: true,
  created_at: now,
  updated_at: now,
  steps: [
    {
      id: "config_step_base",
      configurator_id: "config_trail_kit",
      title: "Choose the shoe that anchors the kit",
      helper_text: "This product becomes the main recommendation and sets the compatibility rules for the rest of the kit.",
      selection_type: "single",
      required: true,
      position: 0,
      options: [
        {
          id: "config_opt_terra",
          step_id: "config_step_base",
          label: "Terra Trail Runner",
          description: "Cushioned, grippy and water resistant for mixed outdoor miles.",
          image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
          price_delta: 128,
          product_id: "prod_trail",
          tags: ["trail", "water-ready", "cushioned"],
          incompatible_option_ids: [],
          position: 0,
        },
        {
          id: "config_opt_cloud",
          step_id: "config_step_base",
          label: "Cloud Rest Walker",
          description: "Stable all-day comfort for gentle walks, travel and urban exploring.",
          image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",
          price_delta: 78,
          product_id: "prod_cloud",
          tags: ["comfort", "walking", "wide-fit"],
          incompatible_option_ids: ["config_opt_mud", "config_opt_speed_laces"],
          position: 1,
        },
        {
          id: "config_opt_pulse",
          step_id: "config_step_base",
          label: "Pulse Tempo Pro",
          description: "Fast, responsive road feel for shoppers who want a lighter performance kit.",
          image_url: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=85",
          price_delta: 165,
          product_id: "prod_speed",
          tags: ["speed", "road", "lightweight"],
          incompatible_option_ids: ["config_opt_mud", "config_opt_wide_socks"],
          position: 2,
        },
      ],
    },
    {
      id: "config_step_conditions",
      configurator_id: "config_trail_kit",
      title: "Match the conditions",
      helper_text: "Findly disables choices that would create a poor-fit bundle.",
      selection_type: "single",
      required: true,
      position: 1,
      options: [
        {
          id: "config_opt_mud",
          step_id: "config_step_conditions",
          label: "Wet trails & mud",
          description: "Adds waterproof care and prioritises water-ready traction.",
          image_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
          price_delta: 12,
          tags: ["wet", "mud", "water-ready"],
          incompatible_option_ids: ["config_opt_cloud", "config_opt_pulse"],
          position: 0,
        },
        {
          id: "config_opt_gravel",
          step_id: "config_step_conditions",
          label: "Dry park paths",
          description: "Balanced setup for light trails, gravel paths and weekend walks.",
          image_url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=85",
          price_delta: 0,
          tags: ["gravel", "everyday"],
          incompatible_option_ids: [],
          position: 1,
        },
        {
          id: "config_opt_road",
          step_id: "config_step_conditions",
          label: "Road-to-trail mix",
          description: "Keeps the kit lighter for shoppers switching between pavement and compact trails.",
          image_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
          price_delta: 0,
          tags: ["road", "hybrid"],
          incompatible_option_ids: [],
          position: 2,
        },
      ],
    },
    {
      id: "config_step_comfort",
      configurator_id: "config_trail_kit",
      title: "Tune the feel",
      helper_text: "These options change the shopper-facing explanation and final bundle price.",
      selection_type: "single",
      required: false,
      position: 2,
      options: [
        {
          id: "config_opt_max_cushion",
          step_id: "config_step_comfort",
          label: "Maximum cushioning",
          description: "Best for longer days and shoppers who want a softer landing.",
          image_url: "",
          price_delta: 8,
          tags: ["cushioned", "long-distance"],
          incompatible_option_ids: [],
          position: 0,
        },
        {
          id: "config_opt_light_feel",
          step_id: "config_step_comfort",
          label: "Lighter feel",
          description: "Keeps the setup nimble and less bulky.",
          image_url: "",
          price_delta: 0,
          tags: ["lightweight"],
          incompatible_option_ids: [],
          position: 1,
        },
        {
          id: "config_opt_wide_socks",
          step_id: "config_step_comfort",
          label: "Wide-fit comfort socks",
          description: "Adds a roomier sock recommendation for comfort-first shoppers.",
          image_url: "",
          price_delta: 14,
          tags: ["wide-fit", "comfort"],
          incompatible_option_ids: ["config_opt_pulse"],
          position: 2,
        },
      ],
    },
    {
      id: "config_step_addons",
      configurator_id: "config_trail_kit",
      title: "Add optional extras",
      helper_text: "Multi-select add-ons turn a single product recommendation into a useful bundle.",
      selection_type: "multi",
      required: false,
      position: 3,
      options: [
        {
          id: "config_opt_care",
          step_id: "config_step_addons",
          label: "Waterproof care kit",
          description: "Care spray and brush for wetter routes.",
          image_url: "",
          price_delta: 18,
          tags: ["care", "water-ready"],
          incompatible_option_ids: [],
          position: 0,
        },
        {
          id: "config_opt_speed_laces",
          step_id: "config_step_addons",
          label: "Race-lock laces",
          description: "Performance laces for a secure faster feel.",
          image_url: "",
          price_delta: 12,
          tags: ["speed", "race"],
          incompatible_option_ids: ["config_opt_cloud"],
          position: 1,
        },
        {
          id: "config_opt_socks",
          step_id: "config_step_addons",
          label: "Trail socks",
          description: "Moisture-wicking socks for longer walks and runs.",
          image_url: "",
          price_delta: 16,
          tags: ["comfort", "trail"],
          incompatible_option_ids: [],
          position: 2,
        },
      ],
    },
  ],
};

export const demoSettings: WidgetSettings = {
  user_id: DEMO_USER_ID,
  brand_name: "Northstar Goods",
  primary_color: "#22352a",
  button_text: "Find my match",
  widget_title: "Your personal product guide",
  welcome_message: "Answer a few quick questions and we’ll narrow down the good stuff.",
  launcher_position: "bottom-right",
};

const demoFinderAnswers = [
  { question_id: "q_use", question: "Where will you wear them most?", option_id: "o_trail", answer: "Trails & outdoors", match_type: "tag", match_value: "trail", weight: 5 },
  { question_id: "q_feel", question: "What matters most underfoot?", option_id: "o_soft", answer: "Soft cushioning", match_type: "feature", match_value: "High cushioning", weight: 3 },
  { question_id: "q_budget", question: "What’s your comfortable budget?", option_id: "o_140", answer: "Up to £140", match_type: "budget_max", match_value: "140", weight: 5 },
];

const demoAdvisorQueries = [
  { query: "Comfortable shoes for wet weekend trails under £140", terms: ["comfort", "wet", "trail"], max_budget: 140 },
  { query: "A lightweight pair for city travel", terms: ["lightweight", "city", "travel"], max_budget: null },
  { query: "Something responsive for faster road running", terms: ["responsive", "speed", "road"], max_budget: null },
];

const demoConfiguratorMetadata = {
  experience_type: "configurator",
  experience_id: demoConfigurator.id,
  experience_name: demoConfigurator.name,
  experience_slug: demoConfigurator.slug,
  selections: ["config_opt_terra", "config_opt_mud", "config_opt_max_cushion", "config_opt_care"],
  selected_option_names: ["Terra Trail Runner", "Wet trails & mud", "Maximum cushioning", "Waterproof care kit"],
  selected_tags: ["trail", "water-ready", "cushioned", "wet", "mud", "long-distance", "care"],
  total: 166,
  progress: 100,
};

const demoGapDate = new Date();
demoGapDate.setDate(demoGapDate.getDate() - 1);

export const demoEvents: AnalyticsEvent[] = [
  ...Array.from({ length: 84 }, (_, index) => {
    const types: AnalyticsEvent["event_type"][] = ["widget_view", "quiz_start", "widget_view", "product_recommended", "quiz_complete", "buy_click"];
    const eventType = types[index % types.length];
    const product = demoProducts[index % demoProducts.length];
    const date = new Date();
    date.setDate(date.getDate() - (index % 14));
    const advisor = demoAdvisorQueries[index % demoAdvisorQueries.length];
    const isConfigurator = index % 7 === 0;
    const isAssistant = !isConfigurator && index % 11 === 0;
    const isSearch = !isConfigurator && !isAssistant && index % 13 === 0;
    const sessionMetadata = { session_id: `demo_session_${Math.floor(index / 6)}`, session_started_at: date.toISOString() };
    const contractMetadata = {
      ...(eventType === "quiz_complete" ? { result_count: 3, recovery_status: "healthy" } : {}),
      ...(eventType === "product_recommended" ? { rank: index % 3 + 1, score: 4 + index % 5, confidence: "high" } : {}),
      ...(eventType === "buy_click" ? { rank: index % 3 + 1 } : {}),
    };
    return {
      id: `event_${index}`,
      user_id: DEMO_USER_ID,
      quiz_id: isConfigurator ? demoConfigurator.id : demoQuiz.id,
      product_id: eventType === "product_recommended" || eventType === "buy_click" ? product.id : undefined,
      event_type: eventType,
      metadata: isConfigurator
        ? { ...demoConfiguratorMetadata, ...sessionMetadata, ...contractMetadata, product_name: product.name }
        : isAssistant
          ? { experience_type: "assistant", experience_id: demoQuiz.id, experience_name: demoQuiz.name, ...sessionMetadata, ...contractMetadata, query: advisor.query, terms: advisor.terms, max_budget: advisor.max_budget, source: "rules", matched_signals: advisor.terms, product_name: product.name }
          : isSearch
            ? { experience_type: "search", experience_id: demoQuiz.id, experience_name: demoQuiz.name, ...sessionMetadata, ...contractMetadata, query: advisor.query, terms: advisor.terms, search_action: "search_submit", matched_signals: advisor.terms, product_name: product.name }
            : { experience_type: "finder", experience_id: demoQuiz.id, experience_name: demoQuiz.name, ...sessionMetadata, ...contractMetadata, answers: demoFinderAnswers, answer_summary: demoFinderAnswers.map((answer) => answer.answer), matched_reasons: ["Trails & outdoors", "Soft cushioning"], product_name: product.name },
      created_at: date.toISOString(),
    };
  }),
  {
    id: "event_gap_search_0",
    user_id: DEMO_USER_ID,
    quiz_id: demoQuiz.id,
    event_type: "quiz_start",
    metadata: {
      experience_type: "search",
      experience_id: demoQuiz.id,
      experience_name: demoQuiz.name,
      session_id: "demo_gap_search",
      session_started_at: demoGapDate.toISOString(),
      search_action: "search_submit",
      query: "orthopedic office shoe under £90",
      terms: ["orthopedic", "office"],
      max_budget: 90,
      result_count: 0,
    },
    created_at: demoGapDate.toISOString(),
  },
  {
    id: "event_gap_finder_0",
    user_id: DEMO_USER_ID,
    quiz_id: demoQuiz.id,
    event_type: "quiz_complete",
    metadata: {
      experience_type: "finder",
      experience_id: demoQuiz.id,
      experience_name: demoQuiz.name,
      session_id: "demo_gap_finder",
      session_started_at: demoGapDate.toISOString(),
      answers: [
        { question: "Where will you wear them most?", answer: "Office comfort" },
        { question: "What’s your comfortable budget?", answer: "Under £50" },
      ],
      answer_summary: ["Office comfort", "Under £50"],
      question_path: ["q_use", "q_budget"],
      result_count: 0,
      recovery_status: "no-results",
      recovery_primary_action: "Relax the budget or add office-comfort catalog signals.",
    },
    created_at: demoGapDate.toISOString(),
  },
];
