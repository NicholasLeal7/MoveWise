import { connect } from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

export const mongoConnect = async () => {
    try {
        await connect(process.env.DATABASE as string);
        //console.log("Conectado ao mongoDB.");
    } catch (err) {
        console.log("Não foi possível conectar ao mongoDB.", err);
    }
}