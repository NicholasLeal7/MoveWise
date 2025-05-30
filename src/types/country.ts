import { Continent } from "./continent"
import { Language } from "./language"

export type Country = {
    namePtBr: string,
    nameEnUs: string,
    cca2: string,
    cca2Upper?: string,
    capital: string,
    currencies: string[],
    languages: string[],
    subregion: Continent[],
    population: number,
    salaryByChosenProfession: number,
    initialSalary: number,
    lastSalary: number,
    countryDisposableIncome: number,
    countryCostOfLiving: number,
    eligible: boolean,
    resumeCountry: string,
    lat: number,
    long: number,
    photos_url?: string[],
    indexQualityOfLife?: {
        purchasingPower: number,
        safetyIndex: number,
        healthCareIndex: number,
        trafficCommute: number,
        pollutionIndex: number
    },
    climate?: number[],
    myCountry: boolean
}