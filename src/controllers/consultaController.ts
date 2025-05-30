import { RequestHandler } from "express";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Language } from "../types/language";
import { Country } from "../types/country";
import { getPaisesByContinent, getAllInfo, getCountryInfo } from "../services/Pais";
import { Continent } from "../types/continent";
import z from 'zod';
import dotenv from 'dotenv';
import { findUserByUsername } from "../services/User";
import { getProfessionPtBr } from "../services/Profession";
import { getLanguagesPtBr } from "../services/Language";

dotenv.config();

const extrairResumoCustoDeVida = async (countryName: string) => {
    try {
        const url = `https://www.numbeo.com/cost-of-living/country_result.jsp?country=${encodeURIComponent(countryName)}`;
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        //seleciona a div pelo seletor de classes
        //const resumo = $('.seeding-call.table_color.summary.limit_size_ad_right.padding_lower.other_highlight_color').html();

        //extrai apenas o texto sem HTML
        //const resumoTexto = $('.seeding-call.table_color.summary.limit_size_ad_right.padding_lower.other_highlight_color').text().trim();
        const resumoTexto = $('.seeding-call.table_color.summary.limit_size_ad_right.padding_lower.other_highlight_color ul li:nth-of-type(2)').text().trim();
        const valorCustoDeVida = resumoTexto.split('.')[0].replace(/[^\d]/g, '');

        const cotacaoDolar = await obterCotacao('USD') || '1';

        return parseFloat(valorCustoDeVida) * parseFloat(cotacaoDolar);
    } catch (error) {
        //console.error(`Erro ao extrair informações de custo de vida para ${countryName}:`, error);
        return 0;
    }
};

const extrairIndicesQualidadeDeVida = async (countryName: string) => {
    try {
        const url = `https://www.numbeo.com/quality-of-life/country_result.jsp?country=${encodeURIComponent(countryName)}`;
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        //extrai apenas o texto sem HTML        
        // Função utilitária para pegar o valor antes da vírgula de um índice específico
        const getValue = (title: string): number => {
            const row = $('table tbody tr').filter((_, el) => $(el).text().includes(title)).first();
            const valueText = row.find('td').eq(1).text().trim();
            return parseInt(valueText.split('.')[0], 10); // pega só o número antes da vírgula
        };

        // Pegando os 5 valores desejados
        const purchasingPower = getValue('Purchasing Power Index');
        const safetyIndex = getValue('Safety Index');
        const healthCareIndex = getValue('Health Care Index');
        const trafficCommute = getValue('Traffic Commute Time Index');
        const pollutionIndex = getValue('Pollution Index');

        return {
            purchasingPower,
            safetyIndex,
            healthCareIndex,
            trafficCommute,
            pollutionIndex
        }
    } catch (error) {
        return {
            purchasingPower: 0,
            safetyIndex: 0,
            healthCareIndex: 0,
            trafficCommute: 0,
            pollutionIndex: 0
        };
    }
};

const extrairClimaPais = async (latitude: number, longitude: number) => {
    try {
        const url = `https://climate.mapresso.com/api/data/?lat=${latitude}&lon=${longitude}`;
        const { data } = await axios.get(url);

        return data.data.map((mes: { temp: number }) => Math.round(mes.temp));
    } catch (error) {
        return Array(12).fill(0);
    }
};

const obterCotacao = async (tipoMoeda: string): Promise<string | null> => {
    try {
        if (tipoMoeda === 'BRL') return '1';

        const urlApiCambio = `https://economia.awesomeapi.com.br/last/${tipoMoeda}-BRL`;
        const response = await axios.get(urlApiCambio);
        const chave = `${tipoMoeda}BRL`;
        const bid = response.data[chave]?.bid;
        return bid || null;
    } catch (error) {
        //console.error('Erro ao obter cotação:', error);
        return null;
    }
};

const extrairMediaSalarial = async (countryAcronym: string, profession: string) => {
    try {
        const url = `https://www.payscale.com/research/${countryAcronym.toUpperCase()}/Job=${profession}/Salary`;
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        //extrai média salarial  
        let salario = $('.paycharts__percentile--text').text().trim();

        //obter sigla da moeda
        let aux: string[] = salario.split('(');
        let tipoMoeda: string = aux[1].replace(')', '').trim();

        //obter valor convertido da moeda
        const valorMoedaEmReal = await obterCotacao(tipoMoeda);
        const cotacao = parseFloat(valorMoedaEmReal || '0');

        //extrai valores de início, meio e fim de carreira
        const media: any = $('.tablerow__value').first().text().trim().split('-');
        const salarioCarreira = {
            inicioDeCarreira: (parseFloat(media[0].replace('k', '000').replace(/[^\d]/g, '')) * cotacao).toFixed(2),
            mediaDeCarreira: (parseFloat(salario.replace(/[^\d]/g, '')) * cotacao).toFixed(2),
            fimDeCarreira: (parseFloat(media[1].replace('k', '000').replace(/[^\d]/g, '')) * cotacao).toFixed(2)
        }

        return salarioCarreira || null;
    } catch (error) {
        //console.error(`Erro ao extrair informações:`, error);
        return null;
    }
};

const obterFotoPais = async (countryName: string) => {
    const url = `https://api.unsplash.com/search/photos?query=${countryName}+beautiful+city&per_page=3`;

    const response = await axios.get(url, {
        headers: {
            'Authorization': `Client-ID ${process.env.PHOTO_API}`
        }
    });

    const imagensFull = response.data.results.map((i: { urls: { full: any; }; }, index: number) => ({
        url: i.urls.full,
        first: index === 0
    }));
    return imagensFull;
};

export const getConsulta: RequestHandler = async (req, res, next) => {
    if (!req.params.username) return next({ status: 400, message: 'Dados inválidos!' });

    //variaveis
    const user: any = await findUserByUsername(req.params.username);
    if (user.profession) {
        user.professionPtBr = await getProfessionPtBr(user.profession);

        let countries: Country[] = [];
        const paises: any = [];
        const userCountry = await getCountryInfo(user.originCountry);
        let userCountryInfo: Country;

        if (!user) return next({ status: 400, message: 'Dados inválidos!' });
        if (!userCountry) return next({ status: 400, message: 'Dados inválidos!' });

        //filtrar continentes
        for (let i = 0; i < user.favoriteContinent.length; i++) {
            const infoPais = await getPaisesByContinent(user.favoriteContinent[i]);
            infoPais.forEach((pais) => {
                if (pais.name_en_us !== user.originCountry) {
                    countries.push({
                        namePtBr: pais.name_pt_br,
                        nameEnUs: pais.name_en_us,
                        cca2: pais.code_en_us,
                        capital: pais.capital,
                        currencies: pais.currencies,
                        subregion: [pais.subregion as Continent],
                        population: pais.population,
                        languages: pais.languages,
                        salaryByChosenProfession: 0,
                        initialSalary: 0,
                        lastSalary: 0,
                        countryDisposableIncome: 0,
                        countryCostOfLiving: 0,
                        resumeCountry: pais.resume_country,
                        eligible: false,
                        lat: pais.lat_lng[0],
                        long: pais.lat_lng[1],
                        myCountry: false
                    });
                }
            });
        }
        userCountryInfo = {
            namePtBr: userCountry.name_pt_br,
            nameEnUs: userCountry.name_en_us,
            cca2: userCountry.code_en_us,
            capital: userCountry.capital,
            currencies: userCountry.currencies,
            subregion: [userCountry.subregion as Continent],
            population: userCountry.population,
            languages: userCountry.languages,
            salaryByChosenProfession: 0,
            initialSalary: 0,
            lastSalary: 0,
            countryDisposableIncome: 0,
            countryCostOfLiving: 0,
            resumeCountry: userCountry.resume_country,
            eligible: false,
            lat: userCountry.lat_lng[0],
            long: userCountry.lat_lng[1],
            myCountry: true
        }


        //filtrar países por idioma e obter nomes    
        countries = countries.filter((pais: any) => {
            const idiomas: Language[] = pais.languages;

            if (idiomas.some(idioma => user.languages.includes(idioma))) {
                paises.push(pais.namePtBr);
                return true;
            }

            return false;
        });

        //filtrar salario            
        for (let i = 0; i < countries.length; i++) {
            const salarioPais = await extrairMediaSalarial(countries[i].cca2, user.profession);

            if (salarioPais?.mediaDeCarreira) {
                countries[i].salaryByChosenProfession = parseInt(salarioPais?.mediaDeCarreira);
                countries[i].initialSalary = parseInt(salarioPais?.inicioDeCarreira);
                countries[i].lastSalary = parseInt(salarioPais?.fimDeCarreira);
                if ((parseFloat(salarioPais.mediaDeCarreira) / 12) >= user.salaryExpect) {
                    //a expectativa salarial do pais em análise é superir a expectativa do usuário
                    //então este país é elegível
                    countries[i].eligible = true;
                }
            }
        }
        const salarioPaisUsuario = await extrairMediaSalarial(userCountryInfo.cca2, user.profession);
        if (salarioPaisUsuario?.mediaDeCarreira) {
            userCountryInfo.salaryByChosenProfession = parseInt(salarioPaisUsuario.mediaDeCarreira);
            userCountryInfo.initialSalary = parseInt(salarioPaisUsuario.inicioDeCarreira);
            userCountryInfo.lastSalary = parseInt(salarioPaisUsuario.fimDeCarreira);
        }

        //filtrar custo de vida            
        const currentDisposableIncome = user.salary - user.costOfLiving;
        for (let i = 0; i < countries.length; i++) {
            if (!countries[i].eligible) continue; //ignora paises não elegíveis

            //otimizar com extração de dados via mongoDB
            const custoDeVidaPais = await extrairResumoCustoDeVida(countries[i].nameEnUs);
            const countryDisposableIncome = (countries[i].salaryByChosenProfession / 12) - custoDeVidaPais;
            countries[i].countryCostOfLiving = custoDeVidaPais;
            countries[i].countryDisposableIncome = parseInt(countryDisposableIncome.toFixed(0));

            if (currentDisposableIncome > countryDisposableIncome) {
                //se o que sobra do país atual é maior que o país sendo comparado, 
                // então ele não é mais elegível           
                countries[i].eligible = false;
            }
        }
        userCountryInfo.countryCostOfLiving = user.costOfLiving;
        userCountryInfo.countryDisposableIncome = user.salary - user.costOfLiving;

        //eleger 3 dos países restantes
        countries = countries.filter((pais: any) => pais.eligible);
        countries = countries
            .sort((a, b) => b.countryDisposableIncome - a.countryDisposableIncome) // decrescente
            .slice(0, 3) // pega os 3 maiores        
        for (let i = 0; i < countries.length; i++) {
            //dados paises
            countries[i].cca2 = countries[i].cca2.toLowerCase();
            countries[i].cca2Upper = countries[i].cca2.toUpperCase();
            countries[i].salaryByChosenProfession = countries[i].salaryByChosenProfession / 12;
            countries[i].initialSalary = countries[i].initialSalary / 12;
            countries[i].lastSalary = countries[i].lastSalary / 12;
            countries[i].photos_url = await obterFotoPais(countries[i].nameEnUs);
            countries[i].languages = await getLanguagesPtBr(countries[i].languages);
            countries[i].indexQualityOfLife = await extrairIndicesQualidadeDeVida(countries[i].nameEnUs);
            countries[i].climate = await extrairClimaPais(countries[i].lat, countries[i].long);
        }
        userCountryInfo.namePtBr = 'Seu país (' + userCountryInfo.namePtBr + ')';
        userCountryInfo.cca2 = userCountryInfo.cca2.toLowerCase();
        userCountryInfo.cca2Upper = userCountryInfo.cca2.toUpperCase();
        userCountryInfo.salaryByChosenProfession = userCountryInfo.salaryByChosenProfession / 12;
        userCountryInfo.initialSalary = userCountryInfo.initialSalary / 12;
        userCountryInfo.lastSalary = userCountryInfo.lastSalary / 12;
        userCountryInfo.photos_url = await obterFotoPais(userCountryInfo.nameEnUs);
        userCountryInfo.languages = await getLanguagesPtBr(userCountryInfo.languages);
        userCountryInfo.indexQualityOfLife = await extrairIndicesQualidadeDeVida(userCountryInfo.nameEnUs);
        userCountryInfo.climate = await extrairClimaPais(userCountryInfo.lat, userCountryInfo.long);

        countries.push(userCountryInfo);

        if (countries.length > 0) {
            res.render('pages/recomendacoes', {
                username: req.params.username,
                countries: countries,
                countriesJson: JSON.stringify(countries),
                user: {
                    name: (req.user as any).name,
                    profession: user.professionPtBr || user.profession,
                    professionEnUs: user.profession,
                    salary: user.salary,
                    costOfLiving: user.costOfLiving,
                    favoriteContinent: user.favoriteContinent.join(', '),
                    languages: user.languages.join(', '),
                    originCountry: user.originCountry,
                    salaryExpect: user.salaryExpect
                }
            });
        } else {
            res.render('pages/noCountriesFounded');
        }
    };
}