import type {
  Command,
  CommandResponse,
  IDE,
  NormalizedIDE,
  TestHelpers,
} from "@cursorless/lib-common";
import type { JetbrainsIDE } from "../ide/JetbrainsIDE";
import type { StoredTargetMap } from "@cursorless/lib-engine";

export interface JetbrainsTestHelpers
  extends Omit<TestHelpers, "takeSnapshot"> {
  talonJsIDE: JetbrainsIDE;
  ide: NormalizedIDE;
  storedTargets: StoredTargetMap;
  injectIde: (ide: IDE) => void;
  runCommand(command: Command): Promise<CommandResponse | unknown>;
}

export interface ActivateReturnValue {
  testHelpers?: JetbrainsTestHelpers;
}
