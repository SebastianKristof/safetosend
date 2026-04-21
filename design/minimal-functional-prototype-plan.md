# SafeToSend Minimal Functional Prototype Plan

## Purpose

Build a first crude but functional prototype of `safetosend.app` that demonstrates the core product loop:

1. User pastes a message draft.
2. System reviews the draft for communication risk.
3. System returns a verdict, short explanation, and safer suggested version.
4. User applies quick adjustments or local edits.
5. User copies the revised message.

This prototype is not meant to be production-ready. It is meant to prove:

- the core UX feels useful
- the verdict layer is valuable
- local edits are more interesting than one-shot rewrite

## Product Scope

### In scope

- Single-page web app
- Text input only
- Audience selector
- Optional goal input
- Verdict:
  `OK to send`, `Risky - revise`, `Do not send yet`
- Up to 3 short reasons explaining the verdict
- Suggested rewrite
- Quick actions:
  `softer`, `firmer`, `shorter`, `more direct`, `more polite`
- Local edit instruction box
- Undo
- Copy-to-clipboard

### Out of scope

- Real LLM integration
- Voice input
- User accounts
- Database
- Browser extension
- Email/Slack integration
- Personalization memory
- Analytics beyond simple console logging

## Recommended Tech Stack

Use the simplest possible stack:

- `index.html`
- `styles.css`
- `app.js`

No framework. No build step. No dependencies.

Reason:

- repo is empty
- prototype should be runnable immediately
- junior dev can build and debug this faster than React/Next setup

If needed, the app can be opened directly in browser or served with:

```bash
python3 -m http.server 8000
```

## High-Level UX

### Screen layout

Single page with two columns on desktop and one column on mobile.

Left side:

- product title
- short positioning line
- input textarea
- audience dropdown
- optional goal input
- `Check before sending` button

Right side:

- verdict card
- why list
- suggested version textarea
- quick action buttons
- local edit instruction input
- `Apply edit`
- `Undo`
- `Copy`

### Core interaction flow

1. User pastes a message.
2. User optionally selects audience and types goal.
3. User clicks `Check before sending`.
4. App analyzes message using heuristic rules.
5. App shows:
   - verdict
   - 1 to 3 reasons
   - rewritten message
6. User can:
   - click quick action buttons
   - type an edit instruction
   - undo changes
   - copy final result

## File Structure

```text
/design/
  gpt-conversation-apr20.md
  minimal-functional-prototype-plan.md
/index.html
/styles.css
/app.js
```

## Functional Requirements

## 1. Input Section

### Elements

- message textarea
- audience dropdown
- goal input
- main CTA button

### Audience options

Keep the set small:

- boss
- client
- colleague
- partner
- other

### Validation

- If textarea is empty, disable the main CTA or show inline error.
- Minimum useful input: at least 3 non-space characters.

## 2. Review Output

After clicking `Check before sending`, show:

- verdict badge
- short bullet list of why the message is risky or safe
- suggested version in editable textarea

### Verdict definitions

#### `OK to send`

Use when:

- message is clear
- no strong aggression/manipulation
- no major clarity issue
- no obvious emotional impulsivity

#### `Risky - revise`

Use when:

- message could trigger defensiveness
- request is unclear
- too apologetic
- passive aggressive
- too blunt for likely audience

#### `Do not send yet`

Use when:

- message contains strong anger
- insulting or humiliating language
- all-caps yelling
- repeated exclamation marks + hostile wording
- emotionally impulsive phrasing like:
  `I’m done`, `forget it`, `whatever`, `you never`, `you always`

## 3. Risk Detection Engine

Since this is a crude prototype, do not use AI yet. Use a rule-based heuristic engine in JavaScript.

### Function shape

Create a main function:

```js
analyzeMessage({ text, audience, goal })
```

Return an object like:

```js
{
  audience: "boss",
  inferredGoal: "ask for clarification",
  verdict: "Risky - revise",
  riskLevel: "medium",
  patterns: [
    { type: "accusation", severity: "medium", evidence: "why did you" },
    { type: "tone_goal_mismatch", severity: "medium", evidence: "sounds confrontational for likely work context" }
  ],
  reasons: [
    "It can sound accusatory.",
    "The wording may put the other person on the defensive."
  ],
  suggestedText: "Can you walk me through your reasoning here?"
}
```

### Risk categories for v1

Use a small set only:

- aggression
- accusation
- passive_aggression
- weakness
- overexplaining
- unclear_ask
- emotional_impulsivity
- tone_goal_mismatch

### Heuristic examples

#### Aggression / accusation

Trigger patterns like:

- `why did you`
- `you didn't`
- `this is wrong`
- `just do it`
- `you never`
- `you always`

#### Passive aggression

Trigger patterns like:

- `thanks for finally`
- `as I already said`
- `obviously`
- `if you had read`

#### Weakness / over-apology

Trigger patterns like:

- `sorry to bother you`
- `sorry, can I`
- `just wanted to ask`
- repeated `sorry`
- repeated `maybe`, `just`, `if possible`

#### Overexplaining

Simple heuristic:

- more than 280 characters and contains multiple fillers:
  `because`, `just`, `actually`, `to be honest`, `I mean`
- request appears late in the message

#### Unclear ask

Trigger when:

- no question mark
- no clear action verb near the end
- contains vague phrase:
  `let me know what you think`
  `just checking in`
  `thoughts?`
  `wanted to mention`

#### Emotional impulsivity

Trigger patterns like:

- `whatever`
- `forget it`
- `I’m done`
- all caps words
- multiple `!!!`

### Scoring model

Use a simple point system.

Example:

- low-risk signal: `+1`
- medium-risk signal: `+2`
- high-risk signal: `+4`

Then convert to verdict:

- score `0-1` -> `OK to send`
- score `2-5` -> `Risky - revise`
- score `6+` or any hard-stop signal -> `Do not send yet`

Hard-stop signals:

- direct insults
- repeated aggressive absolutes
- strong emotional impulsivity

## 4. Rewrite Engine

This should be deterministic and simple.

Do not try to rewrite every message perfectly.
Aim for "better than original" and visibly useful.

### Function shape

```js
rewriteMessage({ text, audience, goal, patterns })
```

### Rewrite principles

- preserve meaning
- reduce blame
- reduce over-apology
- make request clearer
- keep message concise
- do not invent facts

### Rewrite strategy map

#### If accusation detected

Transform blame into inquiry.

Examples:

- `Why did you do it like this?`
  ->
  `Can you walk me through your reasoning here?`

- `You didn’t send me the file`
  ->
  `Just checking, did the file get sent? I may have missed it.`

#### If weakness detected

Reduce apology words and move ask earlier.

Example:

- `Sorry, can I maybe ask you to review this?`
  ->
  `Could you review this when you have a moment?`

#### If passive aggression detected

Remove sarcasm.

Example:

- `Thanks for finally replying`
  ->
  `Thanks for getting back to me`

#### If unclear ask detected

Make the ask explicit.

Example:

- `Let me know what you think`
  ->
  `Could you share your feedback by tomorrow?`

#### If emotional impulsivity detected

Do not aggressively rewrite.
Instead:

- show `Do not send yet`
- produce a calmer fallback version if possible

Example:

- `This is ridiculous. I’m done with this.`
  ->
  `I’d prefer to revisit this later when we can discuss it more calmly.`

## 5. Quick Actions

Quick actions operate on the current suggested version, not the original input.

### Buttons

- `Make softer`
- `Make firmer`
- `Shorter`
- `More direct`
- `More polite`

### Function shape

```js
applyQuickAction(currentText, action)
```

### Basic behavior

#### `Make softer`

- replace harsh phrases with gentler phrasing
- add softeners sparingly

#### `Make firmer`

- remove weak hedges like `maybe`, `just`, `if possible`
- keep request clear

#### `Shorter`

- trim filler phrases
- remove duplicated context

#### `More direct`

- move ask to first sentence
- reduce indirect framing

#### `More polite`

- add light courtesy phrase if missing
- do not overdo it

## 6. Local Edit Engine

This is important even in the crude prototype.

Support simple typed instructions first.

### Supported edit modes

#### Exact replacement

Examples:

- `replace "review" with "look over"`
- `change "this week" to "by Friday"`

Behavior:

- replace exact match only
- if multiple matches, replace first and show note

#### Fuzzy local edit

Examples:

- `make the first sentence softer`
- `remove the apology`
- `make the ending clearer`

Behavior:

- operate on smallest reasonable part
- if targeting is ambiguous, use simple fallback logic

### Function shape

```js
applyLocalEdit(currentText, instruction)
```

Return:

```js
{
  updatedText: "...",
  changedSpanSummary: "Removed the apology from the opening sentence."
}
```

### Minimum instruction support

Implement these commands:

- `replace "A" with "B"`
- `change "A" to "B"`
- `remove apology`
- `make softer`
- `make firmer`
- `shorten first sentence`
- `clearer ask`

If no instruction matches, show:

- `Could not confidently apply that edit. Try a more specific instruction.`

## 7. Undo Behavior

Maintain a history stack in memory.

### Requirements

- Every rewrite and edit pushes a new state.
- Undo restores previous suggested text.
- At minimum, store up to 20 states.

### State to preserve

- original input
- latest analysis result
- current suggested text
- history array

## 8. Copy Behavior

Add a `Copy final message` button.

### Requirements

- copy current suggested text to clipboard
- show temporary success label like:
  `Copied`

## 9. Suggested State Model

Keep one top-level app state object:

```js
const state = {
  inputText: "",
  audience: "other",
  goal: "",
  analysis: null,
  currentDraft: "",
  history: [],
  lastChangeNote: ""
};
```

## 10. UI Details

## Visual direction

Keep it simple but intentional:

- warm neutral background
- strong verdict badge colors
- large textarea
- obvious CTA
- compact explanation bullets

### Verdict colors

- `OK to send` -> green
- `Risky - revise` -> amber
- `Do not send yet` -> red

### Empty state

Before analysis, show short helper copy:

`Paste a draft and get a second opinion before you send it.`

## 11. Implementation Steps

Give the junior dev this order.

### Phase 1: Static UI

1. Create `index.html` with all required controls.
2. Create `styles.css` for layout and basic responsive design.
3. Create placeholder result card on the right side.

Done when:

- page loads cleanly
- layout works on desktop and mobile

### Phase 2: Basic review flow

1. In `app.js`, wire DOM elements.
2. Read user input on button click.
3. Run `analyzeMessage`.
4. Render verdict, reasons, and suggested text.

Done when:

- user can paste text and receive output

### Phase 3: Rule engine

1. Add regex/phrase matchers for core risk categories.
2. Add scoring logic.
3. Add deterministic rewrite rules.

Done when:

- sample messages produce sensible outputs

### Phase 4: Quick actions

1. Add button handlers.
2. Modify current draft, not original input.
3. Push history before every change.

Done when:

- quick actions visibly update draft

### Phase 5: Local edits and undo

1. Add edit instruction input.
2. Parse supported edit commands.
3. Apply local changes.
4. Add undo stack.

Done when:

- exact replacement works
- simple edit instructions work
- undo restores previous draft

### Phase 6: Copy + polish

1. Add copy button.
2. Add micro-feedback.
3. Refine empty state and error states.

Done when:

- prototype feels usable end to end

## 12. Canonical Test Cases

Use these manually during development.

### Case 1

Input:

`Why did you do it like this?`

Expected:

- verdict: `Risky - revise`
- reason mentions accusation
- rewrite becomes a question without blame

### Case 2

Input:

`Thanks for finally replying`

Expected:

- verdict: `Risky - revise`
- reason mentions passive aggression
- rewrite removes sarcasm

### Case 3

Input:

`Sorry, can I maybe ask you to review this?`

Expected:

- verdict: `Risky - revise`
- reason mentions over-apology or weakness
- rewrite becomes clearer and firmer

### Case 4

Input:

`This is ridiculous. You never listen.`

Expected:

- verdict: `Do not send yet`
- reasons mention emotional impulsivity or aggression
- rewrite should be much calmer or suggest pausing

### Case 5

Input:

`Could you send the file by 3 PM?`

Expected:

- verdict: `OK to send`
- minimal rewrite or same text

### Case 6

Input:

`Let me know what you think`

Expected:

- verdict: `Risky - revise`
- reason mentions unclear ask
- rewrite suggests a clearer action or deadline

### Case 7: local edit

Current draft:

`Could you review this when you have a moment?`

Instruction:

`replace "review" with "look over"`

Expected:

- only that phrase changes
- rest of sentence stays untouched

## 13. Acceptance Criteria

Prototype is done when:

- user can open the page without installation
- user can paste text and click one button to get result
- verdict, reasons, and suggested text appear
- at least 5 quick actions work
- at least 3 local edit instruction types work
- undo works
- copy works
- outputs feel directionally aligned with the product thesis

## 14. Known Limitations

These are acceptable for v1 prototype:

- heuristic rewrites will be repetitive
- audience inference will be shallow
- local edit understanding will be limited
- no true language understanding
- no privacy/security architecture yet

That is fine. The prototype’s job is to validate the experience, not model quality.

## 15. What to Build Next If Prototype Feels Promising

After this crude prototype works, next step should be:

1. Replace heuristic analysis with LLM-backed structured review
2. Keep the same UI and state model
3. Preserve local edit mode as a separate operation
4. Add lightweight logging of verdict distribution and quick-action usage
5. Add voice input only after typed local edits feel solid

## 16. Final Guidance For Junior Dev

Do not overengineer this.

The right version is:

- ugly but clear
- deterministic
- easy to run
- easy to inspect
- easy to replace later

If you are choosing between:

- more elegant architecture
- faster proof of the product loop

choose faster proof of the product loop.
