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

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req, res, next) => {
  if (req.session.authenticated) {
    return next(); // Se autenticado, passe para a próxima rota/middleware
  } else {
    return res.redirect('/login'); // Se não autenticado, redirecione para a página de login
  }
};

app.get('/cadastro', (req, res) => {
  res.sendFile(__dirname + '/cadastro.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Rota /prateleira usando o middleware isAuthenticated
app.get('/prateleira', isAuthenticated, (req, res) => {
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

// API endpoint for user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Retrieve user data from the 'users' table
  connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, results) => {
    if (err) {
      return res.redirect('/login');
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Autenticar o usuário e armazenar os detalhes da sessão
    req.session.authenticated = true;
    req.session.userId = results[0].id;
    req.session.username = results[0].username; // Adicione o nome do usuário à sessão

    // Redirecione o usuário para a página halloween.html
    res.redirect('/prateleira');
  });
});

// Rota para obter o nome de usuário
app.get('/getUsername', isAuthenticated, (req, res) => {
  const username = req.session.username;

  if (username) {
    res.json({ username: username });
  } else {
    res.status(401).json({ message: 'Usuário não autenticado' });
  }
});

// API endpoint para atualizar os pontos do usuário quando eles encontram um produto de Halloween
app.post('/addPoints', (req, res) => {
  const { imageId } = req.body;
  const userId = req.session.userId;

  // Verifique se o imageId é válido (verifique se o imageId existe em sua lista de IDs de imagens válidas)
  const validImageIds = ['zombie', 'esp', 'frank', 'lobo', 'morte']; // Exemplo: IDs de imagens válidas
  if (!validImageIds.includes(imageId)) {
    return res.status(400).json({ message: 'ID de imagem inválido' });
  }

  const pointsToAdd = 10; // Defina a quantidade de pontos a serem adicionados
  const cashbackPercentage = 4; // Defina a porcentagem de cashback por clique

  // Inicie uma transação para garantir consistência ao atualizar os pontos, cashback e obter o nome do usuário
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao obter conexão do pool' });
    }

    connection.beginTransaction((err) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao iniciar a transação' });
      }

      // Atualize os pontos e o cashback na tabela 'users' para o usuário
      connection.query(
        'UPDATE users SET points = points + ?, cashback = cashback + ? WHERE id = ?',
        [pointsToAdd, (pointsToAdd * cashbackPercentage) / 100, userId],
        (err, updateResults) => {
          if (err) {
            return connection.rollback(() => {
              res.status(500).json({ message: 'Erro ao adicionar pontos e cashback' });
            });
          }

          // Obtenha os pontos, cashback e nome do usuário atualizados
          connection.query('SELECT points, cashback, username FROM users WHERE id = ?', [userId], (err, results) => {
            if (err) {
              return connection.rollback(() => {
                res.status(500).json({ message: 'Erro ao obter pontos, cashback e nome do usuário' });
              });
            }

            const points = results[0] ? results[0].points : 0;
            const cashback = results[0] ? results[0].cashback : 0;
            const username = results[0] ? results[0].username : '';

            // Atualize o nome do usuário na sessão
            req.session.username = username;

            // Commit a transação
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  res.status(500).json({ message: 'Erro ao finalizar a transação' });
                });
              }

              // Libere a conexão de volta ao pool
              connection.release();

              // Envie a resposta com as informações
              res.json({
                message: 'Pontos e cashback adicionados com sucesso',
                points: points,
                cashback: cashback,
                username: username, // Adicione o nome do usuário à resposta JSON
              });
            });
          });
        }
      );
    });
  });
});

// Rota para obter pontos e cashback
app.get('/getPointsAndCashback', isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  // Consulte o banco de dados para obter os pontos e o cashback do usuário
  connection.query('SELECT points, cashback FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) {
          return res.status(500).json({ message: 'Erro ao obter pontos e cashback' });
      }

      const points = results[0] ? results[0].points : 0;
      const cashback = results[0] ? results[0].cashback : 0;

      // Envie os pontos e o cashback como resposta
      res.json({
          points: points,
          cashback: cashback,
      });
  });
});

const port = 3006;
app.listen(port, () => {
  console.log(`Servidor rodando em http://172.16.31.26:${port}`);
});
