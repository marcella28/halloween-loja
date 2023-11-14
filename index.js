const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'acesso123',
  database: 'halloween',
});

// Configure o middleware 'express-session'
app.use(session({
  secret: 'suaChaveSecreta', // Substitua por uma chave secreta segura
  resave: false,
  saveUninitialized: true,
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/cadastro', (req, res) => {
  res.sendFile(__dirname + '/cadastro.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.get('/prateleira', (req, res) => {
  res.sendFile(__dirname + '/prateleira.html');
});

// Serve static files from the 'public' directory
app.use(express.static('public'));


// API endpoint for user registration
app.post('/cadastro', (req, res) => {
  const { username, password } = req.body;

  // Insert the user's data into the 'users' table with plain text password
  connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erro no servidor' });
    }

    res.redirect('/login');
  });
});

// API endpoint for user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Retrieve user data from the 'users' table
  connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erro no servidor' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Redirecione o usuário para a página halloween.html
    res.redirect('/prateleira');
  });
});


// API endpoint to update user's points when they find a Halloween product
app.post('/addPoints', (req, res) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  const { imageId } = req.body;
  const userId = req.session.userId;

  // Verifique se a imagem clicada é válida (verifique se o imageId existe em sua lista de imagens válidas)
  const validImageIds = [1, 2, 3]; // Exemplo: IDs de imagens válidas
  if (!validImageIds.includes(imageId)) {
    return res.status(400).json({ message: 'ID de imagem inválido' });
  }

  const pointsToAdd = 10; // Defina a quantidade de pontos a serem adicionados

  // Atualize os pontos na tabela 'cashback' para o usuário
  connection.query(
    'INSERT INTO cashback (usuario_id, points) VALUES (?, ?) ON DUPLICATE KEY UPDATE points = points + ?',
    [userId, pointsToAdd, pointsToAdd],
    (err, updateResults) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao adicionar pontos' });
      }

      res.json({ message: 'Pontos adicionados com sucesso' });
      res.redirect('/prateleira');
    }
  );
});



const port = 3006;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
