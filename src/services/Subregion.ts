import SubRegion from '../models/Subregion';

export const getSubRegionsPtBr = async (subRegions: string[]): Promise<string[]> => {
    const translations = await SubRegion.find({
        nome: { $in: subRegions }
    });

    return subRegions.map(region => {
        const translation = translations.find((t: { nome: string, nome_ptbr: string }) => t.nome === region);
        return translation?.nome_ptbr || region;
    });
};
