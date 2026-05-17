import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";

interface TaskCompletionCondition {
  type: "tests_pass" | "file_exists" | "signal";
  test_command?: string;
  file_path?: string;
  required_pass_count?: number;
}

interface EndConditions {
  time_limit_seconds?: number;
  task_completion?: TaskCompletionCondition;
  manual: boolean;
}

interface JudgeSpec {
  experimentId: string;
  sessionId: string;
  taskName: string;
  taskDescription: string;
  judgePersona: string;
  judgeSystemPrompt: string;
  anthropicApiKey: string;
  model: string;
  endConditions: EndConditions;
  activeInterventions: Record<string, boolean>;
  telemetryEndpoint: string;
  completionSignalEndpoint: string;
}

interface TelemetryEvent {
  event_type: string;
  timestamp: string;
  session_id: string;
  data: Record<string, unknown>;
}

let judgeSpec: JudgeSpec | null = null;
let anthropicClient: Anthropic | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  judgeSpec = readJudgeSpec();
  if (!judgeSpec) {
    vscode.window.showWarningMessage("Judge Agent: no judge-spec.json found — extension inactive.");
    return;
  }

  anthropicClient = new Anthropic({ apiKey: judgeSpec.anthropicApiKey });

  setupTelemetryListeners(context);
  setupSidebarPanel(context);
}

export function deactivate(): void {}

function readJudgeSpec(): JudgeSpec | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }
  const specPath = path.join(workspaceFolders[0].uri.fsPath, ".judge", "judge-spec.json");
  if (!fs.existsSync(specPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(specPath, "utf8")) as JudgeSpec;
  } catch {
    return null;
  }
}

function setupTelemetryListeners(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      postTelemetry("file_edit", {
        file: e.document.fileName,
        version: e.document.version,
        changes: e.contentChanges.length,
      });
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        postTelemetry("focus_change", { file: editor.document.fileName });
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution?.((e) => {
      postTelemetry("terminal_command", {
        command: e.execution.commandLine?.value ?? "",
      });
    }) ?? { dispose: () => {} }
  );
}

function setupSidebarPanel(context: vscode.ExtensionContext): void {
  const provider = new JudgeSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("judgeSidebarChat", provider)
  );
}

async function postTelemetry(
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!judgeSpec) {
    return;
  }
  const event: TelemetryEvent = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    session_id: judgeSpec.sessionId,
    data,
  };
  try {
    await fetch(judgeSpec.telemetryEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [event] }),
    });
  } catch {
    // Telemetry posting is best-effort; never block the user
  }
}

async function callJudgeLLM(userContext: string): Promise<string> {
  if (!anthropicClient || !judgeSpec) {
    return "";
  }
  const message = await anthropicClient.messages.create({
    model: judgeSpec.model,
    max_tokens: 1024,
    system: judgeSpec.judgeSystemPrompt,
    messages: [{ role: "user", content: userContext }],
  });
  const text = message.content[0].type === "text" ? message.content[0].text : "";

  postTelemetry("judge_interaction", {
    user_context: userContext,
    judge_response: text,
  });

  return text;
}

class JudgeSidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "userMessage") {
        const reply = await callJudgeLLM(msg.text);
        webviewView.webview.postMessage({ type: "judgeReply", text: reply });
      }
    });
  }

  private getHtml(): string {
    const task = judgeSpec?.taskName ?? "Experiment";
    const persona = judgeSpec?.judgePersona ?? "";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: var(--vscode-font-family); font-size: 13px; padding: 8px; }
    #messages { height: 300px; overflow-y: auto; border: 1px solid var(--vscode-panel-border); padding: 8px; margin-bottom: 8px; }
    .msg { margin-bottom: 8px; }
    .msg.judge { color: var(--vscode-textLink-foreground); }
    textarea { width: 100%; box-sizing: border-box; }
    button { margin-top: 4px; }
  </style>
</head>
<body>
  <p><strong>${task}</strong></p>
  <p style="opacity:0.7;font-size:11px;">${persona}</p>
  <div id="messages"></div>
  <textarea id="input" rows="3" placeholder="Type a message…"></textarea>
  <button onclick="send()">Send</button>
  <script>
    const vscode = acquireVsCodeApi();
    const msgs = document.getElementById('messages');
    const input = document.getElementById('input');

    function send() {
      const text = input.value.trim();
      if (!text) return;
      append('You', text, 'user');
      vscode.postMessage({ type: 'userMessage', text });
      input.value = '';
    }

    function append(from, text, cls) {
      const div = document.createElement('div');
      div.className = 'msg ' + cls;
      div.textContent = from + ': ' + text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    window.addEventListener('message', e => {
      if (e.data.type === 'judgeReply') append('Judge', e.data.text, 'judge');
    });
  </script>
</body>
</html>`;
  }
}
