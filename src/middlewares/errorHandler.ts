import { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    res.status(err.status || 404).json({
        error: true,
        message: err.message || 'Ocorreu um erro'
    });
};