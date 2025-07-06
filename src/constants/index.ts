// ======================= 定数定義 ========================

/** エリア名とHotPepper Beautyのエリア別トップページURLのマッピング */
export const AREA_URL_MAP: Readonly<Record<string, string>> = {
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
export const DELAY_MS = 100;

/** Google検索結果のフルページマップを有効にするかどうかの設定 */
export const FULL_PAGE_MAP = false;

// ======================= 検索エンジン設定 ========================

/**
 * Bing検索を有効にするかどうかの設定
 * 環境変数BRING_SEARCH=trueで有効化（デフォルト: true）
 */
export const BRING_SEARCH = process.env.BRING_SEARCH !== 'false';

/**
 * Yahoo検索を有効にするかどうかの設定  
 * 環境変数YAHOO_SEARCH=trueで有効化（デフォルト: true）
 */
export const YAHOO_SEARCH = process.env.YAHOO_SEARCH !== 'false';



/** CSSセレクタの定数 */
export const SELECTORS = {
    SUBAREAS: 'ul.routeMa a',
    DETAIL_AREAS: 'div.searchAreaListWrap ul.searchAreaList a',
    PAGINATION: 'ul.paging.jscPagingParents li a',
    SALON_LIST: 'ul.slnCassetteList',
    SALON_LIST_ITEMS: 'ul.slnCassetteList li',
    SALON_LINKS: 'a[href*="slnH"]',
    SALON_DATA_TABLE: 'table.slnDataTbl tr',
} as const; 