export type LangCode = "en" | "ar" | "fr" | "ha" | "yo" | "ig" | "zh";

export const LANGUAGES: { code: LangCode; label: string; dir?: "rtl" }[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "Français" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yorùbá" },
  { code: "ig", label: "Igbo" },
  { code: "zh", label: "中文" },
];

// Core UI strings. Add more keys here as the app grows — every screen
// should read from this dictionary via the `t()` helper rather than
// hardcoding text, so translations stay centralized.
export const dictionary = {
  home: {
    en: "Home", ar: "الرئيسية", fr: "Accueil", ha: "Gida", yo: "Ile", ig: "Ụlọ", zh: "首页",
  },
  groups: {
    en: "Groups", ar: "المجموعات", fr: "Groupes", ha: "Rukunoni", yo: "Àwùjọ", ig: "Ìgbè", zh: "小组",
  },
  createGroup: {
    en: "Create Group", ar: "إنشاء مجموعة", fr: "Créer un groupe", ha: "Ƙirƙiri Rukuni", yo: "Ṣẹda Àwùjọ", ig: "Mepụta Ìgbè", zh: "创建小组",
  },
  wallet: {
    en: "Wallet", ar: "المحفظة", fr: "Portefeuille", ha: "Wallet", yo: "Àpò", ig: "Akpa Ego", zh: "钱包",
  },
  activity: {
    en: "Activity", ar: "النشاط", fr: "Activité", ha: "Ayyuka", yo: "Ìgbésẹ̀", ig: "Ọrụ", zh: "活动",
  },
  inviteFriends: {
    en: "Invite Friends", ar: "دعوة الأصدقاء", fr: "Inviter des amis", ha: "Gayyaci Aboki", yo: "Pe Àwọn Ọ̀rẹ́", ig: "Kpọọ Ndị Enyi", zh: "邀请朋友",
  },
  notifications: {
    en: "Notifications", ar: "الإشعارات", fr: "Notifications", ha: "Sanarwa", yo: "Ìfitónilétí", ig: "Ọkwa", zh: "通知",
  },
  profile: {
    en: "Profile", ar: "الملف الشخصي", fr: "Profil", ha: "Bayanan Kai", yo: "Àkọlé", ig: "Profaịlụ", zh: "个人资料",
  },
  menu: {
    en: "Menu", ar: "القائمة", fr: "Menu", ha: "Menu", yo: "Àtòjọ", ig: "Ntujuko", zh: "菜单",
  },
  settings: {
    en: "Settings", ar: "الإعدادات", fr: "Paramètres", ha: "Saitunan", yo: "Ètò", ig: "Ntọala", zh: "设置",
  },
  logout: {
    en: "Log Out", ar: "تسجيل الخروج", fr: "Déconnexion", ha: "Fita", yo: "Jáde", ig: "Pụọ", zh: "退出登录",
  },
  welcomeBack: {
    en: "Good morning", ar: "صباح الخير", fr: "Bonjour", ha: "Barka da safiya", yo: "Ẹ káàrọ̀", ig: "Ụtụtụ ọma", zh: "早上好",
  },
  walletBalance: {
    en: "Wallet Balance", ar: "رصيد المحفظة", fr: "Solde du portefeuille", ha: "Kuɗin Wallet", yo: "Iye Owó Àpò", ig: "Ego Akpa", zh: "钱包余额",
  },
  totalSavings: {
    en: "Total Savings", ar: "إجمالي المدخرات", fr: "Épargne totale", ha: "Jimillar Ajiya", yo: "Àpapọ̀ Ìfowópamọ́", ig: "Mkpokọta Nchekwa", zh: "总储蓄",
  },
  activeGroups: {
    en: "Active Groups", ar: "المجموعات النشطة", fr: "Groupes actifs", ha: "Rukunonin da ke Aiki", yo: "Àwọn Àwùjọ Tí Ń Ṣiṣẹ́", ig: "Ìgbè Na-arụ Ọrụ", zh: "活跃小组",
  },
  totalEarned: {
    en: "Total Earned", ar: "إجمالي الأرباح", fr: "Total gagné", ha: "Jimillar Riba", yo: "Àpapọ̀ Èrè", ig: "Mkpokọta Uru", zh: "总收益",
  },
  stakingBalance: {
    en: "Staking Balance", ar: "رصيد الحصص", fr: "Solde de staking", ha: "Kuɗin Staking", yo: "Iye Owó Staking", ig: "Ego Nchekwa", zh: "质押余额",
  },
  stakingReward: {
    en: "Staking Reward", ar: "مكافأة الحصص", fr: "Récompense de staking", ha: "Ribar Staking", yo: "Èrè Staking", ig: "Uru Nchekwa", zh: "质押奖励",
  },
  transactionHistory: {
    en: "Transaction History", ar: "سجل المعاملات", fr: "Historique des transactions", ha: "Tarihin Ma'amaloli", yo: "Ìtàn Ìdúnàádúrà", ig: "Akụkọ Azụmahịa", zh: "交易记录",
  },
  claimNow: {
    en: "Claim Now", ar: "المطالبة الآن", fr: "Réclamer", ha: "Karɓa Yanzu", yo: "Gba Nísisìyí", ig: "Nweta Ugbu a", zh: "立即领取",
  },
  payNow: {
    en: "Pay Now", ar: "ادفع الآن", fr: "Payer maintenant", ha: "Biya Yanzu", yo: "San Nísisìyí", ig: "Kwụọ Ugbu a", zh: "立即支付",
  },
} as const;

export type DictKey = keyof typeof dictionary;

export function translate(key: DictKey, lang: LangCode): string {
  return dictionary[key]?.[lang] ?? dictionary[key]?.en ?? key;
}
