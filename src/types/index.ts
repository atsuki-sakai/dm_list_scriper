// ======================= 型定義 ========================

/** エリア情報の型定義 */
export interface Area {
    name: string;
    url: string;
}

/** サブエリア情報の型定義 */
export interface SubArea {
    name: string;
    url: string;
}

/** 詳細エリア情報の型定義 */
export interface DetailArea {
    name: string;
    url: string;
}

/** サロン詳細情報の型定義 */
export interface SalonDetails {
    name: string;
    address: string;
    phone?: string; // 電話番号（任意）
    access: string;
    businessHours: string;
    closedDays: string;
    paymentMethods: string;
    cutPrice: string;
    staffCount: string;
    features: string;
    homepageUrl?: string; // 公式サイトURL（任意）
    remarks: string;
    other: string;
}

/** Google Business情報の型定義 */
export interface GoogleBusinessInfo {
    businessHours?: string;
    businessStatus?: string;
    rating?: number;
    reviewCount?: number;
    priceLevel?: string;
    categories?: string[];
    website?: string;
    phoneNumber?: string;
    address?: string;
    email?: string; // Google Businessからのメールアドレス（信頼度が高い）
}

/** Google検索結果から取得する追加情報の型定義 */
export interface GoogleSearchResult {
    instagramUrl?: string;
    email?: string;
    homepageUrl?: string;
    googleBusinessInfo?: GoogleBusinessInfo;
    // 複数候補用の配列（Instagram候補は最大2つまで）
    instagramCandidates?: string[];
    emailCandidates?: string[];
}

/** 拡張されたサロン詳細情報の型定義 */
export interface ExtendedSalonDetails extends SalonDetails {
    instagramUrl?: string;
    email?: string;
    homepageUrl?: string;
    googleBusinessInfo?: GoogleBusinessInfo;
    searchQuery: string;
    // 複数候補用の配列（Instagram候補は最大2つまで）
    instagramCandidates?: string[];
    emailCandidates?: string[];
}

/** エリア選択のオプション */
export interface AreaSelectionOptions {
    areas: Area[];
    prompt: string;
}

/** エリア選択結果を保持する型定義 */
export interface AreaSelectionResult {
    url: string;
    mainAreaName?: string;    // メインエリア名（例：中国）
    subAreaName?: string;     // サブエリア名（例：島根）
    detailAreaName?: string;  // 詳細エリア名（例：益田・浜田）
}