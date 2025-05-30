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

export const getCountryInfo = async (country: string) => {
    const countryInfo = await Pais.findOne({
        name_en_us: country
    });
    return countryInfo;
};

export const getAllInfo = async () => {
    const professions = await Profession.find().sort({ nome_profissao: 1 });
    const subregions = await Subregion.find().sort({ nome_ptbr: 1 });
    const countries = await Pais.find().sort({ name_pt_br: 1 });
    const languages = await Language.find().sort({ nome_ptbr: 1 });

    if (!professions || !subregions || !countries || !languages) return false;

    return {
        professions,
        subregions,
        countries,
        languages
    }
};

export const getCountryNamePtBr = async (countryNameEnUs: string): Promise<string> => {
    const country = await Pais.findOne({
        name_en_us: countryNameEnUs
    });

    return country?.name_pt_br || countryNameEnUs;
};