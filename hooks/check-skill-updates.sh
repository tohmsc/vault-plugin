#!/bin/sh
# SessionStart hook: tell the member when vault skills they installed have changed in the vault.
# Reads the .vault.json marker that get_skill writes into each installed skill folder and compares it with
# the public version list (hashes only). Needs only sh, sed, awk and curl. Any failure exits 0 silently.

URL="${VAULT_SKILL_VERSIONS_URL:-https://vault.sourcetms.com/api/public/skill-versions?format=txt}"

nl='
'
markers=""
for dir in "$HOME/.claude/skills" "${CLAUDE_PROJECT_DIR:-.}/.claude/skills"; do
  for m in "$dir"/*/.vault.json; do
    [ -f "$m" ] && markers="$markers$m$nl"
  done
done
[ -n "$markers" ] || exit 0

latest=$(curl -fsS --max-time 4 "$URL" 2>/dev/null) || exit 0
[ -n "$latest" ] || exit 0

field() { sed -n "s/^ *\"$1\": *\"\([^\"]*\)\".*/\1/p" "$2" | head -n 1; }

outdated=""
IFS="$nl"
for m in $markers; do
  name=$(field skill "$m")
  have=$(field version "$m")
  [ -n "$name" ] || continue
  now=$(printf '%s\n' "$latest" | awk -v n="$name" '$1 == n { print $2; exit }')
  if [ -n "$now" ] && [ "$now" != "$have" ]; then
    case " $outdated " in *" $name "*) ;; *) outdated="${outdated:+$outdated }$name" ;; esac
  fi
done
unset IFS
[ -n "$outdated" ] || exit 0

list=$(printf '%s' "$outdated" | sed 's/ /, /g')
count=$(printf '%s\n' $outdated | wc -l | tr -d ' ')
[ "$count" = 1 ] && what="1 vault skill has" || what="$count vault skills have"

# Skill names are slugs ([a-z0-9-]), so they are safe inside JSON strings.
cat <<EOF
{
  "systemMessage": "$what updates: $list. Say \"update my vault skills\" to get them.",
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Thomas's vault has newer versions of these installed skills: $list. Don't update them unprompted. If the user asks (e.g. 'update my vault skills'), follow the update workflow in the sourcetms-vault plugin's vault skill: read the .vault.json markers, call check_skill_updates, then get_skill(name, reason='update') for each skill they want."
  }
}
EOF
exit 0
