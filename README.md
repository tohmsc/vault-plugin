# sourcetms-vault — Claude Code plugin

Connects Claude Code to [vault.sourcetms.com](https://vault.sourcetms.com), Thomas's (@sourcetms) paid members' vault. Your agent can read his playbooks and install his Claude Code skills on request.

This plugin holds no vault content. Everything is fetched over MCP after you sign in as a member.

## Install

In Claude Code:

```
/plugin marketplace add sourcetms/vault-plugin
/plugin install sourcetms-vault@sourcetms
```

Or from a shell:

```
claude plugin marketplace add sourcetms/vault-plugin
claude plugin install sourcetms-vault@sourcetms
```

Then sign in:

1. Run `/mcp`.
2. Pick `plugin:sourcetms-vault:vault` and choose to authenticate.
3. Your browser opens. Enter the email you use for the vault and click the magic link.

## Use

Just ask:

- "Set me up like Thomas"
- "Install Thomas's ship skill"
- "What does Thomas use for email?"
- `/sourcetms-vault:vault` lists the top skills. `/sourcetms-vault:vault ship` installs one.

Skills install to `~/.claude/skills/<name>/`. Start a new session to load them.

## Without the plugin

```
claude mcp add --transport http sourcetms-vault https://vault.sourcetms.com/mcp
```

Claude.ai or Claude Desktop: Settings → Connectors → Add custom connector → `https://vault.sourcetms.com/mcp`.

## Not a member?

Join at [vault.sourcetms.com](https://vault.sourcetms.com).
