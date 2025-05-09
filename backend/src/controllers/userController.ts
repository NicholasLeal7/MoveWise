import { RequestHandler } from "express"
import z from 'zod';
import { updateUserPreferences } from "../services/User";

export const updateInfo: RequestHandler = async (req, res, next) => {
    const username = req.params.username;
    if (!username) next({ status: 400, message: 'Usuário não encontrado' });

    const updateSchema = z.object({
        profession: z.string(),
        costOfLiving: z.number(),
        favoriteContinent: z.array(z.string()),
        languages: z.array(z.string()),
        originCountry: z.string(),
        salary: z.number(),
        salaryExpect: z.number()
    });

    const body = updateSchema.safeParse(req.body);
    if (!body.success && !body.data) return next({ status: 400, message: 'Dados inválidos' });

    const updatedUser = await updateUserPreferences(username, body.data);

    res.status(200).json({
        updatedUser
    })
};