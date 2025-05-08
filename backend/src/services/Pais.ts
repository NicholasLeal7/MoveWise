import Pais from "../models/Pais";

export const getPaisesByContinent = async (continent: string) => {
    const paises = await Pais.find({
        subregion: continent
    });
    return paises;
};