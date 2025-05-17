import express from 'express';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { requestIntercepter } from './middlewares/requestIntercepter';
import mainRoutes from './routes';
import { mongoConnect } from './instances/mongo';
import passport from 'passport';
import mustache from 'mustache-express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';

//configurar servidor
const server = express();
dotenv.config();

//configurações básicas do servidor
server.use(express.json());
server.use(cors({ origin: '*' }));
server.use(express.urlencoded({ extended: true }));
server.use(express.static(path.join(__dirname, '../public')));
server.use('*', requestIntercepter);
server.use(passport.initialize());
server.use(cookieParser());

//config do mustache
server.set('view engine', 'mustache');
server.set('views', path.join(__dirname, 'views'));
server.engine('mustache', mustache());

//inicializando banco de dados
mongoConnect()

//rotas da api
server.get('/ping', (req, res) => { res.json({ pong: true }) });
server.use('/', mainRoutes);

//rotas de erro
server.use((req, res) => {
    res.render('pages/notFounded');
});
server.use(errorHandler);

server.listen(process.env.PORT, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT}`);
});