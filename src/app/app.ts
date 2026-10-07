import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';
import { User } from './model/user';
import { Counter } from './counter/counter';
import { UserTable } from './user-table/user-table';

@Component({
    selector: 'my-app',
    standalone: true,
    imports: [Counter, UserTable],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class App {
    private readonly userService = inject(UserService);

    page = signal(1);
    pageSize = 5;
    search = signal('');
    sort = signal<'name' | 'age'>('name');
    sortDirection = signal<'asc' | 'desc' | null>(null);

    usersResource = rxResource({ // rxResource следит за этими сигналами
        params: () => ({
            page: this.page(),
            size: this.pageSize,
            search: this.search(),
            sort: this.sort(),
            direction: this.sortDirection()
        }),

        stream: ({ params }) => {
            return this.userService.getUsers(
                params.page,
                params.size,
                params.search,
                params.sort,
                params.direction
            );
        },
    });

    users = computed(() => this.usersResource.hasValue() ? this.usersResource.value().content : []);
    isLoading = computed(() => this.usersResource.isLoading());
    isResourceError = computed(() => this.usersResource.status() === 'error' || !!this.usersResource.error());
    totalPages = computed(() => this.usersResource.hasValue() ? this.usersResource.value().totalPages : 0);
    totalElements = computed(() => this.usersResource.hasValue() ? this.usersResource.value().totalElements : 0);

    statusMessage = signal('');
    isError = signal(false);

    handleSave(userToSave: User) {
        const request$ = userToSave._id === '' ? this.userService.createUser(userToSave) : this.userService.updateUser(userToSave);

        request$.subscribe({
            next: () => {
                this.showTransientStatus('Данные успешно сохранены', false);
                this.usersResource.reload();
            },

            error: () => {
                this.showTransientStatus('Ошибка при сохранении: сервер недоступен', true, 6000);
            }
        });
    }

    handleDelete(user: User) {
        const confirmed = confirm(`Удалить пользователя "${user.name}"?`);

        if (!confirmed) return;

        this.userService.deleteUser(user._id).subscribe({
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

    handleSort(event: { sort: 'name' | 'age'; direction: 'asc' | 'desc' | null; }) {
        this.page.set(1);
        this.sort.set(event.sort);
        this.sortDirection.set(event.direction);
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