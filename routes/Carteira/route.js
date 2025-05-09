import express from 'express';
import authenticateToken from '../../middleware/Middleware.js';

import db from '../../config/db.js';

const router = express.Router();


//GET

 router.get('/', authenticateToken, (req, res) => {
    db.query('SELECT * FROM carteira ', (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao buscar estrategias', error: err });
      }
      res.json(results); // Retorna todos os estrategias
    });
  }); 


// GET: Buscar carteiras e seus ativos de um usuário específico
router.get('/:usuario', authenticateToken, (req, res) => {
  const { usuario } = req.params;

  // Buscar carteiras do usuário
  db.query('SELECT * FROM carteira WHERE usuario = ?', [usuario], (err, carteiraResults) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar carteiras', error: err });
    }

    if (carteiraResults.length === 0) {
      return res.status(404).json({ message: 'Carteiras não encontradas' });
    }

    // Pegar os IDs das carteiras encontradas
    const carteiraIds = carteiraResults.map(carteira => carteira.id);

    // Buscar ativos relacionados às carteiras
    db.query('SELECT * FROM ativos WHERE id_carteira IN (?)', [carteiraIds], (ativosErr, ativosResults) => {
      if (ativosErr) {
        return res.status(500).json({ message: 'Erro ao buscar ativos', error: ativosErr });
      }

      // Agrupar ativos por carteira
      const carteirasComAtivos = carteiraResults.map(carteira => {
        const ativos = ativosResults.filter(ativo => ativo.id_carteira === carteira.id);
        return {
          ...carteira,
          ativos: ativos.map(ativo => ({
            id: ativo.id,
            usuario: ativo.usuario,
            ativo: ativo.ativo,
            taxa_de_corretagem: ativo.taxa_de_corretagem,
            data_registro: ativo.data_registro
          }))
        };
      });

      res.json(carteirasComAtivos);
    });
  });
});

// DELETE: Deletar uma carteira e seus ativos
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao iniciar transação', error: err });
    }

    // Primeiro, excluir os ativos relacionados à carteira
    db.query('DELETE FROM ativos WHERE id_carteira = ?', [id], (ativosErr) => {
      if (ativosErr) {
        return db.rollback(() => {
          console.error("Erro ao deletar ativos:", ativosErr);
          res.status(500).json({ message: 'Erro ao deletar ativos', error: ativosErr });
        });
      }

      // Em seguida, excluir a própria carteira
      db.query('DELETE FROM carteira WHERE id = ?', [id], (carteiraErr, results) => {
        if (carteiraErr) {
          return db.rollback(() => {
            console.error("Erro ao deletar carteira:", carteiraErr);
            res.status(500).json({ message: 'Erro ao deletar carteira', error: carteiraErr });
          });
        }

        if (results.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({ message: 'Carteira não encontrada' });
          });
        }

        // Commit da transação
        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              console.error("Erro ao finalizar transação:", commitErr);
              res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr });
            });
          }

          res.json({ message: 'Carteira e ativos deletados com sucesso' });
        });
      });
    });
  });
});



router.post('/inserir', authenticateToken, (req, res) => {
  const dados = req.body.dados;

  const {
    usuario,
    titulo_da_carteira,
    perfil_do_investidor,
    capital,
    modalidade,
    mercados,
    corretora,
    outras_taxas,
    emolumentos_da_bolsa,
    taxa_de_custodia,
    spread,
    ativos // Array de ativos: [{ ativo: 'PETR4', taxa_de_corretagem: 10 }, ...]
  } = dados;

  // Verificar se a carteira já existe
  db.query(
    'SELECT * FROM carteira WHERE titulo_da_carteira = ? AND usuario = ?',
    [titulo_da_carteira, usuario],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao verificar carteira', error: err });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'Carteira já existe para este usuário' });
      } else {
        // Iniciar transação
        db.beginTransaction((transErr) => {
          if (transErr) {
            return res.status(500).json({ message: 'Erro ao iniciar transação', error: transErr });
          }

          // Inserir a carteira
          db.query(
            `INSERT INTO carteira (
              usuario, titulo_da_carteira, perfil_do_investidor, capital,
              modalidade, mercados, corretora, outras_taxas,
              emolumentos_da_bolsa, taxa_de_custodia, spread, data_registro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              usuario,
              titulo_da_carteira,
              perfil_do_investidor,
              capital,
              modalidade,
              mercados,
              corretora,
              outras_taxas,
              emolumentos_da_bolsa,
              taxa_de_custodia,
              spread
            ],
            (insertErr, insertResult) => {
              if (insertErr) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Erro ao inserir carteira', error: insertErr });
                });
              }

              const carteiraId = insertResult.insertId;

              // Inserir os ativos vinculados à carteira
              if (ativos && Array.isArray(ativos) && ativos.length > 0) {
                const ativosValues = ativos.map(a => [
                  usuario,
                  a.ativo,
                  a.taxa_de_corretagem,
                  carteiraId,
                  new Date()
                ]);

                db.query(
                  `INSERT INTO ativos (usuario, ativo, taxa_de_corretagem, id_carteira, data_registro) VALUES ?`,
                  [ativosValues],
                  (ativosErr) => {
                    if (ativosErr) {
                      return db.rollback(() => {
                        res.status(500).json({ message: 'Erro ao inserir ativos', error: ativosErr });
                      });
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        return db.rollback(() => {
                          res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr });
                        });
                      }

                      res.json({ message: 'Carteira e ativos inseridos com sucesso!' });
                    });
                  }
                );
              } else {
                // Se não houver ativos, apenas commit da carteira
                db.commit((commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr });
                    });
                  }

                  res.json({ message: 'Carteira inserida com sucesso, sem ativos.' });
                });
              }
            }
          );
        });
      }
    }
  );
});






export default router;