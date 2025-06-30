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
    access: string;
    businessHours: string;
    closedDays: string;
    paymentMethods: string;
    cutPrice: string;
    seatCount: string;
    staffCount: string;
    parking: string;
    features: string;
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
}

/** Google検索結果から取得する追加情報の型定義 */
export interface GoogleSearchResult {
    instagramUrl?: string;
    email?: string;
    phoneNumber?: string;
    homepageUrl?: string;
    googleBusinessInfo?: GoogleBusinessInfo;
    // 複数候補用の配列
    instagramCandidates?: string[];
    emailCandidates?: string[];
    phoneNumberCandidates?: string[];
    homepageCandidates?: string[];
}

/** 拡張されたサロン詳細情報の型定義 */
export interface ExtendedSalonDetails extends SalonDetails {
    instagramUrl?: string;
    email?: string;
    phoneNumber?: string;
    homepageUrl?: string;
    googleBusinessInfo?: GoogleBusinessInfo;
    searchQuery: string;
    // 複数候補用の配列
    instagramCandidates?: string[];
    emailCandidates?: string[];
    phoneNumberCandidates?: string[];
    homepageCandidates?: string[];
}

/** エリア選択のオプション */
export interface AreaSelectionOptions {
    areas: Area[];
    prompt: string;
} 