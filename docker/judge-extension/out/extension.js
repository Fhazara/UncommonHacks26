"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
let judgeSpec = null;
let anthropicClient = null;
async function activate(context) {
    judgeSpec = readJudgeSpec();
    if (!judgeSpec) {
        vscode.window.showWarningMessage("Judge Agent: no judge-spec.json found — extension inactive.");
        return;
    }
    anthropicClient = new sdk_1.default({ apiKey: judgeSpec.anthropicApiKey });
    setupTelemetryListeners(context);
    setupSidebarPanel(context);
}
function deactivate() { }
function readJudgeSpec() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }
    const specPath = path.join(workspaceFolders[0].uri.fsPath, ".judge", "judge-spec.json");
    if (!fs.existsSync(specPath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(specPath, "utf8"));
    }
    catch {
        return null;
    }
}
function setupTelemetryListeners(context) {
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => {
        postTelemetry("file_edit", {
            file: e.document.fileName,
            version: e.document.version,
            changes: e.contentChanges.length,
        });
    }));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            postTelemetry("focus_change", { file: editor.document.fileName });
        }
    }));
    context.subscriptions.push(vscode.window.onDidStartTerminalShellExecution?.((e) => {
        postTelemetry("terminal_command", {
            command: e.execution.commandLine?.value ?? "",
        });
    }) ?? { dispose: () => { } });
}
function setupSidebarPanel(context) {
    const provider = new JudgeSidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("judgeSidebarChat", provider));
}
async function postTelemetry(eventType, data) {
    if (!judgeSpec) {
        return;
    }
    const event = {
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
    }
    catch {
        // Telemetry posting is best-effort; never block the user
    }
}
async function callJudgeLLM(userContext) {
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
class JudgeSidebarProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    resolveWebviewView(webviewView) {
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "userMessage") {
                const reply = await callJudgeLLM(msg.text);
                webviewView.webview.postMessage({ type: "judgeReply", text: reply });
            }
        });
    }
    getHtml() {
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
