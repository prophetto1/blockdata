-- Migration 066: Individual pipeline-worker functions (19 task-class functions)
-- Replaces the single generic execute_task function with one function per
-- Kestra task class, carrying full parameter_schema, source_task_class, and
-- plugin_group metadata for UI display and search.
--
-- Prerequisites: 065 (new columns on service_functions)
--
-- All functions share entrypoint /execute on the pipeline-worker service.
-- The source_task_class tells the dispatcher which class to invoke.
-- Safe to re-run: ON CONFLICT (service_id, function_name) DO UPDATE.

-- ---------------------------------------------------------------------------
-- 1. Mark the legacy generic execute_task as deprecated
-- ---------------------------------------------------------------------------

UPDATE public.service_functions
SET
  deprecated   = true,
  description  = '[Deprecated] Generic task dispatcher — use individual task functions instead.',
  updated_at   = now()
WHERE function_id = '00000000-0000-0000-0000-000000000101';

-- ---------------------------------------------------------------------------
-- 2. Insert 16 canonical + 3 legacy task-class functions
-- ---------------------------------------------------------------------------

INSERT INTO public.service_functions (
  function_id, service_id,
  function_name, function_type, label, description,
  entrypoint, http_method,
  parameter_schema,
  source_task_class, plugin_group,
  tags, enabled, deprecated,
  when_to_use
) VALUES

-- ── Core: Log ──────────────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000100',
  'log_log', 'utility', 'Log Message',
  'Write a message to the execution log at a specified level.',
  '/execute', 'POST',
  '[
    {"name": "message", "type": "string", "required": true,  "description": "Message or expression to log. Supports Pebble templating."},
    {"name": "level",   "type": "string", "required": false, "default": "INFO",
     "values": ["TRACE","DEBUG","INFO","WARN","ERROR"],
     "description": "Log level (default: INFO)."}
  ]'::jsonb,
  'io.kestra.plugin.core.log.Log', 'io.kestra.plugin.core',
  '["log","core","debug","trace"]'::jsonb, true, false,
  'Use to emit structured log messages during flow execution for debugging or auditing.'
),

-- ── Core Flow: Sleep ───────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000100',
  'flow_sleep', 'flow', 'Sleep',
  'Pause execution for a specified ISO-8601 duration.',
  '/execute', 'POST',
  '[
    {"name": "duration", "type": "string", "required": true,
     "description": "ISO-8601 duration string (e.g. PT5S for 5 seconds, PT1M for 1 minute)."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.Sleep', 'io.kestra.plugin.core',
  '["flow","core","sleep","delay","wait"]'::jsonb, true, false,
  'Use to introduce intentional delays between tasks, e.g. rate-limiting or polling intervals.'
),

-- ── Core Flow: Pause ───────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000100',
  'flow_pause', 'flow', 'Pause (Human Approval)',
  'Pause execution and wait for manual approval or a timeout.',
  '/execute', 'POST',
  '[
    {"name": "pauseDuration", "type": "string", "required": false,
     "description": "ISO-8601 duration. If set, auto-resumes after this time."},
    {"name": "behavior",      "type": "string", "required": false, "default": "RESUME",
     "values": ["RESUME","CANCEL","FAIL"],
     "description": "What to do when the pause expires without manual action."},
    {"name": "onPause",       "type": "object", "required": false,
     "description": "Optional task group to run when the pause starts."},
    {"name": "onResume",      "type": "array",  "required": false,
     "description": "Input prompts shown to the operator when they resume."},
    {"name": "tasks",         "type": "array",  "required": false,
     "description": "Tasks to run after resuming (sub-flow tasks)."},
    {"name": "errors",        "type": "array",  "required": false,
     "description": "Error handler tasks."},
    {"name": "finally",       "type": "array",  "required": false,
     "description": "Cleanup tasks always run after completion."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.Pause', 'io.kestra.plugin.core',
  '["flow","core","pause","approval","human-in-the-loop"]'::jsonb, true, false,
  'Use when a flow needs human sign-off before proceeding, e.g. staging deployment approval.'
),

-- ── Core Flow: If ─────────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000105',
  '00000000-0000-0000-0000-000000000100',
  'flow_if', 'flow', 'If / Else Branch',
  'Execute tasks conditionally based on a boolean expression.',
  '/execute', 'POST',
  '[
    {"name": "condition", "type": "string", "required": false,
     "description": "Pebble expression that evaluates to true/false. Falsy values: 0, null, empty string."},
    {"name": "then",      "type": "array",  "required": true,
     "description": "Tasks to run when condition is true."},
    {"name": "else",      "type": "array",  "required": false,
     "description": "Tasks to run when condition is false."},
    {"name": "errors",    "type": "array",  "required": false,
     "description": "Error handler tasks."},
    {"name": "finally",   "type": "array",  "required": false,
     "description": "Cleanup tasks always run after completion."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.If', 'io.kestra.plugin.core',
  '["flow","core","conditional","branch","if-else"]'::jsonb, true, false,
  'Use for binary branching logic. For multiple branches, prefer Switch.'
),

-- ── Core Flow: Switch ─────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000106',
  '00000000-0000-0000-0000-000000000100',
  'flow_switch', 'flow', 'Switch / Case Branch',
  'Run different task groups based on a string value.',
  '/execute', 'POST',
  '[
    {"name": "value",    "type": "string", "required": true,
     "description": "The value to switch on (Pebble expression or literal)."},
    {"name": "cases",    "type": "object", "required": false,
     "description": "Map of case value -> task list. Keys are matched against value."},
    {"name": "defaults", "type": "array",  "required": false,
     "description": "Tasks to run if no case matches (default branch)."},
    {"name": "errors",   "type": "array",  "required": false,
     "description": "Error handler tasks."},
    {"name": "finally",  "type": "array",  "required": false,
     "description": "Cleanup tasks always run after completion."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.Switch', 'io.kestra.plugin.core',
  '["flow","core","switch","case","conditional","multi-branch"]'::jsonb, true, false,
  'Use when you have 3+ branches based on a single value (e.g. environment name or status code).'
),

-- ── Core Flow: ForEach ────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000107',
  '00000000-0000-0000-0000-000000000100',
  'flow_foreach', 'flow', 'For Each (Loop)',
  'Execute a task group for each item in a list, optionally in parallel.',
  '/execute', 'POST',
  '[
    {"name": "values",           "type": "string",  "required": true,
     "description": "List of values as a JSON array string, or a Pebble expression returning a list."},
    {"name": "tasks",            "type": "array",   "required": true,
     "description": "Tasks to run for each value. Use {{ taskrun.value }} to reference the current item."},
    {"name": "concurrencyLimit", "type": "integer", "required": false, "default": 1,
     "description": "Max parallel iterations. 0 = unlimited (all items run at once)."},
    {"name": "errors",           "type": "array",   "required": false,
     "description": "Error handler tasks."},
    {"name": "finally",          "type": "array",   "required": false,
     "description": "Cleanup tasks always run after completion."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.ForEach', 'io.kestra.plugin.core',
  '["flow","core","loop","iterate","foreach","parallel"]'::jsonb, true, false,
  'Use to fan out work across a dynamic list of items, e.g. processing files or database rows.'
),

-- ── Core Flow: Parallel ───────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000108',
  '00000000-0000-0000-0000-000000000100',
  'flow_parallel', 'flow', 'Parallel Execution',
  'Run a fixed set of task groups concurrently.',
  '/execute', 'POST',
  '[
    {"name": "tasks",      "type": "array",   "required": true,
     "description": "Task groups to run in parallel. Each group runs as a separate branch."},
    {"name": "concurrent", "type": "integer", "required": false, "default": 0,
     "description": "Max branches running at once. 0 = unlimited (all start immediately)."},
    {"name": "errors",     "type": "array",   "required": false,
     "description": "Error handler tasks."},
    {"name": "finally",    "type": "array",   "required": false,
     "description": "Cleanup tasks always run after completion."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.Parallel', 'io.kestra.plugin.core',
  '["flow","core","parallel","concurrent","fan-out"]'::jsonb, true, false,
  'Use when tasks are independent and can run at the same time. For dynamic lists, prefer ForEach.'
),

-- ── Core Flow: Sequential ─────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000109',
  '00000000-0000-0000-0000-000000000100',
  'flow_sequential', 'flow', 'Sequential Execution',
  'Run tasks one after another in definition order.',
  '/execute', 'POST',
  '[
    {"name": "tasks",   "type": "array", "required": true,
     "description": "Tasks to execute in order."},
    {"name": "errors",  "type": "array", "required": false,
     "description": "Error handler tasks."},
    {"name": "finally", "type": "array", "required": false,
     "description": "Cleanup tasks always run after completion."}
  ]'::jsonb,
  'io.kestra.plugin.core.flow.Sequential', 'io.kestra.plugin.core',
  '["flow","core","sequential","ordered"]'::jsonb, true, false,
  'Use to group tasks that must run in strict order within a parallel or foreach context.'
),

-- ── Core HTTP: Request ────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000110',
  '00000000-0000-0000-0000-000000000100',
  'http_request', 'utility', 'HTTP Request',
  'Make an HTTP request to any URL and capture the response body and status.',
  '/execute', 'POST',
  '[
    {"name": "uri",         "type": "string",  "required": true,
     "description": "Target URL. Supports Pebble expressions."},
    {"name": "method",      "type": "string",  "required": false, "default": "GET",
     "values": ["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"],
     "description": "HTTP method."},
    {"name": "contentType", "type": "string",  "required": false, "default": "application/json",
     "description": "Content-Type header for the request body."},
    {"name": "body",        "type": "string",  "required": false,
     "description": "Request body as a string (JSON, form data, etc.)."},
    {"name": "headers",     "type": "object",  "required": false,
     "description": "Additional HTTP headers as key-value pairs."},
    {"name": "params",      "type": "object",  "required": false,
     "description": "URL query parameters as key-value pairs."},
    {"name": "allowFailed", "type": "boolean", "required": false,
     "description": "If true, non-2xx responses do not fail the task."},
    {"name": "encryptBody", "type": "boolean", "required": false, "default": false,
     "description": "Encrypt the request body in task outputs."},
    {"name": "sslOptions",  "type": "object",  "required": false,
     "description": "SSL/TLS options (insecure, keystore, etc.)."}
  ]'::jsonb,
  'io.kestra.plugin.core.http.Request', 'io.kestra.plugin.core',
  '["http","core","api","rest","webhook"]'::jsonb, true, false,
  'Use to call external REST APIs, webhooks, or any HTTP endpoint from within a flow.'
),

-- ── Core HTTP: Download ───────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000111',
  '00000000-0000-0000-0000-000000000100',
  'http_download', 'utility', 'HTTP Download',
  'Download a file from an HTTP URL and store it as a flow output.',
  '/execute', 'POST',
  '[
    {"name": "uri",                 "type": "string",  "required": true,
     "description": "URL of the file to download."},
    {"name": "method",              "type": "string",  "required": false, "default": "GET",
     "values": ["GET","POST"],
     "description": "HTTP method."},
    {"name": "saveAs",              "type": "string",  "required": false,
     "description": "Override the saved filename. Defaults to the filename in Content-Disposition."},
    {"name": "headers",             "type": "object",  "required": false,
     "description": "Additional HTTP headers."},
    {"name": "body",                "type": "string",  "required": false,
     "description": "Request body (for POST requests)."},
    {"name": "allowFailed",         "type": "boolean", "required": false,
     "description": "If true, non-2xx responses do not fail the task."},
    {"name": "failOnEmptyResponse", "type": "boolean", "required": false, "default": true,
     "description": "Fail if the response body is empty."}
  ]'::jsonb,
  'io.kestra.plugin.core.http.Download', 'io.kestra.plugin.core',
  '["http","core","download","file","fetch"]'::jsonb, true, false,
  'Use to fetch files from HTTP endpoints as part of a data pipeline (e.g. CSV exports, reports).'
),

-- ── Python: Script ────────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000112',
  '00000000-0000-0000-0000-000000000100',
  'python_script', 'transform', 'Python Script (Inline)',
  'Execute an inline Python script in an isolated container.',
  '/execute', 'POST',
  '[
    {"name": "script",         "type": "string", "required": true,
     "description": "Python source code as a multi-line string. Written to a .py file and executed."},
    {"name": "containerImage", "type": "string", "required": false, "default": "python:3.13-slim",
     "description": "Docker image to run the script in."},
    {"name": "beforeCommands", "type": "array",  "required": false,
     "description": "Shell commands run before the script (e.g. pip install, apt-get)."},
    {"name": "dependencies",   "type": "array",  "required": false,
     "description": "Python packages to install before running (shortcut for pip install)."},
    {"name": "inputFiles",     "type": "object", "required": false,
     "description": "Files to inject into the working directory (filename -> content or URI)."},
    {"name": "outputFiles",    "type": "array",  "required": false,
     "description": "Glob patterns of files to capture as task outputs."},
    {"name": "env",            "type": "object", "required": false,
     "description": "Environment variables available to the script."}
  ]'::jsonb,
  'io.kestra.plugin.scripts.python.Script', 'io.kestra.plugin.scripts.python',
  '["python","script","transform","code","inline"]'::jsonb, true, false,
  'Use to run custom Python logic inline. For file-based scripts, prefer Commands.'
),

-- ── Python: Commands ──────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000113',
  '00000000-0000-0000-0000-000000000100',
  'python_commands', 'transform', 'Python Commands',
  'Execute a sequence of Python CLI commands in an isolated container.',
  '/execute', 'POST',
  '[
    {"name": "commands",       "type": "array",  "required": true,
     "description": "List of Python commands to run in order (e.g. [\"python main.py\", \"python cleanup.py\"])."},
    {"name": "containerImage", "type": "string", "required": false, "default": "python:3.13-slim",
     "description": "Docker image to run commands in."},
    {"name": "beforeCommands", "type": "array",  "required": false,
     "description": "Shell commands run before the main commands (e.g. pip install)."},
    {"name": "dependencies",   "type": "array",  "required": false,
     "description": "Python packages to install before running."},
    {"name": "inputFiles",     "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",    "type": "array",  "required": false,
     "description": "Glob patterns of files to capture as task outputs."},
    {"name": "env",            "type": "object", "required": false,
     "description": "Environment variables."}
  ]'::jsonb,
  'io.kestra.plugin.scripts.python.Commands', 'io.kestra.plugin.scripts.python',
  '["python","commands","cli","transform","scripts"]'::jsonb, true, false,
  'Use to run Python scripts from the filesystem or run multiple Python commands in sequence.'
),

-- ── Shell: Script ─────────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000114',
  '00000000-0000-0000-0000-000000000100',
  'shell_script', 'utility', 'Shell Script (Inline)',
  'Execute an inline shell script in an isolated container.',
  '/execute', 'POST',
  '[
    {"name": "script",         "type": "string", "required": true,
     "description": "Shell script source code as a multi-line string."},
    {"name": "containerImage", "type": "string", "required": false, "default": "ubuntu",
     "description": "Docker image to run the script in."},
    {"name": "interpreter",    "type": "array",  "required": false, "default": ["/bin/sh", "-c"],
     "description": "Shell interpreter to use (e.g. [\"/bin/bash\", \"-c\"])."},
    {"name": "beforeCommands", "type": "array",  "required": false,
     "description": "Commands run before the main script."},
    {"name": "inputFiles",     "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",    "type": "array",  "required": false,
     "description": "Glob patterns of files to capture as outputs."},
    {"name": "env",            "type": "object", "required": false,
     "description": "Environment variables."}
  ]'::jsonb,
  'io.kestra.plugin.scripts.shell.Script', 'io.kestra.plugin.scripts.shell',
  '["shell","bash","script","utility","inline"]'::jsonb, true, false,
  'Use for inline shell scripting (file ops, system calls, glue code).'
),

-- ── Shell: Commands ───────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000115',
  '00000000-0000-0000-0000-000000000100',
  'shell_commands', 'utility', 'Shell Commands',
  'Execute a sequence of shell commands in an isolated container.',
  '/execute', 'POST',
  '[
    {"name": "commands",       "type": "array",  "required": true,
     "description": "List of shell commands to run in order."},
    {"name": "containerImage", "type": "string", "required": false, "default": "ubuntu",
     "description": "Docker image to run commands in."},
    {"name": "interpreter",    "type": "array",  "required": false, "default": ["/bin/sh", "-c"],
     "description": "Shell interpreter (e.g. [\"/bin/bash\", \"-c\"])."},
    {"name": "beforeCommands", "type": "array",  "required": false,
     "description": "Commands run before the main commands."},
    {"name": "inputFiles",     "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",    "type": "array",  "required": false,
     "description": "Glob patterns of files to capture as outputs."},
    {"name": "env",            "type": "object", "required": false,
     "description": "Environment variables."}
  ]'::jsonb,
  'io.kestra.plugin.scripts.shell.Commands', 'io.kestra.plugin.scripts.shell',
  '["shell","bash","commands","cli","utility"]'::jsonb, true, false,
  'Use to run existing shell scripts or sequential shell commands.'
),

-- ── Node.js: Script ───────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000116',
  '00000000-0000-0000-0000-000000000100',
  'node_script', 'transform', 'Node.js Script (Inline)',
  'Execute an inline JavaScript (Node.js) script in an isolated container.',
  '/execute', 'POST',
  '[
    {"name": "script",         "type": "string", "required": true,
     "description": "JavaScript source code as a multi-line string. Saved to a .js file and executed."},
    {"name": "containerImage", "type": "string", "required": false, "default": "node",
     "description": "Docker image to run the script in. Add tooling as needed (e.g. node:18-alpine)."},
    {"name": "beforeCommands", "type": "array",  "required": false,
     "description": "Shell commands run before the script (e.g. npm install)."},
    {"name": "inputFiles",     "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",    "type": "array",  "required": false,
     "description": "Glob patterns of files to capture as outputs."},
    {"name": "env",            "type": "object", "required": false,
     "description": "Environment variables."}
  ]'::jsonb,
  'io.kestra.plugin.scripts.node.Script', 'io.kestra.plugin.scripts.node',
  '["node","javascript","script","transform","inline"]'::jsonb, true, false,
  'Use to run custom JavaScript logic inline. For file-based scripts, prefer Commands.'
),

-- ── Node.js: Commands ─────────────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000117',
  '00000000-0000-0000-0000-000000000100',
  'node_commands', 'transform', 'Node.js Commands',
  'Execute a sequence of Node.js CLI commands in an isolated container.',
  '/execute', 'POST',
  '[
    {"name": "commands",       "type": "array",  "required": true,
     "description": "List of Node.js commands to run in order (e.g. [\"node index.js\"])."},
    {"name": "containerImage", "type": "string", "required": false, "default": "node",
     "description": "Docker image to run commands in."},
    {"name": "beforeCommands", "type": "array",  "required": false,
     "description": "Shell commands run before the main commands (e.g. npm install)."},
    {"name": "inputFiles",     "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",    "type": "array",  "required": false,
     "description": "Glob patterns of files to capture as outputs."},
    {"name": "env",            "type": "object", "required": false,
     "description": "Environment variables."}
  ]'::jsonb,
  'io.kestra.plugin.scripts.node.Commands', 'io.kestra.plugin.scripts.node',
  '["node","javascript","commands","cli","transform"]'::jsonb, true, false,
  'Use to run Node.js scripts from the filesystem or multiple Node.js commands in sequence.'
),

-- ── Legacy: Bash (Deprecated) ─────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000118',
  '00000000-0000-0000-0000-000000000100',
  'legacy_bash', 'utility', 'Bash Script (Legacy)',
  '[Deprecated] Use shell_commands instead. Run bash commands in the PROCESS runner.',
  '/execute', 'POST',
  '[
    {"name": "commands",     "type": "array",  "required": true,
     "description": "Bash commands to run."},
    {"name": "runner",       "type": "string", "required": false, "default": "PROCESS",
     "values": ["PROCESS","DOCKER"],
     "description": "Execution environment."},
    {"name": "inputFiles",   "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",  "type": "array",  "required": false,
     "description": "Files to capture as outputs."},
    {"name": "env",          "type": "object", "required": false,
     "description": "Environment variables."},
    {"name": "exitOnFailed", "type": "boolean","required": false, "default": true,
     "description": "Stop on first non-zero exit code."}
  ]'::jsonb,
  'io.kestra.core.tasks.scripts.Bash', 'io.kestra.plugin.scripts.shell',
  '["bash","legacy","deprecated","shell"]'::jsonb, true, true,
  'Legacy alias for shell.Commands. Migrate to shell_commands for new flows.'
),

-- ── Legacy: Node (Deprecated) ─────────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000119',
  '00000000-0000-0000-0000-000000000100',
  'legacy_node', 'transform', 'Node.js Script (Legacy)',
  '[Deprecated] Use node_script or node_commands instead.',
  '/execute', 'POST',
  '[
    {"name": "runner",       "type": "string", "required": false, "default": "PROCESS",
     "values": ["PROCESS","DOCKER"],
     "description": "Execution environment."},
    {"name": "nodePath",     "type": "string", "required": false, "default": "node",
     "description": "Path to the node executable."},
    {"name": "inputFiles",   "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles",  "type": "array",  "required": false,
     "description": "Files to capture as outputs."},
    {"name": "env",          "type": "object", "required": false,
     "description": "Environment variables."},
    {"name": "exitOnFailed", "type": "boolean","required": false, "default": true,
     "description": "Stop on first non-zero exit code."}
  ]'::jsonb,
  'io.kestra.core.tasks.scripts.Node', 'io.kestra.plugin.scripts.node',
  '["node","javascript","legacy","deprecated"]'::jsonb, true, true,
  'Legacy alias for node.Script. Migrate to node_script for new flows.'
),

-- ── Legacy: Python (Deprecated) ───────────────────────────────────────────
(
  '00000000-0000-0000-0000-000000000120',
  '00000000-0000-0000-0000-000000000100',
  'legacy_python', 'transform', 'Python Script (Legacy)',
  '[Deprecated] Use python_script or python_commands instead.',
  '/execute', 'POST',
  '[
    {"name": "commands",    "type": "array",  "required": false, "default": ["./bin/python main.py"],
     "description": "Commands to execute (defaults to running main.py)."},
    {"name": "runner",      "type": "string", "required": false, "default": "PROCESS",
     "values": ["PROCESS","DOCKER"],
     "description": "Execution environment."},
    {"name": "virtualEnv",  "type": "boolean","required": false, "default": true,
     "description": "Create a virtualenv before running."},
    {"name": "requirements","type": "array",  "required": false,
     "description": "Python packages to install (pip install)."},
    {"name": "inputFiles",  "type": "object", "required": false,
     "description": "Files to inject into the working directory."},
    {"name": "outputFiles", "type": "array",  "required": false,
     "description": "Files to capture as outputs."},
    {"name": "env",         "type": "object", "required": false,
     "description": "Environment variables."}
  ]'::jsonb,
  'io.kestra.core.tasks.scripts.Python', 'io.kestra.plugin.scripts.python',
  '["python","legacy","deprecated","scripts"]'::jsonb, true, true,
  'Legacy alias for python.Script. Migrate to python_script for new flows.'
)

ON CONFLICT (service_id, function_name) DO UPDATE SET
  function_type     = EXCLUDED.function_type,
  label             = EXCLUDED.label,
  description       = EXCLUDED.description,
  entrypoint        = EXCLUDED.entrypoint,
  http_method       = EXCLUDED.http_method,
  parameter_schema  = EXCLUDED.parameter_schema,
  source_task_class = EXCLUDED.source_task_class,
  plugin_group      = EXCLUDED.plugin_group,
  tags              = EXCLUDED.tags,
  enabled           = EXCLUDED.enabled,
  deprecated        = EXCLUDED.deprecated,
  when_to_use       = EXCLUDED.when_to_use,
  updated_at        = now();

-- ---------------------------------------------------------------------------
-- 3. Map integration_catalog_items to individual function IDs
--    (no-op if catalog not yet seeded; runs correctly after migration 067)
-- ---------------------------------------------------------------------------

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000102',
  mapping_notes      = 'auto-mapped: pipeline-worker (log_log)'
WHERE task_class = 'io.kestra.plugin.core.log.Log';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000103',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_sleep)'
WHERE task_class = 'io.kestra.plugin.core.flow.Sleep';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000104',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_pause)'
WHERE task_class = 'io.kestra.plugin.core.flow.Pause';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000105',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_if)'
WHERE task_class = 'io.kestra.plugin.core.flow.If';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000106',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_switch)'
WHERE task_class = 'io.kestra.plugin.core.flow.Switch';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000107',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_foreach)'
WHERE task_class = 'io.kestra.plugin.core.flow.ForEach';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000108',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_parallel)'
WHERE task_class = 'io.kestra.plugin.core.flow.Parallel';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000109',
  mapping_notes      = 'auto-mapped: pipeline-worker (flow_sequential)'
WHERE task_class = 'io.kestra.plugin.core.flow.Sequential';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000110',
  mapping_notes      = 'auto-mapped: pipeline-worker (http_request)'
WHERE task_class = 'io.kestra.plugin.core.http.Request';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000111',
  mapping_notes      = 'auto-mapped: pipeline-worker (http_download)'
WHERE task_class = 'io.kestra.plugin.core.http.Download';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000112',
  mapping_notes      = 'auto-mapped: pipeline-worker (python_script)'
WHERE task_class = 'io.kestra.plugin.scripts.python.Script';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000113',
  mapping_notes      = 'auto-mapped: pipeline-worker (python_commands)'
WHERE task_class = 'io.kestra.plugin.scripts.python.Commands';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000114',
  mapping_notes      = 'auto-mapped: pipeline-worker (shell_script)'
WHERE task_class = 'io.kestra.plugin.scripts.shell.Script';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000115',
  mapping_notes      = 'auto-mapped: pipeline-worker (shell_commands)'
WHERE task_class = 'io.kestra.plugin.scripts.shell.Commands';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000116',
  mapping_notes      = 'auto-mapped: pipeline-worker (node_script)'
WHERE task_class = 'io.kestra.plugin.scripts.node.Script';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000117',
  mapping_notes      = 'auto-mapped: pipeline-worker (node_commands)'
WHERE task_class = 'io.kestra.plugin.scripts.node.Commands';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000118',
  mapping_notes      = 'auto-mapped: pipeline-worker (legacy_bash, deprecated)'
WHERE task_class = 'io.kestra.core.tasks.scripts.Bash';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000119',
  mapping_notes      = 'auto-mapped: pipeline-worker (legacy_node, deprecated)'
WHERE task_class = 'io.kestra.core.tasks.scripts.Node';

UPDATE public.integration_catalog_items SET
  mapped_service_id  = '00000000-0000-0000-0000-000000000100',
  mapped_function_id = '00000000-0000-0000-0000-000000000120',
  mapping_notes      = 'auto-mapped: pipeline-worker (legacy_python, deprecated)'
WHERE task_class = 'io.kestra.core.tasks.scripts.Python';

NOTIFY pgrst, 'reload schema';