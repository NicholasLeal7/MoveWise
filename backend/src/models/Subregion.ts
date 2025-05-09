import { Schema, model, Model, connection } from "mongoose";

type SubregionType = {
    nome: string,
    nome_ptbr: string
}

const modelSchema = new Schema<SubregionType>({
    nome: String,
    nome_ptbr: String,
});

const modelName: string = "sub_regions";

export default (connection && connection.models[modelName] ?
    connection.models[modelName] as Model<SubregionType>
    :
    model<SubregionType>(modelName, modelSchema, modelName))