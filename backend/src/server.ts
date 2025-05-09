import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { requestIntercepter } from './middlewares/requestIntercepter';
import consultaRoutes from './routes';
import { mongoConnect } from './instances/mongo';
import passport from 'passport';
import cors from 'cors';

//configurar servidor
const server = express();
dotenv.config();

//configurações básicas do servidor
server.use(express.json());
server.use(cors({ origin: '*' }));
server.use(express.urlencoded({ extended: true }));
server.use('*', requestIntercepter);
server.use(passport.initialize());

//inicializando banco de dados
mongoConnect()

//rotas da api
server.get('/ping', (req, res) => { res.json({ pong: true }) });
server.use('/', consultaRoutes);

//rotas de erro
server.use((req, res) => { res.status(404).json({ error: true, message: 'Rota não encontrada.' }) });
server.use(errorHandler);

server.listen(process.env.PORT, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT}`);
});