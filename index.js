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
  connection.query('INSERT INTO users (username, password, points) VALUES (?, ?, ?)', [username, password, 0], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erro no servidor' });
    }

    res.redirect('/login');
  });
});

// API endpoint para atualizar os pontos do usuário quando eles encontram um produto de Halloween
app.post('/addPoints', (req, res) => {
  if (!req.session.authenticated) {
    // Se não estiver autenticado, redirecione para a página de login
    return res.redirect('/login');
  }

  const { imageId } = req.body;
  const userId = req.session.userId;
  const username = req.session.username; // Obtém o nome do usuário da sessão

  // Verifique se o imageId é válido (verifique se o imageId existe em sua lista de IDs de imagens válidas)
  const validImageIds = ['zombie', 'esp', 'frank', 'lobo', 'morte']; // Exemplo: IDs de imagens válidas
  if (!validImageIds.includes(imageId)) {
    return res.status(400).json({ message: 'ID de imagem inválido' });
  }

  const pointsToAdd = 10; // Defina a quantidade de pontos a serem adicionados

  // Atualize os pontos na tabela 'users' para o usuário
  connection.query(
    'UPDATE users SET pontos = pontos + ? WHERE id = ?',
    [pointsToAdd, userId],
    (err, updateResults) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao adicionar pontos' });
      }

      // Obtenha os pontos e cashback atualizados
      connection.query('SELECT pontos FROM users WHERE id = ?', [userId], (err, pointsResults) => {
        if (err) {
          return res.status(500).json({ message: 'Erro ao obter pontos' });
        }

        const points = pointsResults[0] ? pointsResults[0].pontos : 0;

        // Obtenha o cashback (exemplo: 4% dos pontos)
        const cashbackPercentage = 4;
        const cashback = (points * cashbackPercentage) / 100;

        // Atualize o nome do usuário na sessão
        req.session.username = username;

        // Envie a resposta com as informações
        res.json({
          message: 'Pontos adicionados com sucesso',
          points: points,
          cashback: cashback,
          username: username, // Adicione o nome do usuário à resposta JSON
        });
      });
    }
  );
});





const port = 3006;
app.listen(port, () => {
  console.log(`Servidor rodando em http://172.16.31.26:${port}/prateleira`);
});
