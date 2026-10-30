import type {
  TalonSpokenForms,
  TalonSpokenFormsPayload,
} from "@cursorless/lib-common";
import { NeedsInitialTalonUpdateError, Notifier } from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";

const LATEST_SPOKEN_FORMS_JSON_VERSION = 1;

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

  async getSpokenForms(): Promise<TalonSpokenFormsPayload> {
    const stateJson = this.client.readTalonSpokenForms();
    if (stateJson == null) {
      throw new NeedsInitialTalonUpdateError(
        "Custom spoken forms file (~/.cursorless/state.json) not found. Using default spoken forms.",
      );
    }

    const payload: TalonSpokenFormsPayload = JSON.parse(stateJson);
    if (payload.version > LATEST_SPOKEN_FORMS_JSON_VERSION) {
      throw new Error(
        `Unsupported spoken forms version ${payload.version}. Supported versions: 0-${LATEST_SPOKEN_FORMS_JSON_VERSION}`,
      );
    }

    return payload;
  }
}
