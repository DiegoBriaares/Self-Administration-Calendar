prompt: I se ethat there is a day selector in the postponed events page, but this events are day agnostic, is just a raw list of events without day. Make modifications to database tables, front end and mechanisms accordingly, so that when moving/copying an event to postponend events it must appear in postponed events withput the need to select a day/range of days.

answer: Removed day selectors, made postponed events a flat list, and adjusted backend/storage to allow day-agnostic postponed events.

suggestion: Restart the API and verify postponed list population without date selection.
