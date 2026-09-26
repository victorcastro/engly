---
name: engly-off
description: Pause the Engly English coach for the rest of this session. Use when the user says "engly off", asks to stop being corrected, or is in a hurry.
---

# Engly off

Stop adding Engly notes and stop correcting the user's English for the rest of this session.

Reply with exactly:

> Engly paused for this session. Say "engly on" to resume.

Then keep working normally. Coaching resumes only when the user says "engly on", runs `engly-on`, or starts a new session.

This only affects the current session. To disable Engly permanently, the user can run `engly disable` in the terminal.
