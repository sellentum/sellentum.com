"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { demoConfigurator, demoEvents, demoProducts, demoQuiz, demoSettings, DEMO_USER_ID } from "@/lib/demo-data";
import { normalizeAllowedDomains } from "@/lib/domain-allowlist";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AnalyticsEvent, AnalyticsEventType, Configurator, Product, ProductInput, Quiz, WidgetSettings } from "@/lib/types";
import { uid } from "@/lib/utils";
import { createDefaultWorkspaceSettings } from "@/lib/workspace-onboarding";

type StoreContextValue = {
  ready: boolean;
  mode: "demo" | "supabase";
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  error: string | null;
  saveProduct: (input: ProductInput, id?: string) => Promise<void>;
  importProducts: (items: ProductInput[]) => Promise<number>;
  deleteProduct: (id: string) => Promise<void>;
  saveQuiz: (quiz: Quiz) => Promise<void>;
  createQuiz: () => Quiz;
  deleteQuiz: (id: string) => Promise<void>;
  saveConfigurator: (configurator: Configurator) => Promise<void>;
  createConfigurator: () => Configurator;
  deleteConfigurator: (id: string) => Promise<void>;
  saveSettings: (settings: WidgetSettings) => Promise<void>;
  recordEvent: (type: AnalyticsEventType, quizId: string, productId?: string, metadata?: Record<string, unknown>) => Promise<void>;
  recordPreviewEvent: (type: AnalyticsEventType, quizId: string, productId?: string, metadata?: Record<string, unknown>) => Promise<void>;
  resetDemo: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const STORAGE_KEY = "sellentum-demo-state-v2";

type DemoState = { products: Product[]; quizzes: Quiz[]; configurators: Configurator[]; events: AnalyticsEvent[]; settings: WidgetSettings };
const initialState: DemoState = { products: demoProducts, quizzes: [demoQuiz], configurators: [demoConfigurator], events: demoEvents, settings: demoSettings };

function normalizeQuizState(quiz: Quiz): Quiz {
  return {
    ...quiz,
    recommendation_overrides: quiz.recommendation_overrides || [],
    questions: (quiz.questions || []).map((question) => ({
      ...question,
      options: (question.options || []).map((option) => ({ ...option, next_question_id: option.next_question_id || null })),
    })),
  };
}

function normalizeDemoState(state: DemoState): DemoState {
  return { ...state, quizzes: (state.quizzes || []).map(normalizeQuizState) };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<DemoState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const mode: "demo" | "supabase" = isSupabaseConfigured() ? "supabase" : "demo";

  useEffect(() => {
    async function hydrate() {
      if (mode === "demo") {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) setState(normalizeDemoState(JSON.parse(saved) as DemoState));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        } finally {
          setReady(true);
        }
        return;
      }

      const supabase = createClient();
      if (!supabase) return;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        setReady(true);
        return;
      }

      const [productsResult, quizzesResult, eventsResult, settingsResult] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("quizzes").select("*, questions(*, answer_options(*))").order("created_at", { ascending: false }),
        supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("widget_settings").select("*").maybeSingle(),
      ]);
      const configuratorsResult = await supabase.from("configurators").select("*, steps:configurator_steps(*, options:configurator_options(*))").order("created_at", { ascending: false });

      const firstError = productsResult.error || quizzesResult.error || eventsResult.error || settingsResult.error || configuratorsResult.error;
      if (firstError) setError(firstError.message);
      setState({
        products: (productsResult.data as Product[]) || [],
        quizzes: ((quizzesResult.data || []) as unknown as Quiz[]).map((quiz) => ({
          ...quiz,
          recommendation_overrides: quiz.recommendation_overrides || [],
          questions: [...(quiz.questions || [])]
            .sort((a, b) => a.position - b.position)
            .map((q) => ({ ...q, options: [...(q.options || (q as unknown as { answer_options: typeof q.options }).answer_options || [])].sort((a, b) => a.position - b.position).map((option) => ({ ...option, next_question_id: option.next_question_id || null })) })),
        })),
        configurators: ((configuratorsResult.data || []) as unknown as Configurator[]).map((configurator) => ({
          ...configurator,
          steps: [...(configurator.steps || [])]
            .sort((a, b) => a.position - b.position)
            .map((step) => ({ ...step, options: [...(step.options || [])].sort((a, b) => a.position - b.position) })),
        })),
        events: (eventsResult.data as AnalyticsEvent[]) || [],
        settings: settingsResult.data
          ? { ...createDefaultWorkspaceSettings(userId), ...(settingsResult.data as WidgetSettings), allowed_domains: normalizeAllowedDomains((settingsResult.data as Partial<WidgetSettings>).allowed_domains) }
          : createDefaultWorkspaceSettings(userId),
      });
      setReady(true);
    }
    hydrate();
  }, [mode]);

  useEffect(() => {
    if (ready && mode === "demo") localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mode, ready, state]);

  const saveProduct = useCallback(async (input: ProductInput, id?: string) => {
    setError(null);
    const timestamp = new Date().toISOString();
    const existing = id ? state.products.find((p) => p.id === id) : undefined;
    const next: Product = {
      ...existing,
      ...input,
      id: id || uid("prod"),
      user_id: DEMO_USER_ID,
      created_at: existing?.created_at || timestamp,
      updated_at: timestamp,
    };

    if (mode === "supabase") {
      const supabase = createClient()!;
      const { data: authData } = await supabase.auth.getUser();
      const payload = { ...next, user_id: authData.user!.id };
      const { error: saveError } = await supabase.from("products").upsert(payload);
      if (saveError) { setError(saveError.message); throw saveError; }
      next.user_id = payload.user_id;
    }
    setState((current) => ({ ...current, products: id ? current.products.map((p) => p.id === id ? next : p) : [next, ...current.products] }));
  }, [mode, state.products]);

  const importProducts = useCallback(async (items: ProductInput[]) => {
    for (const item of items) await saveProduct(item);
    return items.length;
  }, [saveProduct]);

  const deleteProduct = useCallback(async (id: string) => {
    if (mode === "supabase") {
      const { error: deleteError } = await createClient()!.from("products").delete().eq("id", id);
      if (deleteError) { setError(deleteError.message); throw deleteError; }
    }
    setState((current) => ({ ...current, products: current.products.filter((p) => p.id !== id) }));
  }, [mode]);

  const createQuiz = useCallback((): Quiz => {
    const id = uid("quiz");
    const timestamp = new Date().toISOString();
    return {
      id, user_id: DEMO_USER_ID, name: "Untitled product finder", slug: `finder-${Date.now()}`,
      welcome_title: "Let’s find your perfect match", welcome_message: "Answer a few quick questions to get a personalised recommendation.",
      published: false, recommendation_overrides: [], questions: [], created_at: timestamp, updated_at: timestamp,
    };
  }, []);

  const saveQuiz = useCallback(async (quiz: Quiz) => {
    const next = { ...quiz, recommendation_overrides: quiz.recommendation_overrides || [], updated_at: new Date().toISOString() };
    if (mode === "supabase") {
      const supabase = createClient()!;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user!.id;
      next.user_id = userId;
      const payload = {
        ...next,
        user_id: userId,
        questions: next.questions.map((question) => ({
          ...question,
          quiz_id: next.id,
          options: question.options.map((option) => ({
            ...option,
            question_id: question.id,
            next_question_id: option.next_question_id || null,
          })),
        })),
      };
      const { error: quizError } = await supabase.rpc("save_quiz_with_children", { payload });
      if (quizError) { setError(quizError.message); throw quizError; }
    }
    setState((current) => ({ ...current, quizzes: current.quizzes.some((q) => q.id === next.id) ? current.quizzes.map((q) => q.id === next.id ? next : q) : [next, ...current.quizzes] }));
  }, [mode]);

  const deleteQuiz = useCallback(async (id: string) => {
    if (mode === "supabase") {
      const { error: deleteError } = await createClient()!.from("quizzes").delete().eq("id", id);
      if (deleteError) { setError(deleteError.message); throw deleteError; }
    }
    setState((current) => ({ ...current, quizzes: current.quizzes.filter((q) => q.id !== id) }));
  }, [mode]);

  const createConfigurator = useCallback((): Configurator => {
    const id = uid("config");
    const timestamp = new Date().toISOString();
    return {
      id,
      user_id: DEMO_USER_ID,
      name: "Untitled configurator",
      slug: `configurator-${Date.now()}`,
      title: "Build your ideal bundle",
      subtitle: "Choose the options that fit your needs and we’ll keep the setup compatible.",
      hero_image_url: "",
      base_price: 0,
      published: false,
      steps: [],
      created_at: timestamp,
      updated_at: timestamp,
    };
  }, []);

  const saveConfigurator = useCallback(async (configurator: Configurator) => {
    const next = { ...configurator, updated_at: new Date().toISOString() };
    if (mode === "supabase") {
      const supabase = createClient()!;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user!.id;
      next.user_id = userId;
      const payload = {
        ...next,
        user_id: userId,
        steps: next.steps.map((step) => ({
          ...step,
          configurator_id: next.id,
          options: step.options.map((option) => ({
            ...option,
            step_id: step.id,
            product_id: option.product_id || null,
            tags: option.tags || [],
            incompatible_option_ids: option.incompatible_option_ids || [],
          })),
        })),
      };
      const { error: configuratorError } = await supabase.rpc("save_configurator_with_children", { payload });
      if (configuratorError) { setError(configuratorError.message); throw configuratorError; }
    }
    setState((current) => ({ ...current, configurators: current.configurators.some((item) => item.id === next.id) ? current.configurators.map((item) => item.id === next.id ? next : item) : [next, ...current.configurators] }));
  }, [mode]);

  const deleteConfigurator = useCallback(async (id: string) => {
    if (mode === "supabase") {
      const { error: deleteError } = await createClient()!.from("configurators").delete().eq("id", id);
      if (deleteError) { setError(deleteError.message); throw deleteError; }
    }
    setState((current) => ({ ...current, configurators: current.configurators.filter((item) => item.id !== id) }));
  }, [mode]);

  const saveSettings = useCallback(async (settings: WidgetSettings) => {
    let next = { ...settings, allowed_domains: normalizeAllowedDomains(settings.allowed_domains) };
    if (mode === "supabase") {
      const supabase = createClient()!;
      const { data: authData } = await supabase.auth.getUser();
      next = { ...next, user_id: authData.user!.id };
      const { error: settingsError } = await supabase.from("widget_settings").upsert(next);
      if (settingsError) { setError(settingsError.message); throw settingsError; }
    }
    setState((current) => ({ ...current, settings: next }));
  }, [mode]);

  const recordPreviewEvent = useCallback(async (eventType: AnalyticsEventType, quizId: string, productId?: string, metadata?: Record<string, unknown>) => {
    const owner = state.quizzes.find((item) => item.id === quizId)?.user_id || state.configurators.find((item) => item.id === quizId)?.user_id || DEMO_USER_ID;
    const event: AnalyticsEvent = { id: uid("event"), user_id: owner, quiz_id: quizId, product_id: productId, event_type: eventType, metadata, created_at: new Date().toISOString() };
    setState((current) => ({ ...current, events: [event, ...current.events] }));
  }, [state.quizzes, state.configurators]);

  const recordEvent = useCallback(async (eventType: AnalyticsEventType, quizId: string, productId?: string, metadata?: Record<string, unknown>) => {
    const owner = state.quizzes.find((item) => item.id === quizId)?.user_id || state.configurators.find((item) => item.id === quizId)?.user_id || DEMO_USER_ID;
    const event: AnalyticsEvent = { id: uid("event"), user_id: owner, quiz_id: quizId, product_id: productId, event_type: eventType, metadata, created_at: new Date().toISOString() };
    if (mode === "supabase") {
      const response = await fetch("/api/workspace/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, quizId, productId, metadata }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; event?: AnalyticsEvent };
      if (!response.ok) {
        const message = payload.error || "Could not record workspace analytics event.";
        setError(message);
        throw new Error(message);
      }
      setState((current) => ({ ...current, events: [payload.event || event, ...current.events] }));
      return;
    }
    setState((current) => ({ ...current, events: [event, ...current.events] }));
  }, [mode, state.quizzes, state.configurators]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(normalizeDemoState(initialState));
  }, []);

  const value = useMemo(() => ({ ready, mode, products: state.products, quizzes: state.quizzes, configurators: state.configurators, events: state.events, settings: state.settings, error, saveProduct, importProducts, deleteProduct, saveQuiz, createQuiz, deleteQuiz, saveConfigurator, createConfigurator, deleteConfigurator, saveSettings, recordEvent, recordPreviewEvent, resetDemo }), [ready, mode, state, error, saveProduct, importProducts, deleteProduct, saveQuiz, createQuiz, deleteQuiz, saveConfigurator, createConfigurator, deleteConfigurator, saveSettings, recordEvent, recordPreviewEvent, resetDemo]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
