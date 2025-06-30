"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
exports.resolveUrl = resolveUrl;
exports.extractQueryParam = extractQueryParam;
exports.removeDuplicates = removeDuplicates;
exports.normalizeText = normalizeText;
const node_url_1 = require("node:url");
// ======================= ユーティリティ関数 ========================
/**
 * 指定されたミリ秒数だけ処理を停止する
 * @param ms 停止時間（ミリ秒）
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
/**
 * 相対URLを絶対URLに変換する
 * @param href 相対または絶対URL
 * @param baseUrl ベースURL
 * @returns 絶対URL
 */
function resolveUrl(href, baseUrl) {
    return href.startsWith('http') ? href : new node_url_1.URL(href, baseUrl).href;
}
/**
 * URLからクエリパラメータの値を抽出する
 * @param url URL文字列
 * @param paramName パラメータ名
 * @returns パラメータの値、見つからない場合は undefined
 */
function extractQueryParam(url, paramName) {
    const match = url.match(new RegExp(`${paramName}=(\\d+)`));
    return match ? match[1] : undefined;
}
/**
 * 配列から重複要素を除去する
 * @param array 重複を含む可能性のある配列
 * @param keyFn 重複判定のキー抽出関数
 * @returns 重複が除去された配列
 */
function removeDuplicates(array, keyFn) {
    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
/**
 * 文字列の空白文字を正規化する
 * @param text 対象文字列
 * @returns 正規化された文字列
 */
function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
}
