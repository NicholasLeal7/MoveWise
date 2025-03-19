import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { requestIntercepter } from './middlewares/requestIntercepter';

//configurar servidor
const server = express();
dotenv.config();

//configurações básicas do servidor
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use('*', requestIntercepter);

//rotas da api
server.get('/ping', (req, res) => { res.json({ pong: true }) });

//rotas de erro
server.use((req, res) => { res.json({ error: true, message: 'Rota não encontrada.' }) });
server.use(errorHandler);


server.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});