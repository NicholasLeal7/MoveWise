import { RequestHandler } from "express"
import z from 'zod';
import JWT from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { findUserByUsername, createUser } from "../services/User";

export const login: RequestHandler = async (req, res) => {
    const loginSchema = z.object({
        username: z.string().max(100),
        password: z.string()
    });

    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
        res.status(400).json({ error: true, message: 'Dados inválidos!' });
        return;
    }

    const user = await findUserByUsername(body.data.username);
    if (user && bcrypt.compareSync(body.data.password, user.password)) {
        const payload = { _id: user._id, username: user.username, name: user.name };
        const token = JWT.sign(payload, process.env.JWT_SECRET_KEY as string, { expiresIn: '2h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2 * 60 * 60 * 1000 // 2 horas
        });

        res.json({
            error: false,
            token,
            user: {
                username: user.username,
                name: user.name
            }
        });
        return;
    }

    res.status(401).json({ error: true, message: 'Usuário ou senha inválidos!' });
    return;
};

export const register: RequestHandler = async (req, res, next) => {
    const registerSchema = z.object({
        name: z.string().max(100),
        username: z.string().max(100),
        email: z.string().email(),
        password: z.string().transform(password => bcrypt.hashSync(password, 10))
    })

    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
        res.status(400).json({ error: true, message: 'Dados inválidos!' });
        return;
    }

    const user = await findUserByUsername(body.data.username);
    if (user) {
        res.status(400).json({ error: true, message: 'Este nome de usuário já está cadastrado!' });
        return;
    }

    const newUser = await createUser(body.data);
    if (newUser) {
        const payload = { _id: newUser._id, username: newUser.username, name: newUser.name };
        const token = JWT.sign(payload, process.env.JWT_SECRET_KEY as string, { expiresIn: '2h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2 * 60 * 60 * 1000 // 2 horas
        });

        res.json({ error: false });
        return;
    }

    res.status(500).json({ error: true, message: 'Erro ao criar usuário' });
};

export const logout: RequestHandler = (req, res, next) => {
    res.clearCookie('token');
    return res.redirect('/');
};

export const getRegister: RequestHandler = (req, res) => {
    res.render('pages/register');
};
