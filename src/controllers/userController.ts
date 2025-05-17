import { RequestHandler } from "express"
import z from 'zod';
import { updateUserPreferences, findUserByUsername } from "../services/User";
import { getAllInfo } from "../services/Pais";

export const updateInfo: RequestHandler = async (req, res, next) => {
    const username = req.params.username;
    if (!username) next({ status: 400, message: 'Usuário não encontrado' });

    const updateSchema = z.object({
        profession: z.string(),
        costOfLiving: z.string().transform((val) => parseFloat(val.replace(/\D/g, '')) || 0),
        favoriteContinent: z.union([z.string(), z.array(z.string())]).transform((val) => Array.isArray(val) ? val : [val]),
        languages: z.union([z.string(), z.array(z.string())]).transform((val) => Array.isArray(val) ? val : [val]),
        originCountry: z.string(),
        salary: z.string().transform((val) => parseFloat(val.replace(/\D/g, '')) || 0),
        salaryExpect: z.string().transform((val) => parseFloat(val.replace(/\D/g, '')) || 0)
    });

    const body = updateSchema.safeParse(req.body);

    if (!body.success && !body.data) return res.redirect('/perfil');

    const updatedUser = await updateUserPreferences(username, body.data);

    res.redirect('/');
};

export const getPerfil: RequestHandler = async (req, res) => {
    const username = (req.user as any).username;
    const info = await getAllInfo();
    const userInfo = await findUserByUsername(username);

    if (!info || !userInfo) return res.redirect('/');

    //inicializar variaveis
    let professions: string = '';
    let countries: string = '';
    let subregions: string = '';
    let languages: string = '';

    //gerar html de profissões
    for (let i = 0; i < info.professions.length; i++) {
        const selected = info.professions[i].url_profissao === userInfo.profession ? 'selected' : '';
        professions += `            
            <option ${selected} value="${info.professions[i].url_profissao}">${info.professions[i].nome_profissao}</option>
        `;
    }

    //gerar html de paises
    for (let i = 0; i < info.countries.length; i++) {
        const selected = info.countries[i].name_en_us === userInfo.originCountry ? 'selected' : '';
        countries += `            
            <option ${selected} value="${info.countries[i].name_en_us}">${info.countries[i].name_pt_br}</option>
        `;
    }

    //gerar html de subregiao
    for (let i = 0; i < info.subregions.length; i++) {
        const selected = userInfo.favoriteContinent.includes(info.subregions[i].nome) ? 'selected' : '';
        subregions += `            
            <option ${selected} value="${info.subregions[i].nome}">${info.subregions[i].nome_ptbr}</option>
        `;
    }

    //gerar html de idiomas
    for (let i = 0; i < info.languages.length; i++) {
        const selected = userInfo.languages.includes(info.languages[i].nome) ? 'selected' : '';
        languages += `            
            <option ${selected} value="${info.languages[i].nome}">${info.languages[i].nome_ptbr}</option>
        `;
    }

    res.render('pages/perfil', {
        name: userInfo.name,
        username,
        professions,
        countries,
        subregions,
        languages,
        salary: userInfo.salary,
        costOfLiving: userInfo.costOfLiving,
        salaryExpect: userInfo.salaryExpect
    });
};