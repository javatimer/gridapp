import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const names = [
    'Alexander',
    'Emma',
    'Michael',
    'Sophia',
    'Daniel',
    'Olivia',
    'James',
    'Emily',
    'Robert',
    'Sarah',
    'David',
    'Alice',
    'John',
    'Maria',
    'Tom',
    'Anna',
    'William',
    'Laura',
    'Peter',
    'Julia'
];

function createUser() {
    return {
        _id: randomUUID(),
        name: names[Math.floor(Math.random() * names.length)],
        age: Math.floor(Math.random() * (80 - 18 + 1)) + 18
    };
}

//const users = [createUser()];
const users = Array.from(
    { length: 100_000 },
    createUser
);

//Форматирование null, 2 делает JSON красивым:
await writeFile('./data/users.json', JSON.stringify(users, null, 2));
