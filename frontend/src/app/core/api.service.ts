import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Dashboard, DepartmentNode, RequestDetails, RequestListItem,
  SaveDestructionRequestDto, UserDto
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Departments
  departmentsTree(): Observable<DepartmentNode[]> {
    return this.http.get<DepartmentNode[]>(`${this.base}/departments/tree`);
  }

  // Requests (current user)
  myRequests(search?: string, status?: string): Observable<RequestListItem[]> {
    return this.http.get<RequestListItem[]>(`${this.base}/requests/mine`, { params: this.filter(search, status) });
  }
  getRequest(id: number): Observable<RequestDetails> {
    return this.http.get<RequestDetails>(`${this.base}/requests/${id}`);
  }
  createRequest(dto: SaveDestructionRequestDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/requests`, dto);
  }
  nextDestructionNo(): Observable<{ destructionNo: string }> {
    return this.http.get<{ destructionNo: string }>(`${this.base}/requests/next-destruction-no`);
  }
  updateRequest(id: number, dto: SaveDestructionRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/requests/${id}`, dto);
  }
  downloadRequestPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/requests/${id}/pdf`, { responseType: 'blob' });
  }
  downloadRequestDocx(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/requests/${id}/docx`, { responseType: 'blob' });
  }

  // Admin
  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/admin/dashboard`);
  }
  submissions(search?: string, status?: string): Observable<RequestListItem[]> {
    return this.http.get<RequestListItem[]>(`${this.base}/admin/submissions`, { params: this.filter(search, status) });
  }
  updateStatus(id: number, status: string, notes?: string): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/submissions/${id}/status`, { status, notes });
  }
  softDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/submissions/${id}`);
  }
  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/admin/submissions/${id}/pdf`, { responseType: 'blob' });
  }
  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.base}/admin/export/excel`, { responseType: 'blob' });
  }

  // Users
  users(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.base}/admin/users`);
  }
  createUser(dto: { fullName: string; email: string; department: string; password: string; role: string }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/admin/users`, dto);
  }
  updateUser(id: string, dto: { fullName: string; email: string; department: string; role: string; newPassword?: string }): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/users/${id}`, dto);
  }
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/users/${id}`);
  }
  toggleUserStatus(id: string): Observable<{ isActive: boolean }> {
    return this.http.post<{ isActive: boolean }>(`${this.base}/admin/users/${id}/toggle-status`, {});
  }
  approveUser(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/users/${id}/approve`, {});
  }
  rejectUser(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/admin/users/${id}/reject`, {});
  }
  register(dto: { fullName: string; email: string; department: string; password: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/register`, dto);
  }
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/change-password`, { currentPassword, newPassword });
  }

  private filter(search?: string, status?: string): HttpParams {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return params;
  }
}
