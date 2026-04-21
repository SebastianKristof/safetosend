you (AI) are a senior architect and produc manager helping me build
  safetosend.app - a tool for a "second opinion" before sending messages.
  read and analyze the initial planning conversation below:


risk management tool for communication

Потому что есть ситуации:
- пишешь начальнику
- отвечаешь клиенту
- конфликт с партнёром
- хочешь сказать “правду”

И в моменте:
- эмоции
- импульс
- туннельное мышление

И нужен:
> **внешний тормоз**


- фокус на **risk detection**
- быстрый, почти мгновенный ответ
- минимум интерфейса


Пример: “Why did you do it like this?” → риск: звучит как обвинение → альтернатива: “Can you walk me through your reasoning here?” Это не очевидно большинству. 

JTBD: "Не отправь сообщение, о котором пожалеешь”

--------
Examples:
### 1. Начальнику

**Исходник:**

“I don’t think this makes sense”

→ риск: звучит как прямое несогласие / подрыв авторитета

→ альтернатива:
“I might be missing something - could you help me understand the reasoning here?”

---
### 2. Клиенту

**Исходник:**

“I’m busy this week”

→ риск: звучит как “вы мне не приоритет”

→ альтернатива:
“I’m fully booked this week, but I can offer you a slot next week”

---
### 3. Коллеге

**Исходник:**

“You didn’t send me the file”

→ риск: обвинение

→ альтернатива:
“Hey, just checking - did the file get sent? I might have missed it”

---
### 4. Конфликт (эмоции)

**Исходник:**

“This is not my problem”

→ риск: эскалация конфликта

→ альтернатива:
“I think this might be handled better by [X], but I’m happy to help if needed”

---
### 5. Запрос (слабая позиция)

**Исходник:**

“Sorry, can I ask you to maybe review this?”

→ риск: чрезмерная извинительность → снижает вес просьбы

→ альтернатива:
“Could you review this when you have a moment?”

---
### 6. Пассивная агрессия

**Исходник:**

“Thanks for finally replying”

→ риск: сарказм → портит отношения

→ альтернатива:
“Thanks for getting back to me”

---
### 7. Личный конфликт

**Исходник:**

“You never listen to me”

→ риск: обобщение + обвинение

→ альтернатива:
“I feel like I wasn’t heard earlier - can we revisit this?”

---
### 8. Перегиб в прямоте

**Исходник:**

“This is wrong”

→ риск: жёсткая оценка → вызывает защиту

→ альтернатива:
“I think there might be an issue here”

---
### 9. Отказ (очень частый кейс)

**Исходник:**

“I can’t do this”

→ риск: звучит резко / закрывает диалог

→ альтернатива:
“I won’t be able to take this on right now”

---
### 10. Деньги / ценность

**Исходник:**

“That’s too expensive”

→ риск: обесценивает → ухудшает переговоры

→ альтернатива:
“That’s a bit outside my current budget - is there a way to adjust the scope?”

---
### 11. В состоянии раздражения

**Исходник:**

“Just do it the way I said”

→ риск: авторитарность → сопротивление

→ альтернатива:
“Let’s go with the approach we discussed earlier”

---
### 12. Неясная просьба

**Исходник:**

“Let me know what you think”

→ риск: нет конкретного действия → игнор

→ альтернатива:
“Could you share your feedback on this by tomorrow?”

---
---
# Как это использовать (важно)

Это не просто примеры. Это:
## 1. Контент
- короткие посты
- карусели
- TikTok / Shorts

## 2. Лендинг

Блок:
> “Сообщения, которые портят отношения - и как их исправить”

## 3. Внутри продукта

Показывать:
- “что было не так”
- “что исправлено”

---
# Ключевой паттерн (суть продукта)

Во всех примерах одно и то же:
- убираем обвинение
- убираем слабость
- убираем лишнее
- добавляем ясность
- добавляем безопасность

Это и есть твой “движок”.

---
# Самое важное наблюдение

Во многих случаях пользователь думает:
> “я просто говорю прямо”

А на самом деле:
- звучит агрессивно
- или звучит слабо
- или звучит странно

И он этого не видит.

---
# Сильная формулировка (можешь использовать)

> “Ты пишешь одно. Люди слышат другое.”

или

> “Это звучит не так, как ты думаешь”


-------

Ниже дам это в трёх слоях:

1. общие паттерны риска
2. правила работы движка
3. ТЗ и промпты для MVP

Я буду писать не как “академическую концепцию”, а как основу, которую можно прямо отдавать в разработку.

---

# 1. Общие паттерны риска

Это не жёсткие правила, а классы сигналов, которые LLM должна уметь замечать.

## A. Агрессия / нападение

Сигналы:

* прямое обвинение
* “почему ты…?”
* обобщения: “ты всегда”, “ты никогда”
* сарказм
* пассивная агрессия
* снисходительный тон

Риск:

* вызывает защиту
* ломает сотрудничество
* создаёт конфликт вместо результата

---

## B. Слабость / заискивание

Сигналы:

* чрезмерные извинения
* многократные смягчители: “just”, “maybe”, “if possible”, “sorry to bother you”
* просьба, поданная как оправдание
* отсутствие ясной формулировки запроса
* ощущение, что автор заранее виноват

Риск:

* снижает вес сообщения
* делает просьбу менее уважаемой
* провоцирует игнор или неуважение

---

## C. Неясность / размытость

Сигналы:

* непонятно, что именно человек хочет
* много контекста, мало сути
* просьба без конкретного next step
* много слов, мало действия
* вывод спрятан в середине текста

Риск:

* человек не отвечает
* отвечает не на то
* откладывает решение

---

## D. Челлендж авторитету

Сигналы:

* звучит как correction, а не inquiry
* резкое несогласие
* тон “ты неправ”
* формулировки, которые ставят собеседника в оборону
* апелляция к внешнему источнику как к замене его экспертизы

Риск:

* начальник, врач, клиент, старший коллега закрываются
* начинается борьба за статус вместо решения задачи

---

## E. Оправдательность / overexplaining

Сигналы:

* длинные объяснения, почему автор не смог / не хочет / не готов
* попытка заранее снять вину
* много деталей, не влияющих на решение
* текст как будто просит прощения за своё существование

Риск:

* снижает статус
* делает сообщение утомительным
* открывает ненужные точки для спора

---

## F. Эмоциональная импульсивность

Сигналы:

* резкость
* эмоциональные слова
* текст “из сердца в экран”
* отправка в гневе, обиде, опьянении, ночью
* желание “сказать правду прямо сейчас”

Риск:

* сообщение решает эмоциональную задачу автора, а не практическую задачу коммуникации

---

## G. Манипулятивность / скрытое давление

Сигналы:

* guilt-tripping
* попытка заставить стыдиться
* “если бы тебе было не всё равно…”
* скрытый ультиматум
* наезд, замаскированный под просьбу

Риск:

* разрушает доверие
* вызывает ответное сопротивление

---

## H. Несоответствие цели и тона

Сигналы:

* человек хочет сотрудничества, а текст звучит как атака
* хочет отказать мягко, а звучит холодно
* хочет звучать уверенно, а звучит виновато
* хочет близости, а звучит бюрократически

Риск:

* сообщение не работает по назначению

---

## I. Неподходящая прямота / неподходящая мягкость

Сигналы:

* слишком прямо для чувствительной ситуации
* слишком мягко для деловой / статусной ситуации
* слишком лично для рабочего контекста
* слишком официально для близких отношений

Риск:

* текст звучит “не в регистр”

---

## J. Отсутствие управляемого действия

Сигналы:

* нет чёткого запроса
* нет дедлайна
* нет ожидаемого следующего шага
* нет ясности, что собеседнику делать после чтения

Риск:

* сообщение не ведёт к результату

---

# 2. Общие правила движка

Вот правила, по которым система должна мыслить.

## Главное правило

Система не должна просто “улучшать текст”.
Она должна отвечать на вопрос:

> Помогает ли этот текст достичь цели с этим адресатом без лишнего ущерба?

---

## Правило 1. Сначала цель, потом стиль

Нельзя переписывать текст без понимания:

* чего автор хочет добиться
* кому пишет
* какой уровень риска

Если это неясно, система либо:

* делает лучшую вероятностную догадку
* либо задаёт ровно 1 короткий уточняющий вопрос

---

## Правило 2. Исправлять нужно не грамматику, а последствия

Приоритет не:

* “красиво”
* “естественно”
* “как native”

Приоритет:

* как это прозвучит
* какой вызовет эффект
* есть ли социальный риск

---

## Правило 3. Убирать крайности

Нужно снижать:

* обвинительность
* заискивание
* сарказм
* эмоциональную импульсивность
* размытость

Но не выхолащивать смысл.

---

## Правило 4. Сохранять намерение автора

Система не должна делать автора “удобным” или “стерильным”.

Нужно сохранить:

* основную мысль
* реальную позицию
* нужную степень твёрдости

Но подать это так, чтобы задача была решена лучше.

---

## Правило 5. Давать verdict

Каждое сообщение должно получать одну из оценок:

* OK to send
* Risky - revise
* Do not send yet

Это очень важный слой. Пользователю нужен не только новый текст, но и внешний взгляд.

---

## Правило 6. Объяснение должно быть коротким

Не психотерапия. Не лекция.

Формат:

* 2–4 пункта
* очень конкретно
* на языке последствий

Пример:

* звучит как обвинение
* просьба неясна
* слишком много оправданий

---

## Правило 7. Переписывание должно быть минимально достаточным

Не надо каждый раз перепридумывать текст с нуля.
Если можно исправить 20%, а не 100% - лучше исправить 20%.

Это особенно важно для voice editing.

---

## Правило 8. При высоком риске - тормозить, а не полировать

Если текст:

* злой
* написан в аффекте
* унижает
* может испортить отношения / работу

система должна уметь сказать:

> Не отправляй это сейчас.

И только потом предлагать вариант.

---

## Правило 9. Система должна уметь работать с несколькими режимами силы

Минимум три режима:

* safer
* firmer
* warmer

Потому что одна и та же мысль может быть верной, но подана не в нужной силе.

---

## Правило 10. Локальные голосовые правки - священны

Если пользователь говорит:

* “замени это слово”
* “сделай этот абзац короче”
* “тут мягче”

система не должна заново переписывать весь текст.
Она должна менять только затронутый фрагмент.

Это ключевой UX.

---

# 3. MVP - общее ТЗ

## Название рабочее

Send Gate / Before Send / Don’t Send That

---

## Основной job to be done

Помочь пользователю не отправить сообщение, о котором он пожалеет, и быстро превратить сырой текст в верное сообщение для конкретного адресата.

---

## Основной use case

Пользователь:

* вставляет текст, набросок или диктует голосом
* указывает или система угадывает, кому это сообщение
* получает:

  1. verdict
  2. краткий анализ рисков
  3. улучшенную версию
* затем голосом вносит точечные правки
* копирует результат

---

## MVP scope

Включить:

* input text
* input voice
* audience selection
* verdict
* rewrite
* short risk explanation
* local follow-up edits by voice/text
* undo

Не включать:

* posting to platforms
* deep personalization memory
* fine-tuning on user corpus
* relationship coaching
* long “am I the asshole” analyses
* complex workflow automations

---

## Аудитории в MVP

Не больше 6–8 штук:

* boss
* client
* colleague
* investor
* customer
* partner
* family member
* other

---

## Типы сообщений в MVP

Не больше 6:

* short message
* email
* follow-up
* request
* refusal
* feedback / disagreement

---

## Verdict logic

Система должна возвращать:

### OK to send

если текст в целом адекватен, понятен и безопасен

### Risky - revise

если текст может сработать плохо, но исправим

### Do not send yet

если сообщение импульсивное, оскорбительное, слишком эмоциональное, слишком рискованное или лучше отложить

---

## Output format MVP

### 1. Verdict

OK to send / Risky - revise / Do not send yet

### 2. Why

3 коротких пункта максимум

### 3. Suggested version

готовый текст

### 4. Optional quick actions

* make softer
* make firmer
* shorter
* more direct
* more polite

---

# 4. Архитектура пайплайна

Минимально разумный пайплайн такой:

## Step 0. Input normalization

Вход:

* сырой текст или транскрибированный голос

Очистка:

* убрать явный мусор транскрипции
* сохранить оригинал для diff/undo

---

## Step 1. Context inference

Определить:

* probable audience
* probable goal
* probable risk level
* emotional charge

Если вероятность низкая - задать 1 вопрос.

---

## Step 2. Risk analysis

Выявить:

* aggression
* weakness
* overexplaining
* lack of clarity
* challenge to authority
* emotional impulsivity
* passive aggression
* unclear ask

Результат - структурированный JSON, не для показа пользователю напрямую.

---

## Step 3. Verdict decision

На основе risk analysis решить:

* send
* risky
* don’t send

---

## Step 4. Rewrite

Сделать одну улучшенную версию с учётом:

* goal
* audience
* risk class
* preserving intent

---

## Step 5. User-facing explanation

Сгенерировать 2–3 краткие причины человеческим языком.

---

## Step 6. Local edit loop

После команды пользователя:

* определить target span
* применить локальное изменение
* не переписывать остальное

---

# 5. Внутренний schema / JSON contract

Удобно иметь промежуточную структуру такого типа:

```json
{
  "audience": "boss",
  "message_type": "request",
  "goal": "reschedule a meeting without sounding flaky",
  "risk_level": "medium",
  "verdict": "risky",
  "detected_patterns": [
    {
      "type": "overexplaining",
      "severity": "medium",
      "evidence": "multiple justifications before the actual request"
    },
    {
      "type": "weakness",
      "severity": "medium",
      "evidence": "excessive apologies and hedging"
    },
    {
      "type": "unclear_ask",
      "severity": "high",
      "evidence": "request is implied, not stated clearly"
    }
  ],
  "rewrite_strategy": [
    "state the request earlier",
    "reduce apologies",
    "keep respectful tone",
    "preserve warmth"
  ],
  "suggested_text": "Could we reschedule our meeting for Thursday? Something unexpected came up on my end, and I’d appreciate the flexibility.",
  "user_explanation": [
    "The request is buried under too much context.",
    "It sounds more apologetic than necessary.",
    "The revised version is clearer and more confident."
  ]
}
```

---

# 6. Системный промпт для основного анализа

Ниже рабочая заготовка.

```text
You are a communication risk reviewer and message rewriter.

Your job is not to make text prettier. Your job is to help the user send a message that achieves their goal with the intended audience while reducing unnecessary social, professional, or relational risk.

Priorities:
1. infer the likely goal of the message
2. infer the likely audience if not explicitly given
3. detect communication risks
4. decide whether the message is safe to send now
5. rewrite it to preserve the user’s intent while making it more effective

Important principles:
- focus on consequences, not grammar
- preserve the user’s core meaning
- reduce unnecessary aggression, weakness, overexplaining, vagueness, passive aggression, and authority-triggering phrasing
- do not over-soften the message if firmness is needed
- do not produce therapy language or abstract psychological commentary
- use concrete, practical explanations
- if the message is too risky, say so clearly

Risk categories to detect:
- aggression
- accusation
- passive aggression
- overexplaining
- excessive apologizing
- vagueness / unclear ask
- emotional impulsivity
- challenge to authority
- manipulative pressure
- mismatch between tone and goal

Return output in this structure:
1. Verdict: OK to send / Risky - revise / Do not send yet
2. Why: 1-3 brief bullet points
3. Suggested version: the revised message

If context is unclear, make the best reasonable assumption rather than asking many questions.
Ask at most one clarifying question only if absolutely necessary.
```

---

# 7. Промпт для внутреннего risk-analysis режима

Это лучше делать отдельным вызовом.

```text
Analyze the following message as a communication-risk checker.

You must infer:
- likely audience
- likely message type
- likely goal
- emotional charge
- main communication risks

Do not rewrite the text yet.

Classify detected issues using only these categories:
- aggression
- weakness
- overexplaining
- unclear_ask
- passive_aggression
- challenge_to_authority
- emotional_impulsivity
- manipulation
- tone_goal_mismatch

For each detected issue, provide:
- type
- severity: low / medium / high
- short evidence

Then provide:
- overall risk level: low / medium / high
- recommended verdict: ok / risky / dont_send_yet
- rewrite strategy: up to 5 short action points

Return valid JSON only.
```

---

# 8. Промпт для rewrite режима

```text
Rewrite the message for the specified audience and goal.

Requirements:
- preserve the user’s intent
- remove unnecessary communication risk
- make the message clearer and more effective
- keep the tone appropriate for the audience
- do not over-explain
- do not sound robotic
- keep it as short as reasonably possible
- do not add new facts

Audience: {{audience}}
Message type: {{message_type}}
Goal: {{goal}}
Risk patterns detected: {{patterns}}
Desired tone adjustment: {{tone_adjustment}}

Return only the final rewritten message.
```

---

# 9. Промпт для user-facing explanation

```text
Explain briefly why the original message was risky and what was improved.

Rules:
- be concrete
- avoid psychological jargon
- focus on likely impression and consequence
- maximum 3 bullet points
- each bullet should be short

Original message:
{{original}}

Rewritten message:
{{rewritten}}

Detected patterns:
{{patterns}}

Return only the bullet points.
```

---

# 10. Промпт для voice editing / локальных правок

Это важнейший кусок.

```text
You are editing an existing message.

Your task is to apply the user’s requested change with minimal edits.
Do not rewrite the whole message unless the user explicitly asks for a full rewrite.

Rules:
- preserve all untouched parts
- modify only the relevant sentence, phrase, or paragraph
- if the user refers to “this sentence” or “that word”, infer the most likely target span
- if ambiguous, choose the smallest reasonable span
- keep style and meaning consistent
- return the full updated text
- also return a short note describing what changed

Current text:
{{current_text}}

User edit instruction:
{{edit_instruction}}

Return JSON:
{
  "updated_text": "...",
  "changed_span_summary": "..."
}
```

---

# 11. Правила для local edit engine

Нужны отдельные продуктовые правила:

1. если пользователь просит заменить слово - менять только слово/фразу
2. если просит “сделай мягче” для абзаца - менять только этот абзац
3. если просит “перепиши всё” - можно полный rewrite
4. всегда хранить предыдущую версию
5. показывать diff визуально
6. поддерживать undo/redo

---

# 12. UI flow MVP

## Экран 1

Поле:

* paste text
* record voice

Минимум опций:

* who is this for?
* optional: what are you trying to do?

Кнопка:

* Check before sending

---

## Экран 2

Карточка:

**Verdict:** Risky - revise

**Why:**

* sounds more defensive than necessary
* the actual request is unclear
* may come across as indirect

**Suggested version:**
...

Кнопки:

* softer
* firmer
* shorter
* more direct
* edit by voice

---

## Экран 3

Voice editing mode:

* пользователь говорит команду
* текст обновляется локально
* есть undo

---

# 13. Примеры quick intents

Для MVP можно зашить стандартные intents:

* ask for something
* say no
* reschedule / cancel
* give feedback
* disagree respectfully
* follow up
* set boundary
* apologize
* clarify misunderstanding

---

# 14. Примеры готовых rewrite strategies

Полезно иметь библиотеку таких стратегий:

## Для слабости

* cut apology count
* move request earlier
* replace hedging with clear ask

## Для агрессии

* replace accusation with inquiry
* remove absolute language
* reduce emotional emphasis

## Для overexplaining

* cut background
* keep only decision-relevant context
* end with clear action

## Для challenge_to_authority

* replace correction with question
* preserve dignity of recipient
* keep disagreement but lower ego threat

---

# 15. Что показывать пользователю, а что нет

Показывать:

* verdict
* короткие причины
* новый текст

Не показывать в MVP:

* “у вас subconscious bug”
* “это говорит о вашем страхе”
* длинный внутренний разбор модели

Психологический язык можно потом использовать как premium / expert mode, но не в основной продукт.

---

# 16. Формулировка продукта

Самая точная сейчас:

> Проверь сообщение перед отправкой

Чуть сильнее:

> Не отправь сообщение, о котором пожалеешь

Чуть более функционально:

> Скажи это так, чтобы не было проблем

---

# 17. Что бы я рекомендовал как MVP-версию

Самая разумная первая версия:

* только английский
* только короткие сообщения и email
* только 4 аудитории: boss, client, colleague, partner
* только 5 intents
* paste + voice
* verdict + rewrite + local voice edits

Этого более чем достаточно.

---

# 18. На чём модель будет сыпаться

Заранее учитывать:

* слишком мало контекста
* культурные различия
* неоднозначность цели
* случаи, где нужна твёрдость, а не softening
* случаи, где “don’t send yet” важнее чем rewrite

Поэтому в промптах нужно жёстко зафиксировать:
сохранять намерение, а не просто делать мягче.

-------
Below is a practical MVP test set in English.

Goal: test whether the system can do four things well:

1. detect risk
2. infer audience/goal when missing
3. rewrite without losing intent
4. support the product’s core JTBD: “Don’t send a message you’ll regret”

I would use these as canonical test cases for evals, regression tests, and demos.

---

# Evaluation schema

For each case, score:

* Verdict correctness
* Risk detection correctness
* Rewrite usefulness
* Intent preservation
* Tone fit for audience
* Concision
* Whether a human would send the rewritten version

Suggested labels:

* Pass
* Partial
* Fail

---

# Canonical test cases

## 1. Direct accusation to colleague

**Audience:** colleague
**Goal:** understand why something was done a certain way
**Input:**
“Why did you do it like this?”

**Expected verdict:** Risky - revise
**Expected risks:** accusation, defensiveness trigger, tone-goal mismatch
**Expected rewrite characteristics:** turn accusation into inquiry, preserve firmness, stay short
**Example acceptable rewrite:**
“Can you walk me through your reasoning here?”

---

## 2. Passive-aggressive follow-up

**Audience:** colleague
**Goal:** get a response
**Input:**
“Thanks for finally replying.”

**Expected verdict:** Risky - revise
**Expected risks:** passive aggression, relationship damage
**Expected rewrite characteristics:** remove sarcasm, keep acknowledgment
**Example acceptable rewrite:**
“Thanks for getting back to me.”

---

## 3. Weak request to boss

**Audience:** boss
**Goal:** ask for review
**Input:**
“Sorry to bother you, but if you maybe have time, could you perhaps take a look at this?”

**Expected verdict:** Risky - revise
**Expected risks:** excessive apologizing, weakness, unclear ask
**Expected rewrite characteristics:** clearer ask, less hedging, respectful
**Example acceptable rewrite:**
“Could you take a look at this when you have a moment?”

---

## 4. Blunt disagreement with boss

**Audience:** boss
**Goal:** disagree without creating unnecessary friction
**Input:**
“I don’t think this makes sense.”

**Expected verdict:** Risky - revise
**Expected risks:** challenge to authority, bluntness
**Expected rewrite characteristics:** preserve disagreement, lower ego threat
**Example acceptable rewrite:**
“I may be missing something - could you help me understand the reasoning here?”

---

## 5. Overexplaining refusal to client

**Audience:** client
**Goal:** say no for now
**Input:**
“I’m really sorry, things are a bit complicated on my end at the moment and I have a lot going on personally and professionally, so I don’t think I can start right now.”

**Expected verdict:** Risky - revise
**Expected risks:** overexplaining, status loss, unnecessary personal detail
**Expected rewrite characteristics:** clear refusal, respectful, concise
**Example acceptable rewrite:**
“I’m not able to start right now, but I’d be happy to reconnect later if that would be helpful.”

---

## 6. Unclear request buried in context

**Audience:** colleague
**Goal:** ask for a file
**Input:**
“Hey, I was looking through some things this morning and realized I might not have that file from last week, unless I missed it somewhere, which is possible.”

**Expected verdict:** Risky - revise
**Expected risks:** unclear ask, vagueness
**Expected rewrite characteristics:** make request explicit
**Example acceptable rewrite:**
“Could you resend the file from last week? I don’t think I have it.”

---

## 7. Emotional message to partner

**Audience:** partner
**Goal:** express hurt without escalating
**Input:**
“You never listen to me.”

**Expected verdict:** Risky - revise
**Expected risks:** accusation, overgeneralization, conflict escalation
**Expected rewrite characteristics:** shift from blame to experience
**Example acceptable rewrite:**
“I felt unheard earlier, and I’d like to talk about it.”

---

## 8. Angry message that should be blocked

**Audience:** ex-partner / family / partner
**Goal:** vent anger
**Input:**
“I’m done with your bullshit. Don’t ever text me again.”

**Expected verdict:** Do not send yet
**Expected risks:** emotional impulsivity, aggression, irreversible harm
**Expected rewrite characteristics:** if rewritten at all, should be much calmer and likely advise delay
**Expected system behavior:** strong recommendation not to send immediately

---

## 9. Drunk-text style impulsive message

**Audience:** ex / crush / partner
**Goal:** emotional outreach
**Input:**
“I miss you so much, I know it’s late but I had to tell you this right now.”

**Expected verdict:** Do not send yet or Risky - revise depending on product philosophy
**Expected risks:** emotional impulsivity, timing risk, regret risk
**Expected rewrite characteristics:** encourage delay or a calmer next-day version
**Example acceptable rewrite:**
No-send recommendation preferred

---

## 10. Customer support boundary setting

**Audience:** customer
**Goal:** set a boundary without sounding hostile
**Input:**
“I already answered this in my previous email.”

**Expected verdict:** Risky - revise
**Expected risks:** irritation, dismissiveness
**Expected rewrite characteristics:** preserve boundary, reduce friction
**Example acceptable rewrite:**
“I addressed this in my previous email, but I’m happy to clarify if anything is still unclear.”

---

## 11. Strong but appropriate boundary

**Audience:** client
**Goal:** enforce a policy
**Input:**
“I can’t hold your slot unless payment is made by Friday.”

**Expected verdict:** OK to send
**Expected risks:** low
**Expected rewrite characteristics:** maybe minor smoothing, but should not weaken the boundary
**Important eval point:** model must not over-soften necessary firmness

---

## 12. Late cancellation to client

**Audience:** client
**Goal:** reschedule a session
**Input:**
“Sorry, something came up, I need to skip tomorrow.”

**Expected verdict:** Risky - revise
**Expected risks:** abruptness, weak professionalism, unclear next step
**Expected rewrite characteristics:** apology + concrete next step
**Example acceptable rewrite:**
“Something unexpected came up on my end, and I need to reschedule tomorrow’s session. I’m sorry for the inconvenience - would Thursday or Friday work instead?”

---

## 13. Feedback that sounds harsh

**Audience:** colleague / contractor
**Goal:** say the work is not acceptable
**Input:**
“This is wrong.”

**Expected verdict:** Risky - revise
**Expected risks:** harshness, defensiveness trigger
**Expected rewrite characteristics:** identify issue without blunt attack
**Example acceptable rewrite:**
“I think there may be an issue here.”

---

## 14. Investor outreach that sounds needy

**Audience:** investor
**Goal:** get a meeting
**Input:**
“I’d be incredibly grateful if you could maybe spare a few minutes for a quick call whenever convenient.”

**Expected verdict:** Risky - revise
**Expected risks:** weakness, over-hedging, low-status phrasing
**Expected rewrite characteristics:** concise, confident, respectful
**Example acceptable rewrite:**
“Would you be open to a brief call next week?”

---

## 15. Ambiguous “Let me know”

**Audience:** colleague
**Goal:** get feedback by a certain time
**Input:**
“Let me know what you think.”

**Expected verdict:** Risky - revise
**Expected risks:** no action target, easy to ignore
**Expected rewrite characteristics:** explicit ask, ideally deadline
**Example acceptable rewrite:**
“Could you share your feedback on this by tomorrow afternoon?”

---

## 16. Authority trigger with outside source

**Audience:** doctor / expert / boss
**Goal:** ask about something the sender found elsewhere
**Input:**
“I Googled this and it says something different.”

**Expected verdict:** Risky - revise
**Expected risks:** challenge to authority, ego threat
**Expected rewrite characteristics:** preserve curiosity, reduce challenge
**Example acceptable rewrite:**
“I came across some information that seemed different, and I wanted to get your take on it.”

---

## 17. Overly formal message to partner

**Audience:** partner
**Goal:** discuss feelings
**Input:**
“I would like to inform you that your recent behavior has been disappointing to me.”

**Expected verdict:** Risky - revise
**Expected risks:** tone-goal mismatch, emotional distance
**Expected rewrite characteristics:** warmer, more natural, still clear
**Example acceptable rewrite:**
“I felt hurt by what happened earlier, and I want to talk about it.”

---

## 18. Too casual message to investor

**Audience:** investor
**Goal:** first outreach
**Input:**
“Hey, got a cool startup idea, wanna chat?”

**Expected verdict:** Risky - revise
**Expected risks:** audience mismatch, low credibility
**Expected rewrite characteristics:** more professional, concise
**Example acceptable rewrite:**
“I’m building a startup in [space] and would value the chance to briefly share what we’re working on.”

---

## 19. Manipulative guilt-tripping

**Audience:** partner / family
**Goal:** get response or compliance
**Input:**
“If you actually cared, you would answer.”

**Expected verdict:** Do not send yet or Risky - revise
**Expected risks:** manipulation, escalation, guilt pressure
**Expected rewrite characteristics:** express need directly, remove guilt
**Example acceptable rewrite:**
“I’d appreciate a reply when you have a moment.”

---

## 20. Appropriate concise refusal

**Audience:** colleague
**Goal:** decline extra work
**Input:**
“I won’t be able to take this on right now.”

**Expected verdict:** OK to send
**Expected risks:** low
**Expected rewrite characteristics:** preserve as-is or minimal improvement
**Important eval point:** model should not fix what isn’t broken

---

## 21. Vague emotionally loaded email

**Audience:** boss
**Goal:** explain concern
**Input:**
“I’ve been thinking a lot about everything that’s happened lately, and honestly I have mixed feelings about the direction we’re taking.”

**Expected verdict:** Risky - revise
**Expected risks:** vagueness, emotional load, unclear ask
**Expected rewrite characteristics:** specify concern or next step
**Example acceptable rewrite:**
“I have some concerns about the current direction and would appreciate a chance to discuss them.”

---

## 22. Customer complaint reply - too defensive

**Audience:** customer
**Goal:** respond to complaint
**Input:**
“That’s not what happened.”

**Expected verdict:** Risky - revise
**Expected risks:** defensiveness, invalidation
**Expected rewrite characteristics:** acknowledge first, then clarify
**Example acceptable rewrite:**
“I understand why that was frustrating. From our side, what happened was…”

---

## 23. Colleague correction that sounds patronizing

**Audience:** colleague
**Goal:** correct a mistake
**Input:**
“Actually, that’s not how this works.”

**Expected verdict:** Risky - revise
**Expected risks:** patronizing tone
**Expected rewrite characteristics:** collaborative correction
**Example acceptable rewrite:**
“I think there may be a misunderstanding here - my understanding is…”

---

## 24. Message with hidden ask but no clear request

**Audience:** boss
**Goal:** get approval for leave
**Input:**
“My family is visiting next week and it’s been a long time since I’ve seen them.”

**Expected verdict:** Risky - revise
**Expected risks:** implied ask only, unclear action
**Expected rewrite characteristics:** make request explicit
**Example acceptable rewrite:**
“My family is visiting next week, and I’d like to take Friday off if that works.”

---

## 25. Too much apology in routine scheduling

**Audience:** colleague
**Goal:** move a meeting
**Input:**
“I’m so sorry, I feel terrible about this, but would it be at all possible to move our meeting?”

**Expected verdict:** Risky - revise
**Expected risks:** excessive apology, weakness
**Expected rewrite characteristics:** lighter apology, clear request
**Example acceptable rewrite:**
“Would it be possible to move our meeting?”

---

## 26. Legitimately firm correction should remain firm

**Audience:** direct report / vendor / colleague
**Goal:** enforce a requirement
**Input:**
“This needs to be fixed before we send it.”

**Expected verdict:** OK to send
**Expected risks:** low
**Expected rewrite characteristics:** preserve firmness
**Important eval point:** avoid useless softening

---

## 27. Night-time impulsive confession to boss

**Audience:** boss
**Goal:** express frustration
**Input:**
“I’m tired of this and I don’t think I can keep pretending everything is fine.”

**Expected verdict:** Do not send yet
**Expected risks:** emotional impulsivity, unclear consequence, high professional risk
**Expected rewrite characteristics:** if rewritten, convert into calm request for conversation
**Preferred behavior:** tell user not to send now

---

## 28. Message that is grammatically poor but socially fine

**Audience:** colleague
**Goal:** ask for update
**Input:**
“Hey did you have any update on this?”

**Expected verdict:** OK to send
**Expected risks:** low
**Expected rewrite characteristics:** minor cleanup only
**Important eval point:** product should focus on consequence, not obsess over grammar

---

## 29. Too long personal explanation to client

**Audience:** client
**Goal:** cancel today
**Input:**
“I didn’t sleep well, I’ve been stressed, and I’m not really in the right headspace, so I think it’s better if we don’t do today.”

**Expected verdict:** Risky - revise
**Expected risks:** oversharing, professionalism issue, unclear rescheduling
**Expected rewrite characteristics:** concise, respectful, professional
**Example acceptable rewrite:**
“I need to reschedule today’s session. I’m sorry for the inconvenience.”

---

## 30. Soft message that becomes too soft if over-optimized

**Audience:** partner
**Goal:** ask for change
**Input:**
“Could you please not joke about that? It bothers me.”

**Expected verdict:** OK to send
**Expected risks:** low
**Expected rewrite characteristics:** preserve directness and boundary
**Important eval point:** model must not dilute a healthy boundary

---

# Voice-editing test cases

These are separate. They test the local-edit loop.

## VE1. Replace one word only

**Current text:**
“Could you review this when you have a moment?”

**Edit instruction:**
“Replace ‘review’ with ‘look over’.”

**Expected behavior:** only that phrase changes
**Expected output:**
“Could you look over this when you have a moment?”

---

## VE2. Make one sentence softer

**Current text:**
“I need to reschedule tomorrow’s session. Let me know what works.”

**Edit instruction:**
“Make the first sentence a little softer.”

**Expected behavior:** change first sentence only
**Expected output example:**
“I need to reschedule tomorrow’s session, unfortunately.”

---

## VE3. Shorten second sentence only

**Current text:**
“Thanks for getting back to me. I really appreciate you taking the time to explain all of this in such detail.”

**Edit instruction:**
“Shorten the second sentence.”

**Expected behavior:** first sentence untouched
**Expected output example:**
“Thanks for getting back to me. I appreciate the explanation.”

---

## VE4. Make whole message firmer

**Current text:**
“Would it maybe be possible to send this today?”

**Edit instruction:**
“Make it firmer.”

**Expected behavior:** global rewrite allowed
**Expected output example:**
“Could you send this today?”

---

## VE5. Undo risky local edit drift

**Current text:**
“Could we move our meeting to Thursday?”

**Edit instruction:**
“Add that I’m annoyed.”

**Expected behavior:** system should not freely inject counterproductive emotional content without making the effect clear; ideally produce a restrained version or ask for confirmation depending on product design

---

# Edge-case tests

## E1. Missing audience, infer from content

**Input:**
“Can we push this to next week? I need more time.”

**Expected behavior:** infer likely colleague/client/work context; produce reasonable rewrite without over-questioning

---

## E2. Two possible audiences, ambiguity high

**Input:**
“I need space right now.”

**Expected behavior:** likely ask one short clarifying question or make explicit assumption

---

## E3. Message should be blocked, not polished

**Input:**
“You’ll regret this.”

**Expected verdict:** Do not send yet
**Important eval point:** the system must not simply make it elegant

---

## E4. Healthy firmness must survive

**Input:**
“This doesn’t work for me.”

**Expected verdict:** depends on context, but the model should not automatically pathologize firmness

---

# What a passing system should do overall

A good MVP should:

* block clearly impulsive or destructive messages
* reduce accusation and over-apology
* preserve healthy boundaries
* make unclear asks explicit
* avoid over-softening
* keep rewrites concise
* support precise local edits without rewriting everything

A bad system will:

* make everything bland
* soften healthy firmness
* miss passive aggression
* ignore authority sensitivity
* overfocus on grammar
* rewrite too much during voice edits

-------

Voice editing should also support direct editing like inserted of A say B (for words or phrases), or instead of A, say something like C

Yes. That should be a first-class editing mode, not an extra.

In fact there are three distinct voice edit types, and the system should support all three.

1. Exact replacement
   User names the old fragment and the new fragment.

Examples:

* “Instead of ‘review’, say ‘look over’.”
* “Replace ‘I’m sorry’ with ‘Thanks for understanding’.”
* “Change ‘this week’ to ‘by Friday’.”

Use when:

* user knows exactly what they want

Behavior:

* replace only the matched word or phrase
* preserve everything else
* if multiple matches, ask or highlight which one was changed

2. Fuzzy replacement
   User points to a fragment but gives an approximate desired alternative.

Examples:

* “Instead of ‘I can’t do this’, say something softer.”
* “Replace ‘This is wrong’ with something less harsh.”
* “Instead of ‘whenever convenient’, say it in a more confident way.”

Use when:

* user knows what is wrong, but not exact wording

Behavior:

* keep change local
* rewrite only the referenced span
* preserve surrounding sentence and overall meaning

3. Local instruction edit
   User does not name old and new text directly, but instructs what to do to a small part.

Examples:

* “In the first sentence, make it shorter.”
* “In the second paragraph, sound less defensive.”
* “Split this paragraph into two.”
* “Remove the apology.”
* “Add a clearer ask at the end.”

Use when:

* user thinks in edits, not replacements

Behavior:

* target the smallest reasonable span
* do not rewrite the whole message unless explicitly asked

So the edit engine should follow this priority:

1. If user says “replace A with B” or “instead of A say B” -> exact replacement mode.
2. If user says “instead of A, say something like...” -> fuzzy replacement mode.
3. Otherwise -> local instruction mode.

I’d add these product rules.

Matching rules

* Prefer exact string match first.
* Then normalized match: punctuation/case differences.
* Then semantic nearest-span match if exact not found.
* If still ambiguous, pick the smallest likely span or ask one short question.

Safety rules

* Never silently rewrite the whole text for a local edit.
* Show what changed.
* Keep undo always available.
* If the requested replacement makes the message much riskier, allow it, but flag it.

Useful JSON contract:

```json
{
  "edit_type": "exact_replacement",
  "target_text": "review",
  "replacement_text": "look over",
  "scope": "local",
  "updated_text": "Could you look over this when you have a moment?",
  "changed_span_summary": "Replaced 'review' with 'look over' in sentence 1."
}
```

For fuzzy/local edits:

```json
{
  "edit_type": "fuzzy_replacement",
  "target_text": "This is wrong",
  "edit_instruction": "say something less harsh",
  "scope": "local",
  "updated_text": "I think there may be an issue here.",
  "changed_span_summary": "Softened the sentence to reduce harshness."
}
```

Prompt for this mode:

```text
You are editing an existing message.

Your default behavior is local editing, not full rewriting.

Supported edit modes:
1. exact replacement: user specifies old text and new text
2. fuzzy replacement: user specifies old text and approximate desired wording
3. local instruction: user specifies what to change in a sentence, phrase, or paragraph

Rules:
- preserve all untouched text
- modify the smallest reasonable span
- do not rewrite the whole message unless explicitly requested
- if multiple matches exist for the target text, choose the most likely one and report which one you changed
- if the user asks for a riskier formulation, comply but note the likely effect
- return the full updated text plus a short summary of what changed

Current text:
{{current_text}}

User edit instruction:
{{edit_instruction}}

Return JSON:
{
  "edit_type": "...",
  "target_text": "...",
  "replacement_text": "...",
  "scope": "local",
  "updated_text": "...",
  "changed_span_summary": "..."
}
```

And yes, this should be in the test set too. Add canonical cases like:

* “Replace ‘review’ with ‘look over’.”
* “Instead of ‘I’m busy this week’, say ‘I’m fully booked this week’.”
* “Instead of ‘This is wrong’, say something less harsh.”
* “Remove ‘just’ from the whole message.”
* “Replace the last sentence with a clearer ask.”

This is not a minor UX detail. This is one of the strongest differentiators of the product. Most tools regenerate. This one obeys edits.

-------

# Where you can win

If you get these right:
## 1. Speed
< 2–3 seconds

## 2. Brutally simple UX
- paste → result

## 3. Strong verdict
Not vague suggestions

## 4. Local voice editing that actually works
This is rare

## 5. Clear positioning
“don’t send something stupid”
