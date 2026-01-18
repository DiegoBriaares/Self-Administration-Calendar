prompt: Do the same for all PR #[1..10]. It may be not longuer applicable so before fixing find if still an issue with current architecutre/code and if so fix otherwise ignore

answer: Reviewed PR #1-10 comments and hardened the delete-all-events script to resolve symlinks before the forbidden-root guard check.

suggestion: Try the script with a symlinked db path to confirm it blocks forbidden targets.
