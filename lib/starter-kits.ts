import type { Configurator, MatchType, ProductInput, Quiz } from "@/lib/types";
import { slugify, uid } from "@/lib/utils";

type StarterKitProduct = ProductInput & {
  key: string;
};

type StarterKitAnswerOption = {
  key: string;
  label: string;
  match_type: MatchType;
  match_value: string;
  weight: number;
  next_question_key?: string | null;
};

type StarterKitQuestion = {
  key: string;
  title: string;
  helper_text: string;
  options: StarterKitAnswerOption[];
};

type StarterKitConfiguratorOption = {
  key: string;
  label: string;
  description: string;
  image_url?: string;
  price_delta: number;
  product_key?: string;
  tags: string[];
  incompatible_option_keys?: string[];
};

type StarterKitConfiguratorStep = {
  key: string;
  title: string;
  helper_text: string;
  selection_type: "single" | "multi";
  required: boolean;
  options: StarterKitConfiguratorOption[];
};

export type StarterKit = {
  id: string;
  title: string;
  industry: string;
  useCase: string;
  description: string;
  audience: string;
  accent: string;
  highlights: string[];
  launchPlaybook: string[];
  products: StarterKitProduct[];
  quiz: {
    name: string;
    welcome_title: string;
    welcome_message: string;
    questions: StarterKitQuestion[];
  };
  configurator: {
    name: string;
    title: string;
    subtitle: string;
    hero_image_url: string;
    base_price: number;
    steps: StarterKitConfiguratorStep[];
  };
};

export type StarterKitReadiness = {
  score: number;
  status: "ready" | "review" | "blocked";
  checks: Array<{
    id: string;
    label: string;
    detail: string;
    status: "pass" | "warn" | "fail";
  }>;
};

export type StarterKitInstallPayload = {
  products: Array<{ id: string; input: ProductInput }>;
  quiz: Quiz;
  configurator: Configurator;
};

function product(
  key: string,
  input: ProductInput,
): StarterKitProduct {
  return { key, ...input };
}

export const starterKits: StarterKit[] = [
  {
    id: "performance-footwear",
    title: "Performance footwear finder",
    industry: "Footwear & apparel",
    useCase: "Fit, activity and budget matching",
    description: "A ready guided-selling path for brands helping shoppers choose running, trail or everyday footwear without overwhelming them.",
    audience: "Performance footwear teams with technical products, fit stories and activity-led shoppers.",
    accent: "#d9ff61",
    highlights: ["Activity-led finder", "Budget-safe matching", "Terrain-aware configurator"],
    launchPlaybook: [
      "Review product URLs and swap in your real hero images.",
      "Publish the finder after checking rule coverage for your top categories.",
      "Embed the modal on collection pages and inline search on PDP recommendation slots.",
    ],
    products: [
      product("trail-runner", {
        name: "Terra Trail Runner Pro",
        price: 128,
        image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
        category: "Trail running shoes",
        description: "Cushioned trail shoe with aggressive grip and water-resistant mesh for mixed outdoor miles.",
        features: ["Water-resistant mesh", "Aggressive trail grip", "High cushioning", "Stable heel platform"],
        tags: ["trail", "wet-weather", "high-cushion", "outdoors", "runner"],
        buyer_needs: ["wet-weather protection", "outdoor confidence", "soft landing"],
        search_text: "Best for wet trails, hiking paths, cushioned outdoor runs and runners who need grip in mixed weather.",
        product_url: "https://store.example/products/terra-trail-runner-pro",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
      product("city-knit", {
        name: "Aero City Knit",
        price: 92,
        image_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",
        category: "Everyday trainers",
        description: "Lightweight breathable trainer made for city commutes, travel days and all-day movement.",
        features: ["Lightweight knit", "Breathable upper", "Flexible sole", "Packable profile"],
        tags: ["city", "travel", "lightweight", "commute", "everyday"],
        buyer_needs: ["all-day comfort", "travel-friendly style", "lightweight commute"],
        search_text: "Best for city walking, daily errands, warm-weather travel and shoppers who want light flexible trainers.",
        product_url: "https://store.example/products/aero-city-knit",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
      product("carbon-tempo", {
        name: "Velocity Carbon Tempo",
        price: 184,
        image_url: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=85",
        category: "Race day shoes",
        description: "Responsive road shoe with a carbon propulsion plate for speedwork, race days and efficient toe-off.",
        features: ["Carbon propulsion plate", "Responsive foam", "Rocker geometry", "Lightweight upper"],
        tags: ["speed", "race", "responsive", "road-running", "lightweight"],
        buyer_needs: ["faster race pace", "springy toe-off", "competitive training"],
        search_text: "Best for road races, tempo sessions, speed workouts and shoppers who want a springy fast feel.",
        product_url: "https://store.example/products/velocity-carbon-tempo",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
    ],
    quiz: {
      name: "Performance footwear finder",
      welcome_title: "Find the shoe built for your next run",
      welcome_message: "Answer three quick questions and Sellentum will match activity, terrain and budget to the right product.",
      questions: [
        {
          key: "goal",
          title: "What will you use the shoes for most?",
          helper_text: "This anchors the category and buyer-intent signal.",
          options: [
            { key: "trail", label: "Trail runs and outdoor miles", match_type: "tag", match_value: "trail", weight: 5, next_question_key: "terrain" },
            { key: "city", label: "Commutes and city travel", match_type: "tag", match_value: "city", weight: 4, next_question_key: "budget" },
            { key: "speed", label: "Race day or speed sessions", match_type: "tag", match_value: "speed", weight: 5, next_question_key: "budget" },
          ],
        },
        {
          key: "terrain",
          title: "Which condition matters most?",
          helper_text: "Trail shoppers get a more specific terrain question; other shoppers skip ahead.",
          options: [
            { key: "wet", label: "Wet ground and mud", match_type: "tag", match_value: "wet-weather", weight: 5 },
            { key: "soft", label: "A softer landing", match_type: "feature", match_value: "High cushioning", weight: 3 },
            { key: "mixed", label: "A balanced everyday trail feel", match_type: "none", match_value: "", weight: 1 },
          ],
        },
        {
          key: "budget",
          title: "What budget should we stay within?",
          helper_text: "Budget remains a hard deterministic eligibility rule.",
          options: [
            { key: "under-100", label: "Up to £100", match_type: "budget_max", match_value: "100", weight: 5 },
            { key: "under-150", label: "Up to £150", match_type: "budget_max", match_value: "150", weight: 5 },
            { key: "best-match", label: "Show me the best match", match_type: "none", match_value: "", weight: 1 },
          ],
        },
      ],
    },
    configurator: {
      name: "Performance footwear kit configurator",
      title: "Build your running kit",
      subtitle: "Choose the anchor shoe, conditions and finishing touches while Sellentum keeps incompatible bundles out of the cart.",
      hero_image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85",
      base_price: 0,
      steps: [
        {
          key: "base",
          title: "Choose the shoe",
          helper_text: "This product anchors the final bundle and recommendation explanation.",
          selection_type: "single",
          required: true,
          options: [
            { key: "base-trail", label: "Terra Trail Runner Pro", description: "Cushioned, grippy and water resistant.", price_delta: 128, product_key: "trail-runner", tags: ["trail", "wet-weather"] },
            { key: "base-city", label: "Aero City Knit", description: "Lightweight comfort for city days.", price_delta: 92, product_key: "city-knit", tags: ["city", "travel"], incompatible_option_keys: ["mud-kit"] },
            { key: "base-speed", label: "Velocity Carbon Tempo", description: "Fast carbon-plated race feel.", price_delta: 184, product_key: "carbon-tempo", tags: ["speed", "race"], incompatible_option_keys: ["mud-kit", "wide-comfort"] },
          ],
        },
        {
          key: "conditions",
          title: "Match the conditions",
          helper_text: "Sellentum explains blocked combinations before the shopper reaches checkout.",
          selection_type: "single",
          required: true,
          options: [
            { key: "mud-kit", label: "Wet trails & mud", description: "Adds waterproofing guidance and traction-led copy.", price_delta: 12, tags: ["wet", "mud"], incompatible_option_keys: ["base-city", "base-speed"] },
            { key: "road-kit", label: "Road and park paths", description: "Keeps the bundle light and versatile.", price_delta: 0, tags: ["road", "everyday"] },
            { key: "race-kit", label: "Race day prep", description: "Prioritises speed laces and lightweight performance.", price_delta: 18, tags: ["race", "lightweight"] },
          ],
        },
        {
          key: "extras",
          title: "Add comfort extras",
          helper_text: "Optional add-ons adjust price and final explanation.",
          selection_type: "multi",
          required: false,
          options: [
            { key: "wide-comfort", label: "Wide comfort sock", description: "Extra comfort for longer days.", price_delta: 10, tags: ["comfort", "wide-fit"], incompatible_option_keys: ["base-speed"] },
            { key: "care-spray", label: "Weather care spray", description: "Useful for wet outdoor kits.", price_delta: 8, tags: ["care", "water"] },
          ],
        },
      ],
    },
  },
  {
    id: "beauty-routine",
    title: "Beauty routine finder",
    industry: "Beauty & skincare",
    useCase: "Skin goal and sensitivity matching",
    description: "A guided skincare routine builder that recommends a small set of products based on goals, tolerance and price comfort.",
    audience: "Skincare brands with goal-led education, bundles and ingredient-sensitive shoppers.",
    accent: "#f7c8d8",
    highlights: ["Goal-led quiz", "Sensitivity-safe tags", "Routine configurator"],
    launchPlaybook: [
      "Replace ingredient notes with your approved claims and compliance language.",
      "Use the configurator to build cleanser + serum + moisturiser bundles.",
      "Track buy clicks by routine goal to spot demand for hydration, glow or barrier repair.",
    ],
    products: [
      product("gel-cleanser", {
        name: "Cloud Gel Cleanser",
        price: 24,
        image_url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85",
        category: "Cleanser",
        description: "Gentle gel cleanser for daily use, balanced skin feel and low-friction routines.",
        features: ["Fragrance-free", "Aloe complex", "Low-foam gel", "Daily use"],
        tags: ["sensitive", "cleanse", "barrier", "gentle"],
        buyer_needs: ["gentle first step", "sensitive skin comfort", "routine reset"],
        search_text: "Best for sensitive skin, gentle cleansing, barrier support and daily low-irritation routines.",
        product_url: "https://store.example/products/cloud-gel-cleanser",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
      product("vitamin-serum", {
        name: "Glow C Serum",
        price: 42,
        image_url: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=85",
        category: "Serum",
        description: "Brightening daily serum designed for uneven tone, glow and lightweight layering.",
        features: ["Vitamin C derivative", "Lightweight texture", "Even-tone support", "AM routine"],
        tags: ["glow", "brightening", "uneven-tone", "lightweight"],
        buyer_needs: ["visible glow", "tone support", "non-heavy serum"],
        search_text: "Best for dullness, glow goals, uneven tone and shoppers wanting a lightweight brightening serum.",
        product_url: "https://store.example/products/glow-c-serum",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
      product("barrier-cream", {
        name: "Barrier Lock Cream",
        price: 36,
        image_url: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=85",
        category: "Moisturiser",
        description: "Rich moisturiser with ceramide support for dry, compromised or winter-stressed skin.",
        features: ["Ceramide blend", "Rich cream", "Overnight comfort", "Dry-skin support"],
        tags: ["hydration", "barrier", "dry-skin", "comfort"],
        buyer_needs: ["deep hydration", "barrier repair", "winter skin comfort"],
        search_text: "Best for dry skin, barrier repair, winter routines and shoppers who want a rich comforting moisturiser.",
        product_url: "https://store.example/products/barrier-lock-cream",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
    ],
    quiz: {
      name: "Beauty routine finder",
      welcome_title: "Build a routine your skin can stick with",
      welcome_message: "Tell Sellentum your goal, tolerance and budget. Product selection stays rule-based; explanation copy stays grounded.",
      questions: [
        {
          key: "skin-goal",
          title: "What is your main skincare goal?",
          helper_text: "Goal language maps to product tags and buyer needs.",
          options: [
            { key: "calm", label: "Calm sensitive skin", match_type: "tag", match_value: "sensitive", weight: 5 },
            { key: "glow", label: "Boost glow and tone", match_type: "tag", match_value: "glow", weight: 5 },
            { key: "hydration", label: "Repair dryness or barrier feel", match_type: "tag", match_value: "hydration", weight: 5 },
          ],
        },
        {
          key: "texture",
          title: "Which texture sounds best?",
          helper_text: "Texture helps explain why the product fits.",
          options: [
            { key: "gel", label: "Fresh gel texture", match_type: "feature", match_value: "gel", weight: 3 },
            { key: "lightweight", label: "Lightweight serum", match_type: "feature", match_value: "Lightweight", weight: 3 },
            { key: "rich", label: "Rich comfort cream", match_type: "feature", match_value: "Rich cream", weight: 3 },
          ],
        },
        {
          key: "beauty-budget",
          title: "What price range should we respect?",
          helper_text: "Sellentum treats budget as a hard rule.",
          options: [
            { key: "under-30", label: "Up to £30", match_type: "budget_max", match_value: "30", weight: 5 },
            { key: "under-45", label: "Up to £45", match_type: "budget_max", match_value: "45", weight: 5 },
            { key: "routine-best", label: "Best routine fit", match_type: "none", match_value: "", weight: 1 },
          ],
        },
      ],
    },
    configurator: {
      name: "Skincare routine configurator",
      title: "Build a three-step routine",
      subtitle: "Pick a base goal, treatment and moisturiser while Sellentum keeps sensitivity and texture choices clear.",
      hero_image_url: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=85",
      base_price: 0,
      steps: [
        {
          key: "base-cleanse",
          title: "Start with a cleanser",
          helper_text: "Anchor the routine with the most universal first step.",
          selection_type: "single",
          required: true,
          options: [
            { key: "cloud-cleanse", label: "Cloud Gel Cleanser", description: "Gentle daily cleanse for sensitive or barrier-first routines.", price_delta: 24, product_key: "gel-cleanser", tags: ["sensitive", "cleanse"] },
          ],
        },
        {
          key: "treatment",
          title: "Choose the treatment focus",
          helper_text: "Treatment choices alter the final routine explanation.",
          selection_type: "single",
          required: true,
          options: [
            { key: "glow-treatment", label: "Glow C Serum", description: "Best when the shopper prioritises glow and tone.", price_delta: 42, product_key: "vitamin-serum", tags: ["glow", "brightening"] },
            { key: "calm-treatment", label: "Skip active treatment", description: "A safer routine when sensitivity is the main concern.", price_delta: 0, tags: ["sensitive", "minimal"] },
          ],
        },
        {
          key: "seal",
          title: "Seal the routine",
          helper_text: "A moisturiser step makes the routine feel complete.",
          selection_type: "single",
          required: true,
          options: [
            { key: "barrier-cream", label: "Barrier Lock Cream", description: "Rich finish for hydration and barrier comfort.", price_delta: 36, product_key: "barrier-cream", tags: ["hydration", "barrier"] },
            { key: "light-finish", label: "Keep it lightweight", description: "No added cream when the shopper wants the lowest-friction routine.", price_delta: 0, tags: ["lightweight"] },
          ],
        },
      ],
    },
  },
  {
    id: "home-office",
    title: "Home office setup finder",
    industry: "Furniture & home electronics",
    useCase: "Workspace bundle and constraint matching",
    description: "A practical product finder for desks, chairs and accessories where shoppers need ergonomic guidance and space-fit confidence.",
    audience: "Home-office, furniture and work-from-home brands selling multiple setup paths.",
    accent: "#b7d7ff",
    highlights: ["Workspace constraints", "Ergonomic recommendations", "Bundle compatibility"],
    launchPlaybook: [
      "Update dimensions and delivery notes in product descriptions before publishing.",
      "Place the finder on workspace category pages and retarget zero-result intent terms.",
      "Use configurator QA to verify small-space and premium-bundle paths before launch.",
    ],
    products: [
      product("ergo-chair", {
        name: "Align Ergo Chair",
        price: 249,
        image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
        category: "Office chair",
        description: "Adjustable ergonomic chair with lumbar support for long working days.",
        features: ["Adjustable lumbar", "Breathable mesh", "Height adjustment", "Tilt support"],
        tags: ["ergonomic", "chair", "long-hours", "support"],
        buyer_needs: ["back support", "all-day work comfort", "ergonomic posture"],
        search_text: "Best for long working days, home office ergonomics, lumbar support and posture comfort.",
        product_url: "https://store.example/products/align-ergo-chair",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
      product("standing-desk", {
        name: "LiftFrame Standing Desk",
        price: 399,
        image_url: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=85",
        category: "Standing desk",
        description: "Electric height-adjustable desk for flexible sit-stand work and larger monitor setups.",
        features: ["Electric height adjustment", "Cable tray", "Wide desktop", "Memory presets"],
        tags: ["standing-desk", "premium", "sit-stand", "large-space"],
        buyer_needs: ["movement during work", "premium workspace", "multi-monitor desk"],
        search_text: "Best for sit stand work, premium home office setups, large desks and shoppers who use multiple monitors.",
        product_url: "https://store.example/products/liftframe-standing-desk",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
      product("task-lamp", {
        name: "FocusBeam Task Lamp",
        price: 69,
        image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
        category: "Desk lighting",
        description: "Compact adjustable task lamp with warm and cool modes for smaller desks.",
        features: ["Adjustable arm", "Warm/cool light modes", "Small footprint", "USB-C power"],
        tags: ["lighting", "small-space", "desk-accessory", "budget"],
        buyer_needs: ["better video-call lighting", "small desk upgrade", "low-cost setup improvement"],
        search_text: "Best for small desks, video call lighting, task lighting and budget-friendly workspace upgrades.",
        product_url: "https://store.example/products/focusbeam-task-lamp",
        active: true,
        enrichment_status: "enriched",
        enriched_at: new Date().toISOString(),
      }),
    ],
    quiz: {
      name: "Home office setup finder",
      welcome_title: "Design a workspace that fits how you work",
      welcome_message: "Sellentum will match your working style, space and budget to a reliable setup recommendation.",
      questions: [
        {
          key: "work-style",
          title: "What would improve your workday most?",
          helper_text: "The answer maps to ergonomic, movement or lighting signals.",
          options: [
            { key: "support", label: "Better back and posture support", match_type: "tag", match_value: "ergonomic", weight: 5 },
            { key: "movement", label: "More movement during the day", match_type: "tag", match_value: "sit-stand", weight: 5 },
            { key: "lighting", label: "Better lighting for focus and calls", match_type: "tag", match_value: "lighting", weight: 4 },
          ],
        },
        {
          key: "space",
          title: "How much room do you have?",
          helper_text: "Space constraints protect shoppers from poor-fit recommendations.",
          options: [
            { key: "small", label: "Small desk or shared room", match_type: "tag", match_value: "small-space", weight: 5 },
            { key: "large", label: "Dedicated office space", match_type: "tag", match_value: "large-space", weight: 4 },
            { key: "flex", label: "Flexible setup", match_type: "none", match_value: "", weight: 1 },
          ],
        },
        {
          key: "office-budget",
          title: "What budget should Sellentum stay under?",
          helper_text: "Budget is used as a hard filter before ranking.",
          options: [
            { key: "under-100", label: "Up to £100", match_type: "budget_max", match_value: "100", weight: 5 },
            { key: "under-300", label: "Up to £300", match_type: "budget_max", match_value: "300", weight: 5 },
            { key: "under-450", label: "Up to £450", match_type: "budget_max", match_value: "450", weight: 5 },
          ],
        },
      ],
    },
    configurator: {
      name: "Home office bundle configurator",
      title: "Build your workspace bundle",
      subtitle: "Create a practical office setup with clear ergonomic, space and price tradeoffs.",
      hero_image_url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
      base_price: 0,
      steps: [
        {
          key: "foundation",
          title: "Choose the foundation",
          helper_text: "Start with the biggest workspace upgrade.",
          selection_type: "single",
          required: true,
          options: [
            { key: "chair-foundation", label: "Align Ergo Chair", description: "Best for back support and long sitting days.", price_delta: 249, product_key: "ergo-chair", tags: ["ergonomic", "support"] },
            { key: "desk-foundation", label: "LiftFrame Standing Desk", description: "Best for sit-stand movement and larger setups.", price_delta: 399, product_key: "standing-desk", tags: ["sit-stand", "premium"], incompatible_option_keys: ["small-room"] },
          ],
        },
        {
          key: "space-fit",
          title: "Confirm the space",
          helper_text: "Space-fit choices flag incompatible large furniture.",
          selection_type: "single",
          required: true,
          options: [
            { key: "small-room", label: "Small room or compact desk", description: "Keeps the setup compact and accessory-led.", price_delta: 0, tags: ["small-space"], incompatible_option_keys: ["desk-foundation"] },
            { key: "dedicated-office", label: "Dedicated office", description: "Unlocks larger furniture and multi-monitor setups.", price_delta: 0, tags: ["large-space"] },
          ],
        },
        {
          key: "accessories",
          title: "Add helpful accessories",
          helper_text: "Optional add-ons improve the final setup recommendation.",
          selection_type: "multi",
          required: false,
          options: [
            { key: "lamp-addon", label: "FocusBeam Task Lamp", description: "Improves task work and video-call lighting.", price_delta: 69, product_key: "task-lamp", tags: ["lighting", "desk-accessory"] },
            { key: "cable-kit", label: "Cable management kit", description: "Keeps desk bundles neat and easier to install.", price_delta: 19, tags: ["organisation", "setup"] },
          ],
        },
      ],
    },
  },
];

export function getStarterKitById(id: string) {
  return starterKits.find((kit) => kit.id === id);
}

export function buildStarterKitReadiness(kit: StarterKit): StarterKitReadiness {
  const productKeys = new Set(kit.products.map((item) => item.key));
  const answerRules = kit.quiz.questions.flatMap((question) => question.options).filter((option) => option.match_type !== "none" && option.match_value.trim());
  const linkedOptions = kit.configurator.steps.flatMap((step) => step.options).filter((option) => option.product_key);
  const invalidProductLinks = linkedOptions.filter((option) => option.product_key && !productKeys.has(option.product_key));
  const conditionalRoutes = kit.quiz.questions.flatMap((question) => question.options).filter((option) => option.next_question_key);
  const questionKeys = new Set(kit.quiz.questions.map((question) => question.key));
  const invalidRoutes = conditionalRoutes.filter((option) => option.next_question_key && !questionKeys.has(option.next_question_key));

  const checks: StarterKitReadiness["checks"] = [
    {
      id: "products",
      label: "Starter catalog",
      detail: `${kit.products.length} products with images, commerce URLs, buyer needs and semantic search text.`,
      status: kit.products.length >= 3 ? "pass" : "fail",
    },
    {
      id: "finder-rules",
      label: "Finder rule coverage",
      detail: `${answerRules.length} deterministic answer rules across ${kit.quiz.questions.length} questions.`,
      status: kit.quiz.questions.length >= 3 && answerRules.length >= 6 ? "pass" : "warn",
    },
    {
      id: "configurator-links",
      label: "Configurator product links",
      detail: invalidProductLinks.length ? `${invalidProductLinks.length} option links need review.` : `${linkedOptions.length} configurator options link back to starter products.`,
      status: invalidProductLinks.length ? "fail" : linkedOptions.length >= 3 ? "pass" : "warn",
    },
    {
      id: "branching",
      label: "Conditional routing",
      detail: invalidRoutes.length ? `${invalidRoutes.length} answer branches point at missing questions.` : `${conditionalRoutes.length} answer branches are ready to install.`,
      status: invalidRoutes.length ? "fail" : "pass",
    },
  ];

  const failed = checks.filter((check) => check.status === "fail").length;
  const warned = checks.filter((check) => check.status === "warn").length;
  const score = Math.max(0, Math.round(100 - failed * 35 - warned * 12));
  return { score, status: failed ? "blocked" : warned ? "review" : "ready", checks };
}

export function materializeStarterKit(kit: StarterKit, userId = "demo-user"): StarterKitInstallPayload {
  const timestamp = new Date().toISOString();
  const suffix = uid("kit").replace(/^kit_/, "");
  const productIdByKey = new Map(kit.products.map((item) => [item.key, uid("prod")]));
  const questionIdByKey = new Map(kit.quiz.questions.map((question) => [question.key, uid("q")]));
  const configuratorOptionIdByKey = new Map(
    kit.configurator.steps.flatMap((step) => step.options.map((option) => [option.key, uid("config_opt")] as const)),
  );

  const products = kit.products.map(({ key, ...input }) => ({
    id: productIdByKey.get(key)!,
    input,
  }));

  const quizId = uid("quiz");
  const quiz: Quiz = {
    id: quizId,
    user_id: userId,
    name: kit.quiz.name,
    slug: `${slugify(kit.quiz.name)}-${suffix}`,
    welcome_title: kit.quiz.welcome_title,
    welcome_message: kit.quiz.welcome_message,
    published: false,
    recommendation_overrides: [],
    created_at: timestamp,
    updated_at: timestamp,
    questions: kit.quiz.questions.map((question, questionIndex) => {
      const questionId = questionIdByKey.get(question.key)!;
      return {
        id: questionId,
        quiz_id: quizId,
        title: question.title,
        helper_text: question.helper_text,
        position: questionIndex,
        options: question.options.map((option, optionIndex) => ({
          id: uid("opt"),
          question_id: questionId,
          label: option.label,
          match_type: option.match_type,
          match_value: option.match_value,
          weight: option.weight,
          next_question_id: option.next_question_key ? questionIdByKey.get(option.next_question_key) || null : null,
          position: optionIndex,
        })),
      };
    }),
  };

  const configuratorId = uid("config");
  const configurator: Configurator = {
    id: configuratorId,
    user_id: userId,
    name: kit.configurator.name,
    slug: `${slugify(kit.configurator.name)}-${suffix}`,
    title: kit.configurator.title,
    subtitle: kit.configurator.subtitle,
    hero_image_url: kit.configurator.hero_image_url,
    base_price: kit.configurator.base_price,
    published: false,
    created_at: timestamp,
    updated_at: timestamp,
    steps: kit.configurator.steps.map((step, stepIndex) => {
      const stepId = uid("config_step");
      return {
        id: stepId,
        configurator_id: configuratorId,
        title: step.title,
        helper_text: step.helper_text,
        selection_type: step.selection_type,
        required: step.required,
        position: stepIndex,
        options: step.options.map((option, optionIndex) => ({
          id: configuratorOptionIdByKey.get(option.key)!,
          step_id: stepId,
          label: option.label,
          description: option.description,
          image_url: option.image_url || "",
          price_delta: option.price_delta,
          product_id: option.product_key ? productIdByKey.get(option.product_key) : undefined,
          tags: option.tags,
          incompatible_option_ids: (option.incompatible_option_keys || []).map((key) => configuratorOptionIdByKey.get(key)).filter((id): id is string => Boolean(id)),
          position: optionIndex,
        })),
      };
    }),
  };

  return { products, quiz, configurator };
}
