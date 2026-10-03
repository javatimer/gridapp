const express = require('express');

// условная база данных
const users = [
  { _id: crypto.randomUUID(), name: 'Tom', age: 22 },
  { _id: crypto.randomUUID(), name: 'Bob', age: 44 },
  { _id: crypto.randomUUID(), name: 'Sam', age: 28 },
];

const app = express();
app.use(express.json());

// настройка CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, PATCH, PUT, POST, DELETE, OPTIONS');
  next(); // передаем обработку запроса дальше
});

app.get('/api/users', async (_, res) => res.send(users));

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
