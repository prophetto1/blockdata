from __future__ import annotations


def list_builtin_tools() -> list[dict[str, object]]:
    return [
        {
            "tool_ref": "builtin:bash",
            "tool_name": "bash",
            "display_name": "Bash",
            "description": "Execute shell commands.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:python",
            "tool_name": "python",
            "display_name": "Python",
            "description": "Execute Python code.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:web_search",
            "tool_name": "web_search",
            "display_name": "Web Search",
            "description": "Search the web.",
            "approval_mode": "auto",
        },
        {
            "tool_ref": "builtin:web_browser",
            "tool_name": "web_browser",
            "display_name": "Web Browser",
            "description": "Browse and inspect web pages.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:text_editor",
            "tool_name": "text_editor",
            "display_name": "Text Editor",
            "description": "Read and edit text files.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:think",
            "tool_name": "think",
            "display_name": "Think",
            "description": "Explicit reasoning scratchpad.",
            "approval_mode": "auto",
        },
        {
            "tool_ref": "builtin:update_plan",
            "tool_name": "update_plan",
            "display_name": "Update Plan",
            "description": "Update plan progress.",
            "approval_mode": "auto",
        },
        {
            "tool_ref": "builtin:memory",
            "tool_name": "memory",
            "display_name": "Memory",
            "description": "Read and write working memory.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:computer",
            "tool_name": "computer",
            "display_name": "Computer",
            "description": "Interact with a desktop computer.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:code_execution",
            "tool_name": "code_execution",
            "display_name": "Code Execution",
            "description": "Execute code in configured runtimes.",
            "approval_mode": "manual",
        },
        {
            "tool_ref": "builtin:bash_session",
            "tool_name": "bash_session",
            "display_name": "Bash Session",
            "description": "Run commands in a persistent shell session.",
            "approval_mode": "manual",
        },
    ]
