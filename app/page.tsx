'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
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
import { useAudioRecorder } from '@/hooks/use-audio-recorder'

const STORAGE_KEY = 'safetosend.app.state.v4'

const UI_COPY = {
  en: {
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
      nothingToCopy: 'Nothing to copy.',
      clipboardEmpty: 'Clipboard is empty.',
      copyFailed: 'Copy failed.',
      pasteFailed: 'Paste failed.',
      dictationUnsupported: 'Voice capture is not available in this browser.',
      dictationFailed: 'Voice capture failed',
      couldNotStart: 'Could not start recording.',
    },
  },
  ru: {
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
      nothingToCopy: 'Копировать нечего.',
      clipboardEmpty: 'Буфер обмена пуст.',
      copyFailed: 'Не удалось скопировать текст.',
      pasteFailed: 'Не удалось вставить текст.',
      dictationUnsupported: 'Голосовая запись недоступна в этом браузере.',
      dictationFailed: 'Не удалось распознать голос',
      couldNotStart: 'Не удалось начать запись.',
    },
  },
  es: {
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
      nothingToCopy: 'No hay nada para copiar.',
      clipboardEmpty: 'El portapapeles esta vacio.',
      copyFailed: 'No se pudo copiar el texto.',
      pasteFailed: 'No se pudo pegar el texto.',
      dictationUnsupported: 'La captura de voz no esta disponible en este navegador.',
      dictationFailed: 'La captura de voz fallo',
      couldNotStart: 'No se pudo iniciar la grabacion.',
    },
  },
  de: {
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
      nothingToCopy: 'Nichts zum Kopieren vorhanden.',
      clipboardEmpty: 'Die Zwischenablage ist leer.',
      copyFailed: 'Der Text konnte nicht kopiert werden.',
      pasteFailed: 'Der Text konnte nicht eingefuegt werden.',
      dictationUnsupported: 'Sprachaufnahme ist in diesem Browser nicht verfuegbar.',
      dictationFailed: 'Sprachaufnahme fehlgeschlagen',
      couldNotStart: 'Aufnahme konnte nicht gestartet werden.',
    },
  },
  fr: {
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
      nothingToCopy: 'Rien a copier.',
      clipboardEmpty: 'Le presse-papiers est vide.',
      copyFailed: 'Impossible de copier le texte.',
      pasteFailed: 'Impossible de coller le texte.',
      dictationUnsupported: "La capture vocale n'est pas disponible dans ce navigateur.",
      dictationFailed: 'La capture vocale a echoue',
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

function buildAnalysisContextPayload(analysis: AnalysisResponse | null) {
  if (!analysis) {
    return undefined
  }

  const verdict = analysis.verdict
  const verdictIsCurrent =
    verdict === 'Safe to send' || verdict === 'Risky - revise' || verdict === 'Do not send yet'

  return {
    verdict: verdictIsCurrent ? verdict : undefined,
    reason: analysis.reason,
    inferredGoal: analysis.inferredGoal,
    recommendedTone: analysis.recommendedTone,
  }
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
  const ext = blob.type.includes('ogg') ? 'ogg' : 'webm'
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

function renderEditorHtml(text: string, highlights: HighlightSpan[]) {
  const segments = buildHighlightSegments(text, highlights)

  if (!segments.length) {
    return ''
  }

  return segments
    .map((segment) => {
      if (segment.kind === 'text') {
        return escapeHtml(segment.value)
      }

      return `<mark class="highlight-mark ${segment.tone}" title="${escapeHtml(segment.label)}">${escapeHtml(segment.value)}</mark>`
    })
    .join('')
}

function normalizeEditorText(text: string) {
  const normalized = text.replace(/\r/g, '').replace(/\u00a0/g, ' ')
  return normalized.trim() ? normalized : ''
}

function getSelectionOffset(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange()
  range.selectNodeContents(root)
  range.setEnd(node, offset)
  return range.toString().length
}

function captureEditorSelection(root: HTMLElement): EditorSelection | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return null
  }

  const anchorNode = selection.anchorNode
  const focusNode = selection.focusNode
  if (!anchorNode || !focusNode || !root.contains(anchorNode) || !root.contains(focusNode)) {
    return null
  }

  const anchor = getSelectionOffset(root, anchorNode, selection.anchorOffset)
  const focus = getSelectionOffset(root, focusNode, selection.focusOffset)

  return anchor <= focus ? { start: anchor, end: focus } : { start: focus, end: anchor }
}

function locateTextPosition(root: HTMLElement, targetOffset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let currentOffset = 0
  let node = walker.nextNode() as Text | null
  let lastTextNode: Text | null = null

  while (node) {
    const nextOffset = currentOffset + node.data.length
    lastTextNode = node

    if (targetOffset <= nextOffset) {
      return {
        node,
        offset: Math.max(0, targetOffset - currentOffset),
      }
    }

    currentOffset = nextOffset
    node = walker.nextNode() as Text | null
  }

  if (lastTextNode) {
    return {
      node: lastTextNode,
      offset: lastTextNode.data.length,
    }
  }

  return {
    node: root,
    offset: 0,
  }
}

function restoreEditorSelection(root: HTMLElement, selection: EditorSelection) {
  const browserSelection = window.getSelection()
  if (!browserSelection) {
    return
  }

  const range = document.createRange()
  const start = locateTextPosition(root, selection.start)
  const end = locateTextPosition(root, selection.end)

  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)

  browserSelection.removeAllRanges()
  browserSelection.addRange(range)
}

function insertPlainTextIntoEditor(root: HTMLElement, text: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return false
  }

  const range = selection.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  root.focus()
  return true
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
  highlights,
  placeholder,
  selectionRef,
  onChange,
  onScroll,
}: {
  value: string
  highlights: HighlightSpan[]
  placeholder: string
  selectionRef: { current: EditorSelection | null }
  onChange: (value: string) => void
  onScroll?: (scrollTop: number) => void
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const editorHtml = useMemo(() => renderEditorHtml(value, highlights), [highlights, value])

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const nextSelection = selectionRef.current ?? { start: value.length, end: value.length }

    if (editor.innerHTML !== editorHtml) {
      editor.innerHTML = editorHtml
    }

    if (document.activeElement === editor) {
      restoreEditorSelection(editor, nextSelection)
    }
  }, [editorHtml, selectionRef, value.length])

  function saveSelection() {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    const selection = captureEditorSelection(editor)
    if (selection) {
      selectionRef.current = selection
    }
  }

  function handleInput(event: FormEvent<HTMLDivElement>) {
    const editor = event.currentTarget
    selectionRef.current = captureEditorSelection(editor)
    onChange(normalizeEditorText(editor.innerText))
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')

    if (!text) {
      return
    }

    const editor = event.currentTarget
    if (!insertPlainTextIntoEditor(editor, text)) {
      return
    }

    selectionRef.current = captureEditorSelection(editor)
    onChange(normalizeEditorText(editor.innerText))
  }

  return (
    <div
      ref={editorRef}
      className="text-input draft-input editor-textarea"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyUp={saveSelection}
      onMouseUp={saveSelection}
      onFocus={saveSelection}
      onScroll={(event) => {
        onScroll?.(event.currentTarget.scrollTop)
      }}
      spellCheck
      dangerouslySetInnerHTML={{ __html: editorHtml }}
    />
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
  const editorHighlights = useMemo<HighlightSpan[]>(() => {
    if (lastChanges.length) {
      return lastChanges
        .filter((change) => change.after.trim())
        .map((change) => ({
          text: change.after,
          tone: 'green' as const,
          label: change.summary,
        }))
    }

    if (!draftIsStale && analysis?.highlights?.length) {
      return analysis.highlights.map((highlight) => ({
        text: highlight.text,
        tone: highlight.severity,
        label: highlight.reason,
      }))
    }

    return []
  }, [analysis, draftIsStale, lastChanges])
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
      note,
      changes: lastChanges,
    }
  }

  function checkpoint(note: string) {
    setPast((existing) => [...existing, currentSnapshot(note)])
    setFuture([])
  }

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
        analysisContext: buildAnalysisContextPayload(analysis),
      }, copy.status.requestFailed)

      setAnalysis(result)

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

    checkpoint(copy.status.beforeCheck)
    await analyzeCurrentDraft(source)
  }

  async function runRewrite(instructionOverride?: string) {
    const source = workingText.trim()
    const instruction = instructionOverride?.trim() || voiceCommand.trim() || defaultRewriteInstruction(locale)

    if (source.length < 3) {
      setError(copy.errors.addDraft)
      return
    }

    checkpoint(copy.status.beforeRewrite)
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
        analysisContext: buildAnalysisContextPayload(analysis),
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
      lastAnalyzedDraftRef.current = text
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
  }, [copy.errors.couldNotStart, copy.errors.dictationFailed, copy.status.voiceCommandCaptured, runRewrite, stop])

  const startVoiceCapture = useCallback(
    async (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (status !== 'idle' || isRecording || isStarting || isTranscribing || !voiceSupported) {
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
    [clearError, isRecording, isStarting, isTranscribing, start, status, voiceSupported],
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
  const interactionBusy = status !== 'idle' || isRecording || isStarting || isTranscribing

  return (
    <main className="page-shell">
      <header className="hero-bar">
        <div className="hero-copy">
          <p className="eyebrow">{copy.hero.eyebrow}</p>
          <h1>{copy.hero.title}</h1>
          <p className="subtle">{copy.hero.subtitle}</p>
        </div>
        <div className="hero-actions">
          <label className="header-language" htmlFor="ui-language">
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

      <section className="panel composer-card">
        <div className="editor-shell">
          <label className="field editor-field">
            <span>{copy.fields.workingText}</span>
            <div className="editor-surface">
              <DraftEditor
                value={workingText}
                highlights={editorHighlights}
                placeholder={copy.placeholders.workingText}
                selectionRef={editorSelectionRef}
                onChange={(nextValue) => {
                  setWorkingText(nextValue)
                  setError(null)
                  setLastChanges([])
                }}
              />
            </div>
          </label>

          <div className="history-rail" aria-label={copy.panel.changes}>
            <button
              className="ghost-button rail-button"
              onClick={undoLastChange}
              disabled={!past.length || interactionBusy}
              type="button"
            >
              {copy.buttons.undo}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={redoLastChange}
              disabled={!future.length || interactionBusy}
              type="button"
            >
              {copy.buttons.redo}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void copyWorkingText()}
              disabled={interactionBusy || !workingText.trim()}
              type="button"
            >
              {copied ? copy.buttons.copied : copy.buttons.copy}
            </button>
            <button
              className="ghost-button rail-button"
              onClick={() => void pasteIntoDraft()}
              disabled={interactionBusy}
              type="button"
            >
              {copy.buttons.paste}
            </button>
          </div>
        </div>

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
            disabled={interactionBusy || workingText.trim().length < 3}
            type="button"
          >
            {status === 'analyzing' ? copy.buttons.checking : copy.buttons.check}
          </button>
          <button
            className="secondary-button"
            onClick={() => void runRewrite()}
            disabled={interactionBusy || !workingText.trim()}
            type="button"
          >
            {status === 'rewriting' ? copy.buttons.submitting : copy.buttons.submit}
          </button>
        </div>

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
              disabled={interactionBusy || !workingText.trim()}
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
              disabled={!voiceSupported || (status !== 'idle' && !isRecording) || isStarting || isTranscribing}
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

        {error || recorderError ? <div className="error-banner">{error || recorderError}</div> : null}

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
            </div>
          ) : null}
        </section>

      </section>
    </main>
  )
}
