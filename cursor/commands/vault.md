---
name: vault
description: Show Thomas's top skills from the vault, ranked by member use. Add a skill name to install it, or "update" to update installed vault skills.
---
Use the `sourcetms-vault` skill.

If no argument was given: call the vault `list_skills` tool and show the ranked table as returned. Then ask which skill to install.

If the argument is `update`: run the skill's "Update my vault skills" workflow.

If the argument names a skill: run the skill's "Install Thomas's X skill" workflow for it (install to `~/.cursor/skills/<name>/`, ask before overwriting).

If the vault tools are missing or return an auth error, tell the user to sign in to the `sourcetms-vault` MCP server with their member email.
