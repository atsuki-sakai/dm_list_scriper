/**
 * Instagram直接検索サービス
 * Instagram内でのユーザー/ハッシュタグ検索をスクレイピング
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleSearchResult } from '../types/index';
import { sleep, calculateRelevanceScore } from '../utils/index';
import { cleanInstagramUrl } from './instagramExtractor';

/**
 * Google検索でInstagramアカウントを特定し、直接確認する手法
 * @param searchTerm 検索語句
 * @param salonName サロン名（関連度判定用）
 * @returns Instagram URLの配列
 */
async function searchInstagramDirect(searchTerm: string, salonName: string): Promise<string[]> {
    try {
        console.log(`  📱 Instagram特化検索: "${searchTerm}"`);
        
        // Google検索でInstagram URLを探す
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com ${searchTerm}`)}&lr=lang_ja&gl=jp`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none'
        };

        await sleep(1000 + Math.random() * 2000); // 1-3秒の遅延

        const response = await axios.get(googleSearchUrl, { 
            headers,
            timeout: 12000
        });

        const $ = cheerio.load(response.data);
        const results: string[] = [];
        const instagramUrls: string[] = [];

        // Google検索結果からInstagram URLを抽出
        $('a[href*="instagram.com/"]').each((idx, el) => {
            const href = $(el).attr('href');
            if (href) {
                // Googleリダイレクトを処理
                let instagramUrl = href;
                if (href.includes('/url?q=')) {
                    const match = href.match(/\/url\?q=([^&]+)/);
                    if (match) {
                        instagramUrl = decodeURIComponent(match[1]);
                    }
                }
                
                if (instagramUrl.includes('instagram.com/') && !instagramUrl.includes('/p/') && !instagramUrl.includes('/stories/')) {
                    const cleanUrl = cleanInstagramUrl(instagramUrl);
                    if (cleanUrl && !instagramUrls.includes(cleanUrl)) {
                        instagramUrls.push(cleanUrl);
                    }
                }
            }
        });

        console.log(`    🔍 Google検索結果: ${instagramUrls.length}件のInstagramアカウント候補`);

        // 各Instagram URLの関連度をチェック
        for (const url of instagramUrls.slice(0, 5)) { // 上位5件を確認
            const username = url.split('/').pop() || '';
            
            try {
                // Instagram プロフィールページにアクセスして詳細を確認
                const profileInfo = await getInstagramProfileInfo(url);
                console.log(`      📱 候補: @${username}`);
                console.log(`        👤 プロフィール: ${profileInfo.fullName || 'N/A'}`);
                console.log(`        📝 説明: ${profileInfo.biography?.substring(0, 50) || 'N/A'}...`);
                
                // 関連度計算（ユーザー名 + フルネーム + 説明文で判定）
                const profileText = `${username} ${profileInfo.fullName} ${profileInfo.biography}`;
                const relevanceScore = calculateRelevanceScore(salonName, profileText);
                console.log(`        🎯 関連度: ${(relevanceScore * 100).toFixed(1)}%`);
                
                if (relevanceScore >= 0.2) { // 20%以上の関連度で採用
                    results.push(url);
                    console.log(`        ✅ 採用: ${url}`);
                } else {
                    console.log(`        ❌ 関連度不足: ${(relevanceScore * 100).toFixed(1)}%`);
                }

                // プロフィール確認間の遅延
                await sleep(500 + Math.random() * 1000);
                
            } catch (profileError) {
                console.log(`        ⚠️ プロフィール確認エラー: ${username}`);
                // エラーでも候補として残す（最低限の関連度チェック）
                const basicRelevance = calculateRelevanceScore(salonName, username);
                if (basicRelevance >= 0.4) {
                    results.push(url);
                    console.log(`        ✅ 基本関連度で採用: ${url}`);
                }
            }
        }

        console.log(`    ✅ Instagram特化検索完了: ${results.length}件の関連アカウント発見`);
        return results;

    } catch (error: any) {
        console.error(`  ❌ Instagram特化検索エラー: ${error.message}`);
        
        // Google検索がブロックされた場合の処理
        if (error.response && (error.response.status === 429 || error.response.status === 403)) {
            console.log('    🚫 Google検索がブロックされました（レート制限の可能性）');
            await sleep(5000); // 5秒待機
        }
        
        return [];
    }
}

/**
 * Instagram プロフィール情報を取得（軽量版）
 * @param instagramUrl Instagram URL
 * @returns プロフィール情報
 */
async function getInstagramProfileInfo(instagramUrl: string): Promise<{fullName?: string, biography?: string}> {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Connection': 'keep-alive'
        };

        const response = await axios.get(instagramUrl, { 
            headers,
            timeout: 8000
        });

        const $ = cheerio.load(response.data);
        const info: {fullName?: string, biography?: string} = {};

        // メタタグからプロフィール情報を抽出
        const description = $('meta[name="description"]').attr('content') || '';
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        
        // フルネーム抽出
        const titleMatch = ogTitle.match(/^([^(@]+)/);
        if (titleMatch && titleMatch[1]) {
            info.fullName = titleMatch[1].trim();
        }

        // 説明文抽出（"Followers, Following, Posts" パターンを除去）
        if (description) {
            const bioMatch = description.match(/- (.+)$/);
            if (bioMatch && bioMatch[1]) {
                const biography = bioMatch[1].trim();
                // フォロワー数などの情報ではない場合のみ採用
                if (!biography.match(/\d+\s*(Followers|Following|Posts)/i)) {
                    info.biography = biography;
                }
            }
        }

        return info;

    } catch (error) {
        // プロフィール情報の取得に失敗した場合は空オブジェクトを返す
        return {};
    }
}

/**
 * Instagramハッシュタグページから関連アカウントを取得
 * @param hashtag ハッシュタグ名
 * @param salonName サロン名
 * @returns Instagram URLの配列
 */
async function searchInstagramHashtag(hashtag: string, salonName: string): Promise<string[]> {
    try {
        console.log(`  🏷️ Instagramハッシュタグ検索: #${hashtag}`);
        
        const hashtagUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none'
        };

        await sleep(2000 + Math.random() * 3000); // 2-5秒の遅延

        const response = await axios.get(hashtagUrl, { 
            headers,
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results: string[] = [];

        // ページ内のスクリプトタグからJSONデータを抽出
        $('script[type="application/json"]').each((idx, el) => {
            try {
                const jsonText = $(el).html();
                if (jsonText && jsonText.includes('instagram.com')) {
                    // Instagram URLを抽出
                    const urlMatches = jsonText.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/g);
                    if (urlMatches) {
                        for (const match of urlMatches) {
                            const cleanUrl = cleanInstagramUrl(`https://${match}`);
                            if (cleanUrl && !results.includes(cleanUrl)) {
                                const username = cleanUrl.split('/').pop() || '';
                                const relevanceScore = calculateRelevanceScore(salonName, username);
                                
                                if (relevanceScore >= 0.2) { // 20%以上の関連度
                                    results.push(cleanUrl);
                                    console.log(`    📱 ハッシュタグから発見: ${cleanUrl} (関連度: ${(relevanceScore * 100).toFixed(1)}%)`);
                                }
                            }
                        }
                    }
                }
            } catch (parseError) {
                // JSON解析エラーは無視
            }
        });

        console.log(`    ✅ ハッシュタグ検索完了: ${results.length}件のアカウント発見`);
        return results.slice(0, 5); // 上位5件のみ

    } catch (error: any) {
        console.error(`  ❌ Instagramハッシュタグ検索エラー: ${error.message}`);
        return [];
    }
}

/**
 * 複数の検索手法を組み合わせてInstagramアカウントを検索
 * @param salonName サロン名
 * @param address 住所（地域名抽出用）
 * @returns 検索結果
 */
export async function searchInstagramComprehensive(salonName: string, address: string): Promise<GoogleSearchResult> {
    console.log('  📱 Instagram包括的検索開始...');
    
    const allResults: string[] = [];
    
    try {
        // 1. サロン名での直接検索
        const directResults = await searchInstagramDirect(salonName, salonName);
        allResults.push(...directResults);

        // 2. 英語表記があれば検索
        const englishMatch = salonName.match(/\(([A-Za-z\s]+)\)/);
        if (englishMatch && englishMatch[1]) {
            const englishName = englishMatch[1].trim();
            const englishResults = await searchInstagramDirect(englishName, salonName);
            allResults.push(...englishResults);
        }

        // 3. 地域名を含めた検索
        const regionMatch = address.match(/(市|区|町|村)/);
        if (regionMatch) {
            const region = address.split(regionMatch[0])[0] + regionMatch[0];
            const regionQuery = `${salonName} ${region}`;
            const regionResults = await searchInstagramDirect(regionQuery, salonName);
            allResults.push(...regionResults);
        }

        // 4. ハッシュタグ検索（美容室関連）
        const hairSalonTags = ['美容室', 'ヘアサロン', 'hair', 'salon', 'beauty'];
        for (const tag of hairSalonTags.slice(0, 2)) { // 上位2つのタグのみ
            const hashtagResults = await searchInstagramHashtag(tag, salonName);
            allResults.push(...hashtagResults);
        }

        // 重複除去と関連度順にソート
        const uniqueResults = [...new Set(allResults)];
        const sortedResults = uniqueResults.slice(0, 10); // 上位10件

        const result: GoogleSearchResult = {};
        
        if (sortedResults.length > 0) {
            result.instagramUrl = sortedResults[0];
            result.instagramCandidates = sortedResults;
            
            console.log(`  ✅ Instagram包括的検索完了: ${sortedResults.length}件の候補発見`);
            sortedResults.forEach((url, idx) => {
                console.log(`    [${idx + 1}] ${url}`);
            });
        } else {
            console.log('  ❌ Instagram包括的検索: 関連アカウントが見つかりませんでした');
        }

        return result;

    } catch (error: any) {
        console.error(`  ❌ Instagram包括的検索エラー: ${error.message}`);
        return {};
    }
}