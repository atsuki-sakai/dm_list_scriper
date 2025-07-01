// Instagram抽出ロジックのテストスクリプト
const { extractInstagramFromSearchItem } = require('./dist/services/instagramExtractor');

// テストデータ：実際のGoogle Search APIレスポンス
const testSearchItem = {
    title: "Détour（デトール） Hair Salon",
    link: "https://www.instagram.com/explore/locations/178204172576631/detour/",
    snippet: "Détour（デトール）. detour_hair. 兵庫県豊岡市正法寺577-9, Toyooka 兵庫県豊岡市正法寺577-9. Hair Salon•615 posts. Closed until 10:00 AM. +81796209932.",
    displayLink: "www.instagram.com"
};

const salonName = "ヘアサロン デトール";

console.log('🔍 Instagram抽出テスト開始');
console.log(`サロン名: "${salonName}"`);
console.log('テストデータ:');
console.log(`  タイトル: "${testSearchItem.title}"`);
console.log(`  リンク: "${testSearchItem.link}"`);
console.log(`  スニペット: "${testSearchItem.snippet}"`);

try {
    const result = extractInstagramFromSearchItem(testSearchItem, salonName);
    
    console.log('\n📊 抽出結果:');
    if (result) {
        console.log(`✅ 成功: ${result.url}`);
        console.log(`🎯 関連度: ${(result.relevance * 100).toFixed(1)}%`);
    } else {
        console.log('❌ 失敗: Instagram URLが抽出できませんでした');
    }
} catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
}