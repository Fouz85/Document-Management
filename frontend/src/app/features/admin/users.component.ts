import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { UserDto } from '../../core/models';

interface UserForm {
  id?: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  password: string;
}

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div class="section-header m-0" style="flex:1;min-width:220px;">
        <i class="bi bi-people"></i>{{ i18n.t('admin.users') }}
      </div>
      <button class="btn btn-primary btn-sm" (click)="startAdd()">
        <i class="bi bi-person-plus me-1"></i>{{ i18n.t('admin.addUser') }}
      </button>
    </div>
    @if (message()) { <div class="alert alert-danger">{{ i18n.t(message()!) }}</div> }

    @if (editing(); as f) {
      <div class="card mb-3">
        <div class="card-body row g-2">
          <div class="col-md-3">
            <label class="form-label" for="ufn">{{ i18n.t('admin.fullName') }}</label>
            <input id="ufn" class="form-control" name="fullName" [(ngModel)]="f.fullName">
          </div>
          <div class="col-md-3">
            <label class="form-label" for="uem">{{ i18n.t('auth.email') }}</label>
            <input id="uem" type="email" class="form-control" name="email" [(ngModel)]="f.email" dir="ltr">
          </div>
          <div class="col-md-2">
            <label class="form-label" for="udep">{{ i18n.t('request.department') }}</label>
            <input id="udep" class="form-control" name="department" [(ngModel)]="f.department">
          </div>
          <div class="col-md-2">
            <label class="form-label" for="urole">{{ i18n.t('admin.role') }}</label>
            <select id="urole" class="form-select" name="role" [(ngModel)]="f.role">
              <option value="User">{{ i18n.t('admin.roleUser') }}</option>
              <option value="Admin">{{ i18n.t('admin.roleAdmin') }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label" for="upw">{{ f.id ? i18n.t('admin.newPasswordOptional') : i18n.t('auth.password') }}</label>
            <input id="upw" type="password" class="form-control" name="password" [(ngModel)]="f.password" autocomplete="new-password">
          </div>
          <div class="col-12">
            <button class="btn btn-primary btn-sm" (click)="saveUser()">{{ i18n.t('common.save') }}</button>
            <button class="btn btn-outline-secondary btn-sm ms-1" (click)="editing.set(null)">{{ i18n.t('common.cancel') }}</button>
          </div>
        </div>
      </div>
    }

    <div class="card">
    <div class="table-responsive">
    <table class="sys-table">
      <thead>
        <tr>
          <th class="col-text">{{ i18n.t('admin.fullName') }}</th>
          <th>{{ i18n.t('auth.email') }}</th>
          <th>{{ i18n.t('request.department') }}</th>
          <th>{{ i18n.t('admin.role') }}</th>
          <th>{{ i18n.t('admin.active') }}</th>
          <th>{{ i18n.t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        @for (u of users(); track u.id) {
          <tr>
            <td class="col-text">{{ u.fullName }}</td>
            <td dir="ltr">{{ u.email }}</td>
            <td>{{ u.department }}</td>
            <td>{{ u.roles.includes('Admin') ? i18n.t('admin.roleAdmin') : i18n.t('admin.roleUser') }}</td>
            <td>
              <span class="badge" [class.bg-success]="u.isActive" [class.bg-secondary]="!u.isActive">
                {{ u.isActive ? i18n.t('admin.active') : i18n.t('admin.inactive') }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-outline-primary" (click)="startEdit(u)" [title]="i18n.t('common.edit')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-warning" (click)="toggle(u)" [title]="i18n.t('admin.toggleStatus')"><i class="bi bi-toggle2-on"></i></button>
              <button class="btn btn-sm btn-outline-danger" (click)="remove(u)" [title]="i18n.t('common.delete')"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        } @empty {
          <tr><td colspan="6" class="text-center text-muted py-4">{{ i18n.t('common.noData') }}</td></tr>
        }
      </tbody>
    </table>
    </div>
    </div>
  `
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  readonly users = signal<UserDto[]>([]);
  readonly editing = signal<UserForm | null>(null);
  readonly message = signal<string | null>(null);

  constructor() { this.load(); }

  async load(): Promise<void> {
    this.users.set(await firstValueFrom(this.api.users()));
  }

  startAdd(): void {
    this.editing.set({ fullName: '', email: '', department: '', role: 'User', password: '' });
  }

  startEdit(u: UserDto): void {
    this.editing.set({
      id: u.id, fullName: u.fullName, email: u.email, department: u.department,
      role: u.roles.includes('Admin') ? 'Admin' : 'User', password: ''
    });
  }

  async saveUser(): Promise<void> {
    const f = this.editing();
    if (!f) return;
    this.message.set(null);
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
      this.editing.set(null);
      await this.load();
    } catch {
      this.message.set('common.error');
    }
  }

  async toggle(u: UserDto): Promise<void> {
    await firstValueFrom(this.api.toggleUserStatus(u.id));
    await this.load();
  }

  async remove(u: UserDto): Promise<void> {
    if (!window.confirm(this.i18n.t('common.confirmDelete'))) return;
    await firstValueFrom(this.api.deleteUser(u.id));
    await this.load();
  }
}
