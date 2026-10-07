const crypto = require('crypto');
const express = require('express');
const fs = require('fs');

// условная база данных npm install express@~5.2.1 и node server.js
const usersTEMP = [
  { _id: crypto.randomUUID(), name: 'Tom', age: 22 },
  { _id: crypto.randomUUID(), name: 'Bob', age: 44 },
  { _id: crypto.randomUUID(), name: 'Sam', age: 28 },
  { _id: crypto.randomUUID(), name: 'Alice', age: 31 },
  { _id: crypto.randomUUID(), name: 'John', age: 37 },
  { _id: crypto.randomUUID(), name: 'Emma', age: 26 },
  { _id: crypto.randomUUID(), name: 'Michael', age: 42 },
  { _id: crypto.randomUUID(), name: 'Sarah', age: 29 },
  { _id: crypto.randomUUID(), name: 'David', age: 35 },
  { _id: crypto.randomUUID(), name: 'Olivia', age: 24 },
  { _id: crypto.randomUUID(), name: 'James', age: 51 },
  { _id: crypto.randomUUID(), name: 'Sophia', age: 33 },
  { _id: crypto.randomUUID(), name: 'Daniel', age: 27 },
  { _id: crypto.randomUUID(), name: 'Emily', age: 39 },
  { _id: crypto.randomUUID(), name: 'Robert', age: 46 },
];

const users = JSON.parse(fs.readFileSync('./data/users.json', 'utf8'));

const app = express();
app.use(express.json());

// настройка CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, PATCH, PUT, POST, DELETE, OPTIONS');
  next(); // передаем обработку запроса дальше
});

app.get('/', async (_, res) => res.send('Hello world!'));

// app.get('/api/users', async (_, res) => res.send(users));


function sortUsers(users, sort, direction) {
  if (!sort || !direction) {
    return users;
  }

  return [...users].sort((a, b) => {

    if (sort === 'name') {
      return direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }

    if (sort === 'age') {
      return direction === 'asc' ? a.age - b.age : b.age - a.age;
    }

    return 0;
  });
}

app.get('/api/users', async (req, res) => {
  const page = Number(req.query.page);
  const size = Number(req.query.size);
  const search = String(req.query.search ?? '').trim().toLowerCase();
  const sort = req.query.sort;
  const direction = req.query.direction;
  const filteredUsers = search ? users.filter(user => user.name.toLowerCase().includes(search)) : users;
  const start = (page - 1) * size;
  const end = start + size;
  //const pageUsers = filteredUsers.slice(start, end);

  const sortedUsers = sortUsers(filteredUsers, sort, direction);
  const pageUsers = sortedUsers.slice(start, end);

  res.send({
    content: pageUsers,
    page,
    size,
    totalElements: filteredUsers.length,
    totalPages: Math.ceil(filteredUsers.length / size)
  });

});

app.get('/api/users/:id', async (req, res) => {
  const id = req.params.id;
  const user = users.find((u) => u._id === id);
  if (user) res.send(user);
  else res.sendStatus(404);
});

app.post('/api/users', async (req, res) => {
  if (!req.body) return res.sendStatus(400);

  const userName = req.body.name;
  const userAge = req.body.age;
  const user = { _id: crypto.randomUUID(), name: userName, age: userAge };

  users.push(user);
  res.send(user);
});

app.delete('/api/users/:id', async (req, res) => {
  const id = req.params.id;

  // получаем индекс первого элемента с _id=id
  let index = users.findIndex((u) => u._id === id);
  if (index > -1) {
    // удаляем пользователя из массива по индексу
    const user = users.splice(index, 1)[0];
    res.send(user);
  } else {
    res.status(404).send('User not found');
  }
});

app.put('/api/users', async (req, res) => {
  if (!req.body) return res.sendStatus(400);

  const id = req.body._id;
  const userName = req.body.name;
  const userAge = req.body.age;

  const index = users.findIndex((u) => u._id === id);
  if (index > -1) {
    // изменяем данные у пользователя
    const user = users[index];
    user.age = userAge;
    user.name = userName;
    res.send(user);
  } else {
    res.status(404).send('User not found');
  }
});

// прослушиваем прерывание работы программы (ctrl-c)
process.on('SIGINT', async () => {
  console.log('Приложение завершило работу');
  process.exit();
});

app.listen(3000, () => console.log('Сервер ожидает подключения...'));
