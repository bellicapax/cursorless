import type { JetbrainsClient } from "./JetbrainsClient";
import { JetbrainsHats } from "./JetbrainsHats";
import type { JetbrainsIDE } from "./JetbrainsIDE";
import { JetbrainsTalonSpokenForms } from "./JetbrainsTalonSpokenForms";
import type { JetbrainsScopeVisualizer } from "./JetbrainsScopeVisualizer";

export class JetbrainsPlugin {
  /** Set by activate, once the engine's scope provider exists */
  scopeVisualizer: JetbrainsScopeVisualizer | undefined;

  constructor(
    readonly client: JetbrainsClient,
    readonly ide: JetbrainsIDE,
    readonly hats: JetbrainsHats,
    readonly talonSpokenForms: JetbrainsTalonSpokenForms,
  ) {}
}

export function createPlugin(
  client: JetbrainsClient,
  ide: JetbrainsIDE,
): JetbrainsPlugin {
  const hats = new JetbrainsHats(client);
  const talonSpokenForms = new JetbrainsTalonSpokenForms(client);
  return new JetbrainsPlugin(client, ide, hats, talonSpokenForms);
}
