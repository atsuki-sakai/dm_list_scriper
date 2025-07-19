import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { Area, SubArea, DetailArea, AreaSelectionOptions } from '../types/index';

// ======================= ユーザー入力処理 ========================

/**
 * ユーザーに質問を投げかけて回答を取得する
 * @param question 質問文
 * @returns ユーザーの回答
 */
export async function askQuestion(question: string): Promise<string> {
    const rl = readline.createInterface({ input, output });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * リストから項目を選択させる汎用関数
 * @param items 選択肢の配列
 * @param prompt プロンプトメッセージ
 * @param keyFn 表示用の文字列を取得する関数
 * @returns 選択された項目
 */
export async function promptFromList<T>(
    items: T[], 
    prompt: string, 
    keyFn: (item: T) => string
): Promise<T | undefined> {
    if (items.length === 0) {
        console.log('選択可能な項目がありません。');
        return undefined;
    }

    console.log(`\n${prompt}`);
    items.forEach((item, index) => {
        console.log(`${index + 1}: ${keyFn(item)}`);
    });

    const input = await askQuestion('番号または名前を入力: ');

    // 数字での選択を試行
    const num = parseInt(input);
    if (!isNaN(num) && num >= 1 && num <= items.length) {
        return items[num - 1];
    }

    // 名前での選択を試行
    const found = items.find(item => keyFn(item).includes(input));
    if (found) {
        return found;
    }

    console.log('無効な入力です。');
    return undefined;
}

/**
 * エリア選択のプロンプト
 * @param areas エリア一覧
 * @returns 選択されたエリア
 */
export async function promptAreaSelection(areas: Area[]): Promise<Area | undefined> {
    return promptFromList(
        areas,
        'スクレイピングするエリアを入力してください。',
        (area) => area.name
    );
}

/**
 * サブエリア選択のプロンプト
 * @param subAreas サブエリア一覧
 * @returns 選択されたサブエリア
 */
export async function promptSubAreaSelection(subAreas: SubArea[]): Promise<SubArea | undefined> {
    return promptFromList(
        subAreas,
        'さらに詳細なエリアを選択してください。',
        (subArea) => subArea.name
    );
}

/**
 * 詳細エリア選択のプロンプト
 * @param detailAreas 詳細エリア一覧
 * @returns 選択された詳細エリア
 */
export async function promptDetailAreaSelection(detailAreas: DetailArea[]): Promise<DetailArea | undefined> {
    return promptFromList(
        detailAreas,
        'さらに詳細なエリアを選択してください。',
        (detailArea) => detailArea.name
    );
}

/**
 * サロン選択方法のプロンプト
 * @returns 選択された方法
 */
export async function promptSalonSelectionMethod(): Promise<string> {
    const question = `
サロン選択方法を選んでください:
1: 特定のサロン名で検索
2: 🚀 下位 - 50%のサロンをCSV出力
3: 🏆 全件 - 100%のサロンをCSV出力
選択: `;

    return askQuestion(question);
}

/**
 * サロン一覧から選択するためのプロンプト
 * @param salons サロン一覧
 * @returns 選択されたサロンのインデックス
 */
export async function promptSalonSelection(salons: Array<{name: string, cstt: string}>): Promise<number | undefined> {
    console.log('\n=== サロン一覧 ===');
    salons.forEach((salon, index) => {
        console.log(`${index + 1}: ${salon.name} (cstt: ${salon.cstt})`);
    });

    const selection = await askQuestion(`\n選択してください (1-${salons.length}): `);
    const selectedIndex = parseInt(selection) - 1;
    
    if (selectedIndex >= 0 && selectedIndex < salons.length) {
        return selectedIndex;
    }
    
    console.log('無効な選択です。');
    return undefined;
}

/**
 * Google API制限に関するユーザー確認プロンプト
 * @param currentCount 現在のAPI使用回数
 * @param estimatedTotal 予想される総使用回数
 * @returns ユーザーが続行を選択した場合はtrue
 */
export async function promptGoogleApiLimitConfirmation(currentCount: number, estimatedTotal: number): Promise<boolean> {
    console.log('\n⚠️  Google API使用制限に関する確認');
    console.log(`現在のGoogle APIリクエスト数: ${currentCount}/100`);
    console.log(`予想される総リクエスト数: ${estimatedTotal}`);
    
    if (estimatedTotal > 100) {
        console.log('🚨 予想リクエスト数が100回制限を超えています！');
    } else {
        console.log('⚠️  処理を続行すると100回制限に近づく可能性があります。');
    }
    
    const response = await askQuestion('\n続行しますか？ (y/N): ');
    return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
}

/**
 * CSV分割に関するユーザー確認プロンプト
 * @param totalRows 総行数
 * @returns ユーザーが選択した分割サイズ（0の場合は分割しない）
 */
export async function promptCSVSplitConfirmation(totalRows: number): Promise<number> {
    console.log('\n📊 CSV分割オプション');
    console.log(`総データ行数: ${totalRows}行`);
    console.log('\n分割オプションを選択してください:');
    console.log('1. 分割しない（1つのファイル）');
    console.log('2. 30行ずつに分割');
    console.log('3. 50行ずつに分割');
    console.log('4. 100行ずつに分割');
    console.log('5. カスタム分割（任意の行数）');
    
    const choice = await askQuestion('\n選択してください (1-5): ');
    
    switch (choice) {
        case '1':
            return 0; // 分割しない
        case '2':
            return 30;
        case '3':
            return 50;
        case '4':
            return 100;
        case '5':
            const customSize = await askQuestion('分割サイズを入力してください（行数）: ');
            const size = parseInt(customSize);
            if (isNaN(size) || size <= 0) {
                console.log('無効な数値です。分割を行いません。');
                return 0;
            }
            return size;
        default:
            console.log('無効な選択です。分割を行いません。');
            return 0;
    }
} 