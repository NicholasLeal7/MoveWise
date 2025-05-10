import { RequestHandler } from "express"
import z from 'zod';
import JWT from 'jsonwebtoken';
import { findUserByUsername, createUser } from "../services/User";

export const login: RequestHandler = async (req, res, next) => {
    const loginSchema = z.object({
        username: z.string().max(100),
        password: z.string()
    })

    const body = loginSchema.safeParse(req.body);
    if (!body.success) return next({ message: 'Dados inválidos!', status: 400 });

    const user = await findUserByUsername(body.data.username);

    if (user && user.password === body.data.password) {
        const payload = { _id: user._id };
        const token = JWT.sign(payload, process.env.JWT_SECRET_KEY as string, { expiresIn: '2h' });

        res.status(200).json({
            user,
            token
        });
        return;
    }

    return next({ message: 'Usuário não encontrado!', status: 400 });
};

export const register: RequestHandler = async (req, res, next) => {
    const registerSchema = z.object({
        name: z.string().max(100),
        username: z.string().max(100),
        email: z.string().email(),
        password: z.string()
    })

    const body = registerSchema.safeParse(req.body);
    if (!body.success) return next({ message: 'Invalid data!', status: 400 });

    const user = await findUserByUsername(body.data.username);
    if (user) return next({ message: 'Este nome de usuário já está cadastrado!', status: 400 });

    const newUser = await createUser(body.data);
    if (newUser) {
        const payload = { _id: newUser._id };
        const token = JWT.sign(payload, process.env.JWT_SECRET_KEY as string, { expiresIn: '2h' });

        res.status(201).json({
            user: newUser,
            token
        });
        return;
    }

    return next({ message: 'An error occured', status: 500 });
};