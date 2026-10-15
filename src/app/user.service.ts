import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { User } from './model/user';
import { UserPage } from './model/user-page';

@Service()
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:8080/user';

  getUsers(page: number,size: number,search: string,sort: string = 'id',direction: string = 'asc') {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('search', search)
      .set('sort', sort)
      .set('direction', direction);

    return this.http.get<UserPage>(this.url, { params });
  }

  createUser(user: User) {
    return this.http.post<User>(this.url, {
      name: user.name,
      age: user.age
    });
  }

  updateUser(user: User) {
    return this.http.put<User>(`${this.url}/${user.id}`, {
      name: user.name,
      age: user.age
    });
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}