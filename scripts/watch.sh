#!/usr/bin/env bash
# Start a watch session: Opus (pinned by .claude/settings.json) with the 4-minute
# GitHub tick armed on turn one. See .claude/skills/watch/SKILL.md for what a tick does.
cd "$(dirname "$0")/.." && exec claude "/loop 4m /watch"
