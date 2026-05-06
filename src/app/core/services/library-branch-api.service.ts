import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateLibraryBranchRequestDto } from '../../dto/create-library-branch-request.dto';
import { UpdateLibraryBranchRequestDto } from '../../dto/update-library-branch-request.dto';
import { LibraryBranch } from '../../models/library-branch.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LibraryBranchApiService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<LibraryBranch[]> {
    return this.http.get<LibraryBranch[]>(`${this.base}/api/library-branches`);
  }

  get(id: string): Observable<LibraryBranch> {
    return this.http.get<LibraryBranch>(`${this.base}/api/library-branches/${encodeURIComponent(id)}`);
  }

  create(body: CreateLibraryBranchRequestDto): Observable<LibraryBranch> {
    return this.http.post<LibraryBranch>(`${this.base}/api/library-branches`, body);
  }

  update(id: string, body: UpdateLibraryBranchRequestDto): Observable<LibraryBranch> {
    return this.http.put<LibraryBranch>(
      `${this.base}/api/library-branches/${encodeURIComponent(id)}`,
      body,
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/library-branches/${encodeURIComponent(id)}`);
  }
}

