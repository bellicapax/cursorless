import {
  Position,
  Range,
  Selection,
  selectionsEqual,
  type Edit,
  type EditableTextEditor,
  type GeneralizedRange,
  type InMemoryTextDocument,
  type OpenLinkOptions,
  type RevealLineAt,
  type SetSelectionsOpts,
  type TextEditor,
  type TextEditorOptions,
} from "@cursorless/lib-common";
import { setSelections } from "./setSelections";
import type { JetbrainsIDE } from "./JetbrainsIDE";
import { jetbrainsPerformEdits } from "./jetbrainsPerformEdits";
import type { JetbrainsClient } from "./JetbrainsClient";
import { JetbrainsEditorCommand } from "./JetbrainsEditorCommand";
import { createSelection } from "./createTextEditor";
import type { JbSelection } from "../types/types";

export class JetbrainsEditor implements EditableTextEditor {
  options: TextEditorOptions = {
    tabSize: 4,
    insertSpaces: true,
  };

  isActive = true;
  isVisible = true;
  isEditable = true;
  isWritable = true;

  constructor(
    private client: JetbrainsClient,
    private ide: JetbrainsIDE,
    public id: string,
    public document: InMemoryTextDocument,
    public visibleRanges: Range[],
    public selections: Selection[],
  ) {}

  isEqual(other: TextEditor): boolean {
    return this.id === other.id;
  }

  async setSelections(
    selections: Selection[],
    _opts?: SetSelectionsOpts,
  ): Promise<void> {
    if (!selectionsEqual(this.selections, selections)) {
      await setSelections(this.client, this.document, this.id, selections);
      this.selections = selections;
      this.ide.selectionsChanged(this);
    }
  }

  edit(edits: Edit[]): Promise<boolean> {
    // console.log("editor.edit");
    if (!this.isWritable) {
      return Promise.resolve(false);
    }
    const selectionsJson = jetbrainsPerformEdits(
      this.client,
      this.ide,
      this.document,
      this.id,
      edits,
    );
    // The IDE moved its carets with the edit; keep ours in step, or a later setSelections that matches our stale
    // copy is skipped and the carets stay where the edit put them
    if (selectionsJson) {
      this.updateSelections(JSON.parse(selectionsJson));
    }
    return Promise.resolve(true);
  }

  /**
   * Applies what an IDE action did (JSON {changes, selections} from the client) to our copy of the editor, as VS Code
   * has it before its command resolves. The IDE's own report of the editor comes later, so without this the engine
   * would act on the text before the action, e.g. a tutorial step that edits the document right after "pour"
   */
  applyIdeEdits(resultJson: string | null | undefined) {
    if (!resultJson) {
      return;
    }
    const { changes, selections } = JSON.parse(resultJson) as {
      changes: IdeChange[];
      selections: JbSelection[];
    };
    this.applyChanges(changes);
    this.updateSelections(selections);
  }

  private applyChanges(changes: IdeChange[]) {
    for (const { rangeOffset, rangeLength, text } of changes) {
      const range = new Range(
        this.document.positionAt(rangeOffset),
        this.document.positionAt(rangeOffset + rangeLength),
      );
      const contentChanges = this.document.edit([{ range, text }]);
      this.ide.emitDidChangeTextDocument({
        document: this.document,
        contentChanges,
      });
    }
  }

  private updateSelections(jbSelections: JbSelection[]) {
    const selections = jbSelections.map((selection) =>
      createSelection(this.document, selection),
    );
    if (!selectionsEqual(this.selections, selections)) {
      this.selections = selections;
      this.ide.selectionsChanged(this);
    }
  }

  async clipboardCopy(ranges: Range[]): Promise<void> {
    await this.ide.clipboard.copy(this.id, ranges);
  }

  async clipboardPaste(): Promise<void> {
    // The IDE pastes with its own paste action and returns the edits it made. Report them now, as VS Code does
    // before its paste command resolves: the IDE's own change notification comes later and covers the whole
    // visible range, so ranges the engine tracks (the "that" mark and the flash) would miss the pasted text
    const changesJson = this.client.clipboardPaste(this.id);
    if (changesJson) {
      this.applyChanges(JSON.parse(changesJson));
    }
  }

  async indentLine(ranges: Range[]): Promise<void> {
    const command = new JetbrainsEditorCommand(
      ranges ? ranges : [],
      true,
      true,
      "EditorIndentSelection",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async outdentLine(ranges: Range[]): Promise<void> {
    const command = new JetbrainsEditorCommand(
      ranges ? ranges : [],
      true,
      true,
      "EditorUnindentSelection",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async insertLineAfter(ranges?: Range[]): Promise<void> {
    this.applyIdeEdits(
      this.client.insertLineAfter(this.id, JSON.stringify(ranges)),
    );
  }

  async focus(): Promise<void> {
    await this.client.focusEditor(this.id);
    this.ide.setActiveEditor(this, true);
  }

  revealRange(range: Range): Promise<void> {
    this.client.revealRange(this.id, JSON.stringify(range));
    return Promise.resolve();
  }

  async revealLine(lineNumber: number, at: RevealLineAt): Promise<void> {
    await this.client.revealLine(this.id, lineNumber, at);
  }

  async openLink(
    range: Range,
    _options?: OpenLinkOptions | undefined,
  ): Promise<void> {
    // Like VS Code's editor.action.openLink: a URL at the target opens in the browser; otherwise go to the
    // declaration, which is how the IDE follows a symbol or a file reference
    const url = this.urlAt(range);
    if (url != null) {
      this.client.openUrl(url);
      return;
    }
    const command = new JetbrainsEditorCommand(
      [range],
      true,
      false,
      "GotoDeclaration",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async fold(ranges?: Range[] | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      ranges ? ranges : [],
      true,
      false,
      "CollapseRegion",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async unfold(ranges?: Range[] | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      ranges ? ranges : [],
      true,
      false,
      "ExpandRegion",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async toggleBreakpoint(
    ranges?: GeneralizedRange[] | undefined,
  ): Promise<void> {
    // ToggleLineBreakpoint acts on the caret's line, so toggle one range at a time
    for (const range of ranges ?? []) {
      const position =
        range.type === "line"
          ? new Position(range.start, 0)
          : range.start;
      const command = new JetbrainsEditorCommand(
        [new Range(position, position)],
        true,
        false,
        "ToggleLineBreakpoint",
      );
      this.applyIdeEdits(
        this.client.executeRangeCommand(this.id, JSON.stringify(command)),
      );
    }
  }

  async toggleLineComment(ranges?: Range[] | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      ranges ? ranges : [],
      true,
      false,
      "CommentByLineComment",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async insertSnippet(
    snippet: string,
    ranges?: Range[] | undefined,
  ): Promise<void> {
    console.log("insertSnippet" + snippet);
    if (ranges != null) {
      await this.setSelections(ranges.map((range) => Selection.fromRange(range)));
    }

    await this.client.insertSnippet(this.id, snippet);
  }

  async rename(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "RenameElement",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async showReferences(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "FindUsages",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async quickFix(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "ShowIntentionActions",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  /** The http(s) URL on the range's first line that overlaps the range, if any */
  private urlAt(range: Range): string | undefined {
    const line = this.document.lineAt(range.start.line).text;
    const end =
      range.end.line === range.start.line ? range.end.character : line.length;
    for (const match of line.matchAll(/https?:\/\/[^\s<>"'`]+/g)) {
      // Punctuation that ends a sentence or closes brackets usually isn't part of the URL
      const url = match[0].replace(/[.,;:!?)\]}]+$/, "");
      const urlStart = match.index;
      if (urlStart <= end && urlStart + url.length >= range.start.character) {
        return url;
      }
    }
    return undefined;
  }

  async revealDefinition(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "GotoDeclaration",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async revealTypeDefinition(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "GotoTypeDeclaration",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async showHover(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "QuickJavaDoc",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async showDebugHover(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "QuickEvaluateExpression",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  async extractVariable(range?: Range | undefined): Promise<void> {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      false,
      "IntroduceVariable",
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }

  editNewNotebookCellAbove(): Promise<void> {
    throw new Error("editNewNotebookCellAbove not implemented.");
  }

  editNewNotebookCellBelow(): Promise<void> {
    throw new Error("editNewNotebookCellBelow not implemented.");
  }

  // Git actions run on the target as the plugin's own IDE actions, which work with or without the IDE's staging
  // area; revert falls back to IntelliJ's Rollback Lines outside git
  async gitAccept(range?: Range): Promise<void> {
    this.runGitAction(range, "Cursorless.AcceptConflictSide");
  }

  async gitRevert(range?: Range): Promise<void> {
    this.runGitAction(range, "Cursorless.GitRevertLines");
  }

  async gitStageFile(): Promise<void> {
    this.runGitAction(undefined, "Cursorless.GitStageFile");
  }

  async gitUnstageFile(): Promise<void> {
    this.runGitAction(undefined, "Cursorless.GitUnstageFile");
  }

  async gitStageRange(range?: Range): Promise<void> {
    this.runGitAction(range, "Cursorless.GitStageLines");
  }

  async gitUnstageRange(range?: Range): Promise<void> {
    this.runGitAction(range, "Cursorless.GitUnstageLines");
  }

  private runGitAction(range: Range | undefined, actionId: string) {
    const command = new JetbrainsEditorCommand(
      range ? [range] : [],
      true,
      true,
      actionId,
    );
    this.applyIdeEdits(
      this.client.executeRangeCommand(this.id, JSON.stringify(command)),
    );
  }
}

/** An edit the IDE made, at an offset into the text as it was just before */
interface IdeChange {
  rangeOffset: number;
  rangeLength: number;
  text: string;
}
