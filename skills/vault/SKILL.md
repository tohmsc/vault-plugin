---
name: vault
description: Use Thomas's (@sourcetms) members' vault through the vault MCP tools. Use when the user says "set me up like Thomas", "install Thomas's <x> skill", "what does Thomas use for <x>", "how does Thomas do <x>", asks about @sourcetms playbooks, build stack or skills, wants the top skills from the vault, or says "update my vault skills".
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
| `get_skill(name, reason?)` | The user wants to install a skill (or update one: `reason: "update"`). Returns every file, a `.vault.json` version marker, and install steps. |
| `check_skill_updates(installed)` | The user wants to update their vault skills, or the plugin said updates are available. |

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

**"Update my vault skills"** (also when the plugin reports updates at session start)
1. Find installed vault skills: read every `~/.claude/skills/*/.vault.json` and `.claude/skills/*/.vault.json` in the project. Each has `skill` and `version`.
2. Call `check_skill_updates` with `{ "<skill>": "<version>", ... }`.
3. Show the outdated ones and say that updating replaces the installed files, so any local edits to them are lost. Ask which to update (default: all).
4. For each, call `get_skill(name, reason: "update")` and follow its update steps: delete files from the old marker's `files` list that are no longer returned, write every returned file including the new `.vault.json`.
5. Say which skills were updated and that changes load in the next session.

Skills installed before version tracking have no `.vault.json`. If a folder in `~/.claude/skills/` has the same name as a vault skill (`list_skills`) but no marker, offer to reinstall it with `get_skill(name, reason: "update")` so it gets tracked. Don't touch folders the user didn't confirm; they may be their own skills with the same name.

## Rules
- Only install skills the user asked for.
- Never paste vault content into public places (repos, issues, posts). It's for members only.
- If a tool returns 401 or the server is missing, tell the user to run `/mcp`, choose `plugin:sourcetms-vault:vault`, and sign in with the email they use for the vault.
