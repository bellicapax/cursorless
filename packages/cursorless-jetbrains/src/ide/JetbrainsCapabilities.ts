import type { Capabilities, CommandCapabilityMap } from "@cursorless/lib-common";

const COMMAND_CAPABILITIES: CommandCapabilityMap = {
  clipboardCopy: { acceptsLocation: true },
  clipboardPaste: true,
  toggleLineComment: { acceptsLocation: true },
  indentLine: { acceptsLocation: true },
  outdentLine: { acceptsLocation: true },
  rename: { acceptsLocation: true },
  quickFix: { acceptsLocation: true },
  revealDefinition: { acceptsLocation: true },
  revealTypeDefinition: { acceptsLocation: true },
  showHover: { acceptsLocation: true },
  showDebugHover: { acceptsLocation: true },
  extractVariable: { acceptsLocation: true },
  fold: { acceptsLocation: true },
  highlight: { acceptsLocation: true },
  unfold: { acceptsLocation: true },
  showReferences: { acceptsLocation: true },
  insertLineAfter: { acceptsLocation: true },
  gitAccept: { acceptsLocation: true },
  gitRevert: { acceptsLocation: true },
  gitStage: { acceptsLocation: true },
  gitUnstage: { acceptsLocation: true },
};

export class JetbrainsCapabilities implements Capabilities {
  commands = COMMAND_CAPABILITIES;
}
