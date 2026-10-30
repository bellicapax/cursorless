import { isEqual } from "lodash-es";
import type {
  Disposable,
  IDE,
  ScopeProvider,
  ScopeSupportInfo,
  ScopeType,
  TextEditor,
} from "@cursorless/lib-common";
import {
  DOCS_URL,
  ScopeSupport,
  disposableFrom,
  serializeScopeType,
  uriEncodeHashId,
} from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";
import type { JetbrainsScopeVisualizer } from "./JetbrainsScopeVisualizer";

/** How long a selection change waits before the list is sent again, so moving the caret doesn't recompute it per key */
const SELECTION_DELAY_MS = 100;

/** One row of the Scopes list */
interface ScopeListItem {
  scopeType: ScopeType;
  support: "present" | "supported" | "unsupported";
  /** Empty when the scope can't be spoken */
  spokenForms: string[];
  /** Why there are no spoken forms: Talon's files need updating, or the user turned the spoken form off */
  unspokenReason?: "requiresTalonUpdate" | "disabled";
  name: string;
  isLanguageSpecific: boolean;
  isVisualized: boolean;
  /** For present scopes: the selection is exactly one of the scope's targets, or inside one */
  containment?: "exact" | "contains";
  docsUrl: string;
}

/**
 * VS Code's "Scopes" sidebar view: every scope type, grouped by whether it's present in the active editor, supported
 * in its language, or unsupported, with its spoken forms. While the IDE shows the list, it's sent to the IDE
 * (client.scopeListChanged) whenever scope support, the visualized scope or the selection changes.
 */
export class JetbrainsScopeList {
  private disposable: Disposable | undefined;
  private supportLevels: ScopeSupportInfo[] = [];
  private selectionTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private ide: IDE,
    private client: JetbrainsClient,
    private scopeProvider: ScopeProvider,
    private scopeVisualizer: JetbrainsScopeVisualizer,
  ) {}

  /** Only a list on screen is kept up to date, as in VS Code, since working out scope support isn't cheap */
  setVisible(visible: boolean) {
    if (!visible) {
      this.dispose();
      return;
    }
    if (this.disposable != null) {
      this.send();
      return;
    }
    this.disposable = disposableFrom(
      // Calls back straight away with the current support
      this.scopeProvider.onDidChangeScopeSupport((supportLevels) => {
        this.supportLevels = supportLevels;
        this.send();
      }),
      this.ide.onDidChangeTextEditorSelection(() => {
        clearTimeout(this.selectionTimer);
        this.selectionTimer = setTimeout(() => this.send(), SELECTION_DELAY_MS);
      }),
    );
  }

  /** The visualizer started or stopped */
  scopeTypeChanged() {
    if (this.disposable != null) {
      this.send();
    }
  }

  dispose() {
    clearTimeout(this.selectionTimer);
    this.selectionTimer = undefined;
    this.disposable?.dispose();
    this.disposable = undefined;
  }

  private send() {
    const editor = this.ide.activeTextEditor;
    const languageId = editor?.document.languageId;
    const selection =
      editor != null && editor.selections.length === 1
        ? editor.selections[0]
        : undefined;

    const items = this.supportLevels
      // Like VS Code, leave out private scopes, which have no spoken form unless the user gives them one
      .filter(
        ({ spokenForm }) =>
          !(spokenForm.type === "error" && spokenForm.isPrivate),
      )
      .map((info): ScopeListItem => {
        const support =
          info.support === ScopeSupport.supportedAndPresentInEditor
            ? "present"
            : info.support === ScopeSupport.supportedButNotPresentInEditor
              ? "supported"
              : "unsupported";
        const docsLanguage = info.isLanguageSpecific
          ? (languageId ?? "plaintext")
          : "plaintext";
        const docsId = uriEncodeHashId(serializeScopeType(info.scopeType));
        return {
          scopeType: info.scopeType,
          support,
          spokenForms:
            info.spokenForm.type === "success"
              ? info.spokenForm.spokenForms
              : [],
          unspokenReason:
            info.spokenForm.type === "error"
              ? info.spokenForm.requiresTalonUpdate
                ? "requiresTalonUpdate"
                : "disabled"
              : undefined,
          name: info.humanReadableName,
          isLanguageSpecific: info.isLanguageSpecific,
          isVisualized: isEqual(info.scopeType, this.scopeVisualizer.scopeType),
          containment:
            support === "present" && editor != null && selection != null
              ? this.containment(editor, info.scopeType)
              : undefined,
          docsUrl: `${DOCS_URL}/user/languages/${docsLanguage}#${docsId}`,
        };
      });
    items.sort(compareItems);

    this.client.scopeListChanged(JSON.stringify({ languageId, items }));
  }

  private containment(
    editor: TextEditor,
    scopeType: ScopeType,
  ): "exact" | "contains" | undefined {
    const selection = editor.selections[0];
    for (const scope of this.scopeProvider.provideScopeRangesForRange(
      editor,
      scopeType,
      selection,
    )) {
      for (const target of scope.targets) {
        if (target.contentRange.isRangeEqual(selection)) {
          return "exact";
        }
        if (target.contentRange.contains(selection)) {
          return "contains";
        }
      }
    }
    return undefined;
  }
}

/** VS Code's order: spoken scopes first, language-specific ones before the rest, then by label */
function compareItems(a: ScopeListItem, b: ScopeListItem): number {
  if ((a.spokenForms.length === 0) !== (b.spokenForms.length === 0)) {
    return a.spokenForms.length === 0 ? 1 : -1;
  }
  if (a.isLanguageSpecific !== b.isLanguageSpecific) {
    return a.isLanguageSpecific ? -1 : 1;
  }
  return label(a).localeCompare(label(b));
}

function label(item: ScopeListItem): string {
  return item.spokenForms.length === 0
    ? "-"
    : item.spokenForms.map((spokenForm) => `"${spokenForm}"`).join(" | ");
}
