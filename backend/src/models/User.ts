import { Schema, model, Model, connection } from "mongoose";
import { number } from "zod";

type UserType = {
    name: string;
    username: string;
    email: string;
    password: string;
    profession: string;
    costOfLiving: number;
    favoriteContinent: string[];
    languages: string[];
    originCountry: string;
    salary: number;
    salaryExpect: number;
};

const modelSchema = new Schema<UserType>({
    name: { type: String, required: true, maxlength: 100 },
    username: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 100 },
    password: { type: String, required: true, maxlength: 100 },
    profession: { type: String, required: false, maxlength: 100 },
    costOfLiving: { type: Number, required: false },
    favoriteContinent: { type: [String], required: false },
    languages: { type: [String], required: false },
    originCountry: { type: String, required: false },
    salary: { type: Number, required: false },
    salaryExpect: { type: Number, required: false },
});

const modelName: string = "users";

export default (connection && connection.models[modelName] ?
    connection.models[modelName] as Model<UserType>
    :
    model<UserType>(modelName, modelSchema))