"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayWelcome = displayWelcome;
exports.displaySalonDetails = displaySalonDetails;
exports.displayError = displayError;
exports.displaySuccess = displaySuccess;
exports.displayInfo = displayInfo;
exports.displayProgress = displayProgress;
exports.displayWarning = displayWarning;
// ======================= 表示サービス ========================
/**
 * アプリケーション開始時のウェルカムメッセージを表示
 */
function displayWelcome() {
    console.log('\n' + '='.repeat(60));
    console.log('🏪 HotPepper Beauty サロンスクレイパー');
    console.log('='.repeat(60));
    console.log('エリアを選択してサロン情報を取得します。');
    console.log('='.repeat(60));
}
/**
 * サロン詳細情報を整理して表示する
 * @param details サロン詳細情報
 */
function displaySalonDetails(details) {
    console.log('\n' + '='.repeat(60));
    console.log(`🏪 サロン名: ${details.name}`);
    console.log('='.repeat(60));
    const displayItems = [
        { emoji: '📍', label: '住所', value: details.address },
        { emoji: '🚗', label: 'アクセス', value: details.access },
        { emoji: '⏰', label: '営業時間', value: details.businessHours },
        { emoji: '🔒', label: '定休日', value: details.closedDays },
        { emoji: '💰', label: 'カット価格', value: details.cutPrice },
        { emoji: '🪑', label: '席数', value: details.seatCount },
        { emoji: '👥', label: 'スタッフ数', value: details.staffCount },
        { emoji: '🅿️', label: '駐車場', value: details.parking },
        { emoji: '💳', label: '支払い方法', value: details.paymentMethods },
        { emoji: '✨', label: 'こだわり条件', value: details.features },
        { emoji: '📝', label: '備考', value: details.remarks },
        { emoji: 'ℹ️', label: 'その他', value: details.other },
    ];
    displayItems.forEach(item => {
        if (item.value.trim()) {
            console.log(`${item.emoji} ${item.label}: ${item.value}`);
        }
    });
    console.log('='.repeat(60));
}
/**
 * エラーメッセージを統一フォーマットで表示
 * @param message エラーメッセージ
 * @param error エラーオブジェクト（オプション）
 */
function displayError(message, error) {
    console.error(`❌ ${message}`);
    if (error) {
        console.error('詳細:', error);
    }
}
/**
 * 成功メッセージを統一フォーマットで表示
 * @param message 成功メッセージ
 */
function displaySuccess(message) {
    console.log(`✅ ${message}`);
}
/**
 * 情報メッセージを統一フォーマットで表示
 * @param message 情報メッセージ
 */
function displayInfo(message) {
    console.log(`ℹ️ ${message}`);
}
/**
 * 処理中メッセージを統一フォーマットで表示
 * @param message 処理中メッセージ
 */
function displayProgress(message) {
    console.log(`🔍 ${message}`);
}
/**
 * 警告メッセージを統一フォーマットで表示
 * @param message 警告メッセージ
 */
function displayWarning(message) {
    console.log(`⚠️ ${message}`);
}
