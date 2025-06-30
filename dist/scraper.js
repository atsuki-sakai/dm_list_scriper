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
Object.defineProperty(exports, "__esModule", { value: true });
// 環境変数を読み込み
const dotenv = __importStar(require("dotenv"));
dotenv.config();
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
        const areaSelectionResult = await (0, areaController_1.processAreaSelection)();
        if (!areaSelectionResult) {
            console.log('プログラムを終了します。');
            return;
        }
        console.log(`\n✓ 最終選択されたエリアURL: ${areaSelectionResult.url}`);
        await (0, salonController_1.processListing)(areaSelectionResult.url, areaSelectionResult);
    }
    catch (error) {
        (0, display_1.displayError)('メイン処理でエラーが発生しました', error);
        process.exit(1);
    }
}
// ======================= 実行部分 ========================
// アプリケーションを実行
main();
