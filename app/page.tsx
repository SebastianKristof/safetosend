'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  AnalysisResponse,
  Audience,
  EditChange,
  EditResponse,
  Locale,
  Verdict,
} from '@/lib/assistant-contracts'
import type { DraftSnapshot } from '@/lib/assistant-client'
import { buildAnalysisContextPayload, getLocalizedMeaning } from '@/lib/analysis-state'
import { MAX_DRAFT_CHARS } from '@/lib/draft-limits'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useTimedDictation } from '@/hooks/use-timed-dictation'

const STORAGE_KEY = 'safetosend.app.state.v4'

const UI_COPY = {
  en: {
    workspace: { draft: "Your message", review: "Message review", reviewHint: "Tone, intent, and possible friction" },
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Is it safe to send?',
      subtitle: 'Your second pair of eyes before sending.',
    },
    panel: {
      kicker: 'Composer',
      title: 'The message lives here.',
      ready: 'Ready',
      resultsPlaceholder: 'Results appear here after you check or rewrite the message.',
      likelyIntent: 'Likely intent',
      reasons: 'Reason',
      changes: 'What changed',
      history: 'Recent history',
      current: 'Current',
    },
    fields: {
      interfaceLanguage: 'Interface language',
      workingText: 'Working text',
      audience: 'Audience',
      voice: 'Voice commands',
    },
    placeholders: {
      workingText: 'Paste, type, or rewrite the message here.',
      voice: 'make it shorter and less blunt',
    },
    buttons: {
      undo: 'Undo',
      redo: 'Redo',
      copy: 'Copy',
      copied: 'Copied',
      paste: 'Paste',
      check: 'Check',
      checking: 'Checking...',
      submit: 'Rewrite',
      submitting: 'Rewriting...',
      mic: 'Hold to speak',
      stopMic: 'Stop recording',
      dictateDraft: "Dictate",
      stopDraftDictation: "Stop",
      transcribingDraft: "Transcribing…",
      dictationHint: "Up to 1 minute · added to your message",
    },
    status: {
      idle: 'Ready',
      analyzing: 'Checking',
      rewriting: 'Rewriting',
      listening: 'Listening',
      transcribing: 'Transcribing',
      draftChanged: 'Draft changed',
      startDraft: 'Paste, type, or write a draft.',
      beforeCheck: 'Before check',
      beforePaste: 'Before paste',
      beforeRewrite: 'Before rewrite',
      clipboardPasted: 'Clipboard pasted',
      voiceCommandCaptured: 'Voice instruction captured',
      draftDictationAdded: "Dictation added",
      draftCopied: 'Draft copied',
      analysisUpdated: 'Analysis updated',
      requestFailed: 'AI request failed.',
      analysisFailed: 'Analysis failed.',
      rewriteFailed: 'Rewrite failed.',
    },
    verdicts: {
      ok: 'Safe to send',
      risky: 'Risky - revise',
      hold: 'Do not send yet',
    },
    risks: {
      low: 'low',
      medium: 'medium',
      high: 'high',
    },
    audiences: {
      boss: { label: 'Boss', helper: 'Short, clear, low-friction' },
      client: { label: 'Client', helper: 'Polished, careful, confident' },
      colleague: { label: 'Colleague', helper: 'Direct and collaborative' },
      partner: { label: 'Partner', helper: 'Warm and non-defensive' },
      general: { label: 'General', helper: 'Neutral and adaptive' },
    },
    analysis: {
      likelyIntent: 'Likely intent',
      tone: 'Recommended tone',
      resultsPlaceholder: 'Results appear here after you check or rewrite the message.',
      translationTitle: 'Translation for verification',
      translationNote: 'Use this to confirm meaning. Tone and nuance are judged from the English version.',
      analysisHighlights: 'Questionable parts',
      rewriteHighlights: 'Rewritten parts',
    },
    changes: {
      title: 'What changed',
      summary: 'Change',
      added: 'Added',
      removed: 'Removed',
      replaced: 'Replaced',
      from: 'From',
      to: 'To',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
      es: 'ES',
      de: 'DE',
      fr: 'FR',
    },
    errors: {
      pasteFirst: 'Paste a draft first.',
      addDraft: 'Add a draft first.',
      draftTooLong: `Draft is too long. Max ${MAX_DRAFT_CHARS} characters.`,
      nothingToCopy: 'Nothing to copy.',
      clipboardEmpty: 'Clipboard is empty.',
      copyFailed: 'Copy failed.',
      pasteFailed: 'Paste failed.',
      dictationUnsupported: 'Voice capture is not available in this browser.',
      dictationFailed: 'Voice capture failed',
      voiceTooShort: 'Hold a little longer to record.',
      couldNotStart: 'Could not start recording.',
    },
  },
  ru: {
    workspace: { draft: "Ваше сообщение", review: "Анализ сообщения", reviewHint: "Тон, смысл и возможные риски" },
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Безопасно ли отправлять?',
      subtitle: 'Вторая пара глаз перед отправкой.',
    },
    panel: {
      kicker: 'Черновик',
      title: 'Здесь живет сообщение.',
      ready: 'Готово',
      resultsPlaceholder: 'Результат появится после проверки или правки сообщения.',
      likelyIntent: 'Вероятная цель',
      reasons: 'Причина',
      changes: 'Что изменилось',
      history: 'Последние версии',
      current: 'Текущая',
    },
    fields: {
      interfaceLanguage: 'Язык интерфейса',
      workingText: 'Текст',
      audience: 'Адресат',
      voice: 'Голосовые команды',
    },
    placeholders: {
      workingText: 'Вставьте, напечатайте или перепишите сообщение здесь.',
      voice: 'сделай короче и мягче',
    },
    buttons: {
      undo: 'Отмена',
      redo: 'Повтор',
      copy: 'Копировать',
      copied: 'Скопировано',
      paste: 'Вставить',
      check: 'Проверить',
      checking: 'Проверяем...',
      submit: 'Переписать',
      submitting: 'Переписываем...',
      mic: 'Говорить',
      stopMic: 'Стоп запись',
      dictateDraft: "Диктовать",
      stopDraftDictation: "Стоп",
      transcribingDraft: "Распознаём…",
      dictationHint: "До 1 минуты · добавим к тексту",
    },
    status: {
      idle: 'Готово',
      analyzing: 'Проверяем',
      rewriting: 'Правим',
      listening: 'Слушаю',
      transcribing: 'Распознаю',
      draftChanged: 'Черновик изменён',
      startDraft: 'Вставьте, напечатайте или напишите черновик.',
      beforeCheck: 'Перед проверкой',
      beforePaste: 'Перед вставкой',
      beforeRewrite: 'Перед переписыванием',
      clipboardPasted: 'Текст вставлен',
      voiceCommandCaptured: 'Голосовая инструкция распознана',
      draftDictationAdded: "Диктовка добавлена",
      draftCopied: 'Текст скопирован',
      analysisUpdated: 'Проверка обновлена',
      requestFailed: 'Запрос к ИИ не удался.',
      analysisFailed: 'Не удалось проверить текст.',
      rewriteFailed: 'Не удалось переписать текст.',
    },
    verdicts: {
      ok: 'Можно отправлять',
      risky: 'Нужно доработать',
      hold: 'Пока не отправлять',
    },
    risks: {
      low: 'низкий',
      medium: 'средний',
      high: 'высокий',
    },
    audiences: {
      boss: { label: 'Руководитель', helper: 'Коротко, ясно, без лишнего' },
      client: { label: 'Клиент', helper: 'Аккуратно, уверенно, вежливо' },
      colleague: { label: 'Коллега', helper: 'Прямо и по делу' },
      partner: { label: 'Партнёр', helper: 'Тепло и без защиты' },
      general: { label: 'Общее', helper: 'Нейтрально и гибко' },
    },
    analysis: {
      likelyIntent: 'Вероятная цель',
      tone: 'Рекомендуемый тон',
      resultsPlaceholder: 'Результат появится после проверки или правки сообщения.',
      translationTitle: 'Перевод для проверки',
      translationNote: 'Используйте это, чтобы сверить смысл. Тон и нюансы оцениваются по английской версии.',
      analysisHighlights: 'Проблемные места',
      rewriteHighlights: 'Переписанные фрагменты',
    },
    changes: {
      title: 'Что изменилось',
      summary: 'Изменение',
      added: 'Добавлено',
      removed: 'Удалено',
      replaced: 'Заменено',
      from: 'Было',
      to: 'Стало',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
      es: 'ES',
      de: 'DE',
      fr: 'FR',
    },
    errors: {
      pasteFirst: 'Сначала вставьте черновик.',
      addDraft: 'Сначала добавьте черновик.',
      draftTooLong: `Черновик слишком длинный. Максимум ${MAX_DRAFT_CHARS} символов.`,
      nothingToCopy: 'Копировать нечего.',
      clipboardEmpty: 'Буфер обмена пуст.',
      copyFailed: 'Не удалось скопировать текст.',
      pasteFailed: 'Не удалось вставить текст.',
      dictationUnsupported: 'Голосовая запись недоступна в этом браузере.',
      dictationFailed: 'Не удалось распознать голос',
      voiceTooShort: 'Подержите кнопку чуть дольше, чтобы записать.',
      couldNotStart: 'Не удалось начать запись.',
    },
  },
  es: {
    workspace: { draft: "Tu mensaje", review: "Revisión del mensaje", reviewHint: "Tono, intención y posibles problemas" },
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Es seguro enviarlo?',
      subtitle: 'Tu segunda mirada antes de enviar.',
    },
    panel: {
      kicker: 'Borrador',
      title: 'Aqui vive el mensaje.',
      ready: 'Listo',
      resultsPlaceholder: 'Los resultados aparecen aqui despues de revisar o reescribir el mensaje.',
      likelyIntent: 'Intencion probable',
      reasons: 'Motivo',
      changes: 'Que cambio',
      history: 'Historial reciente',
      current: 'Actual',
    },
    fields: {
      interfaceLanguage: 'Idioma de la interfaz',
      workingText: 'Texto',
      audience: 'Destinatario',
      voice: 'Comandos de voz',
    },
    placeholders: {
      workingText: 'Pega, escribe o reescribe el mensaje aqui.',
      voice: 'hazlo mas corto y menos brusco',
    },
    buttons: {
      undo: 'Deshacer',
      redo: 'Rehacer',
      copy: 'Copiar',
      copied: 'Copiado',
      paste: 'Pegar',
      check: 'Revisar',
      checking: 'Revisando...',
      submit: 'Reescribir',
      submitting: 'Reescribiendo...',
      mic: 'Mantener para hablar',
      stopMic: 'Detener grabacion',
      dictateDraft: "Dictar",
      stopDraftDictation: "Detener",
      transcribingDraft: "Transcribiendo…",
      dictationHint: "Hasta 1 minuto · se añade al mensaje",
    },
    status: {
      idle: 'Listo',
      analyzing: 'Revisando',
      rewriting: 'Reescribiendo',
      listening: 'Escuchando',
      transcribing: 'Transcribiendo',
      draftChanged: 'El borrador cambio',
      startDraft: 'Pega, escribe o dicta un borrador.',
      beforeCheck: 'Antes de revisar',
      beforePaste: 'Antes de pegar',
      beforeRewrite: 'Antes de reescribir',
      clipboardPasted: 'Texto pegado',
      voiceCommandCaptured: 'Instruccion de voz capturada',
      draftDictationAdded: "Dictado añadido",
      draftCopied: 'Texto copiado',
      analysisUpdated: 'Analisis actualizado',
      requestFailed: 'La solicitud a la IA fallo.',
      analysisFailed: 'No se pudo revisar el texto.',
      rewriteFailed: 'No se pudo reescribir el texto.',
    },
    verdicts: {
      ok: 'Se puede enviar',
      risky: 'Conviene revisarlo',
      hold: 'Todavia no lo envies',
    },
    risks: {
      low: 'bajo',
      medium: 'medio',
      high: 'alto',
    },
    audiences: {
      boss: { label: 'Jefe', helper: 'Breve, claro, sin friccion' },
      client: { label: 'Cliente', helper: 'Pulido, cuidadoso, seguro' },
      colleague: { label: 'Colega', helper: 'Directo y colaborativo' },
      partner: { label: 'Pareja', helper: 'Calido y sin defensiva' },
      general: { label: 'General', helper: 'Neutral y adaptable' },
    },
    analysis: {
      likelyIntent: 'Intencion probable',
      tone: 'Tono recomendado',
      resultsPlaceholder: 'Los resultados aparecen aqui despues de revisar o reescribir el mensaje.',
      translationTitle: 'Traduccion para verificacion',
      translationNote: 'Usalo para confirmar el significado. El tono y el matiz se juzgan por la version en ingles.',
      analysisHighlights: 'Partes cuestionables',
      rewriteHighlights: 'Partes reescritas',
    },
    changes: {
      title: 'Que cambio',
      summary: 'Cambio',
      added: 'Agregado',
      removed: 'Eliminado',
      replaced: 'Reemplazado',
      from: 'Antes',
      to: 'Despues',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
      es: 'ES',
      de: 'DE',
      fr: 'FR',
    },
    errors: {
      pasteFirst: 'Primero pega un borrador.',
      addDraft: 'Primero agrega un borrador.',
      draftTooLong: `El borrador es demasiado largo. Maximo ${MAX_DRAFT_CHARS} caracteres.`,
      nothingToCopy: 'No hay nada para copiar.',
      clipboardEmpty: 'El portapapeles esta vacio.',
      copyFailed: 'No se pudo copiar el texto.',
      pasteFailed: 'No se pudo pegar el texto.',
      dictationUnsupported: 'La captura de voz no esta disponible en este navegador.',
      dictationFailed: 'La captura de voz fallo',
      voiceTooShort: 'Mantén pulsado un poco más para grabar.',
      couldNotStart: 'No se pudo iniciar la grabacion.',
    },
  },
  de: {
    workspace: { draft: "Deine Nachricht", review: "Nachrichtenanalyse", reviewHint: "Ton, Absicht und mögliche Missverständnisse" },
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Ist das sicher zu senden?',
      subtitle: 'Dein zweites Paar Augen vor dem Senden.',
    },
    panel: {
      kicker: 'Entwurf',
      title: 'Hier lebt die Nachricht.',
      ready: 'Bereit',
      resultsPlaceholder: 'Die Ergebnisse erscheinen hier nach der Pruefung oder Ueberarbeitung der Nachricht.',
      likelyIntent: 'Wahrscheinliche Absicht',
      reasons: 'Grund',
      changes: 'Was sich geaendert hat',
      history: 'Letzte Versionen',
      current: 'Aktuell',
    },
    fields: {
      interfaceLanguage: 'Sprache der Oberflaeche',
      workingText: 'Text',
      audience: 'Empfaenger',
      voice: 'Sprachbefehle',
    },
    placeholders: {
      workingText: 'Fuege die Nachricht hier ein, tippe sie ein oder ueberarbeite sie.',
      voice: 'mach es kuerzer und weniger schroff',
    },
    buttons: {
      undo: 'Rueckgaengig',
      redo: 'Wiederholen',
      copy: 'Kopieren',
      copied: 'Kopiert',
      paste: 'Einfuegen',
      check: 'Pruefen',
      checking: 'Wird geprueft...',
      submit: 'Ueberarbeiten',
      submitting: 'Wird ueberarbeitet...',
      mic: 'Gedrueckt halten',
      stopMic: 'Aufnahme stoppen',
      dictateDraft: "Diktieren",
      stopDraftDictation: "Stopp",
      transcribingDraft: "Transkribiere…",
      dictationHint: "Bis zu 1 Minute · wird zum Text hinzugefügt",
    },
    status: {
      idle: 'Bereit',
      analyzing: 'Prueft',
      rewriting: 'Ueberarbeitet',
      listening: 'Hoert zu',
      transcribing: 'Transkribiere',
      draftChanged: 'Entwurf geaendert',
      startDraft: 'Fuege einen Entwurf ein, schreibe oder diktiere ihn.',
      beforeCheck: 'Vor der Pruefung',
      beforePaste: 'Vor dem Einfuegen',
      beforeRewrite: 'Vor der Ueberarbeitung',
      clipboardPasted: 'Text eingefuegt',
      voiceCommandCaptured: 'Sprachanweisung erfasst',
      draftDictationAdded: "Diktat hinzugefügt",
      draftCopied: 'Text kopiert',
      analysisUpdated: 'Analyse aktualisiert',
      requestFailed: 'Die KI-Anfrage ist fehlgeschlagen.',
      analysisFailed: 'Der Text konnte nicht geprueft werden.',
      rewriteFailed: 'Der Text konnte nicht ueberarbeitet werden.',
    },
    verdicts: {
      ok: 'Kann gesendet werden',
      risky: 'Sollte ueberarbeitet werden',
      hold: 'Noch nicht senden',
    },
    risks: {
      low: 'niedrig',
      medium: 'mittel',
      high: 'hoch',
    },
    audiences: {
      boss: { label: 'Chef', helper: 'Kurz, klar, reibungsarm' },
      client: { label: 'Kunde', helper: 'Sauber, vorsichtig, selbstsicher' },
      colleague: { label: 'Kollege', helper: 'Direkt und kooperativ' },
      partner: { label: 'Partner', helper: 'Warm und nicht defensiv' },
      general: { label: 'Allgemein', helper: 'Neutral und anpassungsfaehig' },
    },
    analysis: {
      likelyIntent: 'Wahrscheinliche Absicht',
      tone: 'Empfohlener Ton',
      resultsPlaceholder: 'Die Ergebnisse erscheinen hier nach der Pruefung oder Ueberarbeitung der Nachricht.',
      translationTitle: 'Uebersetzung zur Pruefung',
      translationNote: 'Nutze dies, um die Bedeutung zu bestaetigen. Ton und Nuancen werden anhand der englischen Version beurteilt.',
      analysisHighlights: 'Fragliche Stellen',
      rewriteHighlights: 'Ueberarbeitete Stellen',
    },
    changes: {
      title: 'Was sich geaendert hat',
      summary: 'Aenderung',
      added: 'Hinzugefuegt',
      removed: 'Entfernt',
      replaced: 'Ersetzt',
      from: 'Vorher',
      to: 'Nachher',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
      es: 'ES',
      de: 'DE',
      fr: 'FR',
    },
    errors: {
      pasteFirst: 'Fuege zuerst einen Entwurf ein.',
      addDraft: 'Fuege zuerst einen Entwurf hinzu.',
      draftTooLong: `Der Entwurf ist zu lang. Maximal ${MAX_DRAFT_CHARS} Zeichen.`,
      nothingToCopy: 'Nichts zum Kopieren vorhanden.',
      clipboardEmpty: 'Die Zwischenablage ist leer.',
      copyFailed: 'Der Text konnte nicht kopiert werden.',
      pasteFailed: 'Der Text konnte nicht eingefuegt werden.',
      dictationUnsupported: 'Sprachaufnahme ist in diesem Browser nicht verfuegbar.',
      dictationFailed: 'Sprachaufnahme fehlgeschlagen',
      voiceTooShort: 'Zum Aufnehmen etwas laenger gedrueckt halten.',
      couldNotStart: 'Aufnahme konnte nicht gestartet werden.',
    },
  },
  fr: {
    workspace: { draft: "Votre message", review: "Analyse du message", reviewHint: "Ton, intention et risques de malentendu" },
    hero: {
      eyebrow: 'SafeToSend',
      title: 'Est-ce prudent de l envoyer ?',
      subtitle: 'Ton deuxieme regard avant lenvoi.',
    },
    panel: {
      kicker: 'Brouillon',
      title: 'Le message vit ici.',
      ready: 'Pret',
      resultsPlaceholder: 'Les resultats apparaissent ici apres la verification ou la reecriture du message.',
      likelyIntent: 'Intention probable',
      reasons: 'Raison',
      changes: 'Ce qui a change',
      history: 'Historique recent',
      current: 'Actuel',
    },
    fields: {
      interfaceLanguage: 'Langue de l interface',
      workingText: 'Texte',
      audience: 'Destinataire',
      voice: 'Commandes vocales',
    },
    placeholders: {
      workingText: 'Colle, saisis ou reecris le message ici.',
      voice: 'rends-le plus court et moins brusque',
    },
    buttons: {
      undo: 'Annuler',
      redo: 'Retablir',
      copy: 'Copier',
      copied: 'Copie',
      paste: 'Coller',
      check: 'Verifier',
      checking: 'Verification...',
      submit: 'Reecrire',
      submitting: 'Reecriture...',
      mic: 'Maintenir pour parler',
      stopMic: 'Arreter l enregistrement',
      dictateDraft: "Dicter",
      stopDraftDictation: "Arrêter",
      transcribingDraft: "Transcription…",
      dictationHint: "Jusqu’à 1 minute · ajouté au message",
    },
    status: {
      idle: 'Pret',
      analyzing: 'Verification',
      rewriting: 'Reecriture',
      listening: 'Ecoute',
      transcribing: 'Transcription',
      draftChanged: 'Brouillon modifie',
      startDraft: 'Colle, saisis ou dicte un brouillon.',
      beforeCheck: 'Avant verification',
      beforePaste: 'Avant collage',
      beforeRewrite: 'Avant reecriture',
      clipboardPasted: 'Texte colle',
      voiceCommandCaptured: 'Instruction vocale capturee',
      draftDictationAdded: "Dictée ajoutée",
      draftCopied: 'Texte copie',
      analysisUpdated: 'Analyse mise a jour',
      requestFailed: "La requete a l'IA a echoue.",
      analysisFailed: "Impossible de verifier le texte.",
      rewriteFailed: "Impossible de reecrire le texte.",
    },
    verdicts: {
      ok: 'Peut etre envoye',
      risky: 'A retravailler',
      hold: 'Ne lenvoie pas encore',
    },
    risks: {
      low: 'faible',
      medium: 'moyen',
      high: 'eleve',
    },
    audiences: {
      boss: { label: 'Manager', helper: 'Court, clair, sans friction' },
      client: { label: 'Client', helper: 'Soigne, prudent, confiant' },
      colleague: { label: 'Collegue', helper: 'Direct et collaboratif' },
      partner: { label: 'Partenaire', helper: 'Chaleureux et non defensif' },
      general: { label: 'Général', helper: 'Neutre et adaptable' },
    },
    analysis: {
      likelyIntent: 'Intention probable',
      tone: 'Tonalite recommandee',
      resultsPlaceholder: 'Les resultats apparaissent ici apres la verification ou la reecriture du message.',
      translationTitle: 'Traduction pour verification',
      translationNote: 'Utilisez ceci pour confirmer le sens. Le ton et les nuances sont evalues a partir de la version anglaise.',
      analysisHighlights: 'Passages delicats',
      rewriteHighlights: 'Passages reecrits',
    },
    changes: {
      title: 'Ce qui a change',
      summary: 'Modification',
      added: 'Ajoute',
      removed: 'Supprime',
      replaced: 'Remplace',
      from: 'Avant',
      to: 'Apres',
    },
    locales: {
      en: 'EN',
      ru: 'RU',
      es: 'ES',
      de: 'DE',
      fr: 'FR',
    },
    errors: {
      pasteFirst: 'Colle dabord un brouillon.',
      addDraft: 'Ajoute dabord un brouillon.',
      draftTooLong: `Le brouillon est trop long. Maximum ${MAX_DRAFT_CHARS} caracteres.`,
      nothingToCopy: 'Rien a copier.',
      clipboardEmpty: 'Le presse-papiers est vide.',
      copyFailed: 'Impossible de copier le texte.',
      pasteFailed: 'Impossible de coller le texte.',
      dictationUnsupported: "La capture vocale n'est pas disponible dans ce navigateur.",
      dictationFailed: 'La capture vocale a echoue',
      voiceTooShort: 'Maintiens un peu plus longtemps pour enregistrer.',
      couldNotStart: "Impossible de demarrer l enregistrement.",
    },
  },
} as const

type Copy = (typeof UI_COPY)[Locale]

type PersistedState = {
  workingText: string
  audience: string
  voiceCommand: string
  locale?: Locale
  analysisLocale?: Locale | null
  version?: number
  analysis: AnalysisResponse | null
  past: DraftSnapshot[]
  future: DraftSnapshot[]
  lastChangeNote: string
  lastChanges?: EditChange[]
  clientId: string
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function buildClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`
}

function verdictStyle(verdict: Verdict) {
  if (verdict === 'Safe to send') {
    return 'verdict-ok'
  }

  if (verdict === 'Risky - revise') {
    return 'verdict-warning'
  }

  return 'verdict-danger'
}

function getCopy(locale: Locale): Copy {
  return UI_COPY[locale]
}

function localizedVerdict(verdict: Verdict, copy: Copy) {
  if (verdict === 'Safe to send') {
    return copy.verdicts.ok
  }

  if (verdict === 'Risky - revise') {
    return copy.verdicts.risky
  }

  return copy.verdicts.hold
}

function buildAudienceOptions(copy: Copy): Array<{ value: Audience; label: string; helper: string }> {
  return [
    { value: 'boss', label: copy.audiences.boss.label, helper: copy.audiences.boss.helper },
    { value: 'client', label: copy.audiences.client.label, helper: copy.audiences.client.helper },
    { value: 'colleague', label: copy.audiences.colleague.label, helper: copy.audiences.colleague.helper },
    { value: 'partner', label: copy.audiences.partner.label, helper: copy.audiences.partner.helper },
    { value: 'general', label: copy.audiences.general.label, helper: copy.audiences.general.helper },
  ]
}

const AUDIENCE_VALUES = new Set<Audience>(['boss', 'client', 'colleague', 'partner', 'general'])

function normalizeAudience(value: string | null | undefined): Audience {
  return value && AUDIENCE_VALUES.has(value as Audience) ? (value as Audience) : 'general'
}

const DEFAULT_REWRITE_INSTRUCTION: Record<Locale, string> = {
  en: 'Rewrite this to be clearer, calmer, and ready to send while keeping the draft text in English.',
  ru: 'Перепиши текст яснее, спокойнее и так, чтобы его можно было отправить, не меняя язык черновика.',
  es: 'Reescribe el texto para que sea mas claro, mas calmado y listo para enviar, manteniendo el borrador en ingles.',
  de: 'Formuliere den Text klarer, ruhiger und versandbereit um und halte den Entwurf auf Englisch.',
  fr: 'Reecris le texte pour qu il soit plus clair, plus calme et pret a envoyer, en gardant le brouillon en anglais.',
}

function defaultRewriteInstruction(locale: Locale) {
  return DEFAULT_REWRITE_INSTRUCTION[locale]
}

const MAX_RECORDING_SECONDS = 60
const MIN_TRANSCRIPTION_BYTES = 1200

function mergeTranscribedText(existing: string, transcript: string) {
  const normalizedTranscript = transcript.trim()

  if (!normalizedTranscript) {
    return existing
  }

  if (!existing.trim()) {
    return normalizedTranscript
  }

  const separator = existing.endsWith('\n') ? '' : '\n'
  return `${existing}${separator}${normalizedTranscript}`
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  form.append('audio', new File([blob], `voice-input.${ext}`, { type: blob.type }))

  const endpoint = new URL('/api/transcribe', window.location.origin).toString()
  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
  })

  const data = (await response.json().catch(() => ({}))) as {
    text?: string
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error || `Transcription failed (HTTP ${response.status}).`)
  }

  const transcript = data.text?.trim() || ''
  if (!transcript) {
    throw new Error('No transcript returned.')
  }

  return transcript
}

type HighlightTone = 'yellow' | 'red' | 'green'

type HighlightSpan = {
  text: string
  tone: HighlightTone
  label: string
}

type EditorSelection = {
  start: number
  end: number
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function findHighlightIndex(text: string, needle: string, fromIndex: number) {
  const exactIndex = text.indexOf(needle, fromIndex)
  if (exactIndex >= 0) {
    return exactIndex
  }

  return text.toLowerCase().indexOf(needle.toLowerCase(), fromIndex)
}

function buildHighlightSegments(text: string, highlights: HighlightSpan[]) {
  const accepted: Array<{ start: number; end: number; highlight: HighlightSpan }> = []
  let searchFrom = 0

  for (const highlight of highlights) {
    const needle = highlight.text.trim()
    if (!needle) {
      continue
    }

    let start = findHighlightIndex(text, needle, searchFrom)
    if (start < 0) {
      start = findHighlightIndex(text, needle, 0)
    }
    if (start < 0) {
      continue
    }

    const end = start + needle.length
    const overlapsExisting = accepted.some((segment) => start < segment.end && end > segment.start)
    if (overlapsExisting) {
      continue
    }

    accepted.push({ start, end, highlight })
    searchFrom = end
  }

  accepted.sort((left, right) => left.start - right.start)

  const pieces: Array<
    | { kind: 'text'; value: string }
    | { kind: 'highlight'; value: string; tone: HighlightTone; label: string }
  > = []

  let lastIndex = 0
  for (const segment of accepted) {
    if (segment.start > lastIndex) {
      pieces.push({ kind: 'text', value: text.slice(lastIndex, segment.start) })
    }

    pieces.push({
      kind: 'highlight',
      value: text.slice(segment.start, segment.end),
      tone: segment.highlight.tone,
      label: segment.highlight.label,
    })
    lastIndex = segment.end
  }

  if (lastIndex < text.length) {
    pieces.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return pieces
}

function renderEditorHtml(text: string, highlights: HighlightSpan[], layer: 'analysis' | 'rewrite') {
  const segments = buildHighlightSegments(text, highlights)

  if (!segments.length) {
    return ''
  }

  return segments
    .map((segment) => {
      if (segment.kind === 'text') {
        return escapeHtml(segment.value)
      }

      return `<mark class="highlight-mark ${layer} ${segment.tone}" title="${escapeHtml(segment.label)}">${escapeHtml(segment.value)}</mark>`
    })
    .join('')
}

function normalizeEditorText(text: string) {
  return text.replace(/\r/g, '').replace(/\u00a0/g, ' ')
}

function RewriteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M7 7h9l-2.5-2.5L15 3l5 5-5 5-1.5-1.5L16 9H7a3 3 0 0 0 0 6h2v2H7a5 5 0 0 1 0-10Z"
        fill="currentColor"
      />
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M9 8V4L3 10l6 6v-4h4a4 4 0 1 1 0 8h-1v2h1a6 6 0 1 0 0-12H9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M15 8V4l6 6-6 6v-4h-4a4 4 0 1 0 0 8h1v2h-1a6 6 0 1 1 0-12h4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M9 3a2 2 0 0 0-2 2v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2h1a2 2 0 0 0 2-2V7l-4-4H9Zm8 4h-3V4.5L17 7ZM6 9h8v10H6V9Zm3-4h3v2H9V5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M9 2h6a2 2 0 0 1 2 2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2-2Zm6 4V4H9v2h6Zm4 2H5v12h14V8Zm-9 3h6v2h-6v-2Zm0 4h6v2h-6v-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="m9.2 16.2-3.4-3.4L4.4 14.2l4.8 4.8L20 8.2l-1.4-1.4-9.4 9.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm-5-3H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2a5 5 0 1 1-10 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function StopGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="icon-glyph">
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  )
}

function DraftEditor({
  value,
  analysisHighlights,
  rewriteHighlights,
  placeholder,
  selectionRef,
  onChange,
}: {
  value: string
  analysisHighlights: HighlightSpan[]
  rewriteHighlights: HighlightSpan[]
  placeholder: string
  selectionRef: { current: EditorSelection | null }
  onChange: (value: string) => void
}) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const analysisOverlayRef = useRef<HTMLDivElement | null>(null)
  const rewriteOverlayRef = useRef<HTMLDivElement | null>(null)
  const analysisHtml = useMemo(() => renderEditorHtml(value, analysisHighlights, 'analysis'), [analysisHighlights, value])
  const rewriteHtml = useMemo(() => renderEditorHtml(value, rewriteHighlights, 'rewrite'), [rewriteHighlights, value])

  useLayoutEffect(() => {
    const editor = editorRef.current
    const analysisOverlay = analysisOverlayRef.current
    const rewriteOverlay = rewriteOverlayRef.current
    if (!editor || !analysisOverlay || !rewriteOverlay) {
      return
    }

    analysisOverlay.scrollTop = editor.scrollTop
    rewriteOverlay.scrollTop = editor.scrollTop

    if (selectionRef.current) {
      const nextSelection = selectionRef.current
      try {
        editor.setSelectionRange(nextSelection.start, nextSelection.end)
      } catch {
        // ignore selection restore issues on mobile/browser edge cases
      }
      selectionRef.current = null
    }
  }, [analysisHtml, rewriteHtml, selectionRef, value])

  return (
    <div className="editor-layer">
      <div
        ref={analysisOverlayRef}
        className="editor-overlay analysis-layer"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: analysisHtml }}
      />
      <div
        ref={rewriteOverlayRef}
        className="editor-overlay rewrite-layer"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: rewriteHtml }}
      />
      <textarea
        ref={editorRef}
        id="main-draft"
        className="text-input draft-input editor-textarea"
        value={value}
        onChange={(event) => onChange(normalizeEditorText(event.currentTarget.value))}
        onScroll={(event) => {
          if (analysisOverlayRef.current) {
            analysisOverlayRef.current.scrollTop = event.currentTarget.scrollTop
          }
          if (rewriteOverlayRef.current) {
            rewriteOverlayRef.current.scrollTop = event.currentTarget.scrollTop
          }
        }}
        placeholder={placeholder}
        spellCheck
      />
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="icon-glyph">
      <path d="M5.5 7.5 10 12l4.5-4.5 1.4 1.4L10 14.8 4.1 8.9z" fill="currentColor" />
    </svg>
  )
}

function AudienceDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: Audience; label: string; helper: string }>
  value: Audience
  onChange: (value: Audience) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const current = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="audience-picker">
      <span>{label}</span>
      <button
        className="control audience-button"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="audience-button-copy">
          <span className="audience-button-label">{current.label}</span>
          <span className="audience-button-helper">{current.helper}</span>
        </span>
        <ChevronDownIcon />
      </button>

      {open ? (
        <div className="audience-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              className={`audience-option ${option.value === value ? 'selected' : ''}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              <span className="audience-option-label">{option.label}</span>
              <span className="audience-option-helper">{option.helper}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

async function postAssistant<T>(body: Record<string, unknown>, fallbackError: string) {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as T | { error?: string; detail?: string } | null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? payload.error
        : fallbackError
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload && payload.detail
        ? ` ${payload.detail}`
        : ''

      throw new Error(`${message}${detail}`)
  }

  return payload as T
}

export default function Page() {
  const [workingText, setWorkingText] = useState('')
  const [audience, setAudience] = useState<Audience>('general')
  const [voiceCommand, setVoiceCommand] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [analysisLocale, setAnalysisLocale] = useState<Locale | null>(null)
  const [version, setVersion] = useState(1)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [past, setPast] = useState<DraftSnapshot[]>([])
  const [future, setFuture] = useState<DraftSnapshot[]>([])
  const [lastChanges, setLastChanges] = useState<EditChange[]>([])
  const [lastChangeNote, setLastChangeNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'rewriting'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [clientId, setClientId] = useState('anonymous')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const voiceStopRequestedRef = useRef(false)
  const hydratedRef = useRef(false)
  const lastAnalyzedDraftRef = useRef('')
  const editorSelectionRef = useRef<EditorSelection | null>(null)
  const mobileReviewRef = useRef<HTMLElement | null>(null)
  const shouldRevealReviewRef = useRef(false)
  const recorder = useAudioRecorder()
  const {
    isSupported: voiceSupported,
    isRecording,
    isStarting,
    level,
    error: recorderError,
    start,
    stop,
    abort,
    clearError,
  } = recorder
  const copy = useMemo(() => getCopy(locale), [locale])
  const audienceOptions = useMemo(() => buildAudienceOptions(copy), [copy])
  const localeOptions = useMemo(
    () =>
      ([
        { value: 'en', label: copy.locales.en },
        { value: 'ru', label: copy.locales.ru },
        { value: 'es', label: copy.locales.es },
        { value: 'de', label: copy.locales.de },
        { value: 'fr', label: copy.locales.fr },
      ] as const),
    [copy],
  )

  useEffect(() => {
    const persisted = loadPersistedState()
    const nextLocale = persisted?.locale ?? 'en'
    const persistedVersion =
      persisted?.version ??
      Math.max(
        0,
        ...((persisted?.past ?? []).map((snapshot) => snapshot.version ?? 0) ?? []),
        ...((persisted?.future ?? []).map((snapshot) => snapshot.version ?? 0) ?? []),
      )

    if (persisted) {
      setWorkingText(persisted.workingText)
      setAudience(normalizeAudience(persisted.audience))
      setVoiceCommand(persisted.voiceCommand || '')
      setLocale(nextLocale)
      setAnalysisLocale(persisted.analysisLocale ?? null)
      setVersion(Math.max(1, persistedVersion || 0))
      setAnalysis(persisted.analysis)
      setPast(persisted.past)
      setFuture(persisted.future)
      setLastChanges(persisted.lastChanges ?? [])
      setLastChangeNote(persisted.lastChangeNote)
      setClientId(persisted.clientId || buildClientId())
      lastAnalyzedDraftRef.current = persisted.workingText
    } else {
      setClientId(buildClientId())
      setLocale(nextLocale)
      setAnalysisLocale(null)
      setVersion(1)
      setLastChangeNote(getCopy(nextLocale).status.startDraft)
    }
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = `${copy.hero.eyebrow} — ${copy.hero.title}`
  }, [copy.hero.eyebrow, copy.hero.title, locale])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }

    const state: PersistedState = {
      workingText,
      audience,
      voiceCommand,
      locale,
      analysisLocale,
      analysis,
      past,
      future,
      lastChangeNote,
      lastChanges,
      version,
      clientId,
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [
    analysis,
    audience,
    clientId,
    future,
    lastChangeNote,
    lastChanges,
    locale,
    past,
    version,
    voiceCommand,
    workingText,
    analysisLocale,
  ])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = window.setTimeout(() => setCopied(false), 1200)
    return () => window.clearTimeout(timer)
  }, [copied])

  const verdictTone = useMemo(() => {
    if (!analysis) {
      return 'neutral'
    }

    return verdictStyle(analysis.verdict)
  }, [analysis])
  const draftIsStale = Boolean(analysis) && workingText.trim() !== lastAnalyzedDraftRef.current.trim()
  const draftTooLong = workingText.trim().length > MAX_DRAFT_CHARS
  const analysisHighlights = useMemo<HighlightSpan[]>(() => {
    if (draftIsStale || !analysis?.highlights?.length) {
      return []
    }

    return analysis.highlights.map((highlight) => ({
      text: highlight.text,
      tone: highlight.severity,
      label: highlight.reason,
    }))
  }, [analysis, draftIsStale])
  const analysisHighlightReasons = useMemo(() => {
    if (draftIsStale || !analysis?.highlights?.length) {
      return []
    }

    return analysis.highlights.map((highlight) => ({
      tone: highlight.severity,
      reason: highlight.reason,
    }))
  }, [analysis, draftIsStale])
  const rewriteHighlights = useMemo<HighlightSpan[]>(() => {
    return lastChanges
      .filter((change) => change.after.trim())
      .map((change) => ({
        text: change.after,
        tone: 'green' as const,
        label: change.summary,
      }))
  }, [lastChanges])
  const localizedMeaning = useMemo(() => {
    return getLocalizedMeaning({ analysis, analysisLocale, draftIsStale, locale })
  }, [analysis, analysisLocale, draftIsStale, locale])
  const analysisContextPayload = useMemo(() => {
    if (!analysis || draftIsStale || analysisLocale !== locale) {
      return undefined
    }

    return buildAnalysisContextPayload(analysis)
  }, [analysis, analysisLocale, draftIsStale, locale])
  const statusText = isTranscribing
    ? copy.status.transcribing
    : isRecording || isStarting
      ? copy.status.listening
      : status === 'analyzing'
        ? copy.status.analyzing
        : status === 'rewriting'
          ? copy.status.rewriting
          : draftIsStale
            ? copy.status.draftChanged
            : lastChangeNote

  function currentSnapshot(note = lastChangeNote): DraftSnapshot {
    return {
      version,
      draft: workingText,
      analysis,
      analysisLocale,
      note,
      changes: lastChanges,
    }
  }

  function checkpoint(note: string) {
    setPast((existing) => [...existing, currentSnapshot(note)])
    setFuture([])
  }

  // Draft dictation appends a new paragraph; the original message is never replaced.
  function addDictationToDraft(transcript: string) {
    const nextText = mergeTranscribedText(workingText, transcript)
    if (nextText === workingText) return

    checkpoint(copy.status.draftDictationAdded)
    editorSelectionRef.current = { start: nextText.length, end: nextText.length }
    setWorkingText(nextText)
    setVersion((current) => current + 1)
    setLastChangeNote(copy.status.draftDictationAdded)
    setLastChanges([])
    setError(null)
  }

  const draftDictation = useTimedDictation({
    maxSeconds: MAX_RECORDING_SECONDS,
    transcribe: transcribeBlob,
    onTranscript: addDictationToDraft,
  })

  async function analyzeCurrentDraft(
    textToAnalyze: string,
    options?: { commitDraft?: boolean; preserveNote?: boolean },
  ) {
    const commitDraft = options?.commitDraft ?? false
    const preserveNote = options?.preserveNote ?? false
    setStatus('analyzing')
    setError(null)

    try {
      const result = await postAssistant<AnalysisResponse>({
        mode: 'analyze',
        text: textToAnalyze,
        audience,
        locale,
        clientId,
        analysisContext: analysisContextPayload,
      }, copy.status.requestFailed)

      setAnalysis(result)
      setAnalysisLocale(locale)

      if (commitDraft) {
        editorSelectionRef.current = {
          start: result.suggestedText.length,
          end: result.suggestedText.length,
        }
        setWorkingText(result.suggestedText)
        lastAnalyzedDraftRef.current = result.suggestedText
      } else {
        lastAnalyzedDraftRef.current = textToAnalyze
      }

      if (!preserveNote) {
        setLastChangeNote(copy.status.analysisUpdated)
      }
    } catch (err) {
      shouldRevealReviewRef.current = false
      setError(err instanceof Error ? err.message : copy.status.analysisFailed)
    } finally {
      setStatus('idle')
    }
  }

  async function runCheck() {
    const source = workingText.trim()

    if (source.length < 3) {
      setError(copy.errors.pasteFirst)
      return
    }
    if (source.length > MAX_DRAFT_CHARS) {
      return
    }

    checkpoint(copy.status.beforeCheck)
    shouldRevealReviewRef.current = true
    await analyzeCurrentDraft(source)
  }

  async function runRewrite(instructionOverride?: string) {
    const source = workingText.trim()
    const instruction = instructionOverride?.trim() || voiceCommand.trim() || defaultRewriteInstruction(locale)

    if (source.length < 3) {
      setError(copy.errors.addDraft)
      return
    }
    if (source.length > MAX_DRAFT_CHARS) {
      return
    }

    checkpoint(copy.status.beforeRewrite)
    shouldRevealReviewRef.current = true
    setStatus('rewriting')
    setError(null)

    try {
      const result = await postAssistant<EditResponse>({
        mode: 'edit',
        text: source,
        audience,
        locale,
        instruction,
        clientId,
        analysisContext: analysisContextPayload,
      }, copy.status.requestFailed)

      setVersion((current) => current + 1)
      editorSelectionRef.current = {
        start: result.updatedText.length,
        end: result.updatedText.length,
      }
      setWorkingText(result.updatedText)
      setVoiceCommand('')
      setLastChangeNote(result.changes.map((change) => change.summary).join(' · ') || copy.status.analysisUpdated)
      setLastChanges(result.changes)
      lastAnalyzedDraftRef.current = result.updatedText
      await analyzeCurrentDraft(result.updatedText, { preserveNote: true })
    } catch (err) {
      shouldRevealReviewRef.current = false
      setError(err instanceof Error ? err.message : copy.status.rewriteFailed)
      setStatus('idle')
    }
  }

  function undoLastChange() {
    const previous = past.at(-1)

    if (!previous) {
      return
    }

    setPast((existing) => existing.slice(0, -1))
    setFuture((existing) => [...existing, currentSnapshot()])
    editorSelectionRef.current = {
      start: previous.draft.length,
      end: previous.draft.length,
    }
    setWorkingText(previous.draft)
    setAnalysis(previous.analysis)
    setAnalysisLocale(previous.analysisLocale ?? null)
    setLastChangeNote(previous.note)
    setLastChanges(previous.changes ?? [])
    setVersion(previous.version)
    lastAnalyzedDraftRef.current = previous.draft
  }

  function redoLastChange() {
    const next = future.at(-1)

    if (!next) {
      return
    }

    setFuture((existing) => existing.slice(0, -1))
    setPast((existing) => [...existing, currentSnapshot()])
    editorSelectionRef.current = {
      start: next.draft.length,
      end: next.draft.length,
    }
    setWorkingText(next.draft)
    setAnalysis(next.analysis)
    setAnalysisLocale(next.analysisLocale ?? null)
    setLastChangeNote(next.note)
    setLastChanges(next.changes ?? [])
    setVersion(next.version)
    lastAnalyzedDraftRef.current = next.draft
  }

  async function copyWorkingText() {
    const text = workingText.trim()

    if (!text) {
      setError(copy.errors.nothingToCopy)
      return
    }

    try {
      await navigator.clipboard.writeText(workingText)
      setCopied(true)
      setLastChangeNote(copy.status.draftCopied)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.copyFailed)
    }
  }

  async function pasteIntoDraft() {
    if (status !== 'idle') {
      return
    }

    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        setError(copy.errors.clipboardEmpty)
        return
      }

      checkpoint(copy.status.beforePaste)
      editorSelectionRef.current = {
        start: text.length,
        end: text.length,
      }
      setWorkingText(text)
      setLastChangeNote(copy.status.clipboardPasted)
      setLastChanges([])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.pasteFailed)
    }
  }

  const stopAndTranscribe = useCallback(async () => {
    voiceStopRequestedRef.current = false

    const blob = await stop()
    if (!blob) {
      setError(copy.errors.couldNotStart)
      return
    }

    if (blob.size < MIN_TRANSCRIPTION_BYTES) {
      setError(copy.errors.voiceTooShort)
      return
    }

    setIsTranscribing(true)
    try {
      const transcript = await transcribeBlob(blob)
      setVoiceCommand(transcript)
      setLastChangeNote(copy.status.voiceCommandCaptured)
      setError(null)
      setIsTranscribing(false)
      await runRewrite(transcript)
    } catch (err) {
      setIsTranscribing(false)
      setError(err instanceof Error ? err.message : copy.errors.dictationFailed)
    }
  }, [
    copy.errors.couldNotStart,
    copy.errors.dictationFailed,
    copy.errors.voiceTooShort,
    copy.status.voiceCommandCaptured,
    runRewrite,
    stop,
  ])

  const startVoiceCapture = useCallback(
    async (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (status !== 'idle' || isRecording || isStarting || isTranscribing ||
        draftDictation.isRecording || draftDictation.isStarting || draftDictation.isTranscribing || !voiceSupported) {
        return
      }

      voiceStopRequestedRef.current = false
      setError(null)
      clearError()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // ignore
      }

      await start()
    },
    [clearError, draftDictation.isRecording, draftDictation.isStarting, draftDictation.isTranscribing, isRecording, isStarting, isTranscribing, start, status, voiceSupported],
  )

  const requestVoiceStop = useCallback(() => {
    voiceStopRequestedRef.current = true
    if (isRecording) {
      void stopAndTranscribe()
    }
  }, [isRecording, stopAndTranscribe])

  const cancelVoiceCapture = useCallback(() => {
    voiceStopRequestedRef.current = false
    if (isRecording || isStarting) {
      abort()
    }
  }, [abort, isRecording, isStarting])

  useEffect(() => {
    if (isRecording && voiceStopRequestedRef.current && !isTranscribing) {
      void stopAndTranscribe()
    }
  }, [isRecording, isTranscribing, stopAndTranscribe])

  const verdictLabel = analysis ? localizedVerdict(analysis.verdict, copy) : copy.panel.ready
  const interactionBusy = status !== 'idle' || isRecording || isStarting || isTranscribing || draftDictation.isRecording || draftDictation.isStarting || draftDictation.isTranscribing

  // Reveal fresh results only after a requested analysis, not when restoring a saved draft.
  useEffect(() => {
    if (status !== 'idle' || !analysis || !shouldRevealReviewRef.current) return
    shouldRevealReviewRef.current = false
    if (!window.matchMedia('(max-width: 760px)').matches) return

    const panel = mobileReviewRef.current
    if (!panel) return
    const bounds = panel.getBoundingClientRect()
    // Keep the user's scroll position when the result is already in view.
    if (bounds.top >= 0 && bounds.top < window.innerHeight - 140) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }, [analysis, status])

  const renderReviewPanel = (placement: 'mobile' | 'desktop') => (
    <aside className={`insight-column ${placement}-review`} ref={placement === 'mobile' ? mobileReviewRef : undefined}>
          <section className="panel insights-panel">
            <div className="section-head">
              <span className="step-number">02</span>
              <div className="section-heading"><span className="section-title">{copy.workspace.review}</span><span className="section-subtitle">{copy.workspace.reviewHint}</span></div>
            </div>
        <section className="analysis-card" aria-live="polite">
          <div className="analysis-topline">
            <span className={`verdict-pill ${verdictTone}`}>{verdictLabel}</span>
          </div>
          <p className="analysis-meta">
            {analysis
            ? `${copy.analysis.likelyIntent}: ${analysis.inferredGoal} · ${copy.analysis.tone}: ${analysis.recommendedTone}`
            : copy.analysis.resultsPlaceholder}
          </p>
          {analysis ? (
            <div className="analysis-reasons">
              <p className="analysis-reasons-label">{copy.panel.reasons}</p>
              <p className="reason-text">{analysis.reason}</p>
              {analysisHighlightReasons.length ? (
                <ul className="reason-notes">
                  {analysisHighlightReasons.map((item, index) => (
                    <li key={`${item.tone}-${item.reason}-${index}`} className={`reason-note ${item.tone}`}>
                      {item.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
        {localizedMeaning ? (
          <section className="verification-card" aria-labelledby={`verification-meaning-title-${placement}`}>
            <div className="verification-card-head">
              <p className="verification-card-title" id={`verification-meaning-title-${placement}`}>
                {copy.analysis.translationTitle}
              </p>
              <p className="verification-card-note">{copy.analysis.translationNote}</p>
            </div>
            <p className="verification-meaning" lang={locale}>
              {localizedMeaning}
            </p>
          </section>
        ) : null}

          </section>
        </aside>
  )

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none">
              <path d="M8 19.5 15.2 26 28 10" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="brand-name">{copy.hero.eyebrow}</span>
        </div>
        <div className="hero-actions">
          <label className="header-language" htmlFor="ui-language">
            <span className="sr-only">{copy.fields.interfaceLanguage}</span>
            <select
              id="ui-language"
              className="control header-select"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="hero-bar">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-indicator" aria-hidden="true" /> {copy.hero.subtitle}</p>
          <h1>{copy.hero.title}</h1>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="art-line art-line-one" />
          <span className="art-line art-line-two" />
          <span className="art-line art-line-three" />
          <span className="art-spark">✳</span>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel composer-card">
          <div className="section-head">
            <span className="step-number">01</span>
            <div className="section-heading"><span className="section-title">{copy.workspace.draft}</span><span className="section-subtitle">{copy.panel.kicker}</span></div>
          </div>
        <div className="editor-shell">
          <div className="field editor-field">
            <div className="draft-field-heading">
              <label htmlFor="main-draft">{copy.fields.workingText}</label>
              <button
                type="button"
                className={`draft-dictation-button ${draftDictation.isRecording ? 'is-recording' : ''}`}
                onClick={() => void (draftDictation.isRecording ? draftDictation.stop() : draftDictation.start())}
                disabled={
                  draftDictation.isTranscribing ||
                  draftDictation.isStarting ||
                  (!draftDictation.isRecording && (status !== 'idle' || isRecording || isStarting || isTranscribing || !draftDictation.isSupported))
                }
                aria-pressed={draftDictation.isRecording}
                title={draftDictation.isSupported ? copy.buttons.dictationHint : copy.errors.dictationUnsupported}
              >
                {draftDictation.isTranscribing ? <span className="voice-spinner" aria-hidden="true" /> : draftDictation.isRecording ? <StopGlyph /> : <MicIcon />}
                <span>
                  {draftDictation.isTranscribing
                    ? copy.buttons.transcribingDraft
                    : draftDictation.isRecording
                      ? `${copy.buttons.stopDraftDictation} · ${Math.floor(draftDictation.remainingSeconds / 60)}:${String(draftDictation.remainingSeconds % 60).padStart(2, '0')}`
                      : draftDictation.isStarting
                        ? copy.status.listening
                        : copy.buttons.dictateDraft}
                </span>
              </button>
            </div>
            <div className="editor-surface">
              <DraftEditor
                value={workingText}
                analysisHighlights={analysisHighlights}
                rewriteHighlights={rewriteHighlights}
                placeholder={copy.placeholders.workingText}
                selectionRef={editorSelectionRef}
                onChange={(nextValue) => {
                  setWorkingText(nextValue)
                  setError(null)
                  setLastChanges([])
                }}
              />
            </div>
            {draftTooLong ? <p className="field-warning">{copy.errors.draftTooLong}</p> : null}
            <p className="draft-dictation-hint">{copy.buttons.dictationHint}</p>
          </div>

          <div className="history-rail" aria-label={copy.panel.changes}>
            <button
              className="ghost-button rail-button"
              onClick={undoLastChange}
              disabled={!past.length || interactionBusy}
              type="button"
              title={copy.buttons.undo}
              aria-label={copy.buttons.undo}
            >
              <UndoIcon />
            </button>
            <button
              className="ghost-button rail-button"
              onClick={redoLastChange}
              disabled={!future.length || interactionBusy}
              type="button"
              title={copy.buttons.redo}
              aria-label={copy.buttons.redo}
            >
              <RedoIcon />
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void copyWorkingText()}
              disabled={interactionBusy || !workingText.trim()}
              type="button"
              title={copied ? copy.buttons.copied : copy.buttons.copy}
              aria-label={copied ? copy.buttons.copied : copy.buttons.copy}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void pasteIntoDraft()}
              disabled={interactionBusy}
              type="button"
              title={copy.buttons.paste}
              aria-label={copy.buttons.paste}
            >
              <PasteIcon />
            </button>
          </div>
        </div>

          <div className="composer-actions">
        <div className="audience-row">
          <AudienceDropdown
            label={copy.fields.audience}
            options={audienceOptions}
            value={audience}
            onChange={setAudience}
          />
        </div>
        <div className="button-grid">
          <button
            className="primary-button"
            onClick={() => void runCheck()}
            disabled={interactionBusy || workingText.trim().length < 3 || draftTooLong}
            type="button"
          >
            {status === 'analyzing' ? copy.buttons.checking : copy.buttons.check}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runRewrite()}
            disabled={interactionBusy || !workingText.trim() || draftTooLong}
            type="button"
          >
            {status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
          </button>
        </div>

          </div>
          {analysis ? renderReviewPanel('mobile') : null}
          <div className="refine-panel">
        <div className="voice-row">
          <label className="field grow">
            <span>{copy.fields.voice}</span>
            <textarea
              className="control compact-textarea"
              value={voiceCommand}
              onChange={(event) => setVoiceCommand(event.target.value)}
              placeholder={copy.placeholders.voice}
              rows={2}
            />
          </label>

          <div className="voice-actions">
            <button
              className="secondary-button icon-button edit-button"
              onClick={() => void runRewrite()}
              disabled={interactionBusy || !workingText.trim() || draftTooLong}
              type="button"
              title={status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
              aria-label={status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
            >
              <RewriteIcon />
            </button>

            <button
              className="ghost-button icon-button mic-button"
              onPointerDown={(event) => {
                void startVoiceCapture(event)
              }}
              onPointerUp={() => {
                requestVoiceStop()
              }}
              onPointerCancel={cancelVoiceCapture}
              onContextMenu={(event) => {
                event.preventDefault()
              }}
              disabled={!voiceSupported || (status !== 'idle' && !isRecording) || isStarting || isTranscribing || draftDictation.isRecording || draftDictation.isStarting || draftDictation.isTranscribing}
              type="button"
              title={isRecording || isTranscribing ? copy.buttons.stopMic : copy.buttons.mic}
              aria-label={isRecording || isTranscribing ? copy.buttons.stopMic : copy.buttons.mic}
              aria-pressed={isRecording}
            >
              {isTranscribing ? <span className="voice-spinner" aria-hidden="true" /> : isRecording ? <StopGlyph /> : <MicIcon />}
            </button>
          </div>
        </div>
        {isRecording || isStarting || isTranscribing ? (
          <div className="voice-status" aria-live="polite">
            <span className="voice-status-label">
              {isTranscribing ? copy.status.transcribing : copy.status.listening}
            </span>
            {isRecording ? (
              <div className="voice-level-wrap" aria-hidden="true">
                <div className="voice-level-bar" style={{ width: `${Math.max(6, Math.min(100, Math.round(level * 100)))}%` }} />
              </div>
            ) : null}
          </div>
        ) : null}

          </div>
          {error || recorderError || draftDictation.error ? <div className="error-banner" role="alert">{error || recorderError || draftDictation.error}</div> : null}
        </section>

        {renderReviewPanel('desktop')}
      </div>

      <footer className="site-footer"><span>{copy.hero.eyebrow}</span><span>{copy.hero.subtitle}</span></footer>
    </main>
  )
}
