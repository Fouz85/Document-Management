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
    <div class="d-flex justify-content-between align-items-center mb-3">
      <a class="btn btn-primary btn-sm" routerLink="/admin/users/new">
        <i class="bi bi-person-plus me-1"></i>{{ i18n.t('admin.addNewUser') }}
      </a>
    </div>

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
                    <span class="badge" [style]="u.roles.includes('Admin') ? 'background:#8A1538;color:#fff;padding:4px 10px;' : 'background:#0d6efd;color:#fff;padding:4px 10px;'">
                      {{ u.roles.includes('Admin') ? i18n.t('admin.roleAdmin') : i18n.t('admin.roleUser') }}
                    </span>
                  </td>
                  <td>
                    @if (u.registrationStatus === 'Pending') {
                      <span class="badge" style="background:#e9c56b;color:#333;padding:4px 10px;">{{ i18n.t('admin.pendingReview') }}</span>
                    } @else if (u.registrationStatus === 'Rejected') {
                      <span class="badge" style="background:#dd7877;color:#fff;padding:4px 10px;">{{ i18n.t('admin.rejected') }}</span>
                    } @else {
                      <span class="badge" [style]="u.isActive ? 'background:#129b82;color:#fff;padding:4px 10px;' : 'background:#aaa;color:#fff;padding:4px 10px;'">
                        {{ u.isActive ? i18n.t('admin.active') : i18n.t('admin.inactive') }}
                      </span>
                    }
                  </td>
                  <td class="actions-cell">
                    <div class="d-flex gap-1 flex-nowrap justify-content-center">
                      @if (u.registrationStatus === 'Pending') {
                        <button class="btn btn-sm btn-outline-success py-0 px-2" [title]="i18n.t('admin.approve')" (click)="approve(u)">
                          <i class="bi bi-check-lg"></i><small>{{ i18n.t('admin.approve') }}</small>
                        </button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" [title]="i18n.t('admin.reject')" (click)="reject(u)">
                          <i class="bi bi-x-lg"></i><small>{{ i18n.t('admin.reject') }}</small>
                        </button>
                      } @else {
                        <button class="btn btn-sm py-0 px-2"
                                [class]="u.isActive ? 'btn-outline-secondary' : 'btn-outline-success'"
                                [title]="u.isActive ? i18n.t('admin.deactivate') : i18n.t('admin.activate')"
                                (click)="toggle(u)">
                          <i class="bi" [class.bi-pause-circle]="u.isActive" [class.bi-play-circle]="!u.isActive"></i>
                          <small>{{ u.isActive ? i18n.t('admin.deactivate') : i18n.t('admin.activate') }}</small>
                        </button>
                      }
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

  async approve(u: UserDto): Promise<void> {
    await firstValueFrom(this.api.approveUser(u.id));
    await this.load();
  }

  async reject(u: UserDto): Promise<void> {
    if (!window.confirm(this.i18n.t('admin.confirmRejectUser'))) return;
    await firstValueFrom(this.api.rejectUser(u.id));
    await this.load();
  }

  async remove(u: UserDto): Promise<void> {
    if (!window.confirm(this.i18n.t('admin.confirmDeleteUser'))) return;
    await firstValueFrom(this.api.deleteUser(u.id));
    await this.load();
  }
}
