export interface JetbrainsClient {
  prePhraseVersion(): string | PromiseLike<string | null> | null;
  clipboardCopy(editorId: string, rangesJson: string): void;
  /** Returns the paste's edits as JSON [{rangeOffset, rangeLength, text}], in the order they were made */
  clipboardPaste(editorId: string): string | undefined;
  hatsUpdated(hatsJson: string): void;
  documentUpdated(editorId: string, updateJson: string): void;
  setSelection(editorId: string, selectionJson: string): void;
  executeCommand(editorId: string, command: string, jsonArgs: string): string;
  executeRangeCommand(editorId: string, commandJson: string): string;
  insertLineAfter(editorId: string, rangesJson: string): void;
  insertSnippet(editorId: string, snippet: string): void;
  revealLine(editorId: string, line: number, revealAt: string): void;
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
  /** Opens a new scratch editor with this content; returns its editor state JSON */
  openUntitledTextDocument(content: string, language: string | null): string;
  showMessage(type: string, id: string, message: string): void;
  /** The JetBrains plugin's version, for command history entries */
  pluginVersion(): string;
  /** A tutorial fixture bundled with the plugin, parsed from YAML, as JSON */
  readTutorialFixture(tutorialId: string, fixtureName: string): string;
  /** The tutorial's state changed: the Cursorless tool window shows it */
  tutorialStateChanged(stateJson: string): void;
}
