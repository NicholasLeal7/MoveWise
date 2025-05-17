import ProfessionModel from '../models/Profession';

export const getProfessionPtBr = async (professionEnUs: string): Promise<string> => {
    const profession = await ProfessionModel.findOne({
        url_profissao: professionEnUs
    });
    return profession?.nome_profissao || professionEnUs;
}; 