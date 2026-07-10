import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- ══ Sidebar ══ -->
    <div class="sidebar" [class.open]="mobileOpen()" id="sidebar"
         [style.transform]="desktopClosed() ? (i18n.isEn() ? 'translateX(-110%)' : 'translateX(110%)') : ''">
      <div class="sidebar-brand" [style.justify-content]="i18n.isEn() ? 'flex-start' : 'flex-end'">
        <img src="images/PrimaryLogo.png" [alt]="i18n.t('app.ministry')"
             style="width:100%; height:100%; max-height:120px; object-fit:contain; filter:brightness(0) invert(1); display:block;"
             [style.object-position]="(i18n.isEn() ? 'left' : 'right') + ' center'" />
      </div>
      <div class="flex-grow-1 overflow-auto py-2">
        <div class="sidebar-section-title">{{ i18n.t('nav.navigation') }}</div>
        @if (auth.isAdmin()) {
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-grid-1x2"></i>{{ i18n.t('nav.dashboard') }}
          </a>
          <a routerLink="/admin/submissions" routerLinkActive="active" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-list-ul"></i>{{ i18n.t('nav.allSubmissions') }}
          </a>
          <div class="sidebar-section-title">{{ i18n.t('nav.management') }}</div>
          <a routerLink="/admin/users" routerLinkActive="active" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-people"></i>{{ i18n.t('nav.users') }}
          </a>
          <a routerLink="/change-password" routerLinkActive="active" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-key"></i>{{ i18n.t('nav.changePassword') }}
          </a>
        } @else {
          <a routerLink="/requests/new" routerLinkActive="active" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-file-earmark-plus"></i>{{ i18n.t('nav.newRequest') }}
          </a>
          <a routerLink="/requests" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-clock-history"></i>{{ i18n.t('nav.myRequests') }}
          </a>
          <div class="sidebar-section-title">{{ i18n.t('nav.importantLinks') }}</div>
          <a href="https://canva.link/ubx966f45d69z7j" target="_blank" class="nav-link">
            <i class="bi bi-play-circle"></i>{{ i18n.t('nav.formGuide') }}
          </a>
          <div class="sidebar-section-title">{{ i18n.t('nav.account') }}</div>
          <a routerLink="/change-password" routerLinkActive="active" class="nav-link" (click)="closeMobile()">
            <i class="bi bi-key"></i>{{ i18n.t('nav.changePassword') }}
          </a>
        }
      </div>
      <div class="sidebar-user">
        <div class="sidebar-user-name">
          <i class="bi bi-person-circle"></i>
          {{ auth.session()?.email }}
        </div>
        <button type="button" class="btn btn-outline-light btn-sm w-100"
                style="border-radius:8px;font-size:0.85rem;" (click)="auth.logout()">
          <i class="bi bi-box-arrow-right me-1"></i>{{ i18n.t('nav.logout') }}
        </button>
      </div>
    </div>

    <div class="sidebar-overlay" [class.show]="mobileOpen()" (click)="closeMobile()"></div>
    <button class="sidebar-collapse-btn" (click)="toggleDesktop()"
            [style.right]="!i18n.isEn() ? (desktopClosed() ? '0' : 'var(--sidebar-w)') : 'auto'"
            [style.left]="i18n.isEn() ? (desktopClosed() ? '0' : 'var(--sidebar-w)') : 'auto'"
            [title]="i18n.t('nav.toggleSidebar')">
      <i class="bi" [class.bi-chevron-right]="!desktopClosed() !== i18n.isEn()" [class.bi-chevron-left]="!desktopClosed() === i18n.isEn()"></i>
    </button>

    <!-- ══ Main ══ -->
    <div class="main-content"
         [style.margin-right]="!i18n.isEn() ? (desktopClosed() ? '0' : 'var(--sidebar-w)') : '0'"
         [style.margin-left]="i18n.isEn() ? (desktopClosed() ? '0' : 'var(--sidebar-w)') : '0'">
      <div class="topbar">
        <div class="d-flex align-items-center gap-3">
          <button class="sidebar-toggle" (click)="mobileOpen.set(!mobileOpen())">
            <i class="bi bi-list"></i>
          </button>
          <div>
            <div class="topbar-title">{{ i18n.t('app.ministry') }}</div>
            <div class="topbar-subtitle">وزارة التربية والتعليم والتعليم العالي • Ministry of Education and Higher Education</div>
          </div>
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="lang-switcher">
            <button class="lang-btn" [class.active]="!i18n.isEn()" (click)="i18n.setLang('ar')">العربية</button>
            <button class="lang-btn" [class.active]="i18n.isEn()" (click)="i18n.setLang('en')">English</button>
          </div>
          <span class="badge" style="background:var(--maroon);font-size:0.72rem;padding:0.35rem 0.75rem;">
            <i class="bi bi-person me-1"></i>
            {{ auth.isAdmin() ? i18n.t('nav.roleAdmin') : i18n.t('nav.roleUser') }}
          </span>
        </div>
      </div>
      <div class="qatar-line"></div>
      <div class="page-content"><router-outlet /></div>
    </div>
  `
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly mobileOpen = signal(false);
  readonly desktopClosed = signal(localStorage.getItem('sidebarClosed') === '1');

  closeMobile(): void { this.mobileOpen.set(false); }

  toggleDesktop(): void {
    const closed = !this.desktopClosed();
    this.desktopClosed.set(closed);
    localStorage.setItem('sidebarClosed', closed ? '1' : '0');
  }
}
