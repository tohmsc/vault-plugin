---
description: Show Thomas's top Claude Code skills from the vault, ranked by member use
argument-hint: "[skill-name to install]"
allowed-tools: mcp__plugin_sourcetms-vault_vault__list_skills mcp__plugin_sourcetms-vault_vault__get_skill
---
If `$ARGUMENTS` is empty: call the vault `list_skills` tool and show the ranked table as returned. Then ask which skill to install.

If `$ARGUMENTS` names a skill: call `get_skill` with that name and install it as the result describes (write files to `~/.claude/skills/<name>/`, ask before overwriting).

If the vault tools are missing or return an auth error, tell the user to run `/mcp`, pick `plugin:sourcetms-vault:vault`, and sign in with their member email.
