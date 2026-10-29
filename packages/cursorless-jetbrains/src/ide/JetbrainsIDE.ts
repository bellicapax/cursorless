import {
  InMemoryTextDocument,
  Notifier,
  Range,
  selectionsEqual,
} from "@cursorless/lib-common";
import type {
  Event,
  FlashDescriptor,
  GeneralizedRange,
  QuickPickOptions,
  TextDocument,
  TextDocumentContentChangeEvent,
  TextEditorSelectionChangeEvent,
  TextEditorVisibleRangesChangeEvent,
  Disposable,
  EditableTextEditor,
  IDE,
  OpenUntitledTextDocumentOptions,
  RunMode,
  TextDocumentChangeEvent,
  TextEditor,
  WorkspaceFolder,
  NotebookEditor,
} from "@cursorless/lib-common";
import { pull } from "lodash-es";
import { JetbrainsCapabilities } from "./JetbrainsCapabilities";

import type { JetbrainsClient } from "./JetbrainsClient";
import { JetbrainsClipboard } from "./JetbrainsClipboard";
import type { JetbrainsConfiguration } from "./JetbrainsConfiguration";
import { JetbrainsMessages } from "./JetbrainsMessages";
import { JetbrainsKeyValueStore } from "./JetbrainsKeyValueStore";
import type { EditorState } from "../types/types";
import { createSelection, createTextEditor } from "./createTextEditor";
import { JetbrainsEditor } from "./JetbrainsEditor";
import type { JetbrainsFlashDescriptor } from "./JetbrainsFlashDescriptor";

export class JetbrainsIDE implements IDE {
  readonly configuration: JetbrainsConfiguration;
  readonly keyValueStore: JetbrainsKeyValueStore;
  readonly messages: JetbrainsMessages;
  readonly clipboard: JetbrainsClipboard;
  readonly capabilities: JetbrainsCapabilities;
  readonly runMode: RunMode = "production";
  readonly visibleNotebookEditors: NotebookEditor[] = [];
  //   private editorMap;
  //   private documentMap;
  private activeProject: Window | undefined;
  private activeEditor: JetbrainsEditor | undefined;

  private disposables: Disposable[] = [];
  private assetsRoot_: string | undefined;
  private cursorlessJetbrainsPath: string | undefined;
  private quickPickReturnValue: string | undefined = undefined;

  private editors: Map<string, JetbrainsEditor> = new Map<
    string,
    JetbrainsEditor
  >();

  private onDidChangeTextDocumentNotifier: Notifier<[TextDocumentChangeEvent]> =
    new Notifier();
  private onDidChangeActiveTextEditorNotifier: Notifier<
    [TextEditor | undefined]
  > = new Notifier();
  private onDidChangeTextEditorSelectionNotifier: Notifier<
    [TextEditorSelectionChangeEvent]
  > = new Notifier();
  private onDidChangeTextEditorVisibleRangesNotifier: Notifier<
    [TextEditorVisibleRangesChangeEvent]
  > = new Notifier();
  private onDidChangeVisibleTextEditorsNotifier: Notifier<[TextEditor[]]> =
    new Notifier();
  private onDidOpenTextDocumentNotifier: Notifier<[TextDocument]> =
    new Notifier();

  private onDidChangeTextDocumentContentNotifier: Notifier<
    [TextDocumentContentChangeEvent]
  > = new Notifier();

  constructor(
    private client: JetbrainsClient,
    configuration: JetbrainsConfiguration,
  ) {
    this.configuration = configuration;
    this.keyValueStore = new JetbrainsKeyValueStore(this.client);
    this.messages = new JetbrainsMessages(this.client);
    this.clipboard = new JetbrainsClipboard(this.client);
    this.capabilities = new JetbrainsCapabilities();
    //     this.editorMap = new Map<Window, JetbrainsTextEditorImpl>();
    //     this.documentMap = new Map<Buffer, JetbrainsTextDocumentImpl>();
    this.activeProject = undefined;
    this.activeEditor = undefined;
  }

  async init() {}

  async showQuickPick(
    _items: readonly string[],
    _options?: QuickPickOptions,
  ): Promise<string | undefined> {
    throw Error("showQuickPick Not implemented");
  }

  async setHighlightRanges(
    highlightId: string | undefined,
    editor: TextEditor,
    ranges: GeneralizedRange[],
  ): Promise<void> {
    const editorId = editor.id;
    const rangesJson = JSON.stringify(ranges);
    this.client.setHighlightRanges(highlightId, editorId, rangesJson);
  }

  async flashRanges(flashDescriptors: FlashDescriptor[]): Promise<void> {
    console.log("flashRangeses");
    const jbfs = flashDescriptors.map((flashDescriptor) => {
      const jbf: JetbrainsFlashDescriptor = {
        editorId: flashDescriptor.editor.id,
        range: flashDescriptor.range,
        style: flashDescriptor.style,
      };
      return jbf;
    });
    this.client.flashRanges(JSON.stringify(jbfs));
  }

  get assetsRoot(): string {
    console.log("get assetsRoot");
    throw new Error("assetsRoot not implemented.");
  }

  get cursorlessVersion(): string {
    return `jetbrains-${this.client.pluginVersion()}`;
  }

  get workspaceFolders(): readonly WorkspaceFolder[] | undefined {
    console.log("get workspaceFolders");
    throw new Error("workspaceFolders not get implemented.");
  }

  get activeTextEditor(): TextEditor | undefined {
    // console.log("get activeTextEditor");
    return this.activeEditor;
  }

  get activeEditableTextEditor(): EditableTextEditor | undefined {
    // console.log("get activeEditableTextEditor");
    return this.activeEditor?.isEditable ? this.activeEditor : undefined;
  }

  get visibleTextEditors(): TextEditor[] {
    // console.log("get visibleTextEditors");
    return [...this.editors.values()].filter((editor) => editor.isVisible);
  }

  getEditableTextEditor(editor: TextEditor): EditableTextEditor  {
    // console.log("getEditableTextEditor");
    if (editor instanceof JetbrainsEditor) {
      // console.log("getEditableTextEditor - return current");
      if (editor.isEditable) {
        return editor;
      } else {
        throw Error(`Editor is not editable: ${editor}`);
      }
    }
    throw Error(`Unsupported text editor type: ${editor}`);
  }

  public async findInDocument(
    query: string,
    editor?: TextEditor,
  ): Promise<void> {
    const editorId = (editor ?? this.activeEditor)?.id;
    if (editorId == null) {
      throw Error("findInDocument: no editor to search in");
    }
    this.client.findInDocument(editorId, query);
  }

  public async findInWorkspace(query: string): Promise<void> {
    // The active editor tells the IDE which project to search
    const editorId = this.activeEditor?.id;
    if (editorId == null) {
      throw Error("findInWorkspace: no active editor");
    }
    this.client.findInWorkspace(editorId, query);
  }

  public async openTextDocument(_path: string): Promise<TextEditor> {
    throw Error("openTextDocument Not implemented");
  }

  public async openUntitledTextDocument(
    options: OpenUntitledTextDocumentOptions = {},
  ): Promise<TextEditor> {
    const opened: { editor: EditorState; hiddenEditorIds: string[] } =
      JSON.parse(
        this.client.openUntitledTextDocument(
          options.content ?? "",
          options.language ?? null,
        ),
      );
    // Hide the replaced tab now, not when the IDE next reports it: until then its tokens would compete for hats,
    // such as the ones a tutorial step pins in the new document
    for (const id of opened.hiddenEditorIds) {
      const hidden = this.editors.get(id);
      if (hidden != null) {
        hidden.isVisible = false;
        hidden.isActive = false;
      }
    }
    return this.updateTextEditors(opened.editor);
  }

  public async showInputBox(options?: any): Promise<string | undefined> {
    return this.client.showInputBox(JSON.stringify(options ?? {})) ?? undefined;
  }

  public async executeCommand<T>(
    command: string,
    ...args: any[]
  ): Promise<T | undefined> {
    // command is an IDE action id; it runs on the active editor, whose selection the engine has already set
    const editor = this.activeEditor;
    if (editor == null) {
      throw Error(`executeCommand ${command}: no active editor`);
    }
    editor.applyIdeEdits(
      this.client.executeCommand(editor.id, command, JSON.stringify(args)),
    );
    return undefined;
  }

  public onDidChangeTextDocument(
    listener: (event: TextDocumentChangeEvent) => void,
  ): Disposable {
    return this.onDidChangeTextDocumentNotifier.registerListener(listener);
  }

  public onDidOpenTextDocument(
    listener: (event: TextDocument) => any,
    _thisArgs?: any,
    _disposables?: Disposable[] | undefined,
  ): Disposable {
    return this.onDidOpenTextDocumentNotifier.registerListener(listener);
  }
  onDidCloseTextDocument: Event<TextDocument> = dummyEvent;
  onDidChangeActiveTextEditor: Event<TextEditor | undefined> = (listener) =>
    this.onDidChangeActiveTextEditorNotifier.registerListener(listener);
  onDidChangeVisibleTextEditors: Event<TextEditor[]> = (listener) =>
    this.onDidChangeVisibleTextEditorsNotifier.registerListener(listener);
  onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent> = (
    listener,
  ) => this.onDidChangeTextEditorSelectionNotifier.registerListener(listener);

  /** Announces new selections, as VS Code does whether the user or Cursorless set them */
  selectionsChanged(editor: JetbrainsEditor) {
    this.onDidChangeTextEditorSelectionNotifier.notifyListeners({
      textEditor: editor,
      selections: editor.selections,
    });
  }

  /**
   * Focusing an editor makes it the active one straight away, as in VS Code, rather than when the IDE next reports.
   * [announceUnchanged] announces it even if it already was: a tutorial step ends its setup by focusing its editor,
   * and the IDE calls along the way can outlast the tutorial's 100 ms recheck, which then sees a half-set-up step
   */
  setActiveEditor(editor: JetbrainsEditor, announceUnchanged = false) {
    if (this.activeEditor !== editor || announceUnchanged) {
      this.activeEditor = editor;
      this.onDidChangeActiveTextEditorNotifier.notifyListeners(editor);
    }
  }
  onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent> =
    (listener) =>
      this.onDidChangeTextEditorVisibleRangesNotifier.registerListener(listener);

  handleCommandError(_err: Error) {
    // if (err instanceof OutdatedExtensionError) {
    //   this.showUpdateExtensionErrorMessage(err);
    // } else {
    //     void showErrorMessage(this.client, err.message);
    // }
  }

  disposeOnExit(...disposables: Disposable[]): () => void {
    this.disposables.push(...disposables);

    return () => pull(this.disposables, ...disposables);
  }

  public documentClosed(editorId: string) {
    this.editors.delete(editorId);
    // console.log(
    //   "removed editor " +
    //     editorId +
    //     "remaining after change: " +
    //     this.editors.size,
    // );
  }

  public documentCreated(editorStateJson: any) {
    this.documentChanged(editorStateJson);
    const editorState = editorStateJson as EditorState;
    const editor = this.editors.get(editorState.id);
    if (editor) {
      this.onDidOpenTextDocumentNotifier.notifyListeners(editor.document);
    }
  }

  public documentChanged(editorStateJson: any) {
    const editorState = editorStateJson as EditorState;
    const oldDocument = this.editors.get(editorState.id)?.document;

    const editor = this.updateTextEditors(editorState);

    // Report only the text that changed, as VS Code does. The IDE sends the whole document with every update, also
    // for scrolling or moving the cursor; reporting all of it as replaced made the engine reassign every hat.
    const change =
      oldDocument == null
        ? undefined
        : textChange(oldDocument, editorState.text);
    if (change != null) {
      this.emitDidChangeTextDocument({
        document: editor.document,
        contentChanges: [change],
      });
    }
  }

  emitDidChangeTextDocument(event: TextDocumentChangeEvent) {
    this.onDidChangeTextDocumentNotifier.notifyListeners(event);
  }

  updateTextEditors(editorState: EditorState): JetbrainsEditor {
    let editor = this.editors.get(editorState.id);
    let visibilityChanged: boolean;
    if (editor) {
      const oldSelections = editor.selections;
      const oldVisibleRanges = editor.visibleRanges;
      const wasVisible = editor.isVisible;
      updateEditor(editor, editorState);
      visibilityChanged = wasVisible !== editor.isVisible;
      if (!selectionsEqual(oldSelections, editor.selections)) {
        this.selectionsChanged(editor);
      }
      if (!rangesEqual(oldVisibleRanges, editor.visibleRanges)) {
        this.onDidChangeTextEditorVisibleRangesNotifier.notifyListeners({
          textEditor: editor,
          visibleRanges: editor.visibleRanges,
        });
      }
    } else {
      editor = createTextEditor(this.client, this, editorState);
      this.editors.set(editorState.id, editor);
      visibilityChanged = editor.isVisible;
    }
    if (visibilityChanged) {
      this.onDidChangeVisibleTextEditorsNotifier.notifyListeners(
        this.visibleTextEditors,
      );
    }
    if (editorState.active) {
      this.setActiveEditor(editor);
    }
    return editor;
  }

  readQuery(filename: string): string | undefined {
    return this.client.readQuery(filename);
  }
}

function updateEditor(editor: JetbrainsEditor, editorState: EditorState) {
  // console.log("Updating editor " + editorState.id);
  const oldDocument = editor.document;
  editor.document = new InMemoryTextDocument(
    oldDocument.uri,
    oldDocument.languageId,
    editorState.text,
  );
  editor.visibleRanges = [
    new Range(
      editorState.firstVisibleLine,
      0,
      editorState.lastVisibleLine + 1,
      0,
    ),
  ];
  editor.selections = editorState.selections.map((selection) =>
    createSelection(editor.document, selection),
  );
  editor.isActive = editorState.active;
  editor.isVisible = editorState.visible;
  editor.isEditable = editorState.editable;
  editor.isWritable = editorState.writable;
}

/** The span of [oldDocument] that differs from [newText], as one change, or undefined if the text is the same */
function textChange(
  oldDocument: TextDocument,
  newText: string,
): TextDocumentContentChangeEvent | undefined {
  const oldText = oldDocument.getText();
  if (oldText === newText) {
    return undefined;
  }
  const maxLength = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < maxLength && oldText[prefix] === newText[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < maxLength - prefix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix++;
  }
  const rangeLength = oldText.length - prefix - suffix;
  return {
    range: new Range(
      oldDocument.positionAt(prefix),
      oldDocument.positionAt(prefix + rangeLength),
    ),
    rangeOffset: prefix,
    rangeLength,
    text: newText.slice(prefix, newText.length - suffix),
  };
}

function rangesEqual(a: readonly Range[], b: readonly Range[]): boolean {
  return a.length === b.length && a.every((range, i) => range.isRangeEqual(b[i]));
}

function dummyEvent() {
  return {
    dispose() {
      // empty
    },
  };
}

export function createIDE(
  client: JetbrainsClient,
  configuration: JetbrainsConfiguration,
) {
  return new JetbrainsIDE(client, configuration);
}
