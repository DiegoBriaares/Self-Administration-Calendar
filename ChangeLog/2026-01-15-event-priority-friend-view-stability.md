# Event priority, view ordering, and friend-view stability

## Summary
Added priority support to events (input, storage, and display) with configurable ordering in day, range, and edit panels, while keeping the month grid time-first. Stabilized friend calendar view to stop flicker and prevent self data from overwriting friend context. Restored theme-aware styling for the event edit/delete section and fixed login/logout hook ordering.

## Key changes
- Added priority field support across API, store, and UI displays, with null-safe handling and consistent ordering behavior.
- Introduced ordering controls for day modal, range board, and event board, including time/priority sorting rules.
- Fixed friend-view flicker by preventing self-profile refresh from overwriting friend context and by isolating compare events updates.
- Restored theme-aware styles in the edit/delete panel and prevented blank screen on login/logout.

## Bugs/Enhancements addressed
- BUG: Friend calendar view flicker and self events overriding friend view.
- BUG: Login/logout blank screen until refresh.
- ENHANCEMENT: Event priority input/display and ordering controls.
- ENHANCEMENT: Theme-respecting edit/delete panel styling.
