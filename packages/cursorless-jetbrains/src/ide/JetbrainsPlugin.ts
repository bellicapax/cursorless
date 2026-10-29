import type { CheatsheetInfo } from "@cursorless/lib-common";
import {
  getCheatsheetInfo,
  getDefaultCheatsheetInfo,
} from "@cursorless/lib-common";
import { analyzeCommandHistory } from "@cursorless/lib-engine";
import { JetbrainsCommandHistoryStorage } from "./JetbrainsCommandHistoryStorage";
import type { JetbrainsClient } from "./JetbrainsClient";
import { JetbrainsHats } from "./JetbrainsHats";
import type { JetbrainsIDE } from "./JetbrainsIDE";
import { JetbrainsTalonSpokenForms } from "./JetbrainsTalonSpokenForms";
import type { JetbrainsScopeVisualizer } from "./JetbrainsScopeVisualizer";

export class JetbrainsPlugin {
  /** Set by activate, once the engine's scope provider exists */
  scopeVisualizer: JetbrainsScopeVisualizer | undefined;

  readonly commandHistoryStorage: JetbrainsCommandHistoryStorage;

  constructor(
    readonly client: JetbrainsClient,
    readonly ide: JetbrainsIDE,
    readonly hats: JetbrainsHats,
    readonly talonSpokenForms: JetbrainsTalonSpokenForms,
  ) {
    this.commandHistoryStorage = new JetbrainsCommandHistoryStorage(client);
  }

  /** Talon's "cursorless stats": opens a report of the command history, as the VS Code extension does */
  async analyzeCommandHistory(): Promise<void> {
    await analyzeCommandHistory(this.ide, this.commandHistoryStorage);
  }

  /**
   * The cheat sheet for Talon's "cursorless cheat sheet", built from the user's spoken forms as the VS Code
   * extension does; the IDE writes it into the cheatsheet page.
   */
  async getCheatsheetInfo(): Promise<CheatsheetInfo> {
    try {
      const { spokenForms } = await this.talonSpokenForms.getSpokenForms();
      return getCheatsheetInfo(spokenForms);
    } catch (error) {
      console.error("Using default spoken forms for the cheat sheet: " + error);
      return getDefaultCheatsheetInfo();
    }
  }
}

export function createPlugin(
  client: JetbrainsClient,
  ide: JetbrainsIDE,
): JetbrainsPlugin {
  const hats = new JetbrainsHats(client);
  const talonSpokenForms = new JetbrainsTalonSpokenForms(client);
  return new JetbrainsPlugin(client, ide, hats, talonSpokenForms);
}
