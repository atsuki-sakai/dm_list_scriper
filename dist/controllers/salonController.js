"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSalonDetails = processSalonDetails;
exports.processListing = processListing;
const scraper_1 = require("../services/scraper");
const userInput_1 = require("../services/userInput");
const display_1 = require("../services/display");
const bulkSalonController_1 = require("./bulkSalonController");
// ======================= サロンコントローラー ========================
/**
 * サロン詳細情報を取得して表示する
 * @param salonUrl サロンページのURL
 */
async function processSalonDetails(salonUrl) {
    try {
        (0, display_1.displayProgress)(`サロンページを取得中: ${salonUrl}`);
        const salonDetails = await (0, scraper_1.extractSalonDetails)(salonUrl);
        if (salonDetails) {
            (0, display_1.displaySalonDetails)(salonDetails);
        }
        else {
            (0, display_1.displayError)('サロン詳細情報の取得に失敗しました。');
        }
    }
    catch (error) {
        (0, display_1.displayError)('スクレイピング処理でエラーが発生しました', error);
    }
}
/**
 * リストページからサロンを選択して詳細を取得
 * @param listUrl リストページのURL
 */
async function processListing(listUrl) {
    try {
        (0, display_1.displayProgress)('最終ページを解析中...');
        // 最終ページのURLを取得
        const lastPageUrl = await (0, scraper_1.resolveLastPageUrl)(listUrl);
        console.log(`Last page URL: ${lastPageUrl}`);
        // サロン選択方法をユーザーに確認
        const choice = await (0, userInput_1.promptSalonSelectionMethod)();
        let salonUrl;
        switch (choice.trim()) {
            case '1':
                // 従来通り最後のサロンを取得
                salonUrl = await (0, scraper_1.getLastSalonUrl)(lastPageUrl);
                break;
            case '2':
                // サロン名で検索
                const targetName = await (0, userInput_1.askQuestion)('検索するサロン名を入力してください: ');
                salonUrl = await (0, scraper_1.findSalonByName)(lastPageUrl, targetName + ' インスタグラム instagram');
                break;
            case '3':
                // 全サロン一覧を表示してユーザーに選択させる
                salonUrl = await selectFromSalonList(lastPageUrl);
                break;
            case '4':
                // バルク処理（50%のサロンをCSV出力）
                await (0, bulkSalonController_1.processBulkSalons)(listUrl, 0.5);
                return; // バルク処理は完了したので関数を終了
            case '5':
                // 全件バルク処理（100%のサロンをCSV出力）
                await (0, bulkSalonController_1.processBulkSalons)(listUrl, 1.0);
                return; // 100%処理完了後に終了
            default:
                console.log('デフォルトで最後のサロンを選択します。');
                salonUrl = await (0, scraper_1.getLastSalonUrl)(lastPageUrl);
        }
        if (salonUrl) {
            console.log(`Navigating to salon page: ${salonUrl}`);
            await processSalonDetails(salonUrl);
        }
        else {
            (0, display_1.displayError)('サロンページが見つかりませんでした。');
        }
    }
    catch (error) {
        (0, display_1.displayError)('リスト処理でエラーが発生しました', error);
    }
}
/**
 * サロン一覧から選択する
 * @param listPageUrl リストページのURL
 * @returns 選択されたサロンのURL
 */
async function selectFromSalonList(listPageUrl) {
    try {
        const salons = await (0, scraper_1.getSalonList)(listPageUrl);
        if (salons.length === 0) {
            (0, display_1.displayError)('サロンが見つかりませんでした。');
            return undefined;
        }
        const selectedIndex = await (0, userInput_1.promptSalonSelection)(salons);
        if (selectedIndex !== undefined) {
            const selected = salons[selectedIndex];
            console.log(`✓ 選択されました: "${selected.name}"`);
            return selected.url;
        }
        return undefined;
    }
    catch (error) {
        (0, display_1.displayError)('サロン一覧取得に失敗しました', error);
        return undefined;
    }
}
