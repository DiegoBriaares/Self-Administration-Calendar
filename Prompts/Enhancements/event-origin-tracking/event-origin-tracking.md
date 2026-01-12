prompt: Change DAY EVENTS to DAY EVENTS MANAGEMENT, and lets add a new feature below (in between DAY EVENT MANAGEMENT and COPY EVENTS i.e up to COPY EVENTS) called DAY EVENTS INFORMATION, that list the events and instead of edit/delete options (as in DAY EVENTS MANAGEMENT) with track record option, to see the record of days that this events has been being copied (in chain i.e if an event was copied from day x and that event was copied from another day y, then show both x and y), this would require a list data structure for storing "origin" days belonging to the events

answer: Added Day Events Information with Track Record and persisted origin chains in event resources.

suggestion: Tell me if you want the current day included in the track record.

---

prompt: To show oldest first (if the linked list is ordered by order of copying this sould be printing the reverse list so that it would be better to use a double linked list data strucutre)

answer: Preserved oldest-first ordering in the origin chain.

suggestion: Tell me if you want newest-first instead.
