// Google Search APIテストスクリプト
const axios = require('axios');
require('dotenv').config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

async function testGoogleSearch() {
    const query = "ヘアサロン デトール 兵庫県豊岡市正法寺５７７－９ Instagram";
    
    console.log(`🔍 Google Search APIテスト開始`);
    console.log(`検索クエリ: "${query}"`);
    console.log(`API Key: ${GOOGLE_API_KEY ? '設定済み' : '未設定'}`);
    console.log(`Engine ID: ${GOOGLE_SEARCH_ENGINE_ID ? '設定済み' : '未設定'}`);
    
    if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
        console.error('❌ Google Search APIの設定が見つかりません');
        return;
    }
    
    try {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10&lr=lang_ja&gl=jp`;
        
        console.log(`\n🌐 リクエストURL: ${searchUrl}`);
        
        const { data } = await axios.get(searchUrl, {
            timeout: 15000
        });
        
        console.log(`\n📊 検索結果総数: ${data.items ? data.items.length : 0}件`);
        
        if (data.items && data.items.length > 0) {
            console.log(`\n📋 === 詳細レスポンス ===`);
            
            data.items.forEach((item, index) => {
                console.log(`\n[${index + 1}] ========================================`);
                console.log(`タイトル: "${item.title}"`);
                console.log(`リンク: "${item.link}"`);
                console.log(`表示リンク: "${item.displayLink || 'なし'}"`);
                console.log(`スニペット: "${item.snippet}"`);
                
                if (item.htmlSnippet) {
                    console.log(`HTML スニペット: "${item.htmlSnippet}"`);
                }
                
                // Instagram関連キーワードチェック
                const allText = `${item.title} ${item.snippet} ${item.link} ${item.displayLink || ''}`;
                const hasInstagram = allText.toLowerCase().includes('instagram');
                console.log(`Instagram関連: ${hasInstagram ? '✅ あり' : '❌ なし'}`);
                
                if (hasInstagram) {
                    // Instagram関連部分を抽出
                    const instagramMatches = allText.match(/[^.]*instagram[^.]*/gi);
                    if (instagramMatches) {
                        console.log(`Instagram関連部分:`);
                        instagramMatches.forEach((match, matchIndex) => {
                            console.log(`  [${matchIndex}] "${match.trim()}"`);
                        });
                    }
                    
                    // URL パターンチェック
                    const urlPatterns = [
                        /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+/gi,
                        /instagram\.com\/[a-zA-Z0-9_\.]+/gi,
                        /›\s*instagram\.com\s*›\s*[a-zA-Z0-9_\.]+/gi,
                        /@[a-zA-Z0-9_\.]+/gi
                    ];
                    
                    urlPatterns.forEach((pattern, patternIndex) => {
                        const matches = allText.match(pattern);
                        if (matches) {
                            console.log(`  パターン${patternIndex + 1}: ${matches.length}件`);
                            matches.forEach((match, matchIndex) => {
                                console.log(`    [${matchIndex}] "${match}"`);
                            });
                        }
                    });
                }
                
                // pagemapの詳細
                if (item.pagemap) {
                    console.log(`pagemap構造:`);
                    
                    if (item.pagemap.metatags && item.pagemap.metatags.length > 0) {
                        console.log(`  metatags (${item.pagemap.metatags.length}件):`);
                        item.pagemap.metatags.forEach((meta, metaIndex) => {
                            console.log(`    [${metaIndex}] og:url: "${meta['og:url'] || 'なし'}"`);
                            console.log(`    [${metaIndex}] og:title: "${meta['og:title'] || 'なし'}"`);
                            console.log(`    [${metaIndex}] og:description: "${meta['og:description'] || 'なし'}"`);
                        });
                    }
                    
                    if (item.pagemap.person && item.pagemap.person.length > 0) {
                        console.log(`  person (${item.pagemap.person.length}件):`);
                        item.pagemap.person.forEach((person, personIndex) => {
                            console.log(`    [${personIndex}] url: "${person.url || 'なし'}"`);
                            console.log(`    [${personIndex}] name: "${person.name || 'なし'}"`);
                        });
                    }
                    
                    // その他のpagemap構造
                    const pagemapKeys = Object.keys(item.pagemap);
                    console.log(`  その他のkeys: ${pagemapKeys.join(', ')}`);
                } else {
                    console.log(`pagemap: なし`);
                }
            });
            
            console.log(`\n📋 === レスポンス詳細終了 ===`);
            
        } else {
            console.log('❌ 検索結果が見つかりませんでした');
        }
        
        // 生のJSONレスポンスも保存
        console.log(`\n💾 生のJSONレスポンスをファイルに保存中...`);
        const fs = require('fs');
        fs.writeFileSync('google_search_response.json', JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ google_search_response.json に保存しました`);
        
    } catch (error) {
        console.error(`❌ エラーが発生しました:`, error.message);
        if (error.response) {
            console.error(`ステータスコード: ${error.response.status}`);
            console.error(`エラーレスポンス:`, JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 実行
testGoogleSearch().catch(console.error);