import { Schema, model, Model, connection } from "mongoose";

type PaisType = {
    currencies: string[],
    capital: string,
    code_en_us: string,
    flag_url: string,
    languages: string[],
    lat_lng: number[],
    name_en_us: string,
    photo_path: string[]
    population: number,
    subregion: string,
    name_pt_br: string
}

const modelSchema = new Schema<PaisType>({
    currencies: [String],
    capital: String,
    code_en_us: String,
    flag_url: String,
    languages: [String],
    lat_lng: [Number],
    name_en_us: String,
    photo_path: [String],
    population: Number,
    subregion: String,
    name_pt_br: String
});

const modelName: string = "paises";

export default (connection && connection.models[modelName] ?
    connection.models[modelName] as Model<PaisType>
    :
    model<PaisType>(modelName, modelSchema))