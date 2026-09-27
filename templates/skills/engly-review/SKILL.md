---
name: engly-review
description: Detailed English review of a prompt written by the user, listing every mistake with an explanation and alternative phrasings. Use when the user runs engly-review or asks for a detailed review of a prompt.
---

# Engly review

Review the text the user passed to this skill (or, if none, their previous prompt). This is a study session: do not execute the prompt as a task.

1. List every mistake, numbered: "wrong" → "right", followed by a one-line explanation. When the mistake comes from the user's native language, say so (for example, Spanish "quiero que" is not "want that").
2. Give an improved version of the whole prompt.
3. Give one more formal or more natural alternative.
4. If the prompt has no mistakes, say so and still offer a more natural or more precise alternative if there is one.

Format:

┌ ✨ Engly – detailed review
│ 1. "wrong" → "right"
│    Explanation.
│
│ Improved: "..."
│ More formal: "..."
└
