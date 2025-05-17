import { Schema, model, Model, connection } from "mongoose";

type LanguageType = {
    nome: string,
    nome_ptbr: string
}

const modelSchema = new Schema<LanguageType>({
    nome: String,
    nome_ptbr: String,
});

const modelName: string = "idiomas";

export default (connection && connection.models[modelName] ?
    connection.models[modelName] as Model<LanguageType>
    :
    model<LanguageType>(modelName, modelSchema, modelName))