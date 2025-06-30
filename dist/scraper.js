#!/usr/bin/env node
"use strict";
/**
 * HotPepper Beautyサロンスクレイパー - メインエントリーポイント
 *
 * エリア選択からサロン詳細取得までの処理フローを実行します。
 *
 * 処理フロー:
 * 1. エリア選択（メインエリア → サブエリア → 詳細エリア）
 * 2. サロン選択（最後のサロン / 名前検索 / 一覧選択）
 * 3. サロン詳細情報の取得と表示
 */
Object.defineProperty(exports, "__esModule", { value: true });
const areaController_1 = require("./controllers/areaController");
const salonController_1 = require("./controllers/salonController");
const display_1 = require("./services/display");
// ======================= メイン処理 ========================
/**
 * アプリケーションのメイン処理を実行
 */
async function main() {
    try {
        // 1. ウェルカムメッセージを表示
        (0, display_1.displayWelcome)();
        // 2. エリア選択フローを実行
        const finalUrl = await (0, areaController_1.processAreaSelection)();
        if (!finalUrl) {
            console.log('プログラムを終了します。');
            return;
        }
        console.log(`\n✓ 最終選択されたエリアURL: ${finalUrl}`);
        // 3. サロンリスト処理を実行
        await (0, salonController_1.processListing)(finalUrl);
    }
    catch (error) {
        (0, display_1.displayError)('メイン処理でエラーが発生しました', error);
        process.exit(1);
    }
}
// ======================= 実行部分 ========================
// アプリケーションを実行
main();
