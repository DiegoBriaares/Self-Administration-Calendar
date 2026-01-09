# Add dev-only event purge script

## Summary
- Add a dev-only script to delete all events and event notes from the calendar-app database.
- Guard the script against touching the production directory.

## Reason
The repository needed a safe, repeatable way to clear event data during development without risking production data.
