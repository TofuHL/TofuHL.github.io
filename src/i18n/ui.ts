import en from './locales/en.json';
import sv from './locales/sv.json';
import uk from './locales/uk.json';

export const locales = ['en', 'sv', 'uk'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  sv: 'Svenska',
  uk: 'Українська',
};

export const localeBcp47: Record<Locale, string> = {
  en: 'en-US',
  sv: 'sv-SE',
  uk: 'uk-UA',
};

const dictionaries = { en, sv, uk } as const;

// Structural type shared by every locale file (validated equal at build time in scripts/check-i18n.mjs)
export type Dict = typeof en;

export function getDict(locale: string): Dict {
  return (dictionaries as Record<string, Dict>)[locale] ?? dictionaries[defaultLocale];
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/');
  if ((locales as readonly string[]).includes(maybeLocale)) {
    return maybeLocale as Locale;
  }
  return defaultLocale;
}

export function localizedPath(locale: Locale, path: string): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}

/** Resolve a dotted key path, e.g. t(dict, 'pages.contact.title') */
export function pick(dict: Dict, keyPath: string): unknown {
  return keyPath.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

/** Simple {placeholder} interpolation for strings like pages.stories.byline */
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}
