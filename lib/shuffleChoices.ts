/**
 * 選択肢をランダムにシャッフルする
 * Fisher-Yates アルゴリズムを使用
 */
export function shuffleChoices<T>(array: T[]): T[] {
  const shuffled = [...array]; // 元の配列を変更しない
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * 使用例:
 * 
 * const choices = [
 *   { text: "選択肢A", is_correct: false },
 *   { text: "選択肢B", is_correct: true },
 *   { text: "選択肢C", is_correct: false },
 *   { text: "選択肢D", is_correct: false }
 * ];
 * 
 * const shuffledChoices = shuffleChoices(choices);
 */