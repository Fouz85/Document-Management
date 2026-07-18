import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="gov-header-row">
      @if (!i18n.isEn()) { <div class="gov-logo-area">
        <img src="images/ar.png" [alt]="i18n.t('app.ministry')" />
      </div> }

      <nav class="gov-navbar">
        <div class="gov-navbar-icons">
          <button type="button" class="gov-icon-btn" [title]="i18n.t('nav.notifications')" (click)="goBell()">
            <i class="bi bi-bell"></i>
            @if (auth.isAdmin() && pendingResets() > 0) {
              <span class="gov-icon-badge">{{ pendingResets() }}</span>
            }
          </button>
          <button type="button" class="gov-icon-btn gov-icon-btn-text"
                  (click)="i18n.setLang(i18n.isEn() ? 'ar' : 'en')">
            {{ i18n.isEn() ? 'عربي' : 'En' }}
          </button>
          <a class="gov-icon-btn" routerLink="/change-password" [title]="i18n.t('nav.changePassword')">
            <i class="bi bi-gear"></i>
          </a>
          <button type="button" class="gov-icon-btn" [title]="i18n.t('nav.logout')" (click)="auth.logout()">
            <i class="bi bi-box-arrow-right"></i>
          </button>
          <button type="button" class="gov-navbar-toggle" (click)="mobileOpen.set(!mobileOpen())">
            <i class="bi bi-list"></i>
          </button>
        </div>

        <div class="gov-navbar-links" [class.open]="mobileOpen()">
          @if (auth.isAdmin()) {
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              <i class="bi bi-house-door"></i>{{ i18n.t('nav.dashboard') }}
            </a>
            <a routerLink="/admin/submissions" routerLinkActive="active" class="gov-navbar-link" (click)="closeMobile()">
              {{ i18n.t('nav.allSubmissions') }}
            </a>
            <div class="gov-navbar-dropdown" [class.open]="openMenu() === 'mgmt'">
              <button type="button" class="gov-navbar-link" (click)="toggleMenu('mgmt')">
                {{ i18n.t('nav.management') }} <i class="bi bi-chevron-down"></i>
              </button>
              <div class="gov-navbar-dropdown-menu">
                <a routerLink="/admin/users" (click)="closeMenu(); closeMobile()">{{ i18n.t('nav.users') }}</a>
                <a routerLink="/admin/password-reset-requests" (click)="closeMenu(); closeMobile()">
                  {{ i18n.t('admin.passwordResetRequests') }}
                  @if (pendingResets() > 0) {
                    <span class="badge rounded-pill bg-warning text-dark ms-1">{{ pendingResets() }}</span>
                  }
                </a>
              </div>
            </div>
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
      </nav>

      @if (i18n.isEn()) { <div class="gov-logo-area">
        <img src="images/en.png" [alt]="i18n.t('app.ministry')" />
      </div> }
    </div>

    <div class="page-content"><router-outlet /></div>
  `
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly mobileOpen = signal(false);
  readonly openMenu = signal<string | null>(null);
  readonly pendingResets = signal(0);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.openMenu() && !(event.target as HTMLElement).closest('.gov-navbar-dropdown')) {
      this.openMenu.set(null);
    }
  }

  constructor() {
    if (this.auth.isAdmin()) {
      firstValueFrom(this.api.passwordResetRequests())
        .then(list => this.pendingResets.set(list.filter(r => !r.isResolved).length))
        .catch(() => {});
    }
  }

  closeMobile(): void { this.mobileOpen.set(false); }

  toggleMenu(name: string): void {
    this.openMenu.set(this.openMenu() === name ? null : name);
  }
  closeMenu(): void { this.openMenu.set(null); }

  goBell(): void {
    this.router.navigate([this.auth.isAdmin() ? '/admin/password-reset-requests' : '/requests']);
  }
}
