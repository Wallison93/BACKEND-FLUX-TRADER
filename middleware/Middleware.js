import jwt from 'jsonwebtoken';
import { SECRET_KEY } from '../config/env.js';

export default function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) return res.status(403).json({ message: 'Token não fornecido!' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido!' });

        req.user = user;
        next();
    });
};
