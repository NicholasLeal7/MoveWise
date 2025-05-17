import { Router } from "express";
import * as consultaController from '../controllers/consultaController';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import * as homeController from '../controllers/homeController';
import { privateRoute } from "../libs/passport";

const router = Router();

//rota principal
router.get('/', privateRoute, homeController.getHome);

//rotas de autenticação - authController
router.get('/register', authController.getRegister);
router.post('/login', authController.login);
router.post('/register', authController.register);

//realizar consulta - consultaController
router.get('/consulta/:username', privateRoute, consultaController.getConsulta);

//usuário - userController
router.get('/perfil', privateRoute, userController.getPerfil);
router.post('/:username', privateRoute, userController.updateInfo);
router.get('/logout', authController.logout);

//teste
router.get('/teste', consultaController.teste);

export default router;