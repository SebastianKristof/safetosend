import type { Locale } from './assistant-contracts'
import en from './copy/en'
import ru from './copy/ru'
import es from './copy/es'
import de from './copy/de'
import fr from './copy/fr'
const UI_COPY = { en, ru, es, de, fr }
export type Copy = (typeof UI_COPY)[Locale]
export function getCopy(locale: Locale): Copy { return UI_COPY[locale] }
