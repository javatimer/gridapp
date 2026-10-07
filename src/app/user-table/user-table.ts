import { Component, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { User } from '../model/user';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [FormsModule, CdkDrag, CdkDragHandle],
  styleUrl: './user-table.css',
  templateUrl: './user-table.html'
})
export class UserTable {
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();
  totalElements = input.required<number>();

  users = input.required<User[]>();
  isLoading = input<boolean>(false);
  isResourceError = input<boolean>(false);

  save = output<User>();
  delete = output<User>();
  retry = output<void>();

  search = input('');
  searchChange = output<string>();

  newUser = signal<User | null>(null);
  editedUser = signal<User | null>(null);

  sortColumn = signal<'name' | 'age'>('name');
  sortDirection = signal<'asc' | 'desc' | null>(null);

  sortChange = output<{
    sort: 'name' | 'age';
    direction: 'asc' | 'desc' | null;
  }>();

  /*

  filteredUsers = computed(() => {
    const query = this.search().trim().toLowerCase();
    const result = query ? this.users().filter(user => user.name.toLowerCase().includes(query)) : [...this.users()];
    const direction = this.sortDirection();

    if (!direction) return result;

    const column = this.sortColumn();

    result.sort((user1, user2) => {
      const comparison = column === 'name' ? user1.name.localeCompare(user2.name) : user1.age - user2.age;
      return direction === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  paginatedUsers = computed(() => {
    const users = this.filteredUsers();
    const start = (this.currentPage() - 1) * this.pageSize;
    const end = start + this.pageSize;
    return users.slice(start, end);
  });

  currentPage = computed(() => {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return 1;
    }

    return Math.min(this.page(), totalPages);
  });

  totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.pageSize));

  constructor() {
    effect(() => {
      const total = this.totalPages();
      if (this.page() > total) {
        this.page.set(Math.max(1, total));
      }
    });
  }
  */

  nextPage() {
    const next = this.currentPage() + 1;
    this.pageChange.emit(next);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchChange.emit(input.value);
  }

  sort(column: 'name' | 'age') {
    if (this.sortColumn() !== column) {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    } else {
      this.sortDirection.update(dir => dir === null ? 'asc' : dir === 'asc' ? 'desc' : null);
    }

    this.sortChange.emit({
      sort: this.sortColumn(),
      direction: this.sortDirection()
    });
  }

  addUser() {
    this.newUser.set({ _id: '', name: '', age: 0 });
  }

  editUser(user: User) {
    this.editedUser.set({
      _id: user._id,
      name: user.name,
      age: user.age
    });
  }

  isEditing(user: User): boolean {
    const currentEdit = this.editedUser();

    if (!currentEdit) return false;

    return currentEdit === user || currentEdit._id === user._id;
  }

  onSave() {
    const userToSave = this.editedUser();
    if (!userToSave) return;
    this.save.emit(userToSave);
    this.resetForm();
  }

  saveNewUser() {
    const user = this.newUser();
    if (!user) return;
    this.save.emit(user);
    this.newUser.set(null);
  }

  onDelete(user: User) {
    this.delete.emit(user);
  }

  cancel() {
    this.resetForm();
  }

  private resetForm() {
    this.editedUser.set(null);
    this.newUser.set(null);
  }
}