import express from 'express';
import authenticateToken from '../../middleware/Middleware.js';

import db from '../../config/db.js';

const router = express.Router();


//GET

 router.get('/', authenticateToken, (req, res) => {
    db.query('SELECT * FROM estrategias ', (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao buscar estrategias', error: err });
      }
      res.json(results); // Retorna todos os estrategias
    });
  }); 


/*   // BUSCAR COM FILTRO
router.get('/:usuario', authenticateToken, (req, res) => {
  const { usuario} = req.params;

  db.query('SELECT * FROM estrategias WHERE usuario = ? ', [usuario],  (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar dados', error: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Dados não encontrados' });
    }

    res.json(results); // Retorna apenas a massa da Processo encontrada
  });
});
 */

// BUSCAR COM FILTRO
router.get('/:usuario', authenticateToken, (req, res) => {
  const { usuario } = req.params;

  // Primeiro, buscar as estratégias para o usuário
  db.query('SELECT * FROM estrategias WHERE usuario = ?', [usuario], (err, estrategiasResults) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao buscar estratégias', error: err });
    }

    if (estrategiasResults.length === 0) {
      return res.status(404).json({ message: 'Estratégias não encontradas' });
    }

    // Agora, para cada estratégia encontrada, buscamos seus indicadores
    const estrategiaIds = estrategiasResults.map(estrategia => estrategia.id);

    db.query(
      `SELECT * FROM indicadores_estrategia WHERE estrategia_id IN (?)`,
      [estrategiaIds],
      (indicadoresErr, indicadoresResults) => {
        if (indicadoresErr) {
          return res.status(500).json({ message: 'Erro ao buscar indicadores', error: indicadoresErr });
        }

        // Agrupar indicadores para cada estratégia
        const estrategiasComIndicadores = estrategiasResults.map(estrategia => {
          const indicadores = indicadoresResults.filter(indicador => indicador.estrategia_id === estrategia.id);
          return {
            ...estrategia,
            indicadores: indicadores.map(indicador => ({
              indicador: indicador.indicador,
              configuracao: indicador.configuracao
            }))
          };
        });

        // Retornar as estratégias com seus indicadores
        res.json(estrategiasComIndicadores);
      }
    );
  });
});

/* router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Executar a query para deletar o Balanca com o id fornecido
  db.query('DELETE FROM estrategias WHERE id = ?', [id],(err, results) => {
    if (err) {
      console.error("Erro ao deletar estrategias:", err); // Exibe o erro no servidor
      return res.status(500).json({ message: 'Erro ao deletar estrategias', error: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'estrategias não encontrado' });
    }

    res.json({ message: 'estrategias deletada com sucesso' });
  });
}); */

// DELETE ESTRATEGIA E SEUS INDICADORES
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  // Iniciar uma transação para garantir que ambas as exclusões ocorram corretamente
  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Erro ao iniciar transação', error: err });
    }

    // Excluir os indicadores associados à estratégia
    db.query('DELETE FROM indicadores_estrategia WHERE estrategia_id = ?', [id], (indicadoresErr) => {
      if (indicadoresErr) {
        return db.rollback(() => {
          console.error("Erro ao deletar indicadores:", indicadoresErr);
          res.status(500).json({ message: 'Erro ao deletar indicadores', error: indicadoresErr });
        });
      }

      // Excluir a estratégia
      db.query('DELETE FROM estrategias WHERE id = ?', [id], (estrategiaErr, results) => {
        if (estrategiaErr) {
          return db.rollback(() => {
            console.error("Erro ao deletar estrategia:", estrategiaErr);
            res.status(500).json({ message: 'Erro ao deletar estrategia', error: estrategiaErr });
          });
        }

        if (results.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({ message: 'Estratégia não encontrada' });
          });
        }

        // Commit da transação após as duas exclusões terem sido bem-sucedidas
        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              console.error("Erro ao cometer transação:", commitErr);
              res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr });
            });
          }

          // Resposta de sucesso
          res.json({ message: 'Estratégia e indicadores deletados com sucesso' });
        });
      });
    });
  });
});





 /*  // INSERIR
router.post('/inserir', authenticateToken, (req, res) => {
  const dados = req.body.dados;

  const {
    usuario,
    carteira,
    titulo,
    meta,
    perda,
    parcial,
    medio,
    tempo,
    medidaTempo,
    observacao
  } = dados;

  // Verificar se o ViscosidadeDaAgua já existe na tabela
  db.query(
    'SELECT * FROM estrategias WHERE titulo = ? AND usuario = ?',
    [dados.titulo, dados.usuario
    ],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao usuario', error: err });
      }

      if (results.length > 0) {
        // Se o ViscosidadeDaAgua já existe, faz UPDATE

        res.json({ message: 'Estrategia já existente!' });

      } else {
        // Se o ViscosidadeDaAgua não existe, faz INSERT
        db.query(
          `INSERT INTO estrategias
                ( usuario,
                  carteira,
                  titulo,
                  meta,
                  perda,
                  parcial,
                  medio,
                  tempo,
                  medidaTempo,
                  observacao
                  ) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [    
            usuario,
            carteira,
            titulo,
            meta,
            perda,
            parcial,
            medio,
            tempo,
            medidaTempo,
            observacao
          ],
          (insertErr) => {
            if (insertErr) {
              return res.status(500).json({ message: 'Erro ao inserir Estrategia', error: insertErr });
            }
            res.json({ message: 'Estrategia inserido com sucesso!' });
          }
        );
      }
    }
  );
});
 */

router.post('/inserir', authenticateToken, (req, res) => {
  const dados = req.body.dados;

  const {
    usuario,
    carteira,
    titulo,
    meta,
    perda,
    parcial,
    medio,
    tempo,
    medidaTempo,
    observacao,
    indicadores // Assuming this is an array of indicadores to be inserted
  } = dados;

  // Verificar se a estratégia já existe na tabela
  db.query(
    'SELECT * FROM estrategias WHERE titulo = ? AND usuario = ?',
    [dados.titulo, dados.usuario],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erro ao verificar estrategia', error: err });
      }

      if (results.length > 0) {
        // Se a estratégia já existe, faz um UPDATE
        return res.json({ message: 'Estratégia já existente!' });
      } else {
        // Inserir a nova estratégia
        db.query(
          `INSERT INTO estrategias
                (usuario, carteira, titulo, meta, perda, parcial, medio, tempo, medidaTempo, observacao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [usuario, carteira, titulo, meta, perda, parcial, medio, tempo, medidaTempo, observacao],
          (insertErr, insertResult) => {
            if (insertErr) {
              return res.status(500).json({ message: 'Erro ao inserir Estrategia', error: insertErr });
            }

            // Recuperar o id da estratégia inserida
            const estrategiaId = insertResult.insertId;

            // Inserir os indicadores na tabela indicadores_estrategia
            if (indicadores && Array.isArray(indicadores) && indicadores.length > 0) {
              const indicadoresValues = indicadores.map(indicador => [
                usuario,
                estrategiaId,
                indicador.indicador,    // Assuming indicador has "indicador" and "configuracao" properties
                indicador.configuracao
              ]);

              // Inserir indicadores
              db.query(
                `INSERT INTO indicadores_estrategia (usuario, estrategia_id, indicador, configuracao)
                 VALUES ?`,
                [indicadoresValues],
                (indicadoresErr) => {
                  if (indicadoresErr) {
                    return res.status(500).json({ message: 'Erro ao inserir indicadores', error: indicadoresErr });
                  }

                  // Resposta de sucesso
                  res.json({ message: 'Estratégia e indicadores inseridos com sucesso!' });
                }
              );
            } else {
              // Se não houver indicadores para inserir
              res.json({ message: 'Estratégia inserida com sucesso, mas sem indicadores!' });
            }
          }
        );
      }
    }
  );
});




export default router;