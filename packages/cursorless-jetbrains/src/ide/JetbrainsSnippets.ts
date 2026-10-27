import type { TextEditor } from "@cursorless/common";
import type { EditorState } from "../types/types";
import type { JetbrainsClient } from "./JetbrainsClient";
import type { JetbrainsIDE } from "./JetbrainsIDE";

/**
 * Snippet files for "snip make": the IDE plugin creates and opens `<directory>/<snippetName>.snippet` and returns the
 * new editor's state, so the engine can edit it straight away.
 */
export class JetbrainsSnippets {
  constructor(
    private client: JetbrainsClient,
    private ide: JetbrainsIDE,
  ) {}

  async openNewSnippetFile(
    snippetName: string,
    directory: string,
  ): Promise<TextEditor> {
    const editorState: EditorState = JSON.parse(
      this.client.openSnippetFile(snippetName, directory),
    );
    return this.ide.updateTextEditors(editorState);
  }
}
