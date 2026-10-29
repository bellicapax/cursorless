import type { CursorlessEngine } from "@cursorless/lib-engine";
import { CommandHistory, createCursorlessEngine } from "@cursorless/lib-engine";
import type { JetbrainsPlugin } from "./ide/JetbrainsPlugin";
import { Parser } from "web-tree-sitter";
import { JetbrainsTreeSitter } from "./ide/JetbrainsTreeSitter";
import { JetbrainsTreeSitterQueryProvider } from "./ide/JetbrainsTreeSitterQueryProvider";
import { pathJoin } from "./ide/pathJoin";
import { JetbrainsCommandServer } from "./ide/JetbrainsCommandServer";
import { JetbrainsSnippets } from "./ide/JetbrainsSnippets";
import { JetbrainsScopeVisualizer } from "./ide/JetbrainsScopeVisualizer";
import { TutorialImpl } from "@cursorless/lib-tutorial";
import { JetbrainsTutorialContentProvider } from "./ide/JetbrainsTutorialContentProvider";

export async function activate(
  plugin: JetbrainsPlugin,
  wasmDirectory: string,
): Promise<CursorlessEngine> {
  console.log("activate started");
  await Parser.init({
    locateFile(scriptName: string, _scriptDirectory: string) {
      const fullPath = pathJoin(wasmDirectory, scriptName);
      return fullPath;
    },
  });
  console.log("Parser initialized");

  const commandServerApi = new JetbrainsCommandServer(plugin.client);
  const queryProvider = new JetbrainsTreeSitterQueryProvider(plugin.ide);
  const engine = await createCursorlessEngine({
    ide: plugin.ide,
    hats: plugin.hats,
    treeSitterQueryProvider: queryProvider,
    treeSitter: new JetbrainsTreeSitter(wasmDirectory),
    commandServerApi: commandServerApi,
    talonSpokenForms: plugin.talonSpokenForms,
    snippets: new JetbrainsSnippets(plugin.client, plugin.ide),
  });
  // Records each command when the commandHistory setting is on, for "cursorless stats"
  engine.addCommandRunnerDecorator(
    new CommandHistory(
      plugin.ide,
      plugin.commandHistoryStorage,
      commandServerApi,
    ),
  );
  plugin.scopeVisualizer = new JetbrainsScopeVisualizer(
    plugin.client,
    engine.scopeProvider,
  );

  // The tutorial, as the VS Code extension creates it; the Cursorless tool window shows its state
  const tutorial = new TutorialImpl(
    plugin.ide,
    engine.hatTokenMap,
    engine.customSpokenFormGenerator,
    new JetbrainsTutorialContentProvider(plugin.client),
    plugin.hats,
  );
  engine.addCommandRunnerDecorator(tutorial);
  tutorial.onState((state) =>
    plugin.client.tutorialStateChanged(JSON.stringify(state)),
  );
  plugin.scopeVisualizer.onDidChangeScopeType = (scopeType) =>
    tutorial.scopeTypeVisualized(scopeType);
  plugin.tutorial = tutorial;
  console.log("activate completed");
  return engine;
}
