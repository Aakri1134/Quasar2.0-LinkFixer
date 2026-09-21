const SHARER_PATTERNS: RegExp[] = [
  // Facebook
  /^https?:\/\/(www\.)?facebook\.com\/(sharer|share)(\.php|\/sharer)?/i,
  // Twitter / X
  /^https?:\/\/(www\.)?(twitter|x)\.com\/(intent\/tweet|share)/i,
  // WhatsApp
  /^https?:\/\/(api\.)?whatsapp\.com\/send/i,
  /^https?:\/\/wa\.me\//i,
  // LinkedIn
  /^https?:\/\/(www\.)?linkedin\.com\/(sharing\/share-offsite|shareArticle)/i,
  // Telegram
  /^https?:\/\/t\.me\/share/i,
  // Reddit
  /^https?:\/\/(www\.)?reddit\.com\/submit/i,
  // Pinterest
  /^https?:\/\/(www\.)?pinterest\.[a-z.]+\/pin\/create/i,
  // Tumblr
  /^https?:\/\/(www\.)?tumblr\.com\/(widgets\/)?share/i,
  // mailto / sms share targets
  /^mailto:/i,
  /^sms:/i,
];

export function isSharerLink(url: string): boolean {
  return SHARER_PATTERNS.some((pattern) => pattern.test(url));
}