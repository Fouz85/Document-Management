import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { DepartmentNode, UnitNode } from '../../core/models';

interface UserForm {
  id?: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: UserForm = { fullName: '', email: '', department: '', role: 'User', password: '', confirmPassword: '' };
/** Schools is its own top-level department with no fixed unit list — typed freely as the school's name. */
const SCHOOL_DEPT_NAME = 'المدارس';

@Component({
  selector: 'app-user-form',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/admin/users" class="btn-back mb-3"><i class="bi bi-arrow-right"></i>{{ i18n.t('common.back') }}</a>

    <div class="card mb-3" style="max-width:600px;margin:auto;">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0">
          <i class="bi bi-person-plus me-2" style="color:var(--maroon);"></i>
          {{ f().id ? i18n.t('common.edit') : i18n.t('admin.addNewUser') }}
        </h5>
      </div>
      <div class="card-body p-4">
        @if (message()) { <div class="alert alert-danger small">{{ i18n.t(message()!) }}</div> }
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label">{{ i18n.t('admin.fullName') }} *</label>
            <input class="form-control" name="fullName" [ngModel]="f().fullName" (ngModelChange)="patch({ fullName: $event })"
                   [placeholder]="i18n.t('admin.namePlaceholder')">
          </div>

          <div class="col-12">
            <label class="form-label">{{ i18n.t('admin.deptSection') }} *</label>
            <select class="form-select mb-2" [value]="selectedDeptId()" (change)="pickDept($event)">
              <option value="">-- {{ i18n.t('admin.selectMainDept') }} --</option>
              @for (d of departments(); track d.id) { <option [value]="d.id">{{ d.name }}</option> }
            </select>
            @if (isSchoolDept()) {
              <input class="form-control mb-2" [value]="schoolName()" (input)="pickSchoolName($event)"
                     [placeholder]="i18n.t('request.schoolNamePlaceholder')">
            } @else {
              <select class="form-select mb-2" [value]="selectedUnitId()" (change)="pickUnit($event)"
                      [disabled]="!selectedDeptId()">
                <option value="">-- {{ i18n.t('admin.selectUnit') }} --</option>
                @for (u of units(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
              </select>
              <select class="form-select mb-2" [value]="selectedSectionId()" (change)="pickSection($event)"
                      [disabled]="sections().length === 0">
                <option value="">-- {{ i18n.t('request.selectSection') }} --</option>
                @for (s of sections(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
              </select>
            }
            @if (f().department) {
              <div class="text-muted small mt-1">✓ {{ f().department }}</div>
            }
          </div>

          <div class="col-12">
            <label class="form-label">{{ i18n.t('auth.email') }} *</label>
            <input type="email" class="form-control" name="email" [ngModel]="f().email" (ngModelChange)="patch({ email: $event })"
                   placeholder="name@example.com" dir="ltr">
          </div>

          <div class="col-12">
            <label class="form-label">{{ i18n.t('admin.role') }} *</label>
            <select class="form-select" name="role" [ngModel]="f().role" (ngModelChange)="patch({ role: $event })">
              <option value="User">{{ i18n.t('admin.roleUser') }}</option>
              <option value="Admin">{{ i18n.t('admin.roleAdmin') }}</option>
            </select>
          </div>

          @if (!f().id) {
            <div class="col-12">
              <label class="form-label">{{ i18n.t('auth.password') }} *</label>
              <input type="password" class="form-control" name="password" [ngModel]="f().password" (ngModelChange)="patch({ password: $event })"
                     [placeholder]="i18n.t('admin.passwordPlaceholder')" autocomplete="new-password">
              <div class="form-text text-muted" style="font-size:0.75rem;">{{ i18n.t('admin.passwordHint') }}</div>
              @if (f().password) {
                <div class="mt-2" style="font-size:0.78rem;">
                  <div [class]="f().password.length >= 10 ? 'text-success' : 'text-danger'">
                    <i class="bi" [class.bi-check-circle]="f().password.length >= 10" [class.bi-x-circle]="f().password.length < 10"></i>
                    {{ i18n.t('admin.chkLen') }}
                  </div>
                  <div [class]="hasUpper(f().password) ? 'text-success' : 'text-danger'">
                    <i class="bi" [class.bi-check-circle]="hasUpper(f().password)" [class.bi-x-circle]="!hasUpper(f().password)"></i>
                    {{ i18n.t('admin.chkUpper') }}
                  </div>
                  <div [class]="hasNumber(f().password) ? 'text-success' : 'text-danger'">
                    <i class="bi" [class.bi-check-circle]="hasNumber(f().password)" [class.bi-x-circle]="!hasNumber(f().password)"></i>
                    {{ i18n.t('admin.chkNum') }}
                  </div>
                  <div [class]="hasSymbol(f().password) ? 'text-success' : 'text-danger'">
                    <i class="bi" [class.bi-check-circle]="hasSymbol(f().password)" [class.bi-x-circle]="!hasSymbol(f().password)"></i>
                    {{ i18n.t('auth.chkSymbol') }}
                  </div>
                </div>
              }
            </div>

            <div class="col-12">
              <label class="form-label">{{ i18n.t('auth.confirmPassword') }} *</label>
              <input type="password" class="form-control" name="confirmPassword" [ngModel]="f().confirmPassword" (ngModelChange)="patch({ confirmPassword: $event })" autocomplete="new-password">
            </div>
          }
        </div>

        <div class="mt-4 d-flex gap-2">
          <button class="btn btn-primary" (click)="save()">
            <i class="bi bi-check-lg me-1"></i>{{ f().id ? i18n.t('common.save') : i18n.t('admin.createUser') }}
          </button>
          <a routerLink="/admin/users" class="btn btn-outline-secondary">{{ i18n.t('common.cancel') }}</a>
        </div>
      </div>
    </div>
  `
})
export class UserFormComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly message = signal<string | null>(null);
  readonly departments = signal<DepartmentNode[]>([]);
  readonly selectedDeptId = signal<number | ''>('');
  readonly selectedUnitId = signal<number | ''>('');
  readonly selectedSectionId = signal<number | ''>('');
  readonly schoolName = signal('');

  readonly f = signal<UserForm>(EMPTY_FORM);

  constructor() { this.load(); }

  patch(partial: Partial<UserForm>): void {
    this.f.update(v => ({ ...v, ...partial }));
  }

  async load(): Promise<void> {
    this.departments.set(await firstValueFrom(this.api.departmentsTree()));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const user = (await firstValueFrom(this.api.users())).find(u => u.id === id);
      if (user) {
        this.f.set({
          id: user.id, fullName: user.fullName, email: user.email, department: user.department,
          role: user.roles.includes('Admin') ? 'Admin' : 'User', password: '', confirmPassword: ''
        });
      }
    }
  }

  units(): UnitNode[] {
    const id = this.selectedDeptId();
    if (!id) return [];
    const dept = this.departments().find(d => d.id === id);
    return dept?.units ?? [];
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
      this.patch({ department: [dept?.name, this.schoolName()].filter(Boolean).join(' - ') });
      return;
    }
    const unit = this.units().find(u => u.id === this.selectedUnitId());
    const section = this.sections().find(s => s.id === this.selectedSectionId())?.name;
    this.patch({ department: [dept?.name, unit?.name, section].filter(Boolean).join(' - ') });
  }

  async save(): Promise<void> {
    this.message.set(null);
    const f = this.f();
    if (!f.id && f.password !== f.confirmPassword) {
      this.message.set('auth.passwordMismatch');
      return;
    }
    try {
      if (f.id) {
        await firstValueFrom(this.api.updateUser(f.id, {
          fullName: f.fullName, email: f.email, department: f.department,
          role: f.role, newPassword: f.password || undefined
        }));
      } else {
        await firstValueFrom(this.api.createUser({
          fullName: f.fullName, email: f.email, department: f.department,
          role: f.role, password: f.password
        }));
      }
      this.router.navigate(['/admin/users']);
    } catch {
      this.message.set('common.error');
    }
  }

  hasUpper(s: string): boolean { return /[A-Z]/.test(s); }
  hasNumber(s: string): boolean { return /[0-9]/.test(s); }
  hasSymbol(s: string): boolean { return /[^A-Za-z0-9]/.test(s); }
}
