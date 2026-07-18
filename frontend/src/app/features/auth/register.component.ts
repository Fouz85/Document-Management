import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { DepartmentNode, UnitNode } from '../../core/models';

const SCHOOL_DEPT_NAME = 'المدارس';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-wrapper" style="max-width:560px;">
        <div class="lang-switcher">
          <button class="lang-btn" [class.active]="!i18n.isEn()" (click)="i18n.setLang('ar')">العربية</button>
          <button class="lang-btn" [class.active]="i18n.isEn()" (click)="i18n.setLang('en')">English</button>
        </div>

        <div class="login-card card">
          <div class="login-header">
            <img [src]="i18n.isEn() ? 'images/en.png' : 'images/ar.png'" [alt]="i18n.t('app.ministry')"
                 style="max-width:380px; height:auto; margin-bottom:0.5rem;" />
          </div>

          <div class="login-body">
            @if (success()) {
              <div class="alert alert-success mb-3 py-2 small" style="border-radius:10px;">
                {{ i18n.t('auth.registerSuccess') }}
              </div>
              <a routerLink="/login" class="btn btn-login w-100 text-white">{{ i18n.t('auth.backToLogin') }}</a>
            } @else {
              <h5 class="mb-3 text-center" style="color:var(--maroon);">{{ i18n.t('auth.registerTitle') }}</h5>

              @if (error()) {
                <div class="alert alert-danger mb-3 py-2 small" style="border-radius:10px;">{{ i18n.t(error()!) }}</div>
              }

              <div class="mb-3">
                <label class="form-label">{{ i18n.t('admin.fullName') }}</label>
                <input class="form-control" [(ngModel)]="fullName" name="fullName">
              </div>

              <div class="mb-3">
                <label class="form-label">{{ i18n.t('admin.deptSection') }}</label>
                <select class="form-select mb-2" [value]="selectedDeptId()" (change)="pickDept($event)">
                  <option value="">-- {{ i18n.t('admin.selectMainDept') }} --</option>
                  @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
                </select>
                @if (isSchoolDept()) {
                  <input class="form-control" [value]="schoolName()" (input)="pickSchoolName($event)"
                         [placeholder]="i18n.t('request.schoolNamePlaceholder')">
                } @else {
                  <select class="form-select mb-2" [value]="selectedUnitId()" (change)="pickUnit($event)"
                          [disabled]="!selectedDeptId()">
                    <option value="">-- {{ i18n.t('admin.selectUnit') }} --</option>
                    @for (u of units(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                  </select>
                  <select class="form-select" [value]="selectedSectionId()" (change)="pickSection($event)"
                          [disabled]="sections().length === 0">
                    <option value="">-- {{ i18n.t('request.selectSection') }} --</option>
                    @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
                  </select>
                }
                @if (department()) {
                  <div class="text-muted small mt-1">✓ {{ department() }}</div>
                }
              </div>

              <div class="mb-3">
                <label class="form-label">{{ i18n.t('auth.email') }}</label>
                <div class="input-icon">
                  <i class="bi bi-envelope"></i>
                  <input type="email" class="form-control" [(ngModel)]="email" name="email" dir="ltr">
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">{{ i18n.t('auth.password') }}</label>
                <div class="input-icon">
                  <i class="bi bi-lock"></i>
                  <input type="password" class="form-control" [(ngModel)]="password" name="password" autocomplete="new-password">
                </div>
                @if (password) {
                  <div class="mt-2" style="font-size:0.78rem;">
                    <div [class]="password.length >= 10 ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="password.length >= 10" [class.bi-x-circle]="password.length < 10"></i>
                      {{ i18n.t('admin.chkLen') }}
                    </div>
                    <div [class]="hasUpper(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasUpper(password)" [class.bi-x-circle]="!hasUpper(password)"></i>
                      {{ i18n.t('admin.chkUpper') }}
                    </div>
                    <div [class]="hasNumber(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasNumber(password)" [class.bi-x-circle]="!hasNumber(password)"></i>
                      {{ i18n.t('admin.chkNum') }}
                    </div>
                    <div [class]="hasSymbol(password) ? 'text-success' : 'text-danger'">
                      <i class="bi" [class.bi-check-circle]="hasSymbol(password)" [class.bi-x-circle]="!hasSymbol(password)"></i>
                      {{ i18n.t('auth.chkSymbol') }}
                    </div>
                  </div>
                }
              </div>

              <div class="mb-4">
                <label class="form-label">{{ i18n.t('auth.confirmPassword') }}</label>
                <div class="input-icon">
                  <i class="bi bi-lock"></i>
                  <input type="password" class="form-control" [(ngModel)]="confirmPassword" name="confirmPassword" autocomplete="new-password">
                </div>
              </div>

              <button type="button" class="btn btn-login w-100 text-white mb-2" [disabled]="busy()" (click)="submit()">
                <i class="bi bi-person-plus me-2"></i>{{ i18n.t('auth.registerTitle') }}
              </button>
              <a routerLink="/login" class="btn btn-outline-secondary w-100">{{ i18n.t('auth.backToLogin') }}</a>
            }
          </div>
        </div>

        <div class="login-footer">
          وزارة التربية والتعليم والتعليم العالي &bull; State of Qatar &bull; دولة قطر
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly departments = signal<DepartmentNode[]>([]);
  readonly selectedDeptId = signal<number | ''>('');
  readonly selectedUnitId = signal<number | ''>('');
  readonly selectedSectionId = signal<number | ''>('');
  readonly schoolName = signal('');
  readonly department = signal('');

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  constructor() {
    this.api.departmentsTree().subscribe(tree => this.departments.set(tree));
  }

  units(): UnitNode[] {
    const id = this.selectedDeptId();
    if (!id) return [];
    return this.departments().find(d => d.id === id)?.units ?? [];
  }
  sections(): UnitNode[] {
    const id = this.selectedUnitId();
    if (!id) return [];
    return this.units().find(u => u.id === id)?.children ?? [];
  }
  isSchoolDept(): boolean {
    return this.departments().find(d => d.id === this.selectedDeptId())?.name === SCHOOL_DEPT_NAME;
  }

  pickDept(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedDeptId.set(v ? +v : '');
    this.selectedUnitId.set('');
    this.selectedSectionId.set('');
    this.schoolName.set('');
    this.syncDept();
  }
  pickUnit(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedUnitId.set(v ? +v : '');
    this.selectedSectionId.set('');
    this.schoolName.set('');
    this.syncDept();
  }
  pickSection(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.selectedSectionId.set(v ? +v : '');
    this.syncDept();
  }
  pickSchoolName(e: Event): void {
    this.schoolName.set((e.target as HTMLInputElement).value);
    this.syncDept();
  }
  private syncDept(): void {
    const dept = this.departments().find(d => d.id === this.selectedDeptId());
    if (this.isSchoolDept()) {
      this.department.set([dept?.name, this.schoolName()].filter(Boolean).join(' - '));
      return;
    }
    const unit = this.units().find(u => u.id === this.selectedUnitId());
    const section = this.sections().find(s => s.id === this.selectedSectionId())?.name;
    this.department.set([dept?.name, unit?.name, section].filter(Boolean).join(' - '));
  }

  hasUpper(s: string): boolean { return /[A-Z]/.test(s); }
  hasNumber(s: string): boolean { return /[0-9]/.test(s); }
  hasSymbol(s: string): boolean { return /[^A-Za-z0-9]/.test(s); }

  async submit(): Promise<void> {
    this.error.set(null);
    if (!this.fullName.trim() || !this.department() || !this.email.trim() || !this.password) {
      this.error.set('common.fillRequired');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('auth.passwordMismatch');
      return;
    }
    if (this.password.length < 10 || !this.hasUpper(this.password) || !this.hasNumber(this.password) || !this.hasSymbol(this.password)) {
      this.error.set('auth.weakPassword');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.register({
        fullName: this.fullName, email: this.email, department: this.department(), password: this.password
      }));
      this.success.set(true);
    } catch (err: unknown) {
      const httpErr = err as { error?: { error?: string; errors?: string[] } };
      this.error.set(httpErr?.error?.error ?? (httpErr?.error?.errors ? 'auth.weakPassword' : 'common.error'));
    } finally {
      this.busy.set(false);
    }
  }
}
