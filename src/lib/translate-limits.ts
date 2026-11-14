/** Bounds of one /api/translate request, shared by the server (which enforces them) and the client (which plans around them). */
export const TRANSLATE_MAX_ITEMS = 200;
export const TRANSLATE_MAX_ITEM_LENGTH = 20_000;
export const TRANSLATE_MAX_TOTAL_LENGTH = 100_000;
