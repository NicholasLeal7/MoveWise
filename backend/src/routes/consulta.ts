import { Router } from "express";
import * as consulta from '../controllers/consulta';

const router = Router();

//realizar consulta
router.get('/', consulta.getPaises);

export default router;