export type MatchType = "tag" | "category" | "feature" | "budget_max" | "none";

export type Product = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  description: string;
  features: string[];
  tags: string[];
  product_url: string;
  active: boolean;
  search_text?: string;
  buyer_needs?: string[];
  enrichment_status?: "pending" | "enriched" | "failed";
  enriched_at?: string;
  created_at: string;
  updated_at: string;
};

export type ConfiguratorOption = {
  id: string;
  step_id: string;
  label: string;
  description: string;
  image_url: string;
  price_delta: number;
  product_id?: string;
  tags: string[];
  incompatible_option_ids: string[];
  position: number;
};

export type ConfiguratorStep = {
  id: string;
  configurator_id: string;
  title: string;
  helper_text: string;
  selection_type: "single" | "multi";
  required: boolean;
  position: number;
  options: ConfiguratorOption[];
};

export type Configurator = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  title: string;
  subtitle: string;
  hero_image_url: string;
  base_price: number;
  published: boolean;
  steps: ConfiguratorStep[];
  created_at: string;
  updated_at: string;
};

export type AnswerOption = {
  id: string;
  question_id: string;
  label: string;
  match_type: MatchType;
  match_value: string;
  weight: number;
  next_question_id?: string | null;
  position: number;
};

export type Question = {
  id: string;
  quiz_id: string;
  title: string;
  helper_text: string;
  position: number;
  options: AnswerOption[];
};

export type RecommendationOverrideAction = "boost" | "pin" | "exclude";

export type RecommendationOverride = {
  id: string;
  product_id: string;
  action: RecommendationOverrideAction;
  weight: number;
  note: string;
};

export type Quiz = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  welcome_title: string;
  welcome_message: string;
  published: boolean;
  recommendation_overrides: RecommendationOverride[];
  questions: Question[];
  created_at: string;
  updated_at: string;
};

export type AnalyticsEventType =
  | "widget_view"
  | "quiz_start"
  | "quiz_complete"
  | "product_recommended"
  | "buy_click"
  | "recommendation_feedback";

export type ExperienceType = "finder" | "assistant" | "configurator" | "search";

export type AnalyticsEvent = {
  id: string;
  user_id: string;
  quiz_id: string;
  product_id?: string;
  event_type: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type WidgetSettings = {
  user_id: string;
  brand_name: string;
  primary_color: string;
  button_text: string;
  widget_title: string;
  welcome_message: string;
  launcher_position: "bottom-right" | "bottom-left";
};

export type ProductInput = Omit<Product, "id" | "user_id" | "created_at" | "updated_at">;
export type ConfiguratorInput = Omit<Configurator, "id" | "user_id" | "created_at" | "updated_at">;

export type FinderAnswer = {
  questionId: string;
  question: string;
  optionId: string;
  answer: string;
  matchType: MatchType;
  matchValue: string;
  weight: number;
};

export type Recommendation = {
  product: Product;
  score: number;
  matchedReasons: string[];
  explanation?: string;
};

export type RecommendationComparison = {
  productId: string;
  bestFor: string;
  standout: string;
  tradeoff: string;
  proofPoints: string[];
};

export type MatchAuditSignal = {
  answer: string;
  matchType: MatchType;
  matchValue: string;
  matched: boolean;
  contribution: number;
  note: string;
  source?: "answer_rule" | "buyer_profile" | "pgvector" | "merchandising";
};

export type ProductMatchAudit = {
  product: Product;
  eligible: boolean;
  blockedReason?: string;
  score: number;
  matchedReasons: string[];
  signals: MatchAuditSignal[];
};

export type GeneratedQuizSuggestion = {
  name: string;
  welcome_title: string;
  welcome_message: string;
  questions: Array<{
    title: string;
    helper_text: string;
    options: Array<{
      label: string;
      match_type: MatchType;
      match_value: string;
      weight: number;
    }>;
  }>;
};

export type ConversationalMatch = {
  product: Product;
  score: number;
  explanation: string;
  matchedSignals: string[];
};
