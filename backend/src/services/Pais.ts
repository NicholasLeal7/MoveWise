import Language from "../models/Language";
import Pais from "../models/Pais";
import Profession from "../models/Profession";
import Subregion from "../models/Subregion";

export const getPaisesByContinent = async (continent: string) => {
    const paises = await Pais.find({
        subregion: continent
    });
    return paises;
};

export const getAllInfo = async () => {
    const professions = await Profession.find();
    const subregions = await Subregion.find();
    const countries = await Pais.find();
    const languages = await Language.find()

    if (!professions || !subregions || !countries || !languages) return false;

    return {
        professions,
        subregions,
        countries,
        languages
    }
};