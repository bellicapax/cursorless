export interface JetbrainsClient {
  prePhraseVersion(): string | PromiseLike<string | null> | null;
  clipboardCopy(editorId: string, rangesJson: string): void;
  /** Returns the paste's edits as JSON [{rangeOffset, rangeLength, text}], in the order they were made */
  clipboardPaste(editorId: string): string | undefined;
  hatsUpdated(hatsJson: string): void;
  /** Applies the edit; returns the editor's selections afterwards as JSON, since the IDE moves carets as text changes */
  documentUpdated(editorId: string, updateJson: string): string | undefined;
  setSelection(editorId: string, selectionJson: string): void;
  /** These run an IDE action; they return JSON {changes, selections}: its document edits, in order, and the carets after */
  executeCommand(editorId: string, command: string, jsonArgs: string): string | undefined;
  executeRangeCommand(editorId: string, commandJson: string): string | undefined;
  insertLineAfter(editorId: string, rangesJson: string): string | undefined;
  insertSnippet(editorId: string, snippet: string): void;
  revealLine(editorId: string, line: number, revealAt: string): void;
  /** Scrolls the range into view, if it isn't already */
  revealRange(editorId: string, rangeJson: string): void;
  /** Opens the URL in the browser */
  openUrl(url: string): void;
  readQuery(filename: string): string | undefined;
  flashRanges(flashRangesJson: string): string | undefined;
  setHighlightRanges(highlightId: string | undefined, editorId: string, rangesJson: string): void;
  findInDocument(editorId: string, query: string): void;
  findInWorkspace(editorId: string, query: string): void;
  focusEditor(editorId: string): void;
  getFocusedElementType(): string | null;
  keyValueGet(key: string): string | null;
  keyValueSet(key: string, valueJson: string): void;
  readTalonSpokenForms(): string | null;
  showInputBox(optionsJson: string): string | null;
  openSnippetFile(snippetName: string, directory: string): string;
  /** Appends one JSON line to the named command history file */
  commandHistoryAppend(fileName: string, entryJson: string): void;
  /** Every command history entry, oldest file first, as a JSON array */
  commandHistoryEntries(): string;
  /**
   * Opens a new scratch editor with this content. Returns JSON {editor, hiddenEditorIds}: its editor state, and the
   * editors its tab replaced on screen
   */
  openUntitledTextDocument(content: string, language: string | null): string;
  showMessage(type: string, id: string, message: string): void;
  /** The JetBrains plugin's version, for command history entries */
  pluginVersion(): string;
  /** A tutorial fixture bundled with the plugin, parsed from YAML, as JSON */
  readTutorialFixture(tutorialId: string, fixtureName: string): string;
  /** The tutorial's state changed: the Cursorless tool window shows it */
  tutorialStateChanged(stateJson: string): void;
}
