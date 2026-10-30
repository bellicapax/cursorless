import type {
  Disposable,
  GeneralizedRange,
  ScopeProvider,
  ScopeType,
  TextEditor,
} from "@cursorless/lib-common";
import {
  isGeneralizedRangeEqual,
  toCharacterRange,
} from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";

export type VisualizationType = "content" | "removal" | "iteration";

interface RendererScope {
  domain: GeneralizedRange;
  nestedRanges: GeneralizedRange[];
}

/**
 * Talon's "visualize <scope>": highlights the visible scopes of one scope type, as the VS Code extension's scope
 * visualizer does. Ranges go to the IDE through setHighlightRanges, one highlight id per kind of range.
 */
export class JetbrainsScopeVisualizer {
  private listener: Disposable | undefined;
  private highlightIds: string[] = [];
  private renderedEditorIds = new Set<string>();

  /** The scope type shown, if any */
  scopeType: ScopeType | undefined;

  /** Called with the scope type shown, or undefined when hidden, so the tutorial can wait for "visualize" */
  onDidChangeScopeType: ((scopeType: ScopeType | undefined) => void) | undefined;

  constructor(
    private client: JetbrainsClient,
    private scopeProvider: ScopeProvider,
  ) {}

  start(scopeType: ScopeType, visualizationType: VisualizationType) {
    this.stop();
    this.scopeType = scopeType;
    this.onDidChangeScopeType?.(scopeType);

    const nestedId = `scopeVisualizer.${visualizationType}`;
    this.highlightIds = [
      "scopeVisualizer.domain",
      nestedId,
      `${nestedId}.equalsDomain`,
    ];

    this.listener =
      visualizationType === "iteration"
        ? this.scopeProvider.onDidChangeIterationScopeRanges(
            (editor, iterationScopeRanges) =>
              this.render(
                editor,
                iterationScopeRanges.map(({ domain, ranges }) => ({
                  domain: toCharacterRange(domain),
                  nestedRanges: ranges.map(({ range }) =>
                    toCharacterRange(range),
                  ),
                })),
              ),
            { scopeType, visibleOnly: true, includeNestedTargets: false },
          )
        : this.scopeProvider.onDidChangeScopeRanges(
            (editor, scopeRanges) =>
              this.render(
                editor,
                scopeRanges.map(({ domain, targets }) => ({
                  domain: toCharacterRange(domain),
                  nestedRanges: targets.map((target) =>
                    visualizationType === "removal"
                      ? target.removalHighlightRange
                      : toCharacterRange(target.contentRange),
                  ),
                })),
              ),
            { scopeType, visibleOnly: true },
          );
  }

  stop() {
    this.scopeType = undefined;
    if (this.listener != null) {
      this.onDidChangeScopeType?.(undefined);
    }
    this.listener?.dispose();
    this.listener = undefined;
    for (const editorId of this.renderedEditorIds) {
      for (const highlightId of this.highlightIds) {
        this.client.setHighlightRanges(highlightId, editorId, "[]");
      }
    }
    this.renderedEditorIds.clear();
  }

  /** Like VS Code's renderer, a domain identical to its only nested range is drawn once, in the nested colors */
  private render(editor: TextEditor, scopes: RendererScope[]) {
    const domainRanges: GeneralizedRange[] = [];
    const nestedRanges: GeneralizedRange[] = [];
    const domainEqualsNestedRanges: GeneralizedRange[] = [];

    for (const { domain, nestedRanges: nested } of scopes) {
      if (nested.length === 1 && isGeneralizedRangeEqual(nested[0], domain)) {
        domainEqualsNestedRanges.push(domain);
      } else {
        domainRanges.push(domain);
        nestedRanges.push(...nested);
      }
    }

    const [domainId, nestedId, equalsDomainId] = this.highlightIds;
    this.renderedEditorIds.add(editor.id);
    this.client.setHighlightRanges(domainId, editor.id, JSON.stringify(domainRanges));
    this.client.setHighlightRanges(nestedId, editor.id, JSON.stringify(nestedRanges));
    this.client.setHighlightRanges(
      equalsDomainId,
      editor.id,
      JSON.stringify(domainEqualsNestedRanges),
    );
  }
}
