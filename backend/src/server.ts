import express from 'express';

const server = express();

server.get('/ping', (req, res) => { res.json({ pong: true }) })

server.listen(3000, () => {
    console.log('server rodando');
});