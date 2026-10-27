import type { SpokenFormEntry, TalonSpokenForms } from "@cursorless/common";
import {
  NeedsInitialTalonUpdateError,
  Notifier,
  SUPPORTED_ENTRY_TYPES,
} from "@cursorless/common";
import type { JetbrainsClient } from "./JetbrainsClient";

interface TalonSpokenFormsPayload {
  version: number;
  spokenForms: SpokenFormEntry[];
}

const LATEST_SPOKEN_FORMS_JSON_VERSION = 0;

/**
 * Version 1 (cursorless-talon, August 2026) adds entry types for the cheatsheet built extension side, such as
 * "connective" and "hatColor". Until the engine is updated, accept it and keep only the entry types this engine knows.
 */
const NEWER_SPOKEN_FORMS_JSON_VERSION = 1;

/**
 * Reads Talon's spoken forms (~/.cursorless/state.json) through the IDE plugin, which also watches the file and
 * calls {@link notifyChanged}. Mirrors FileSystemTalonSpokenForms, without needing Node's fs.
 */
export class JetbrainsTalonSpokenForms implements TalonSpokenForms {
  private notifier = new Notifier();

  constructor(private client: JetbrainsClient) {}

  onDidChange = this.notifier.registerListener;

  notifyChanged() {
    this.notifier.notifyListeners();
  }

  async getSpokenFormEntries(): Promise<SpokenFormEntry[]> {
    const stateJson = this.client.readTalonSpokenForms();
    if (stateJson == null) {
      throw new NeedsInitialTalonUpdateError(
        "Custom spoken forms file (~/.cursorless/state.json) not found. Using default spoken forms.",
      );
    }

    const payload: TalonSpokenFormsPayload = JSON.parse(stateJson);
    if (payload.version === NEWER_SPOKEN_FORMS_JSON_VERSION) {
      const supported: readonly string[] = SUPPORTED_ENTRY_TYPES;
      return payload.spokenForms.filter((entry) =>
        supported.includes(entry.type),
      );
    }
    if (payload.version !== LATEST_SPOKEN_FORMS_JSON_VERSION) {
      throw new Error(
        `Invalid spoken forms version. Expected ${LATEST_SPOKEN_FORMS_JSON_VERSION} but got ${payload.version}`,
      );
    }

    return payload.spokenForms;
  }
}
