import type {
  CommandHistoryEntry,
  CommandHistoryStorage,
} from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";

/**
 * Command history kept by the IDE, in the same ~/.cursorless/commandHistory files the VS Code extension writes,
 * so "cursorless stats" covers both editors
 */
export class JetbrainsCommandHistoryStorage implements CommandHistoryStorage {
  constructor(private client: JetbrainsClient) {}

  async appendEntry(
    fileName: string,
    entry: CommandHistoryEntry,
  ): Promise<void> {
    this.client.commandHistoryAppend(fileName, JSON.stringify(entry));
  }

  async getEntries(): Promise<CommandHistoryEntry[]> {
    return JSON.parse(this.client.commandHistoryEntries());
  }
}
