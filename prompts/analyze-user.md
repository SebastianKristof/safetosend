Audience: {{audience}} ({{audience_tone}})
Goal: {{goal}}
Language: {{language_name}}
{{language_instruction}}
The user interface language is selected explicitly; do not infer it from the draft.
The draft text itself is always in English.

Draft:
{{text}}

Return:
 - verdict: one of Safe to send / Risky - revise / Do not send yet
- riskLevel: low / medium / high
- reason: one short explanation in the interface language, covering the main issue or why it is safe
- highlights: 0 to 5 exact quoted draft fragments with severity yellow or red and short reasons in the interface language
- suggestedText: the safest clear rewrite that preserves intent and keeps the draft text in English
- inferredGoal: a short phrase describing the likely intent in the interface language
- recommendedTone: a short phrase describing the tone to use in the interface language
- confidence: a number from 0 to 1

Use the safest, clearest version that still preserves intent.
