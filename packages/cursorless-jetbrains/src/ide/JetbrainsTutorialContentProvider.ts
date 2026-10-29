import type {
  TestCaseFixtureLegacy,
  TutorialContentProvider,
  TutorialId,
} from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";

/** Tutorial fixtures bundled with the plugin, which parses their YAML and returns it as JSON */
export class JetbrainsTutorialContentProvider implements TutorialContentProvider {
  constructor(private client: JetbrainsClient) {}

  async loadFixture(
    tutorialId: TutorialId,
    fixtureName: string,
  ): Promise<TestCaseFixtureLegacy> {
    return JSON.parse(this.client.readTutorialFixture(tutorialId, fixtureName));
  }
}