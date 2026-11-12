const vscode = require("vscode");
const runtime = require("./runtime");

const helpTopics = new Map([
  ["var", "Variables and types"],
  ["ver", "Variables and types"],
  ["string", "Variables and types"],
  ["int", "Variables and types"],
  ["double", "Variables and types"],
  ["char", "Variables and types"],
  ["bool", "Variables and types"],
  ["list2D", "Collections"],
  ["list3D", "Collections"],
  ["tuple2D", "Collections"],
  ["tuple3D", "Collections"],
  ["set2D", "Collections"],
  ["set3D", "Collections"],
  ["true", "Variables and types"],
  ["false", "Variables and types"],
  ["nil", "Variables and types"],
  ["and", "Expressions and operators"],
  ["or", "Expressions and operators"],
  ["not", "Expressions and operators"],
  ["if", "Conditions"],
  ["elseif", "Conditions"],
  ["else", "Conditions"],
  ["for", "Loops"],
  ["while", "Loops"],
  ["fn", "Functions and flow control"],
  ["return", "Functions and flow control"],
  ["break", "Functions and flow control"],
  ["continue", "Functions and flow control"],
  ["pass", "Functions and flow control"],
  ["print", "Output, input, and waiting"],
  ["input", "Output, input, and waiting"],
  ["prompt", "Output, input, and waiting"],
  ["io", "Output, input, and waiting"],
  ["wait", "Output, input, and waiting"],
  ["range", "Loops"],
  ["upper", "String methods"],
  ["lower", "String methods"],
  ["split", "String methods"],
  ["trim", "String methods"],
  ["replace", "String methods"],
  ["repeat", "String methods"],
  ["at", "String methods"],
  ["slice", "String methods"],
  ["substring", "String methods"],
  ["substr", "String methods"],
  ["|>", "Expressions and operators"]
]);

const languageIds = ["espresso", "cespresso"];

function activate(context) {
  const helpUri = vscode.Uri.joinPath(context.extensionUri, "docs", "help.md");
  const output = vscode.window.createOutputChannel("Espresso");
  let activeRun;

  const provider = {
    async provideDefinition(document, position) {
      const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
      const word = wordRange ? document.getText(wordRange) : "";
      const topic = helpTopics.get(word);
      const lineText = document.lineAt(position.line).text;
      const operatorAtCursor = lineText.slice(position.character, position.character + 2) === "|>"
        || lineText.slice(position.character - 1, position.character + 1) === "|>";
      const operatorTopic = !wordRange && operatorAtCursor ? helpTopics.get("|>") : undefined;
      const targetTopic = topic || operatorTopic;
      if (!targetTopic) {
        return undefined;
      }

      const helpDocument = await vscode.workspace.openTextDocument(helpUri);
      for (let line = 0; line < helpDocument.lineCount; line += 1) {
        const text = helpDocument.lineAt(line).text;
        if (text === `## ${targetTopic}`) {
          return new vscode.Location(
            helpUri,
            new vscode.Range(line, 0, line, text.length)
          );
        }
      }

      return undefined;
    }
  };

  for (const languageId of languageIds) {
    context.subscriptions.push(
      vscode.languages.registerDefinitionProvider({ language: languageId }, provider)
    );
  }

  context.subscriptions.push(output);
  context.subscriptions.push(vscode.commands.registerCommand("espresso.runFile", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !languageIds.includes(editor.document.languageId)) {
      void vscode.window.showErrorMessage("Open an Espresso or cEspresso file before running.");
      return;
    }
    if (activeRun) {
      void vscode.window.showInformationMessage("An Espresso program is already running. Stop it before starting another.");
      return;
    }
    if (!(await editor.document.save())) {
      return;
    }

    const document = editor.document;
    const runState = { cancelled: false };
    activeRun = runState;
    await vscode.commands.executeCommand("setContext", "espresso.running", true);
    output.clear();
    output.appendLine(`Running ${document.fileName}`);
    output.show(true);
    try {
      await runtime.run(document.getText(), {
        write: (text) => output.append(text),
        readInput: async (promptText) => {
          const value = await vscode.window.showInputBox({ prompt: String(promptText) });
          if (value === undefined) {
            throw new Error("Input cancelled.");
          }
          return value;
        },
        isCancelled: () => runState.cancelled
      });
      if (!runState.cancelled) {
        output.appendLine("\nProcess finished.");
      }
    } catch (error) {
      output.appendLine(`\n${error instanceof Error ? error.message : String(error)}`);
      if (!runState.cancelled) {
        void vscode.window.showErrorMessage(`Espresso: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      activeRun = undefined;
      await vscode.commands.executeCommand("setContext", "espresso.running", false);
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("espresso.stopFile", () => {
    if (activeRun) {
      activeRun.cancelled = true;
      output.appendLine("\nStopping program...");
    } else {
      void vscode.window.showInformationMessage("No Espresso program is running.");
    }
  }));
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
