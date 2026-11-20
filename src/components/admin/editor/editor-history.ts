import type { DraftSlice, EditorDraft } from "@/lib/site/editor-document";

/**
 * Histórico do rascunho (desfazer/refazer). Alterações seguidas no mesmo
 * campo em menos de um segundo viram um único passo (digitação contínua).
 * Salvar recomeça o histórico a partir da versão confirmada pelo banco.
 */

const LIMIT = 100;
const COALESCE_MS = 1000;

export type EditorHistory = {
  past: EditorDraft[];
  present: EditorDraft;
  future: EditorDraft[];
  group: string | null;
  at: number;
};

export type HistoryAction =
  | { type: "change"; slice: DraftSlice; value: EditorDraft[DraftSlice]; group: string; at: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; draft: EditorDraft }
  | { type: "saved"; patch: Partial<EditorDraft> };

export function initHistory(draft: EditorDraft): EditorHistory {
  return { past: [], present: draft, future: [], group: null, at: 0 };
}

export function historyReducer(state: EditorHistory, action: HistoryAction): EditorHistory {
  switch (action.type) {
    case "change": {
      const present = { ...state.present, [action.slice]: action.value } as EditorDraft;
      const coalesce = state.group === action.group && action.at - state.at < COALESCE_MS && state.past.length > 0;
      return {
        past: coalesce ? state.past : [...state.past, state.present].slice(-LIMIT),
        present,
        future: [],
        group: action.group,
        at: action.at,
      };
    }
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        group: null,
        at: 0,
      };
    }
    case "redo": {
      const [next, ...future] = state.future;
      if (!next) return state;
      return { past: [...state.past, state.present], present: next, future, group: null, at: 0 };
    }
    case "reset":
      return initHistory(action.draft);
    case "saved":
      return initHistory({ ...state.present, ...action.patch });
  }
}
