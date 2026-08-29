import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { DepartmentPickerComponent } from '../../shared/department-picker.component';

interface UserForm {
  id: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
}

const EMPTY_FORM: UserForm = { id: '', fullName: '', email: '', department: '', role: 'User' };

/** Admin management of an existing account — accounts are created by self-registration
 * (see auth/register.component.ts), not by an admin, so this is edit-only. */
@Component({
  selector: 'app-user-form',
  imports: [FormsModule, RouterLink, DepartmentPickerComponent],
  template: `
    <a routerLink="/admin/users" class="btn-back mb-3"><i class="bi bi-arrow-right"></i>{{ i18n.t('common.back') }}</a>

    <div class="card mb-3" style="max-width:600px;margin:auto;">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0">
          <i class="bi bi-person-gear me-2" style="color:var(--maroon);"></i>
          {{ i18n.t('common.edit') }}
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
            <app-department-picker [value]="f().department" (valueChange)="patch({ department: $event })" />
          </div>

          <div class="col-12">
            <label class="form-label">{{ i18n.t('auth.email') }} *</label>
            <input type="email" class="form-control" [class.is-invalid]="emailInvalid()" name="email"
                   [ngModel]="f().email" (ngModelChange)="patch({ email: $event })"
                   placeholder="name@education.qa" dir="ltr">
            <div class="form-text" [class.text-muted]="!emailInvalid()" [class.text-danger]="emailInvalid()" style="font-size:0.75rem;">
              {{ i18n.t('auth.emailDomainNotAllowed') }}
            </div>
          </div>

          <div class="col-12">
            <label class="form-label">{{ i18n.t('admin.role') }} *</label>
            <select class="form-select" name="role" [ngModel]="f().role" (ngModelChange)="patch({ role: $event })">
              <option value="User">{{ i18n.t('admin.roleUser') }}</option>
              <option value="Admin">{{ i18n.t('admin.roleAdmin') }}</option>
            </select>
          </div>
        </div>

        <div class="mt-4 d-flex gap-2">
          <button class="btn btn-primary" (click)="save()">
            <i class="bi bi-check-lg me-1"></i>{{ i18n.t('common.save') }}
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
  readonly f = signal<UserForm>(EMPTY_FORM);

  constructor() { this.load(); }

  patch(partial: Partial<UserForm>): void {
    this.f.update(v => ({ ...v, ...partial }));
  }

  async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/admin/users']); return; }

    const user = (await firstValueFrom(this.api.users())).find(u => u.id === id);
    if (!user) { this.router.navigate(['/admin/users']); return; }

    this.f.set({
      id: user.id, fullName: user.fullName, email: user.email, department: user.department,
      role: user.roles.includes('Admin') ? 'Admin' : 'User'
    });
  }

  async save(): Promise<void> {
    this.message.set(null);
    const f = this.f();
    if (!this.isAllowedEmailDomain(f.email)) {
      this.message.set('auth.emailDomainNotAllowed');
      return;
    }
    try {
      await firstValueFrom(this.api.updateUser(f.id, {
        fullName: f.fullName, email: f.email, department: f.department, role: f.role
      }));
      this.router.navigate(['/admin/users']);
    } catch {
      this.message.set('common.error');
    }
  }

  private isAllowedEmailDomain(email: string): boolean {
    return /@(education\.qa|edu\.gov\.qa)$/i.test(email.trim());
  }

  /** Only flags the field once there's something to judge — an empty email isn't "wrong domain" yet. */
  emailInvalid(): boolean {
    const email = this.f().email.trim();
    return email.length > 0 && !this.isAllowedEmailDomain(email);
  }
}
