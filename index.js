import express from 'express';
import cors from 'cors';

import estrategia from './routes/Estrategia/route.js';
import login from './routes/Login/login.js'

const app = express();
const PORT = process.env.PORTA || 3000;

app.use(express.json());
app.use(cors()); // aceitando todos

// Rotas
app.use('/', login);
app.use('/estrategia', estrategia);




app.listen(PORT, () => {
    console.log(`SERVIDOR ONLINE na porta ${PORT}`);
});


export default app;


