import { RequestHandler } from "express"
import axios from 'axios';
import { user } from "../data/user";
import * as cheerio from 'cheerio';
import { Language } from "../types/language";
import { Country } from "../types/country";
import { getPaisesByContinent } from "../services/Pais";
import { Continent } from "../types/continent";

const formatarGemini = async (prompt: string) => {
    const apiKey = 'AIzaSyBOLTOgc_q5z4kwEdd08t5SthxL6SitFlI';
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

export const getPaises: RequestHandler = async (req, res) => {
    //variaveis
    let countries: Country[] = [];
    const paises: any = [];

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
                countryCostOfLiving: 0
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
            (parseFloat(salarioPais.mediaDeCarreira) / 12) >= user.salaryExpect || countries.splice(i, 1);
        }
    }

    //filtrar custo de vida    
    const currentDisposableIncome = user.salary - user.costOfLiving;
    for (let i = 0; i < countries.length; i++) {
        //otimizar com extração de dados via mongoDB
        const custoDeVidaPais = await extrairResumoCustoDeVida(countries[i].nameEnUs);
        const countryDisposableIncome = (countries[i].salaryByChosenProfession / 12) - custoDeVidaPais;
        countries[i].countryCostOfLiving = custoDeVidaPais;
        countries[i].countryDisposableIncome = countryDisposableIncome;

        countryDisposableIncome >= currentDisposableIncome || countries.splice(i, 1);
    }

    //eleger 3 dos países restantes
    countries = countries
        .sort((a, b) => b.countryDisposableIncome - a.countryDisposableIncome) // decrescente
        .slice(0, 3) // pega os 3 maiores        

    //otimizar com API Gemini / avaliar necessidade    
    // const prompt = `
    //     Escolha 3 países entre: ${paises}. O critério para a escolha é a maior expectativa salarial para a profissão de ${user.profession}.

    //     Com base nisso, retorne **apenas** o seguinte JSON (sem nenhum texto antes ou depois das chaves):

    //     {
    //     "paisesElegiveis": [
    //         {
    //         "name": "Nome do país",
    //         "subregion": "Sub-região do país",
    //         "salaryExpect": valorEstimadoEmDólares,
    //         "languages": ["idioma1", "idioma2"],
    //         "textoApresentacao": "Escreva um breve texto atrativo sobre o país, o descrevendo.",
    //         "weatherType": "Descreva o tipo de clima predominante no país"
    //         },
    //         ...
    //     ]
    //     }

    //     Preencha o JSON com 3 países selecionados segundo o critério de maior expectativa salarial para ${user.profession}. Todos os campos devem ser preenchidos.
    // `;
    // const resultado = await formatarGemini(prompt);
    // const json = gerarJson(resultado);

    if (countries.length > 0) {
        res.status(200).json({
            error: false,
            countries
        })
    } else {
        res.status(200).json({
            error: true,
            message: 'Nenhum país foi selecionado.'
        })
    }
};
