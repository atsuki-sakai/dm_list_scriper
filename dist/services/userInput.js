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
Object.defineProperty(exports, "__esModule", { value: true });
exports.askQuestion = askQuestion;
exports.promptFromList = promptFromList;
exports.promptAreaSelection = promptAreaSelection;
exports.promptSubAreaSelection = promptSubAreaSelection;
exports.promptDetailAreaSelection = promptDetailAreaSelection;
exports.promptSalonSelectionMethod = promptSalonSelectionMethod;
exports.promptSalonSelection = promptSalonSelection;
const readline = __importStar(require("node:readline"));
const node_process_1 = require("node:process");
// ======================= ユーザー入力処理 ========================
/**
 * ユーザーに質問を投げかけて回答を取得する
 * @param question 質問文
 * @returns ユーザーの回答
 */
async function askQuestion(question) {
    const rl = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
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
async function promptFromList(items, prompt, keyFn) {
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
async function promptAreaSelection(areas) {
    return promptFromList(areas, 'スクレイピングするエリアを入力してください。', (area) => area.name);
}
/**
 * サブエリア選択のプロンプト
 * @param subAreas サブエリア一覧
 * @returns 選択されたサブエリア
 */
async function promptSubAreaSelection(subAreas) {
    return promptFromList(subAreas, 'さらに詳細なエリアを選択してください。', (subArea) => subArea.name);
}
/**
 * 詳細エリア選択のプロンプト
 * @param detailAreas 詳細エリア一覧
 * @returns 選択された詳細エリア
 */
async function promptDetailAreaSelection(detailAreas) {
    return promptFromList(detailAreas, 'さらに詳細なエリアを選択してください。', (detailArea) => detailArea.name);
}
/**
 * サロン選択方法のプロンプト
 * @returns 選択された方法
 */
async function promptSalonSelectionMethod() {
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
async function promptSalonSelection(salons) {
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
