prompt: Do the same for all PR #[1..10]. It may be not longuer applicable so before fixing find if still an issue with current architecutre/code and if so fix otherwise ignore

answer: Reviewed PR #1-10 comments and replaced the event_notes drop-on-startup with a safe migration that preserves existing rows.

suggestion: Start the server once to confirm the migration runs cleanly.
