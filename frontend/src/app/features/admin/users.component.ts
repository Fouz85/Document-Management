import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { UserDto } from '../../core/models';

@Component({
  selector: 'app-users',
  imports: [RouterLink],
  template: `
    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="sys-table">
            <thead>
              <tr>
                <th class="col-text" style="width:220px;">{{ i18n.t('admin.fullName') }}</th>
                <th class="col-text" style="width:250px;">{{ i18n.t('auth.email') }}</th>
                <th class="col-text">{{ i18n.t('request.department') }}</th>
                <th style="width:90px;">{{ i18n.t('admin.role') }}</th>
                <th style="width:90px;">{{ i18n.t('common.status') }}</th>
                <th style="width:150px;">{{ i18n.t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td class="col-text"><strong>{{ u.fullName }}</strong></td>
                  <td class="col-text">{{ u.email }}</td>
                  <td class="col-text">{{ u.department }}</td>
                  <td>
                    <span class="badge" [style]="roleBadgeStyle(u.roles)">
                      {{ roleLabel(u.roles) }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" [style]="u.isActive ? 'background:#129b82;color:#fff;padding:4px 10px;' : 'background:#aaa;color:#fff;padding:4px 10px;'">
                      {{ u.isActive ? i18n.t('admin.active') : i18n.t('admin.inactive') }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <div class="d-flex gap-1 flex-nowrap justify-content-center">
                      <button class="btn btn-sm py-0 px-2"
                              [class]="u.isActive ? 'btn-outline-secondary' : 'btn-outline-success'"
                              [title]="u.isActive ? i18n.t('admin.deactivate') : i18n.t('admin.activate')"
                              (click)="toggle(u)">
                        <i class="bi" [class.bi-pause-circle]="u.isActive" [class.bi-play-circle]="!u.isActive"></i>
                        <small>{{ u.isActive ? i18n.t('admin.deactivate') : i18n.t('admin.activate') }}</small>
                      </button>
                      <a class="btn btn-sm btn-outline-warning py-0 px-2" [title]="i18n.t('common.edit')"
                         [routerLink]="['/admin/users', u.id, 'edit']">
                        <i class="bi bi-pencil"></i>
                      </a>
                      <button class="btn btn-sm btn-outline-danger py-0 px-2" [title]="i18n.t('common.delete')" (click)="remove(u)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="text-center text-muted py-5">{{ i18n.t('common.noData') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  readonly i18n = inject(I18nService);

  readonly users = signal<UserDto[]>([]);

  constructor() { this.load(); }

  async load(): Promise<void> {
    this.users.set(await firstValueFrom(this.api.users()));
  }

  async toggle(u: UserDto): Promise<void> {
    await firstValueFrom(this.api.toggleUserStatus(u.id));
    await this.load();
  }

  async remove(u: UserDto): Promise<void> {
    if (!window.confirm(this.i18n.t('admin.confirmDeleteUser'))) return;
    await firstValueFrom(this.api.deleteUser(u.id));
    await this.load();
  }

  private readonly roleBadges: Record<string, { labelKey: string; style: string }> = {
    Admin: { labelKey: 'admin.roleAdmin', style: 'background:#8A1538;color:#fff;padding:4px 10px;' },
    LegalAffairs: { labelKey: 'admin.roleLegalAffairs', style: 'background:#6f42c1;color:#fff;padding:4px 10px;' },
    InternalAudit: { labelKey: 'admin.roleInternalAudit', style: 'background:#198754;color:#fff;padding:4px 10px;' },
    User: { labelKey: 'admin.roleUser', style: 'background:#0d6efd;color:#fff;padding:4px 10px;' }
  };

  /** A user is only ever expected to hold one of these roles at a time — first match wins. */
  private matchedRole(roles: string[]): string {
    return ['Admin', 'LegalAffairs', 'InternalAudit'].find(r => roles.includes(r)) ?? 'User';
  }

  roleLabel(roles: string[]): string {
    return this.i18n.t(this.roleBadges[this.matchedRole(roles)].labelKey);
  }

  roleBadgeStyle(roles: string[]): string {
    return this.roleBadges[this.matchedRole(roles)].style;
  }
}
