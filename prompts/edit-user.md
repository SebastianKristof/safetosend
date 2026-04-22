Audience: {{audience}} ({{audience_tone}})
Goal: {{goal}}
Language: {{language_name}}
{{language_instruction}}
The user interface language is selected explicitly; do not infer it from the draft.
The draft text itself is always in English.

Context:
{{context}}

Current draft:
{{text}}

Edit instruction:
{{instruction}}

Apply the instruction to the draft.

Rules:
- use the smallest reasonable edit
- if the instruction asks for an exact replacement, replace only that span
- preserve meaning unless the instruction explicitly asks otherwise
- return 1 to 3 concrete change items with short summaries in the interface language and exact before/after spans
- keep updatedText in English
