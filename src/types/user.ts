import { Continent } from "./continent";
import { Language } from "./language";

export type User = {
    id: number,
    name: string,
    username: string,
    password: string,
    salary: number,
    salaryExpect: number,
    costOfLiving: number,
    originCountry: string,
    profession: string,
    languages: Language[],
    favoriteContinent: Continent[],
}