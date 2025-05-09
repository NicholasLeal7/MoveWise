import { Continent } from "./continent"
import { Language } from "./language"

export type Country = {
    namePtBr: string,
    nameEnUs: string,
    cca2: string,
    capital: string,
    currencies: string[],
    languages: string[],
    subregion: Continent[],
    population: number,
    salaryByChosenProfession: number,
    countryDisposableIncome: number,
    countryCostOfLiving: number,
    eligible: boolean
}