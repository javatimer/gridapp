import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './model/user';
import { UserPage } from './model/user-page';

@Service()
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly url = 'http://localhost:3000/api/users';

  //getUsers() {return this.http.get<User[]>(this.url);}

  getUsers(page: number, size: number, search: string, sort: string, direction: string | null) {
    return this.http.get<UserPage>(this.url, {
      params: {
        page,
        size,
        search,
        sort,
        direction: direction ?? ''
      }
    });
  }

  createUser(user: User) {
    // HttpClient сам сериализует объект в JSON и ставит Content-Type
    return this.http.post<User>(this.url, user);
  }

  updateUser(user: User) {
    return this.http.put<User>(this.url, user);
  }

  deleteUser(id: string) {
    return this.http.delete<User>(`${this.url}/${id}`);
  }
}
