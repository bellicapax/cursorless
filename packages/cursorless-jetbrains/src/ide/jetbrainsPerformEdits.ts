import type { Edit } from "@cursorless/lib-common";
import { type InMemoryTextDocument } from "@cursorless/lib-common";
import type { EditorEdit } from "../types/types";
import type { JetbrainsIDE } from "./JetbrainsIDE";
import type { JetbrainsClient } from "./JetbrainsClient";

export function jetbrainsPerformEdits(
  client: JetbrainsClient,
  ide: JetbrainsIDE,
  document: InMemoryTextDocument,
  id: string,
  edits: Edit[],
): string | undefined {
  const changes = document.edit(edits);

  const editorEdit: EditorEdit = {
    text: document.text,
    changes: changes.map((change) => ({
      rangeOffset: change.rangeOffset,
      rangeLength: change.rangeLength,
      text: change.text,
    })),
  };

  const selectionsJson = client.documentUpdated(id, JSON.stringify(editorEdit));
  //jetbrains.actions.user.cursorless_everywhere_edit_text(editorEdit);

  ide.emitDidChangeTextDocument({
    document,
    contentChanges: changes,
  });

  return selectionsJson;
}
