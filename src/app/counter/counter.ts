import { Component, signal, computed } from '@angular/core';

@Component({
    selector: 'app-counter',
    standalone: true,
    templateUrl: './counter.html',
    styleUrl: './counter.css'
})
export class Counter {
    count = signal(0);
    isEven = computed(() => this.count() % 2 === 0);

    increment(): void {
        this.count.update(value => value + 1);
    }

    decrement(): void {
        this.count.update(value => value - 1);
    }
}

