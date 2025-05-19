import { RequestHandler } from "express";
import { findUserByUsername } from "../services/User";
import { getProfessionPtBr } from "../services/Profession";
import { getLanguagesPtBr } from "../services/Language";
import { getSubRegionsPtBr } from "../services/Subregion";  
import { getCountryNamePtBr } from "../services/Pais";

export const getHome: RequestHandler = async (req, res) => {
    const username = (req.user as any).username;
    const userInfo = await findUserByUsername(username);

    if (!userInfo) return res.redirect('/login');

    // Traduzir profissão
    const professionPtBr = await getProfessionPtBr(userInfo.profession);

    // Traduzir idiomas
    const languagesPtBr = await getLanguagesPtBr(userInfo.languages);

    // Traduzir continentes
    const continentsPtBr = await getSubRegionsPtBr(userInfo.favoriteContinent);

    // Traduzir país de origem
    const originCountryPtBr = await getCountryNamePtBr(userInfo.originCountry);


    res.render('pages/home', {
        username: username,
        name: (req.user as any).name,
        profession: professionPtBr,
        salary: userInfo.salary,
        costOfLiving: userInfo.costOfLiving,
        favoriteContinent: continentsPtBr.join(', '),
        languages: languagesPtBr.join(', '),
        originCountry: originCountryPtBr,
        expectedSalary: userInfo.salaryExpect
    });
};

