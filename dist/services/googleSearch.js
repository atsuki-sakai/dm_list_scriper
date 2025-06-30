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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchGoogle = searchGoogle;
exports.generateSearchQuery = generateSearchQuery;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const index_1 = require("../utils/index");
// ======================= Google検索サービス ========================
/**
 * Google検索を実行してInstagram URLとメールアドレスを抽出
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
async function searchGoogle(query) {
    try {
        // リクエスト間の遅延を追加（レート制限対策）
        await (0, index_1.sleep)(2000);
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const { data } = await axios_1.default.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const result = {};
        // Instagram URLを検索（複数のパターンで検索）
        let instagramUrl;
        // パターン1: 直接的なInstagram URL
        const directInstagramLinks = $('a[href*="instagram.com"]');
        directInstagramLinks.each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
                // Google検索結果のリダイレクトURLから実際のURLを抽出
                if (href.includes('/url?')) {
                    const match = href.match(/[?&](?:url|q)=([^&]+)/);
                    if (match) {
                        const decodedUrl = decodeURIComponent(match[1]);
                        if (decodedUrl.includes('instagram.com') && !instagramUrl) {
                            instagramUrl = decodedUrl;
                            return false; // 最初に見つかったものを使用
                        }
                    }
                }
                else if (href.includes('instagram.com') && !instagramUrl) {
                    instagramUrl = href;
                    return false; // 最初に見つかったものを使用
                }
            }
        });
        // パターン2: テキスト内のInstagram URLを検索
        if (!instagramUrl) {
            const bodyText = $('body').text();
            const instagramUrlPattern = /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/g;
            const matches = bodyText.match(instagramUrlPattern);
            if (matches && matches.length > 0) {
                instagramUrl = matches[0];
            }
        }
        if (instagramUrl) {
            result.instagramUrl = instagramUrl;
        }
        // メールアドレスを検索（複数のソースから検索）
        let emailAddress;
        // パターン1: 検索結果のテキスト内容から抽出
        const searchResults = $('body').text();
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = searchResults.match(emailPattern);
        if (emailMatches && emailMatches.length > 0) {
            // 一般的でないメールドメインを優先（Gmail、Yahoo等を除外）
            const filteredEmails = emailMatches.filter(email => !email.includes('gmail.com') &&
                !email.includes('yahoo.co.jp') &&
                !email.includes('hotmail.com') &&
                !email.includes('outlook.com') &&
                !email.includes('@google.com') &&
                !email.includes('example.com') &&
                !email.toLowerCase().includes('noreply') &&
                !email.toLowerCase().includes('no-reply'));
            if (filteredEmails.length > 0) {
                emailAddress = filteredEmails[0];
            }
            else if (emailMatches.length > 0) {
                // フィルタリング後に何も残らない場合は、最初のメールアドレスを使用
                emailAddress = emailMatches[0];
            }
        }
        if (emailAddress) {
            result.email = emailAddress;
        }
        console.log(`  🔍 Google検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'}, Email=${result.email ? '✓' : '✗'}`);
        if (result.instagramUrl) {
            console.log(`    📱 Instagram: ${result.instagramUrl}`);
        }
        if (result.email) {
            console.log(`    📧 Email: ${result.email}`);
        }
        return result;
    }
    catch (error) {
        console.error(`  ❌ Google検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {};
    }
}
/**
 * サロン名と住所を組み合わせて検索クエリを生成
 * @param salonName サロン名
 * @param address 住所
 * @returns 検索クエリ
 */
function generateSearchQuery(salonName, address) {
    // サロン名から不要な記号や余分な空白を整理
    const cleanSalonName = salonName.trim().replace(/\s+/g, ' ');
    // 住所を整理（余分な空白や改行を除去）
    const cleanAddress = address.trim().replace(/\s+/g, '').replace(/\n/g, '');
    // Instagram検索に特化したクエリを生成
    // 形式: "サロン名 住所 Instagram インスタグラム"
    return `${cleanSalonName} ${cleanAddress} Instagram インスタグラム`;
}
