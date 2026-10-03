import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { User } from './user';
import { UserService } from './user.service';

@Component({
    selector: 'my-app',
    imports: [FormsModule],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    private readonly userService = inject(UserService);

    // 1. Реактивный ресурс для загрузки пользователей (заменяет loadUsers и ngOnInit)
    // Он автоматически сделает GET-запрос при старте приложения
    usersResource = rxResource({
        stream: () => this.userService.getUsers(),
    });

    // Пример на будущее (с параметрами):
    /*
      usersResource = rxResource({
          params: () => ({ search: this.searchQuery() }), // вместо request
          stream: ({ params }) => this.userService.getUsers(params.search)
      });
      */

    // 2. Сигналы для состояния компонента
    editedUser = signal<User | null>(null);
    isNewRecord = signal<boolean>(false);
    statusMessage = signal<string>('');
    users = computed(() => this.usersResource.value() ?? []);
    isError = signal<boolean>(false);

    // Геттер для получения массива (rxResource хранит данные в свойстве .value)
    /*
      get users(): User[] {
          return this.usersResource.value() ?? [];
      }
      */

    addUser() {
        const newUser: User = { _id: '', name: '', age: 0 };

        this.usersResource.value.update((current) => (current ? [...current, newUser] : [newUser]));

        this.editedUser.set(newUser);
        this.isNewRecord.set(true);
    }

    editUser(user: User) {
        // Создаем копию объекта в сигнал
        this.editedUser.set({ _id: user._id, name: user.name, age: user.age });
    }

    isEditing(user: User): boolean {
        const currentEdit = this.editedUser();

        if (!currentEdit) {
            return false;
        }

        if (currentEdit === user) {
            return true;
        }

        if (user._id === '') {
            return false;
        }

        return currentEdit._id === user._id;
    }

    saveUser() {
        const userToSave = this.editedUser();
        if (!userToSave) return;

        if (this.isNewRecord()) {
            this.userService.createUser(userToSave).subscribe({
                next: () => {
                    this.showTransientStatus('Данные успешно добавлены', false);
                    this.usersResource.reload();
                    this.resetForm();
                },
                error: () => {
                    // Ошибку тоже пропускаем через метод, но увеличиваем время до 6 секунд
                    this.showTransientStatus('Ошибка при добавлении: сервер недоступен', true, 6000);
                },
            });
        } else {
            this.userService.updateUser(userToSave).subscribe({
                next: () => {
                    this.showTransientStatus('Данные успешно обновлены', false);
                    this.usersResource.reload();
                    this.resetForm();
                },
                error: () => {
                    this.showTransientStatus('Ошибка при обновлении: изменения не сохранены', true, 6000);
                },
            });
        }
    }

    deleteUser(user: User) {
        const confirmed = confirm(`Удалить пользователя "${user.name}"?`);
        if (!confirmed) {
            return;
        }
        this.userService.deleteUser(user._id).subscribe({
            next: () => {
                this.showTransientStatus('Данные успешно удалены', false);
                this.usersResource.reload();
            },
            error: () => {
                this.showTransientStatus('Не удалось удалить пользователя: сервер не отвечает', true, 6000);
            },
        });
    }

    cancel() {
        if (this.isNewRecord()) {
            // Просто отрезаем последний добавленный элемент черновика
            this.usersResource.value.update((current) => (current ? current.slice(0, -1) : []));
        }
        this.resetForm();
    }

    private showTransientStatus(message: string, errorStatus: boolean, duration: number = 3000) {
        this.isError.set(errorStatus);
        this.statusMessage.set(message);

        setTimeout(() => {
            // Проверяем, совпадает ли текущее сообщение с тем, что мы планировали удалить
            // Это защитит от ситуации, когда одно уведомление перебивает другое
            if (this.statusMessage() === message) {
                this.statusMessage.set('');
                this.isError.set(false);
            }
        }, duration);
    }

    private resetForm() {
        this.editedUser.set(null);
        this.isNewRecord.set(false);
    }
}
