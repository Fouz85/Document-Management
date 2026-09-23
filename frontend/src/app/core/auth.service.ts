import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResult } from './models';

const STORAGE_KEY = 'rds_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly session = signal<AuthResult | null>(this.restore());
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.session()?.roles.includes('Admin') ?? false);
  readonly token = computed(() => this.session()?.token ?? null);

  async login(email: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${environment.apiUrl}/auth/login`, { email, password })
    );
    this.setSession(result);
  }

  /** Exchanges the stored refresh token for a new access token. Throws if there's no session or
   *  the refresh token has expired/was already used/revoked — callers should treat that as "must
   *  log in again", same as any other auth failure. */
  async refresh(): Promise<void> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) throw new Error('No refresh token available');
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
    );
    this.setSession(result);
  }

  /** Self-service sign-up — no admin approval. FullName/Department come right after via completeProfile(). */
  async register(email: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<AuthResult>(`${environment.apiUrl}/auth/register`, { email, password })
    );
    this.setSession(result);
  }

  /** The logged-in user filling in their own name/department for the first time. */
  readonly profileIncomplete = computed(() => {
    const s = this.session();
    return s !== null && (!s.fullName || !s.department);
  });

  async completeProfile(fullName: string, department: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.put<AuthResult>(`${environment.apiUrl}/auth/profile`, { fullName, department })
    );
    this.setSession(result);
  }

  private setSession(result: AuthResult): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    this.session.set(result);
  }

  /** Revokes the session's refresh token server-side (best-effort — a network failure here must
   *  never block the client-side sign-out) before clearing local state. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
    } catch {
      // Offline or already-expired token — the local session is cleared regardless below.
    }
    sessionStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  private restore(): AuthResult | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthResult;
      if (new Date(parsed.expiresAtUtc) <= new Date()) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
