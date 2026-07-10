import { Injectable, signal, computed } from '@angular/core';

export type Lang = 'ar' | 'en';

/**
 * Lightweight runtime i18n with RTL/LTR switching.
 * All UI strings live in /public/i18n/*.json — never hardcoded in components.
 * Mirrors the original layout behavior: html[lang/dir] + body.lang-ar/.lang-en.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>((localStorage.getItem('lang') as Lang) || 'ar');
  private readonly dict = signal<Record<string, unknown>>({});
  readonly dir = computed(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly isEn = computed(() => this.lang() === 'en');

  async init(): Promise<void> {
    await this.load(this.lang());
  }

  async setLang(lang: Lang): Promise<void> {
    localStorage.setItem('lang', lang);
    this.lang.set(lang);
    await this.load(lang);
  }

  /** Resolve a dotted key, e.g. t('request.title'). Falls back to the key itself. */
  t(key: string): string {
    let node: unknown = this.dict();
    for (const part of key.split('.')) {
      if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof node === 'string' ? node : key;
  }

  private async load(lang: Lang): Promise<void> {
    const res = await fetch(`i18n/${lang}.json`);
    this.dict.set(await res.json());

    document.documentElement.lang = lang;
    document.documentElement.dir = this.dir();
    document.body.classList.toggle('lang-en', lang === 'en');
    document.body.classList.toggle('lang-ar', lang !== 'en');
    const link = document.getElementById('bootstrap-css') as HTMLLinkElement | null;
    if (link) {
      link.href = lang === 'ar'
        ? 'vendor/bootstrap/bootstrap.rtl.min.css'
        : 'vendor/bootstrap/bootstrap.min.css';
    }
  }
}
