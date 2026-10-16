import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';
import { User } from './model/user';
import { UserTable } from './user-table/user-table';
import { catchError, exhaustMap, of, switchMap, timeout, timer, map } from 'rxjs';

@Component({
    selector: 'my-app',
    standalone: true,
    imports: [UserTable],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class App {
    private readonly userService = inject(UserService);

    page = signal(1);
    pageSize = 5;
    search = signal('');

    sort = signal<'id' | 'name' | 'age'>('id');
    direction = signal<'asc' | 'desc'>('asc');

    usersResource = rxResource({
        params: () => ({
            page: this.page(),
            size: this.pageSize,
            search: this.search(),
            sort: this.sort(),
            direction: this.direction()
        }),

        stream: ({ params }) =>
            this.userService.getUsers(
                params.page,
                params.size,
                params.search,
                params.sort,
                params.direction
            )
    });

    appInfoResource = rxResource({
        stream: () => this.userService.getAppInfo()
    });

    databaseResource = rxResource({
        stream: () =>
            timer(0, 10_000).pipe(
                exhaustMap(() => {
                    const startedAt = Date.now();

                    return this.userService.getDatabaseHealth()
                        .pipe(
                            timeout({ first: 5_000 }),

                            map(db => ({
                                ...db,
                                checkedAt: new Date(),
                                responseTimeMs: Date.now() - startedAt
                            })),

                            catchError(() =>
                                of({
                                    connected: false,
                                    database: null,
                                    version: null,
                                    checkedAt: new Date(),
                                    responseTimeMs: Date.now() - startedAt
                                })
                            )
                        );
                })
            )
    });

    appInfo = computed(() => this.appInfoResource.hasValue() ? this.appInfoResource.value() : null);
    databaseHealth = computed(() => this.databaseResource.hasValue() ? this.databaseResource.value() : null);

    users = computed(() => this.usersResource.hasValue() ? this.usersResource.value().content : []);
    isLoading = computed(() => this.usersResource.isLoading());
    isResourceError = computed(() => this.usersResource.status() === 'error' || !!this.usersResource.error());
    totalPages = computed(() => this.usersResource.hasValue() ? this.usersResource.value().totalPages : 0);
    totalElements = computed(() => this.usersResource.hasValue() ? this.usersResource.value().totalElements : 0);

    statusMessage = signal('');
    isError = signal(false);

    handleSave(userToSave: User) {
        const request$ = userToSave.id == null ? this.userService.createUser(userToSave) : this.userService.updateUser(userToSave);

        request$.subscribe({
            next: () => {
                this.showTransientStatus('Данные успешно сохранены', false);
                this.usersResource.reload();
            },
            error: (error) => {
                console.error('Ошибка сохранения:', error);
                this.showTransientStatus('Ошибка при сохранении', true, 6000);
            }
        });
    }

    handleDelete(user: User) {
        const confirmed = confirm(`Удалить пользователя "${user.name}"?`);

        if (!confirmed) return;

        this.userService.deleteUser(user.id!).subscribe({
            next: () => {
                this.showTransientStatus('Данные успешно удалены', false);
                this.usersResource.reload();
            },

            error: () => {
                this.showTransientStatus('Не удалось удалить пользователя', true, 6000);
            }
        });
    }

    handleSearch(query: string) {
        this.page.set(1);
        this.search.set(query);
    }

    handleSort(field: 'id' | 'name' | 'age') {
        if (this.sort() === field) {
            this.direction.update(current => current === 'asc' ? 'desc' : 'asc');
        } else {
            this.sort.set(field);
            this.direction.set('asc');
        }

        this.page.set(1);
    }

    refreshData() {
        this.usersResource.reload();
    }

    private showTransientStatus(message: string, errorStatus: boolean, duration: number = 3000) {
        this.isError.set(errorStatus);
        this.statusMessage.set(message);

        setTimeout(() => {
            if (this.statusMessage() === message) {
                this.statusMessage.set('');
                this.isError.set(false);
            }
        }, duration);
    }
}