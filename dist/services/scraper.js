"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSubAreas = fetchSubAreas;
exports.fetchDetailAreas = fetchDetailAreas;
exports.resolveLastPageUrl = resolveLastPageUrl;
exports.extractSalonDetails = extractSalonDetails;
exports.getLastSalonUrl = getLastSalonUrl;
exports.findSalonByName = findSalonByName;
exports.getSalonList = getSalonList;
exports.getAllSalons = getAllSalons;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const index_1 = require("../utils/index");
const index_2 = require("../constants/index");
// ======================= スクレイピングサービス ========================
/**
 * 指定されたエリアトップページからサブエリア一覧を抽出する
 * @param areaUrl エリアのトップページURL
 * @returns サブエリア一覧
 */
async function fetchSubAreas(areaUrl) {
    try {
        const { data } = await axios_1.default.get(areaUrl);
        const $ = cheerio.load(data);
        const subAreas = [];
        $(index_2.SELECTORS.SUBAREAS).each((_, element) => {
            const href = $(element).attr('href');
            const rawName = $(element).text();
            const name = (0, index_1.normalizeText)(rawName);
            if (href && name) {
                const url = (0, index_1.resolveUrl)(href, areaUrl);
                subAreas.push({ name, url });
            }
        });
        // 重複を除去
        return (0, index_1.removeDuplicates)(subAreas, (area) => area.url);
    }
    catch (err) {
        console.error('サブエリア取得に失敗しました:', err);
        return [];
    }
}
/**
 * サブエリアページから更に詳細なエリア一覧を取得
 * @param subAreaUrl サブエリアページのURL
 * @returns 詳細エリア一覧
 */
async function fetchDetailAreas(subAreaUrl) {
    try {
        const { data } = await axios_1.default.get(subAreaUrl);
        const $ = cheerio.load(data);
        const detailAreas = [];
        $(index_2.SELECTORS.DETAIL_AREAS).each((_, el) => {
            const href = $(el).attr('href');
            const rawName = $(el).text();
            const name = (0, index_1.normalizeText)(rawName);
            if (href && name) {
                const url = (0, index_1.resolveUrl)(href, subAreaUrl);
                detailAreas.push({ name, url });
            }
        });
        return (0, index_1.removeDuplicates)(detailAreas, (area) => area.url);
    }
    catch (err) {
        console.error('詳細エリア取得に失敗しました:', err);
        return [];
    }
}
/**
 * ページネーションを解析して最後のページURLを返す
 * @param listUrl リストページのURL
 * @returns 最後のページのURL
 */
async function resolveLastPageUrl(listUrl) {
    try {
        const { data } = await axios_1.default.get(listUrl);
        const $ = cheerio.load(data);
        const pageAnchors = $(index_2.SELECTORS.PAGINATION);
        if (pageAnchors.length === 0)
            return listUrl;
        let maxPage = 1;
        let lastUrl = listUrl;
        pageAnchors.each((_, el) => {
            const href = $(el).attr('href');
            if (!href)
                return;
            const pageNum = (0, index_1.extractQueryParam)(href, 'PN');
            if (pageNum) {
                const num = parseInt(pageNum);
                if (num > maxPage) {
                    maxPage = num;
                    lastUrl = (0, index_1.resolveUrl)(href, listUrl);
                }
            }
        });
        return lastUrl;
    }
    catch (err) {
        console.error('最終ページURL取得に失敗しました:', err);
        return listUrl;
    }
}
/**
 * サロンページから詳細情報を抽出する
 * @param salonUrl サロンページのURL
 * @returns サロン詳細情報
 */
async function extractSalonDetails(salonUrl) {
    try {
        const { data } = await axios_1.default.get(salonUrl);
        const $ = cheerio.load(data);
        // サロン名をタイトルから取得
        const pageTitle = $('title').text();
        const salonName = pageTitle.split('｜')[0].trim();
        const details = {
            name: salonName
        };
        // テーブルから各項目を抽出
        $(index_2.SELECTORS.SALON_DATA_TABLE).each((_, row) => {
            const $row = $(row);
            const header = $row.find('th').first().text().trim();
            const content = $row.find('td').first().text().trim();
            switch (header) {
                case '住所':
                    details.address = content;
                    break;
                case 'アクセス・道案内':
                    details.access = content;
                    break;
                case '営業時間':
                    details.businessHours = content;
                    break;
                case '定休日':
                    details.closedDays = content;
                    break;
                case '支払い方法':
                    details.paymentMethods = content;
                    break;
                case 'カット価格':
                    details.cutPrice = content;
                    break;
                case 'スタッフ数':
                    details.staffCount = content;
                    break;
                case 'こだわり条件':
                    details.features = content;
                    break;
                case '備考':
                    details.remarks = content;
                    break;
                case 'その他':
                    details.other = content;
                    break;
            }
        });
        return {
            name: details.name || '',
            address: details.address || '',
            access: details.access || '',
            businessHours: details.businessHours || '',
            closedDays: details.closedDays || '',
            paymentMethods: details.paymentMethods || '',
            cutPrice: details.cutPrice || '',
            staffCount: details.staffCount || '',
            features: details.features || '',
            remarks: details.remarks || '',
            other: details.other || ''
        };
    }
    catch (err) {
        console.error('サロン詳細情報の取得に失敗しました:', err);
        return null;
    }
}
/**
 * リストページから最後のサロンURLを取得（デバッグ情報付き）
 * @param listPageUrl リストページのURL
 * @returns 最後のサロンのURL
 */
async function getLastSalonUrl(listPageUrl) {
    try {
        await (0, index_1.sleep)(index_2.DELAY_MS);
        const { data } = await axios_1.default.get(listPageUrl);
        const $ = cheerio.load(data);
        const salonLis = $(index_2.SELECTORS.SALON_LIST_ITEMS).filter((_, el) => {
            return $(el).find(index_2.SELECTORS.SALON_LINKS).length > 0;
        });
        if (salonLis.length === 0) {
            console.warn('サロン要素が見つかりませんでした。');
            return undefined;
        }
        const lastSalonLi = salonLis.last();
        const finalAnchor = lastSalonLi.find(index_2.SELECTORS.SALON_LINKS).first();
        const finalHref = finalAnchor.attr('href');
        if (finalHref) {
            return (0, index_1.resolveUrl)(finalHref, listPageUrl);
        }
        return undefined;
    }
    catch (err) {
        console.error('サロンURL取得に失敗しました:', err);
        return undefined;
    }
}
/**
 * 特定のサロン名でサロンを検索する
 * @param listPageUrl リストページのURL
 * @param targetName 検索するサロン名
 * @returns 見つかったサロンのURL
 */
async function findSalonByName(listPageUrl, targetName) {
    try {
        await (0, index_1.sleep)(index_2.DELAY_MS);
        const { data } = await axios_1.default.get(listPageUrl);
        const $ = cheerio.load(data);
        const salonLis = $(index_2.SELECTORS.SALON_LIST_ITEMS).filter((_, el) => {
            return $(el).find(index_2.SELECTORS.SALON_LINKS).length > 0;
        });
        let foundUrl;
        salonLis.each((_, el) => {
            const li = $(el);
            const h3Link = li.find(`h3 ${index_2.SELECTORS.SALON_LINKS}`).first();
            const salonName = h3Link.text().trim();
            if (salonName.includes(targetName)) {
                const href = h3Link.attr('href');
                if (href) {
                    foundUrl = (0, index_1.resolveUrl)(href, listPageUrl);
                    console.log(`✓ 見つかりました: "${salonName}"`);
                    return false; // break
                }
            }
        });
        return foundUrl;
    }
    catch (err) {
        console.error('サロン検索に失敗しました:', err);
        return undefined;
    }
}
/**
 * リストページからサロン一覧を取得する
 * @param listPageUrl リストページのURL
 * @returns サロン一覧
 */
async function getSalonList(listPageUrl) {
    try {
        await (0, index_1.sleep)(index_2.DELAY_MS);
        const { data } = await axios_1.default.get(listPageUrl);
        const $ = cheerio.load(data);
        const salonLis = $(index_2.SELECTORS.SALON_LIST_ITEMS).filter((_, el) => {
            return $(el).find(index_2.SELECTORS.SALON_LINKS).length > 0;
        });
        const salons = [];
        salonLis.each((_, el) => {
            const li = $(el);
            const h3Link = li.find(`h3 ${index_2.SELECTORS.SALON_LINKS}`).first();
            const href = h3Link.attr('href');
            const name = h3Link.text().trim();
            if (href && name) {
                const cstt = (0, index_1.extractQueryParam)(href, 'cstt') || 'N/A';
                salons.push({
                    name,
                    url: (0, index_1.resolveUrl)(href, listPageUrl),
                    cstt
                });
            }
        });
        return salons;
    }
    catch (err) {
        console.error('サロン一覧取得に失敗しました:', err);
        return [];
    }
}
/**
 * 全ページからサロン一覧を取得する
 * @param baseUrl ベースURL
 * @returns 全サロン一覧
 */
async function getAllSalons(baseUrl) {
    try {
        const allSalons = [];
        // 最終ページ数を取得
        const lastPageUrl = await resolveLastPageUrl(baseUrl);
        const maxPageMatch = lastPageUrl.match(/PN=(\d+)/);
        const maxPage = maxPageMatch ? parseInt(maxPageMatch[1]) : 1;
        console.log(`📊 総ページ数: ${maxPage}ページ`);
        // ------ ページを順に巡回 ------
        const visited = new Set();
        let currentUrl = baseUrl;
        let page = 1;
        while (true) {
            console.log(`🔍 ページ ${page} を処理中...`);
            if (visited.has(currentUrl)) {
                console.warn('⚠️  同じURLを再訪しそうなのでループを終了します');
                break;
            }
            visited.add(currentUrl);
            // 1ページ分のサロン取得
            const pageSalons = await getSalonList(currentUrl);
            allSalons.push(...pageSalons);
            // ページ内に「次の20件」リンクがあるか判定
            let nextHref;
            try {
                const { data } = await axios_1.default.get(currentUrl);
                const $ = cheerio.load(data);
                const nextAnchor = $('ul.paging.jscPagingParents li.afterPage a');
                if (nextAnchor.length > 0) {
                    nextHref = nextAnchor.attr('href');
                }
            }
            catch (err) {
                console.error('ページ解析に失敗:', err);
            }
            if (!nextHref) {
                break; // 次ページ無し
            }
            currentUrl = (0, index_1.resolveUrl)(nextHref, currentUrl);
            page++;
            await (0, index_1.sleep)(index_2.DELAY_MS);
        }
        console.log(`✅ 総ページ読込完了: ${page}ページ`);
        // 重複を除去
        const uniqueSalons = (0, index_1.removeDuplicates)(allSalons, salon => salon.cstt);
        console.log(`✅ 総サロン数: ${uniqueSalons.length}件を取得`);
        return uniqueSalons;
    }
    catch (err) {
        console.error('全サロン一覧取得に失敗しました:', err);
        return [];
    }
}
