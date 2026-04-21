# SafeToSend Single-Field Composer Idea

## Goal

Make the UI feel like one assistant workspace instead of two separate panels.

## Core Shape

- One primary text field holds the current working message.
- Paste, typed input, dictation, and generation all write into the same field.
- Rewrite actions mutate that same field in place.
- The text field is the main surface, not one control among many.

## Surrounding Controls

- Audience selector
- Goal input
- Primary check button
- Verdict badge
- Risk indicator
- Quick action chips
- Undo
- Copy

## Behavior

- The assistant analyzes the current contents of the single field.
- Quick actions apply directly to the same field.
- Voice editing is treated as another way to update the same field.
- Undo restores prior field states from local history.
- Copy always copies the current working text.

## Mobile Layout

- Single-column layout.
- One prominent text field near the top.
- Controls stack below the field.
- Primary action stays full width.
- Secondary actions are collapsed or de-emphasized.

## UX Intent

- Reduce the number of visible editable areas.
- Make the product feel simpler and faster.
- Keep the assistant centered on one live message.
- Make the app easier to use on phones without losing capability.

## Implementation Later

- Refactor the page around one working text state.
- Keep the assistant response model-driven.
- Keep local history for undo.
- Keep analysis separate from the text field, but attached to it visually.
