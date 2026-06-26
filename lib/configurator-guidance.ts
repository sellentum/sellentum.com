import type { Configurator, ConfiguratorOption } from "@/lib/types";
import { flattenConfiguratorOptions, getConfiguratorOption, optionConflictsWithSelection } from "@/lib/utils";

export type ConfiguratorConflict = {
  optionId: string;
  optionLabel: string;
  selectedOptionId: string;
  selectedOptionLabel: string;
  direction: "option_blocks_selected" | "selected_blocks_option" | "mutual";
  reason: string;
};

export type ConfiguratorOptionGuidance = {
  optionId: string;
  blocked: boolean;
  conflicts: ConfiguratorConflict[];
  explanation: string;
  suggestion: string;
  safeAlternativeIds: string[];
};

export type ConfiguratorSelectionGuidance = {
  selectedIds: string[];
  blockedOptions: ConfiguratorOptionGuidance[];
  availableOptions: ConfiguratorOptionGuidance[];
  summary: string;
};

function conflictDirection(option: ConfiguratorOption, selected: ConfiguratorOption): ConfiguratorConflict["direction"] | null {
  const optionBlocksSelected = option.incompatible_option_ids.includes(selected.id);
  const selectedBlocksOption = selected.incompatible_option_ids.includes(option.id);
  if (optionBlocksSelected && selectedBlocksOption) return "mutual";
  if (optionBlocksSelected) return "option_blocks_selected";
  if (selectedBlocksOption) return "selected_blocks_option";
  return null;
}

function conflictReason(option: ConfiguratorOption, selected: ConfiguratorOption, direction: ConfiguratorConflict["direction"]) {
  if (direction === "mutual") return `${option.label} and ${selected.label} are marked as incompatible with each other.`;
  if (direction === "option_blocks_selected") return `${option.label} is configured to block ${selected.label}.`;
  return `${selected.label} is configured to block ${option.label}.`;
}

export function getConfiguratorOptionConflicts(configurator: Configurator, optionId: string, selectedIds: string[]): ConfiguratorConflict[] {
  const option = getConfiguratorOption(configurator, optionId);
  if (!option) return [];
  return selectedIds.flatMap((selectedId) => {
    if (selectedId === option.id) return [];
    const selected = getConfiguratorOption(configurator, selectedId);
    if (!selected) return [];
    const direction = conflictDirection(option, selected);
    if (!direction) return [];
    return [{
      optionId: option.id,
      optionLabel: option.label,
      selectedOptionId: selected.id,
      selectedOptionLabel: selected.label,
      direction,
      reason: conflictReason(option, selected, direction),
    }];
  });
}

function safeAlternatives(configurator: Configurator, option: ConfiguratorOption, selectedIds: string[]) {
  const step = configurator.steps.find((item) => item.id === option.step_id);
  if (!step) return [];
  return step.options
    .filter((candidate) => candidate.id !== option.id && !selectedIds.includes(candidate.id) && !optionConflictsWithSelection(candidate, selectedIds, configurator))
    .map((candidate) => candidate.id)
    .slice(0, 3);
}

export function buildConfiguratorOptionGuidance(configurator: Configurator, optionId: string, selectedIds: string[]): ConfiguratorOptionGuidance | null {
  const option = getConfiguratorOption(configurator, optionId);
  if (!option) return null;
  const conflicts = getConfiguratorOptionConflicts(configurator, optionId, selectedIds);
  const blocked = conflicts.length > 0;
  const alternatives = safeAlternatives(configurator, option, selectedIds);
  const conflictNames = conflicts.map((conflict) => conflict.selectedOptionLabel);

  return {
    optionId,
    blocked,
    conflicts,
    explanation: blocked
      ? `${option.label} is unavailable because it conflicts with ${conflictNames.slice(0, 2).join(conflictNames.length > 2 ? ", " : " and ")}.`
      : `${option.label} is compatible with the choices selected so far.`,
    suggestion: blocked
      ? alternatives.length
        ? "Choose a compatible alternative in this step, or go back and change the conflicting selection."
        : "Go back and change the conflicting selection to unlock this option."
      : "Safe to add to this configuration.",
    safeAlternativeIds: alternatives,
  };
}

export function buildConfiguratorSelectionGuidance(configurator: Configurator, selectedIds: string[]): ConfiguratorSelectionGuidance {
  const optionGuidance = flattenConfiguratorOptions(configurator)
    .map((option) => buildConfiguratorOptionGuidance(configurator, option.id, selectedIds))
    .filter((item): item is ConfiguratorOptionGuidance => Boolean(item));
  const blockedOptions = optionGuidance.filter((item) => item.blocked);
  const availableOptions = optionGuidance.filter((item) => !item.blocked);
  return {
    selectedIds,
    blockedOptions,
    availableOptions,
    summary: blockedOptions.length
      ? `${blockedOptions.length} option${blockedOptions.length === 1 ? "" : "s"} are currently blocked by compatibility rules.`
      : "All unselected options are compatible with the current configuration.",
  };
}
