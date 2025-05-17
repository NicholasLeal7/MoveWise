import LanguageModel from '../models/Language';

export const getLanguagesPtBr = async (languages: string[]): Promise<string[]> => {
    const translations = await LanguageModel.find({
        nome: { $in: languages }
    });

    return languages.map(lang => {
        const translation = translations.find(t => t.nome === lang);
        return translation?.nome_ptbr || lang;
    });
}; 