/**
 * sourcetms vault for Amp (single-file plugin).
 *
 * Install for every project on this machine:
 *   amp plugins add https://raw.githubusercontent.com/tohmsc/vault-plugin/main/amp/sourcetms-vault.ts
 *
 * What it does, mirroring the Claude Code plugin in this repo:
 * - Registers the `sourcetms-vault` skill, which bundles the vault MCP server (mcp.json).
 *   Single-file plugins can only register skills they write under their cache directory, so the
 *   skill files are written there on load.
 * - On the first turn of each thread, checks installed vault skills for updates (hashes only, no
 *   vault content, nothing about the member is sent) and tells the member when some changed.
 * - Adds two command-palette commands: "Top skills" and "Update my vault skills".
 *
 * Runs on Bun (Amp's plugin runtime). Any failure in the update check is silent.
 */
import type { PluginAPI } from '@ampcode/plugin'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SERVER = 'sourcetms-vault'
const MCP_URL = 'https://vault.sourcetms.com/mcp'
const VERSIONS_URL =
	process.env.VAULT_SKILL_VERSIONS_URL ?? 'https://vault.sourcetms.com/api/public/skill-versions?format=txt'
const MARKER = '.vault.json'

/** Same server name as `amp mcp add sourcetms-vault …`, so a settings entry takes precedence instead of doubling up. */
const MCP_JSON = { [SERVER]: { url: MCP_URL } }

const SKILL_MD = `---
name: sourcetms-vault
description: Use Thomas's (@sourcetms) members' vault through the vault MCP tools. Use when the user says "set me up like Thomas", "install Thomas's <x> skill", "what does Thomas use for <x>", "how does Thomas do <x>", asks about @sourcetms playbooks, build stack or skills, wants the top skills from the vault, or says "update my vault skills".
---

# Thomas's vault

This skill bundles the \`${SERVER}\` MCP server (${MCP_URL}). It exposes Thomas's paid members' vault: his playbooks, build stack, operating system and his own agent skills. Skills are not bundled here. You fetch them through MCP.

## Tools

| Tool | Call it when |
|---|---|
| \`list_sections\` | You need a map of the vault, or don't know where a topic lives. |
| \`search_vault(query)\` | The user asks "what does Thomas use for X" or "how does he do X". |
| \`get_page(section, slug)\` | You know the page. Returns the full Markdown. Quote from it, cite its URL. |
| \`whats_new\` | The user wants a tour or asks what's new. |
| \`list_skills\` | The user asks which skills Thomas has or which are popular. Ranked by member use. |
| \`get_skill(name, reason?)\` | The user wants to install a skill (or update one: \`reason: "update"\`). Returns every file, a \`${MARKER}\` version marker, and install steps. |
| \`check_skill_updates(installed)\` | The user wants to update their vault skills, or the plugin said updates are available. |

## Where skills go

Install vault skills to \`~/.claude/skills/<name>/\`, as \`get_skill\` says. Amp loads skills from that folder, and so does Claude Code, so one install serves both. For a project-only install, use \`.claude/skills/<name>/\` in the repo. After installing or updating, call \`reload_skills\` if that tool is available so the skill works in this thread; otherwise it loads in the next thread.

## Workflows

**"What does Thomas use for X?"**
1. \`search_vault\` with 1–3 keywords.
2. \`get_page\` on the best hit.
3. Answer from the page in a few lines. Link the vault URL. Don't invent tools or numbers that are not on the page.

**"Install Thomas's X skill"**
1. \`get_skill("X")\`. If it errors, the error lists valid names. Pick the closest one or ask.
2. Check whether \`~/.claude/skills/X/\` exists. If it does, ask before overwriting.
3. Write each file to the path in its heading, exactly as returned. Run any \`chmod\` step.
4. Tell the user it's installed and which phrase triggers it.

**"Set me up like Thomas"**
1. \`list_skills\`. Show the top 5 with one line each.
2. Ask which to install (default: all five).
3. Install each with the steps above.
4. End with a table: skill, path, trigger phrase.

**"Update my vault skills"** (also when the plugin reports updates)
1. Find installed vault skills: read every \`~/.claude/skills/*/${MARKER}\` and \`.claude/skills/*/${MARKER}\` in the project. Each has \`skill\` and \`version\`.
2. Call \`check_skill_updates\` with \`{ "<skill>": "<version>", ... }\`.
3. Show the outdated ones and say that updating replaces the installed files, so any local edits to them are lost. Ask which to update (default: all).
4. For each, call \`get_skill(name, reason: "update")\` and follow its update steps: delete files from the old marker's \`files\` list that are no longer returned, write every returned file including the new \`${MARKER}\`.
5. Say which skills were updated.

Skills installed before version tracking have no \`${MARKER}\`. If a folder in \`~/.claude/skills/\` has the same name as a vault skill (\`list_skills\`) but no marker, offer to reinstall it with \`get_skill(name, reason: "update")\` so it gets tracked. Don't touch folders the user didn't confirm; they may be their own skills with the same name.

## Rules
- Only install skills the user asked for.
- Never paste vault content into public places (repos, issues, posts). It's for members only.
- If the vault tools are missing or return 401: tell the user to run \`amp mcp add ${SERVER} ${MCP_URL}\`, restart Amp, and sign in with the email they use for the vault when the browser opens. \`amp mcp doctor\` shows the server's status.
`

type Marker = { skill?: string; version?: string }

/** Installed vault skills whose version differs from the vault's current one. */
async function outdatedSkills(): Promise<string[]> {
	const installed = new Map<string, string>()
	for (const root of [join(homedir(), '.claude', 'skills'), join(process.cwd(), '.claude', 'skills')]) {
		let names: string[]
		try {
			names = await readdir(root)
		} catch {
			continue
		}
		for (const name of names) {
			try {
				const m = JSON.parse(await readFile(join(root, name, MARKER), 'utf8')) as Marker
				if (m.skill && m.version) installed.set(m.skill, m.version)
			} catch {
				// Not a vault skill, or an unreadable marker.
			}
		}
	}
	if (installed.size === 0) return []

	const res = await fetch(VERSIONS_URL, { signal: AbortSignal.timeout(4000) })
	if (!res.ok) return []
	// One "<skill> <version>" pair per line.
	const latest = new Map<string, string>()
	for (const line of (await res.text()).split('\n')) {
		const [name, version] = line.trim().split(/\s+/)
		if (name && version) latest.set(name, version)
	}
	return [...installed].filter(([name, have]) => latest.has(name) && latest.get(name) !== have).map(([name]) => name)
}

export default async function (amp: PluginAPI) {
	const dir = join(amp.system.cacheDirectory, 'skills', SERVER)
	await mkdir(dir, { recursive: true })
	await writeFile(join(dir, 'SKILL.md'), SKILL_MD)
	await writeFile(join(dir, 'mcp.json'), JSON.stringify(MCP_JSON, null, 2) + '\n')
	await amp.registerSkill({ path: dir })

	// Checked once per session; reported once per thread.
	let check: Promise<string[]> | undefined
	const runCheck = () => (check = outdatedSkills().catch(() => []))
	const told = new Set<string>()

	amp.on('session.start', () => {
		runCheck()
	})

	amp.on('agent.start', async (event, ctx) => {
		if (told.has(event.thread.id)) return
		told.add(event.thread.id)
		const names = await (check ?? runCheck())
		if (names.length === 0) return
		const list = names.join(', ')
		const what = names.length === 1 ? '1 vault skill has' : `${names.length} vault skills have`
		await ctx.ui.notify(`${what} updates: ${list}. Say "update my vault skills" to get them.`).catch(() => {})
		return {
			message: {
				content:
					`Thomas's vault has newer versions of these installed skills: ${list}. Don't update them unprompted. ` +
					`If the user asks (e.g. "update my vault skills"), follow the update workflow in the ${SERVER} skill.`,
			},
		}
	})

	const ask = (content: string) => async (ctx: Parameters<Parameters<PluginAPI['registerCommand']>[2]>[0]) => {
		if (!ctx.thread) {
			await ctx.ui.notify('Start a thread first, then run this command again.')
			return
		}
		await ctx.thread.appendUserMessage({ type: 'user-message', content })
	}

	amp.registerCommand(
		'top-skills',
		{ title: 'Top skills', category: 'sourcetms vault', description: "List Thomas's top skills, ranked by member use" },
		ask(`Use the ${SERVER} skill: list Thomas's top skills from the vault, ranked by member use, then ask which to install.`),
	)
	amp.registerCommand(
		'update-skills',
		{ title: 'Update my vault skills', category: 'sourcetms vault', description: 'Check installed vault skills for updates' },
		ask(`Use the ${SERVER} skill: update my vault skills.`),
	)
}
