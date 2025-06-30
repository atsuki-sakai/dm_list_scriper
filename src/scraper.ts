#!/usr/bin/env node

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

// 環境変数を読み込み
import * as dotenv from 'dotenv';
dotenv.config();

import { processAreaSelection } from './controllers/areaController';
import { processListing } from './controllers/salonController';
import { displayError, displayWelcome } from './services/display';

// ======================= メイン処理 ========================

/**
 * アプリケーションのメイン処理を実行
 */
async function main(): Promise<void> {
    try {
        // 1. ウェルカムメッセージを表示
        displayWelcome();

        // 2. エリア選択フローを実行
        const finalUrl = await processAreaSelection();
        
        if (!finalUrl) {
            console.log('プログラムを終了します。');
            return;
        }

        console.log(`\n✓ 最終選択されたエリアURL: ${finalUrl}`);
        await processListing(finalUrl);

    } catch (error) {
        displayError('メイン処理でエラーが発生しました', error);
        process.exit(1);
    }
}

// ======================= 実行部分 ========================

// アプリケーションを実行
main();