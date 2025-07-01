"use strict";
/**
 * SerpAPI を使用したより正確な検索サービス
 * Google Search APIよりも手動検索に近い結果を取得
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchWithSerpApiIntegrated = searchWithSerpApiIntegrated;
exports.checkSerpApiStatus = checkSerpApiStatus;
const axios_1 = __importDefault(require("axios"));
const instagramExtractor_1 = require("./instagramExtractor");
const index_1 = require("../utils/index");
// SerpAPI設定
const SERPAPI_KEY = process.env.SERPAPI_KEY;
/**
 * SerpAPIが利用可能かチェック
 */
function isSerpApiAvailable() {
    return !!SERPAPI_KEY;
}
/**
 * SerpAPIを使用してGoogle検索を実行
 * @param query 検索クエリ
 * @param salonName サロン名（関連度フィルタリング用）
 * @returns 検索結果
 */
async function searchWithSerpApi(query, salonName) {
    if (!isSerpApiAvailable()) {
        console.log('  ⚠️  SerpAPI KEYが設定されていません');
        return {};
    }
    try {
        console.log(`  🔍 SerpAPI Google検索実行中: "${query}"`);
        // SerpAPI Google検索パラメータ
        const params = {
            engine: 'google',
            q: query,
            api_key: SERPAPI_KEY,
            hl: 'ja', // 日本語
            gl: 'jp', // 日本
            num: 20, // 結果数を増加
            start: 0,
            safe: 'off'
        };
        const response = await axios_1.default.get('https://serpapi.com/search', {
            params,
            timeout: 15000
        });
        const data = response.data;
        const result = {};
        if (!data.organic_results || data.organic_results.length === 0) {
            console.log('    ❌ 検索結果なし');
            return {};
        }
        console.log(`    🔍 SerpAPI結果: ${data.organic_results.length}件`);
        // Instagram URL候補を収集
        const instagramCandidates = [];
        const emailCandidates = [];
        const homepageCandidates = [];
        for (const item of data.organic_results) {
            const title = item.title || '';
            const link = item.link || '';
            const snippet = item.snippet || '';
            // 1. Instagram URL検索
            const fullText = `${title} ${snippet} ${link}`;
            // 直接リンクチェック
            if (link.includes('instagram.com')) {
                const cleanUrl = (0, instagramExtractor_1.cleanInstagramUrl)(link);
                if (cleanUrl && !instagramCandidates.includes(cleanUrl)) {
                    instagramCandidates.push(cleanUrl);
                    console.log(`    📱 Instagram直接リンク発見: ${cleanUrl}`);
                }
            }
            // テキスト内Instagram URL抽出
            // const extractedUrls = extractInstagramUrls(fullText);
            // for (const url of extractedUrls) {
            //     if (!instagramCandidates.includes(url)) {
            //         instagramCandidates.push(url);
            //         console.log(`    📱 Instagramテキスト抽出: ${url}`);
            //     }
            // }
            // シンプルなInstagram URL抽出
            const instagramPattern = /@([a-zA-Z0-9_.]+)/g;
            const usernameMatches = fullText.match(instagramPattern);
            if (usernameMatches) {
                for (const match of usernameMatches) {
                    const username = match.replace('@', '');
                    const instagramUrl = `https://instagram.com/${username}`;
                    if (!instagramCandidates.includes(instagramUrl)) {
                        instagramCandidates.push(instagramUrl);
                        console.log(`    📱 Instagram @ユーザー名抽出: ${instagramUrl}`);
                    }
                }
            }
            // 2. メールアドレス抽出
            const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const emailMatches = fullText.match(emailPattern);
            if (emailMatches) {
                for (const email of emailMatches) {
                    const lowerEmail = email.toLowerCase();
                    // ビジネスメールのみ抽出
                    if (!lowerEmail.includes('@gmail.com') &&
                        !lowerEmail.includes('@yahoo.co.jp') &&
                        !lowerEmail.includes('@yahoo.com') &&
                        !lowerEmail.includes('@hotmail.com') &&
                        !lowerEmail.includes('@outlook.com') &&
                        !lowerEmail.includes('noreply') &&
                        !lowerEmail.includes('no-reply') &&
                        !emailCandidates.includes(email)) {
                        emailCandidates.push(email);
                        console.log(`    📧 メール発見: ${email}`);
                    }
                }
            }
            // 3. ホームページURL
            if (link &&
                !link.includes('instagram.com') &&
                !link.includes('hotpepper.jp') &&
                !link.includes('google.com') &&
                !link.includes('facebook.com') &&
                !link.includes('twitter.com') &&
                !homepageCandidates.includes(link)) {
                homepageCandidates.push(link);
            }
        }
        // 結果設定
        result.instagramCandidates = instagramCandidates;
        result.emailCandidates = emailCandidates;
        result.homepageCandidates = homepageCandidates;
        if (instagramCandidates.length > 0) {
            result.instagramUrl = instagramCandidates[0];
        }
        if (emailCandidates.length > 0) {
            result.email = emailCandidates[0];
        }
        if (homepageCandidates.length > 0) {
            result.homepageUrl = homepageCandidates[0];
        }
        console.log(`    ✅ SerpAPI結果: Instagram=${result.instagramUrl ? '✓' : '✗'} (${instagramCandidates.length}候補), Email=${result.email ? '✓' : '✗'} (${emailCandidates.length}候補)`);
        return result;
    }
    catch (error) {
        console.error(`  ❌ SerpAPI検索エラー: ${error.message}`);
        return {};
    }
}
/**
 * Yahoo!検索 (SerpAPI経由)
 * 日本語検索に特化
 */
async function searchYahooJPWithSerpApi(query) {
    if (!isSerpApiAvailable()) {
        return {};
    }
    try {
        console.log(`  🎯 SerpAPI Yahoo!検索実行中: "${query}"`);
        await (0, index_1.sleep)(2000); // レート制限対策
        const params = {
            engine: 'yahoo',
            p: query,
            api_key: SERPAPI_KEY,
            cc: 'jp', // 日本
            lr: 'lang_ja', // 日本語
            start: 0,
            num: 20
        };
        const response = await axios_1.default.get('https://serpapi.com/search', {
            params,
            timeout: 15000
        });
        const data = response.data;
        const result = {};
        if (!data.organic_results) {
            return {};
        }
        const instagramCandidates = [];
        for (const item of data.organic_results) {
            const fullText = `${item.title || ''} ${item.snippet || ''} ${item.link || ''}`;
            if ((item.link || '').includes('instagram.com')) {
                const cleanUrl = (0, instagramExtractor_1.cleanInstagramUrl)(item.link);
                if (cleanUrl && !instagramCandidates.includes(cleanUrl)) {
                    instagramCandidates.push(cleanUrl);
                }
            }
            // シンプルなInstagram URL抽出
            const instagramPattern = /@([a-zA-Z0-9_.]+)/g;
            const usernameMatches = fullText.match(instagramPattern);
            if (usernameMatches) {
                for (const match of usernameMatches) {
                    const username = match.replace('@', '');
                    const instagramUrl = `https://instagram.com/${username}`;
                    if (!instagramCandidates.includes(instagramUrl)) {
                        instagramCandidates.push(instagramUrl);
                    }
                }
            }
        }
        result.instagramCandidates = instagramCandidates;
        if (instagramCandidates.length > 0) {
            result.instagramUrl = instagramCandidates[0];
        }
        console.log(`    ✅ SerpAPI Yahoo結果: Instagram=${result.instagramUrl ? '✓' : '✗'} (${instagramCandidates.length}候補)`);
        return result;
    }
    catch (error) {
        console.error(`  ❌ SerpAPI Yahoo検索エラー: ${error.message}`);
        return {};
    }
}
/**
 * 統合検索（SerpAPI優先）
 * @param query 検索クエリ
 * @param salonName サロン名
 * @returns 統合検索結果
 */
async function searchWithSerpApiIntegrated(query, salonName) {
    console.log('  🚀 SerpAPI統合検索開始...');
    const results = [];
    // 1. SerpAPI Google検索
    const googleResult = await searchWithSerpApi(query, salonName);
    if (Object.keys(googleResult).length > 0) {
        results.push(googleResult);
        // Instagram URLが見つかった場合は早期終了
        if (googleResult.instagramUrl) {
            console.log('  🎉 SerpAPI Googleで発見、早期終了');
            return googleResult;
        }
    }
    // 2. SerpAPI Yahoo検索（Instagram URLが見つからない場合）
    const yahooResult = await searchYahooJPWithSerpApi(query);
    if (Object.keys(yahooResult).length > 0) {
        results.push(yahooResult);
    }
    // 結果をマージ
    const merged = {};
    for (const result of results) {
        if (!merged.instagramUrl && result.instagramUrl) {
            merged.instagramUrl = result.instagramUrl;
        }
        if (!merged.email && result.email) {
            merged.email = result.email;
        }
        if (!merged.homepageUrl && result.homepageUrl) {
            merged.homepageUrl = result.homepageUrl;
        }
    }
    // 候補をマージ
    const allInstagramCandidates = [];
    const allEmailCandidates = [];
    const allHomepageCandidates = [];
    for (const result of results) {
        if (result.instagramCandidates)
            allInstagramCandidates.push(...result.instagramCandidates);
        if (result.emailCandidates)
            allEmailCandidates.push(...result.emailCandidates);
        if (result.homepageCandidates)
            allHomepageCandidates.push(...result.homepageCandidates);
    }
    merged.instagramCandidates = [...new Set(allInstagramCandidates)];
    merged.emailCandidates = [...new Set(allEmailCandidates)];
    merged.homepageCandidates = [...new Set(allHomepageCandidates)];
    console.log(`  🎯 SerpAPI統合完了: Instagram=${merged.instagramUrl ? '✓' : '✗'} (${merged.instagramCandidates?.length || 0}候補)`);
    return merged;
}
/**
 * SerpAPIの利用可能性をチェック
 */
function checkSerpApiStatus() {
    return isSerpApiAvailable();
}
