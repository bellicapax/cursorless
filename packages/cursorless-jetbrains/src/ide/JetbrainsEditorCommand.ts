import type { Range } from "@cursorless/lib-common";

export class JetbrainsEditorCommand {
  constructor(
    private ranges: Range[],
    private singleRange: boolean,
    private restoreSelection: boolean,
    private ideCommand: string,
  ) {}
}
