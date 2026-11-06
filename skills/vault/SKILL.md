---
name: vault
description: Use Thomas's (@sourcetms) members' vault through the vault MCP tools. Use when the user says "set me up like Thomas", "install Thomas's <x> skill", "what does Thomas use for <x>", "how does Thomas do <x>", asks about @sourcetms playbooks, build stack or skills, or wants the top skills from the vault.
---

# Thomas's vault

The `vault` MCP server (from this plugin) exposes Thomas's paid members' vault. It holds his playbooks, build stack, operating system and his own Claude Code skills. Skills are not bundled in this plugin. You fetch them through MCP.

## Tools

| Tool | Call it when |
|---|---|
| `list_sections` | You need a map of the vault, or don't know where a topic lives. |
| `search_vault(query)` | The user asks "what does Thomas use for X" or "how does he do X". |
| `get_page(section, slug)` | You know the page. Returns the full Markdown. Quote from it, cite its URL. |
| `whats_new` | The user wants a tour or asks what's new. |
| `list_skills` | The user asks which skills Thomas has or which are popular. Ranked by member use. |
| `get_skill(name)` | The user wants to install a skill. Returns every file and install steps. |

There is also an MCP prompt, `setup_like_thomas`.

## Workflows

**"What does Thomas use for X?"**
1. `search_vault` with 1–3 keywords.
2. `get_page` on the best hit.
3. Answer from the page in a few lines. Link the vault URL. Don't invent tools or numbers that are not on the page.

**"Install Thomas's X skill"**
1. `get_skill("X")`. If it errors, the error lists valid names. Pick the closest one or ask.
2. Check whether `~/.claude/skills/X/` exists. If it does, ask before overwriting.
3. Write each file to the path in its heading, exactly as returned. Run any `chmod` step.
4. Tell the user it's installed and which phrase triggers it. New skills load in the next session.

**"Set me up like Thomas"**
1. `list_skills`. Show the top 5 with one line each.
2. Ask which to install (default: all five).
3. Install each with the steps above.
4. End with a table: skill, path, trigger phrase.

## Rules
- Only install skills the user asked for.
- Never paste vault content into public places (repos, issues, posts). It's for members only.
- If a tool returns 401 or the server is missing, tell the user to run `/mcp`, choose `plugin:sourcetms-vault:vault`, and sign in with the email they use for the vault.
