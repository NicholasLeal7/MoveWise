import { Schema, model, Model, connection } from "mongoose";

type ProfessionType = {
    nome_profissao: string,
    url_profissao: string
}

const modelSchema = new Schema<ProfessionType>({
    nome_profissao: String,
    url_profissao: String,
});

const modelName: string = "profissoes";

export default (connection && connection.models[modelName] ?
    connection.models[modelName] as Model<ProfessionType>
    :
    model<ProfessionType>(modelName, modelSchema, modelName))