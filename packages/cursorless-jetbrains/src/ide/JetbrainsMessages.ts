import type { MessageId, Messages, MessageType } from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";

export class JetbrainsMessages implements Messages {
  constructor(private client: JetbrainsClient) {}

  /**
   * Shows the message as an IDE notification. The IDE doesn't wait for a choice, so options aren't offered and no
   * option is returned.
   */
  async showMessage(
    type: MessageType,
    id: MessageId,
    message: string,
    ..._options: string[]
  ): Promise<string | undefined> {
    this.client.showMessage(type, id, message);
    return undefined;
  }
}
