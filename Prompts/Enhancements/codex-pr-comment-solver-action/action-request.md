prompt: Ok, good.  Please algo generate an Action in administration-management-plan-system/Prompts/Actions for SolvingAllPRCodexComments

answer: Added the SolvingAllPRCodexComments action prompt with steps for fetching, verifying, fixing, and summarizing Codex PR comments.

suggestion: Tell me if you want tighter scoping (specific PRs or only review comments).

---

prompt: Go find and solve comments on all open or specified PRs authored by Codex for this repository.

- Pull review comments from GitHub (PR review comments and conversation comments).
- For each comment, verify whether it is still applicable to the current codebase.
- If applicable, implement a fix; if not, document why it is obsolete.
- Add or update tests for the fixes when reasonable.
- Summarize which comments were resolved vs. skipped and why.

answer: Checked for open PRs and found none to review at that time.

suggestion: Provide specific PR numbers if you want closed PRs reviewed.
