import { Router } from "express";
import * as consultaController from '../controllers/consultaController';
import * as authController from '../controllers/authController';
import * as userController from '../controllers/userController';
import { privateRoute } from "../libs/passport";

const router = Router();

//rotas de autenticação
router.post('/login', authController.login);
router.post('/register', authController.register);

//realizar consulta
router.get('/consulta', privateRoute, consultaController.getConsulta);
router.get('/info', privateRoute, consultaController.getInfo);

//usuário
router.put('/:username', privateRoute, userController.updateInfo);

export default router;