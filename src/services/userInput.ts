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
2: 🚀 下位50%のサロンをCSV出力
3: 🏆 全件100%のサロンをCSV出力
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