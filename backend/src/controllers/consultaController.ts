import { RequestHandler } from "express";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Language } from "../types/language";
import { Country } from "../types/country";
import { getPaisesByContinent, getAllInfo } from "../services/Pais";
import { Continent } from "../types/continent";
import z from 'zod';
import dotenv from 'dotenv';
import { findUserByUsername } from "../services/User";

dotenv.config();

const formatarGemini = async (prompt: string) => {
    const apiKey = process.env.GOOGLEAPIKEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ]
    };

    try {
        const response = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const resposta = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.';
        return resposta;

    } catch (error: any) {
        console.error('Erro ao chamar a API do Gemini:', error.response?.data || error.message);
        return 'Erro ao gerar resposta com Gemini.';
    }
};

const gerarJson = (result: string) => {
    try {
        //removendo blocos de markdown ```json e ```
        const cleaned = result
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const json = JSON.parse(cleaned);
        return json;
    } catch (error) {
        console.error("Erro ao converter string para JSON:", error);
        return null;
    }
};

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

        return parseFloat(valorCustoDeVida);
    } catch (error) {
        //console.error(`Erro ao extrair informações de custo de vida para ${countryName}:`, error);
        return 0;
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
        console.error('Erro ao obter cotação:', error);
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

    const imagensFull = response.data.results.map((i: { urls: { full: any; }; }) => i.urls.full);
    return imagensFull;
};

export const testRoute: RequestHandler = async (req, res, next) => {
    const a = await obterFotoPais('Spain');
    console.log(a);

    res.json({
        s: 0
    });
};

export const getConsulta: RequestHandler = async (req, res, next) => {
    if (!req.params.username) return next({ status: 400, message: 'Dados inválidos!' });

    //variaveis
    const user = await findUserByUsername(req.params.username);
    let countries: Country[] = [];
    const paises: any = [];

    if (!user) return next({ status: 400, message: 'Dados inválidos!' });

    //filtrar continentes
    for (let i = 0; i < user.favoriteContinent.length; i++) {
        const infoPais = await getPaisesByContinent(user.favoriteContinent[i]);
        infoPais.forEach((pais) => {
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
                countryDisposableIncome: 0,
                countryCostOfLiving: 0,
                resumeCountry: pais.resume_country,
                eligible: false
            });
        });
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
            countries[i].salaryByChosenProfession = parseFloat(salarioPais?.mediaDeCarreira);
            if ((parseFloat(salarioPais.mediaDeCarreira) / 12) >= user.salaryExpect) {
                //a expectativa salarial do pais em análise é superir a expectativa do usuário
                //então este país é elegível
                countries[i].eligible = true;
            }
        }
    }

    //filtrar custo de vida            
    const currentDisposableIncome = user.salary - user.costOfLiving;
    for (let i = 0; i < countries.length; i++) {
        if (!countries[i].eligible) continue; //ignora paises não elegíveis

        //otimizar com extração de dados via mongoDB
        const custoDeVidaPais = await extrairResumoCustoDeVida(countries[i].nameEnUs);
        const countryDisposableIncome = (countries[i].salaryByChosenProfession / 12) - custoDeVidaPais;
        countries[i].countryCostOfLiving = custoDeVidaPais;
        countries[i].countryDisposableIncome = countryDisposableIncome;

        if (currentDisposableIncome > countryDisposableIncome) {
            //se o que sobra do país atual é maior que o país sendo comparado, 
            // então ele não é mais elegível           
            countries[i].eligible = false;
        }
    }

    //eleger 3 dos países restantes
    countries = countries.filter((pais: any) => pais.eligible);
    countries = countries
        .sort((a, b) => b.countryDisposableIncome - a.countryDisposableIncome) // decrescente
        .slice(0, 3) // pega os 3 maiores        
    for (let i = 0; i < countries.length; i++) {
        countries[i].photos_url = await obterFotoPais(countries[i].nameEnUs);
    }

    if (countries.length > 0) {
        res.status(200).json({
            error: false,
            countries
        })
    } else {
        //enviando erro para o errorHandler
        next({
            status: 200,
            message: 'Nenhum país foi encontrado para esta busca.'
        });
    }
};

export const getInfo: RequestHandler = async (req, res, next) => {
    const info = await getAllInfo();
    const userInfo = await findUserByUsername(req.query.username as string);

    if (!info || !userInfo) return next({ status: 500, message: 'Ocorreu um erro ao buscar os dados.' });

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

    const html = {
        professions,
        countries,
        subregions,
        languages,
        salary: userInfo.salary,
        costOfLiving: userInfo.costOfLiving,
        salaryExpect: userInfo.salaryExpect
    }

    res.status(200).json({
        html
    });
};