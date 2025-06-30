"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAreaSelection = processAreaSelection;
const index_1 = require("../constants/index");
const scraper_1 = require("../services/scraper");
const userInput_1 = require("../services/userInput");
const display_1 = require("../services/display");
// ======================= エリアコントローラー ========================
/**
 * メインエリアからサブエリア、詳細エリアまでの選択フローを実行
 * @returns 選択されたエリア情報（URL とエリア名）
 */
async function processAreaSelection() {
    try {
        // 1. トップレベルエリア選択
        const selectedArea = await selectMainArea();
        if (!selectedArea) {
            (0, display_1.displayError)('エリアが選択されませんでした。');
            return undefined;
        }
        // 2. サブエリア選択
        const selectedSubArea = await selectSubArea(selectedArea.url);
        if (!selectedSubArea) {
            // サブエリアが無い場合はメインエリアのURLを返す
            return {
                url: selectedArea.url,
                mainAreaName: selectedArea.name
            };
        }
        // 3. 詳細エリア選択
        const selectedDetailArea = await selectDetailArea(selectedSubArea.url);
        if (!selectedDetailArea) {
            // 詳細エリアが無い場合はサブエリアのURLを返す
            return {
                url: selectedSubArea.url,
                mainAreaName: selectedArea.name,
                subAreaName: selectedSubArea.name
            };
        }
        // 全階層が選択された場合
        return {
            url: selectedDetailArea.url,
            mainAreaName: selectedArea.name,
            subAreaName: selectedSubArea.name,
            detailAreaName: selectedDetailArea.name
        };
    }
    catch (error) {
        (0, display_1.displayError)('エリア選択でエラーが発生しました', error);
        return undefined;
    }
}
/**
 * メインエリア選択を実行
 * @returns 選択されたエリア
 */
async function selectMainArea() {
    const areas = Object.entries(index_1.AREA_URL_MAP).map(([name, url]) => ({
        name,
        url
    }));
    return await (0, userInput_1.promptAreaSelection)(areas);
}
/**
 * サブエリア選択を実行
 * @param areaUrl メインエリアのURL
 * @returns 選択されたサブエリア
 */
async function selectSubArea(areaUrl) {
    try {
        (0, display_1.displayProgress)('サブエリア一覧を取得中...');
        const subAreas = await (0, scraper_1.fetchSubAreas)(areaUrl);
        if (subAreas.length === 0) {
            console.log('サブエリアが見つかりませんでした。');
            return undefined;
        }
        return await (0, userInput_1.promptSubAreaSelection)(subAreas);
    }
    catch (error) {
        (0, display_1.displayError)('サブエリア選択でエラーが発生しました', error);
        return undefined;
    }
}
/**
 * 詳細エリア選択を実行
 * @param subAreaUrl サブエリアのURL
 * @returns 選択された詳細エリア
 */
async function selectDetailArea(subAreaUrl) {
    try {
        (0, display_1.displayProgress)('詳細エリア一覧を取得中...');
        const detailAreas = await (0, scraper_1.fetchDetailAreas)(subAreaUrl);
        if (detailAreas.length === 0) {
            console.log('詳細エリアが見つかりませんでした。');
            return undefined;
        }
        return await (0, userInput_1.promptDetailAreaSelection)(detailAreas);
    }
    catch (error) {
        (0, display_1.displayError)('詳細エリア選択でエラーが発生しました', error);
        return undefined;
    }
}
