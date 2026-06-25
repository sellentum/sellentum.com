import type { AnswerOption, FinderAnswer, Question, Quiz } from "@/lib/types";

export type FinderAnswerSelection = {
  questionId: string;
  optionId: string;
};

export type FinderAnswerPathResult = {
  valid: boolean;
  completed: boolean;
  answers: FinderAnswer[];
  visitedQuestionIds: string[];
  missingQuestionId?: string;
  error?: string;
};

export type FinderQuestionPathStep = {
  index: number;
  question: Question;
  selectedOption?: AnswerOption;
};

export function orderedFinderQuestions(quiz: Pick<Quiz, "questions">): Question[] {
  return [...(quiz.questions || [])].sort((a, b) => a.position - b.position);
}

export function answerToFinderAnswer(question: Question, option: AnswerOption): FinderAnswer {
  return {
    questionId: question.id,
    question: question.title,
    optionId: option.id,
    answer: option.label,
    matchType: option.match_type,
    matchValue: option.match_value,
    weight: option.weight,
  };
}

export function getNextFinderQuestionIndex(
  quiz: Pick<Quiz, "questions">,
  currentIndex: number,
  selectedOption?: Pick<AnswerOption, "next_question_id">,
  visitedIndexes: number[] = [],
) {
  const questions = orderedFinderQuestions(quiz);
  const visited = new Set(visitedIndexes);
  const targetId = selectedOption?.next_question_id;

  if (targetId) {
    const targetIndex = questions.findIndex((question) => question.id === targetId);
    if (targetIndex >= 0 && targetIndex !== currentIndex && !visited.has(targetIndex)) return targetIndex;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex < questions.length && !visited.has(nextIndex)) return nextIndex;
  return -1;
}

export function buildFinderQuestionPath(
  quiz: Pick<Quiz, "questions">,
  selectionsByQuestionId: Record<string, string> = {},
  fillMissingWithFirstOption = false,
): FinderQuestionPathStep[] {
  const questions = orderedFinderQuestions(quiz);
  const path: FinderQuestionPathStep[] = [];
  const visitedIndexes: number[] = [];
  let currentIndex = 0;

  while (currentIndex >= 0 && currentIndex < questions.length) {
    if (visitedIndexes.includes(currentIndex)) break;
    const question = questions[currentIndex];
    const selectedOption = question.options.find((option) => option.id === selectionsByQuestionId[question.id]) || (fillMissingWithFirstOption ? question.options[0] : undefined);
    path.push({ index: currentIndex, question, selectedOption });
    visitedIndexes.push(currentIndex);
    if (!selectedOption) break;
    currentIndex = getNextFinderQuestionIndex(quiz, currentIndex, selectedOption, visitedIndexes);
  }

  return path;
}

export function defaultFinderSelections(quiz: Pick<Quiz, "questions">) {
  return Object.fromEntries(
    buildFinderQuestionPath(quiz, {}, true)
      .flatMap((step) => step.selectedOption ? [[step.question.id, step.selectedOption.id] as const] : []),
  );
}

export function resolveFinderAnswerPath(quiz: Pick<Quiz, "questions">, selections: FinderAnswerSelection[]): FinderAnswerPathResult {
  const questions = orderedFinderQuestions(quiz);
  if (!questions.length) return { valid: false, completed: false, answers: [], visitedQuestionIds: [], error: "Finder has no questions." };

  const selectionsByQuestionId = new Map<string, string>();
  for (const selection of selections) {
    if (!selectionsByQuestionId.has(selection.questionId)) selectionsByQuestionId.set(selection.questionId, selection.optionId);
  }

  const answers: FinderAnswer[] = [];
  const visitedIndexes: number[] = [];
  let currentIndex = 0;

  while (currentIndex >= 0 && currentIndex < questions.length) {
    if (visitedIndexes.includes(currentIndex)) {
      return { valid: false, completed: false, answers, visitedQuestionIds: visitedIndexes.map((index) => questions[index].id), error: "Finder flow contains a loop." };
    }

    const question = questions[currentIndex];
    visitedIndexes.push(currentIndex);
    const optionId = selectionsByQuestionId.get(question.id);
    if (!optionId) {
      return {
        valid: answers.length > 0,
        completed: false,
        answers,
        visitedQuestionIds: visitedIndexes.map((index) => questions[index].id),
        missingQuestionId: question.id,
      };
    }

    const option = question.options.find((item) => item.id === optionId);
    if (!option) {
      return {
        valid: false,
        completed: false,
        answers,
        visitedQuestionIds: visitedIndexes.map((index) => questions[index].id),
        missingQuestionId: question.id,
        error: "Selected answer does not belong to this finder path.",
      };
    }

    answers.push(answerToFinderAnswer(question, option));
    currentIndex = getNextFinderQuestionIndex(quiz, currentIndex, option, visitedIndexes);
  }

  return {
    valid: answers.length > 0,
    completed: answers.length > 0,
    answers,
    visitedQuestionIds: visitedIndexes.map((index) => questions[index].id),
  };
}
