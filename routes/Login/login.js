import express from 'express';
import jwt from 'jsonwebtoken';
import { SECRET_KEY } from '../../config/env.js';
import db from '../../config/db.js';

const router = express.Router();


// http://localhost:3000/login
router.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  const query = 'SELECT * FROM usuarios WHERE usuario = ? AND senha = ?';

  db.query(query, [usuario, senha], (err, results) => {
    if (err) {
      console.error('Erro ao consultar banco:', err);
      return res.status(500).json({ message: 'Erro interno no servidor.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Usuário ou senha inválido!' });
    }

    const user = results[0];

    const token = jwt.sign(
      { id: user.id, user: user.Usuario },
      SECRET_KEY,
    );

    delete user.Senha;

    return res.status(201).json({ message: 'Login bem-sucedido!',token_API:token, dados: user });
  });
});

export default router;
