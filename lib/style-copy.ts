import type { Locale } from './assistant-contracts'

const copy = {
  en: {
    formality: 'Formality', as_written: 'As written', casual: 'Casual',
    professional_conversational: 'Professional, conversational', formal: 'Formal',
    keepTone: 'Keep my tone', toneHint: 'Preserve your warmth, directness, and personality.',
    context: 'Context (optional)', contextPlaceholder: 'Recruiter I know; friendly exchange.',
    more: 'More context', variant: 'English usage', auto: 'As written', american: 'American', british: 'British',
    clear: 'Clear', beforeClear: 'Before clearing', cleared: 'Message cleared. Undo to restore.',
    noChanges: 'No changes needed.', language: 'Language corrections', stale: 'Review out of date',
    recheck: 'Your message or settings changed. Check again for an updated review.',
  },
  ru: {
    formality: 'Формальность', as_written: 'Как в тексте', casual: 'Неформально',
    professional_conversational: 'По-деловому, без официоза', formal: 'Официально',
    keepTone: 'Сохранить мой тон', toneHint: 'Сохранить теплоту, прямоту и индивидуальность.',
    context: 'Контекст (необязательно)', contextPlaceholder: 'Знакомый рекрутер; дружеская переписка.',
    more: 'Дополнительный контекст', variant: 'Вариант английского', auto: 'Как в тексте', american: 'Американский', british: 'Британский',
    clear: 'Очистить', beforeClear: 'До очистки', cleared: 'Текст очищен. Можно отменить.',
    noChanges: 'Правки не нужны.', language: 'Языковые исправления', stale: 'Анализ устарел',
    recheck: 'Текст или настройки изменились. Запустите проверку снова.',
  },
  es: {
    formality: 'Formalidad', as_written: 'Como está escrito', casual: 'Informal',
    professional_conversational: 'Profesional y conversacional', formal: 'Formal',
    keepTone: 'Mantener mi tono', toneHint: 'Conserva tu calidez, franqueza y personalidad.',
    context: 'Contexto (opcional)', contextPlaceholder: 'Un reclutador que conozco; conversación amistosa.',
    more: 'Más contexto', variant: 'Variante de inglés', auto: 'Como está escrito', american: 'Estadounidense', british: 'Británico',
    clear: 'Borrar', beforeClear: 'Antes de borrar', cleared: 'Mensaje borrado. Puedes deshacerlo.',
    noChanges: 'No hacen falta cambios.', language: 'Correcciones de idioma', stale: 'Revisión desactualizada',
    recheck: 'El mensaje o los ajustes cambiaron. Vuelve a comprobarlo.',
  },
  de: {
    formality: 'Formalität', as_written: 'Wie geschrieben', casual: 'Locker',
    professional_conversational: 'Professionell und natürlich', formal: 'Formell',
    keepTone: 'Meinen Ton beibehalten', toneHint: 'Wärme, Direktheit und Persönlichkeit bewahren.',
    context: 'Kontext (optional)', contextPlaceholder: 'Bekannter Recruiter; freundlicher Austausch.',
    more: 'Mehr Kontext', variant: 'Englischvariante', auto: 'Wie geschrieben', american: 'Amerikanisch', british: 'Britisch',
    clear: 'Leeren', beforeClear: 'Vor dem Leeren', cleared: 'Nachricht geleert. Rückgängig möglich.',
    noChanges: 'Keine Änderungen nötig.', language: 'Sprachkorrekturen', stale: 'Prüfung veraltet',
    recheck: 'Nachricht oder Einstellungen geändert. Bitte erneut prüfen.',
  },
  fr: {
    formality: 'Formalité', as_written: 'Comme écrit', casual: 'Décontracté',
    professional_conversational: 'Professionnel et naturel', formal: 'Formel',
    keepTone: 'Garder mon ton', toneHint: 'Préserver votre chaleur, franchise et personnalité.',
    context: 'Contexte (facultatif)', contextPlaceholder: 'Un recruteur que je connais ; échange amical.',
    more: 'Plus de contexte', variant: "Variante d’anglais", auto: 'Comme écrit', american: 'Américain', british: 'Britannique',
    clear: 'Effacer', beforeClear: 'Avant effacement', cleared: 'Message effacé. Annulation possible.',
    noChanges: 'Aucune modification nécessaire.', language: 'Corrections linguistiques', stale: 'Analyse périmée',
    recheck: 'Le message ou les réglages ont changé. Relancez la vérification.',
  },
} as const

export function getStyleCopy(locale: Locale) { return copy[locale] }
