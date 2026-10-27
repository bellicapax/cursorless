import type { JetbrainsClient } from "./JetbrainsClient";
import type {
  CommandServerApi,
  FocusedElementType,
  InboundSignal,
} from "@cursorless/common";

export class JetbrainsCommandServer implements CommandServerApi {
  private client!: JetbrainsClient;
  readonly signals: { prePhrase: InboundSignal } = {
    prePhrase: {
      getVersion: async () => {
        return this.client.prePhraseVersion();
      },
    },
  };

  constructor(client: JetbrainsClient) {
    this.client = client;
  }

  getFocusedElementType(): Promise<FocusedElementType | undefined> {
    // Anything other than "textEditor" makes the engine return a fallback for Talon to run as keystrokes
    const type = this.client.getFocusedElementType();
    return Promise.resolve(
      type == null ? undefined : (type as FocusedElementType),
    );
  }
}
