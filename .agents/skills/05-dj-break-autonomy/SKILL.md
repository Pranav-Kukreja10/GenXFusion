---
name: dj-break-autonomy
description: Use when running unattended /goal or /teamwork autonomous loops during the 2-hour hackathon DJ break.
---

<AUTONOMOUS_EXECUTION_PROTOCOL>
1. BRANCH ISOLATION: Immediately run `git checkout -b feat/dj-break-autonomy` before starting unattended loops.
2. TASK QUEUE LOOP: Read `TASKS.md`. Claim the next unchecked `[ ]` item.
3. ATOMIC VERIFICATION GATE:
   - Backend tasks: run `python -m pytest -q --tb=short` and verify `match_hsn` + `math_auditor` pass on the ₹850 Kurti (5% GST) vs ₹2,400 Lehnga (12% GST) test case.
   - Frontend tasks: run `npm run build --quiet` to verify 0 broken imports.
4. SELF-HEALING ROLLBACK: If checks pass, mark `[x]` in `TASKS.md` and run `git add -A && git commit -m "feat(auto): complete task"`. If checks fail after 3 attempts, run `git reset --hard HEAD`, log the issue in `BLOCKERS.md`, and advance to the next task.
</AUTONOMOUS_EXECUTION_PROTOCOL>
