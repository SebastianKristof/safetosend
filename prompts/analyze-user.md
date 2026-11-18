Analyze the draft using the supplied context and preferences. Return an assessment and, only where useful, a minimally revised version.

Audience: {{audience}}
Audience guidance:
{{audience_description}}

Relationship / situation (quoted context): {{relationship_context}}
Formality target: {{formality}}
Keep my tone: {{preserve_tone}}
English variant: {{english_variant}}

Interface language: {{language_name}}
{{language_instruction}}

Draft:
{{text}}

Return JSON:
{
  "verdict": "Safe to send | Risky - revise | Do not send yet",
  "reason": "brief explanation in the interface language",
  "highlights": [{"text": "exact fragment from original draft", "severity": "yellow | red", "reason": "specific plausible unwanted reading and consequence"}],
  "languageFixes": [{"text": "exact fragment from original draft", "replacement": "minimal English correction", "reason": "actual language error explained in interface language"}],
  "suggestedText": "English draft, unchanged when no edit is needed",
  "localizedMeaning": "literal-leaning meaning gloss of the original draft in the interface language",
  "inferredGoal": "brief, cautiously inferred communication goal",
  "recommendedTone": "appropriate tone consistent with preferences"
}

Rules:
- Explanations must use the interface language. Message text and replacements stay English.
- Return 0–5 risk highlights and 0–3 language fixes. Do not invent issues.
- Any risk highlight requires a revision verdict; language fixes alone do not.
- Clear meaning with a minor language error means Safe to send, no risk highlights, and a separate language fix. Do not cite generic loss of professionalism as a reason to classify grammar as risk.
- Explain the main concern in reason. If the draft works, say so briefly and preserve it.
- Do not offer alternative wording solely to demonstrate improvement. Requested formality changes may appear in suggestedText, but valid informal language must not be listed as a grammar error or automatically treated as risk.
- localizedMeaning is for meaning verification, not prose quality. Prefer literal translation for the core ask.
- Do not turn an explicit action ask into a meta ask. Perform an internal back-translation check for semantic equivalence.

Final consistency check: apply the selected formality even when Keep my tone is true. Keep my tone preserves personality, not a conflicting register. A formality-only adjustment is not a grammar error or automatically a communication risk.
