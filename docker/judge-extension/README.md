# Judge Agent VS Code Extension

HCI experiment judge agent that reads experiment configuration, renders a sidebar chat panel, posts telemetry to the backend, and calls Claude as the judge LLM.

## Build

```bash
npm install
npm run compile   # tsc → ./out/
npm run package   # vsce → judge-agent-0.1.0.vsix
```

Place the resulting `judge-agent.vsix` at `docker/judge-extension/judge-agent.vsix` before building the sandbox Docker image.

## judge-spec.json schema

The extension reads `.judge/judge-spec.json` from the workspace root on activation:

```json
{
  "experimentId": "uuid",
  "sessionId": "uuid",
  "taskName": "Short task name",
  "taskDescription": "What the participant must accomplish",
  "judgePersona": "One-sentence judge description",
  "judgeSystemPrompt": "Full system prompt for the judge LLM",
  "anthropicApiKey": "sk-ant-...",
  "model": "claude-sonnet-4-6",
  "endConditions": {
    "time_limit_seconds": 3600,
    "task_completion": {
      "type": "tests_pass",
      "test_command": "npm test",
      "required_pass_count": null
    },
    "manual": true
  },
  "activeInterventions": {
    "prediction_questions_enabled": true,
    "bug_injection_enabled": false,
    "explanation_requests_enabled": true
  },
  "telemetryEndpoint": "http://host.docker.internal:8000/api/experiments/<id>/telemetry",
  "completionSignalEndpoint": "http://host.docker.internal:8000/api/experiments/<id>/complete"
}
```

## Telemetry events posted

| event_type | trigger |
|---|---|
| `file_edit` | `onDidChangeTextDocument` |
| `focus_change` | `onDidChangeActiveTextEditor` |
| `terminal_command` | `onDidStartTerminalShellExecution` |
| `judge_interaction` | after every judge LLM call |
