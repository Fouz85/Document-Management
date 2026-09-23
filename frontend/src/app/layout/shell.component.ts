import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="gov-header-row">
      <div class="gov-logo-area">
        <img [src]="i18n.isEn() ? 'images/en.png' : 'images/ar.png'" [alt]="i18n.t('app.ministry')" />
      </div>

      <nav class="gov-navbar">
        <div class="gov-navbar-links" [class.open]="mobileOpen()">
          @if (auth.isAdmin()) {
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              <i class="bi bi-house-door"></i>{{ i18n.t('nav.dashboard') }}
            </a>
            <a routerLink="/admin/submissions" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              {{ i18n.t('nav.allSubmissions') }}
            </a>
            <a routerLink="/admin/users" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              {{ i18n.t('nav.users') }}
            </a>
          } @else if (auth.isCounterSigner()) {
            <a routerLink="/requests/pending-signature" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              <i class="bi bi-house-door"></i>{{ i18n.t('nav.pendingSignature') }}
            </a>
          } @else {
            <a routerLink="/requests/new" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              <i class="bi bi-house-door"></i>{{ i18n.t('nav.newRequest') }}
            </a>
            <a routerLink="/requests" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
               class="gov-navbar-link" (click)="closeMobile()">
              {{ i18n.t('nav.myRequests') }}
            </a>
            <a href="https://canva.link/ubx966f45d69z7j" target="_blank" class="gov-navbar-link">
              {{ i18n.t('nav.formGuide') }}
            </a>
          }
        </div>

        <div class="gov-navbar-icons">
          <button type="button" class="gov-icon-btn gov-icon-btn-text"
                  (click)="i18n.setLang(i18n.isEn() ? 'ar' : 'en')">
            {{ i18n.isEn() ? 'عربي' : 'En' }}
          </button>
          <button type="button" class="gov-icon-btn" [title]="i18n.t('nav.logout')" (click)="auth.logout()">
            <i class="bi bi-box-arrow-right"></i>
          </button>
          <button type="button" class="gov-navbar-toggle" (click)="mobileOpen.set(!mobileOpen())">
            <i class="bi bi-list"></i>
          </button>
        </div>
      </nav>
    </div>

    <div class="page-content"><router-outlet /></div>
  `
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly mobileOpen = signal(false);
  readonly openMenu = signal<string | null>(null);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.openMenu() && !(event.target as HTMLElement).closest('.gov-navbar-dropdown')) {
      this.openMenu.set(null);
    }
  }

  closeMobile(): void { this.mobileOpen.set(false); }

  toggleMenu(name: string): void {
    this.openMenu.set(this.openMenu() === name ? null : name);
  }
  closeMenu(): void { this.openMenu.set(null); }
}
