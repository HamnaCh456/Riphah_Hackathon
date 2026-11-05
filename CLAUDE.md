# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Recruitment & Talent Intelligence Platform

Hackathon project: an AI-powered recruitment platform for recruiters and candidates.
Late submissions are not evaluated.

## The higher goal

**A reliable end-to-end workflow, meaningful AI, and transparent evidence-based recommendations,
with solid engineering. Not the greatest number of features.**

Check every decision against these rules:

1. **The demo must always work.** The final scenario in [REQUIREMENTS.md](REQUIREMENTS.md) section
   2 comes before any extra feature.
2. **Humans decide.** AI recommends. It never shortlists, rejects, selects or merges on its own.
3. **Evidence for every claim.** Every AI score, skill or statement links to a real resume excerpt.
   Unsupported claims get flagged for manual review.
4. **Missing is not absent.** "No evidence found" and "confirmed absent" are different results.
5. **Semantic, not keyword.** Matching and search must work when the wording differs.
6. **No hardcoded AI.** The brief says hardcoded responses do not count as implemented AI features.
7. **Fair scoring.** Protected or irrelevant personal characteristics never affect a score.
8. **Candidates never see recruiter-only data**, including notes, scores and other applicants.

[REQUIREMENTS.md](REQUIREMENTS.md) holds the full brief, rubric, demo scenario, modules and build
order. Read it before planning or building a module.

## Current state

Modules 1-10 and 12 are built and live at https://riphah-recruitment.vercel.app. Module 11 (comparison and duplicates) isn't built.

Commands: `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`. `npm run lint` currently fails on its config.

## Open decisions

- The stack is not final. The proposal is Next.js and Supabase with pgvector, one LLM provider and
  one embeddings model. `.env` already has a Gemini key.
- The proposal for scoring is that AI extracts the evidence and normal code calculates the score.

## Plans are auto-approved

Don't wait for approval on a plan. State it in a line or two and start implementing straight away, because time is short. Only stop for a real blocker, or before a step that risks losing data.

## Push every module as it's finished

When a module is done, commit it and push it to https://github.com/HamnaCh456/Riphah_Hackathon.git in the same turn, without being asked. Don't save modules up for one big push at the end.

- Push from this folder's own git repo. Never push from the home repo at `C:\Users\LENOVO`.
- `.env` must stay in `.gitignore`. `.mcp.json` holds no secrets and can be committed.
- At the end of each module, say what was pushed (commit and branch) and anything still local.

## Configuration

- `.env` holds `SUPABASE_URL`, `ANON_API_KEY` and `GEMINI_API_KEY`.
- `ANON_API_KEY` holds a `sb_secret_` key, which bypasses database access rules. Keep it server-only and never send it to the browser.
- `.mcp.json` connects the Supabase MCP server to project `lbxozdqgboubbyvzgquz`. Other projects on this machine use different Supabase projects, so check the connected project before any schema change or data write.

## DESIGN.md

`DESIGN.md` is the design system, and its colour, type, spacing and component rules apply to UI work here. It was written for another project (BetterFind), so some of it doesn't match this folder:

- `index.html`, `styles.css`, `main.js` and `README.md`, which it refers to, don't exist here. Its tokens exist only as the tables in §3 until a stylesheet defines them.
- It points to this file for "product truth" and the AGO pipeline (§9.1). Neither is written here, so don't assume this project is BetterFind or that its screens follow that pipeline. The product truth for this project is [REQUIREMENTS.md](REQUIREMENTS.md).
- Its vanilla-only, no-build conventions (§12) describe the BetterFind build and aren't a decision for this project. Don't carry over its branding or marketing-user wording.
 Always push the code here after you are done with any module https://github.com/HamnaCh456/Riphah_Hackathon.git