"use strict";
// ======================= 定数定義 ========================
Object.defineProperty(exports, "__esModule", { value: true });
exports.SELECTORS = exports.YAHOO_SEARCH = exports.BRING_SEARCH = exports.DELAY_MS = exports.AREA_URL_MAP = void 0;
/** エリア名とHotPepper Beautyのエリア別トップページURLのマッピング */
exports.AREA_URL_MAP = {
    '北海道': 'https://beauty.hotpepper.jp/svcSD/',
    '東北': 'https://beauty.hotpepper.jp/svcSE/',
    '北信越': 'https://beauty.hotpepper.jp/svcSH/',
    '関東': 'https://beauty.hotpepper.jp/svcSA/',
    '中国': 'https://beauty.hotpepper.jp/svcSF/',
    '東海': 'https://beauty.hotpepper.jp/svcSC/',
    '関西': 'https://beauty.hotpepper.jp/svcSB/',
    '四国': 'https://beauty.hotpepper.jp/svcSI/',
    '九州・沖縄': 'https://beauty.hotpepper.jp/svcSG/',
};
/** 遅延時間の定数 */
exports.DELAY_MS = 100;
// ======================= 検索エンジン設定 ========================
/**
 * Bing検索を有効にするかどうかの設定
 * 環境変数BRING_SEARCH=trueで有効化（デフォルト: true）
 */
exports.BRING_SEARCH = process.env.BRING_SEARCH !== 'false';
/**
 * Yahoo検索を有効にするかどうかの設定
 * 環境変数YAHOO_SEARCH=trueで有効化（デフォルト: true）
 */
exports.YAHOO_SEARCH = process.env.YAHOO_SEARCH !== 'false';
/** CSSセレクタの定数 */
exports.SELECTORS = {
    SUBAREAS: 'ul.routeMa a',
    DETAIL_AREAS: 'div.searchAreaListWrap ul.searchAreaList a',
    PAGINATION: 'ul.paging.jscPagingParents li a',
    SALON_LIST: 'ul.slnCassetteList',
    SALON_LIST_ITEMS: 'ul.slnCassetteList li',
    SALON_LINKS: 'a[href*="slnH"]',
    SALON_DATA_TABLE: 'table.slnDataTbl tr',
};
