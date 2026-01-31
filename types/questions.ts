// ========================================
// Phase 8: 問題形式のTypeScript型定義
// ========================================
// ファイル: types/questions.ts

/**
 * 問題形式の種類
 */
export type QuestionFormat = 
  | 'single_choice'      // 4択問題
  | 'multiple_choice'    // 複数選択
  | 'ordering'           // 並べ替え
  | 'free_text'          // 自由記述
  | 'numeric';           // 数値入力

/**
 * 学習モード
 */
export type LearningMode = 
  | 'story_arc'          // ストーリーアーク別学習
  | 'knowledge_base';    // 基礎知識学習

/**
 * 基礎知識のカテゴリ
 */
export type KnowledgeCategory =
  | 'face_to_name'           // 顔→名前
  | 'vivre_card'             // ビブルカード
  | 'technique_reading'      // 技の読み書き
  | 'technique_usage'        // 技の使用順・回数
  | 'location'               // 地名
  | 'term'                   // 専門用語
  | 'narration';             // ナレーション

/**
 * 難易度
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * 画像タイプ
 */
export type ImageType = 
  | 'original'   // オリジナル
  | 'edited'     // 編集済み
  | 'cropped'    // トリミング
  | 'mosaic'     // モザイク
  | 'blackout';  // 黒塗り

// ========================================
// 基本問題型
// ========================================

/**
 * 基本問題インターフェース
 */
export interface BaseQuestion {
  id: number;
  story_arc_id: number;
  question_format: QuestionFormat;
  learning_mode: LearningMode;
  knowledge_category?: KnowledgeCategory;
  question_text: string;
  difficulty: Difficulty;
  points: number;
  explanation: string | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  ai_generated: boolean;
  ai_source: string | null;
  verification_notes: string | null;
  created_manually: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 選択肢
 */
export interface Choice {
  id: number;
  question_id: number;
  choice_text: string;
  is_correct: boolean;
  order_num: number;
  correct_position?: number; // 並べ替え問題用
}

/**
 * 問題画像
 */
export interface QuestionImage {
  id: number;
  question_id: number;
  image_path: string;
  image_type: ImageType;
  edit_metadata: Record<string, unknown>;
  display_order: number;
  created_at: string;
}

/**
 * 自由記述の正解パターン
 */
export interface FreeTextAnswer {
  id: number;
  question_id: number;
  answer_text: string;
  is_primary: boolean;
  is_variation: boolean;
  created_at: string;
}

// ========================================
// 各問題形式固有の設定型
// ========================================

/**
 * 複数選択問題の設定
 */
export interface MultipleChoiceConfig {
  min_selections?: number;    // 最低選択数
  max_selections?: number;    // 最大選択数
  partial_scoring?: boolean;  // 部分点を有効にするか
}

/**
 * 並べ替え問題のアイテム
 */
export interface OrderingItem {
  id: number;
  text: string;
  image_path?: string;
  correct_position: number;
}

/**
 * 並べ替え問題の設定
 */
export interface OrderingConfig {
  ordering_criteria: string;        // '時系列順', '使用順', '強さ順'など
  partial_scoring?: boolean;        // 部分点を有効にするか
  items: OrderingItem[];            // アイテムリスト
}

/**
 * 自由記述問題のマッチングモード
 */
export type MatchingMode = 
  | 'exact'      // 完全一致
  | 'partial'    // 部分一致
  | 'keywords'   // キーワードマッチング
  | 'regex';     // 正規表現

/**
 * 自由記述問題の設定
 */
export interface FreeTextConfig {
  correct_answers: string[];          // 正解のリスト
  matching_mode?: MatchingMode;       // マッチングモード（デフォルト: 'exact'）
  case_sensitive?: boolean;           // 大文字小文字を区別するか（デフォルト: false）
  trim_whitespace?: boolean;          // 前後の空白を無視するか（デフォルト: true）
  allow_partial_match?: boolean;      // 部分一致を許可するか（デフォルト: false）
  placeholder?: string;               // 入力フィールドのヒント
}

/**
 * 数値入力問題の設定
 */
export interface NumericConfig {
  correct_answer: number;             // 正解の数値
  unit?: string;                      // 単位（'回', 'ベリー', '巻'など）
  acceptable_range?: {                // 許容範囲
    min?: number;
    max?: number;
  };
}

// ========================================
// 各問題形式の具体的な型
// ========================================

/**
 * 4択問題
 */
export interface SingleChoiceQuestion extends BaseQuestion {
  question_format: 'single_choice';
  format_config: Record<string, never>; // 空のオブジェクト
  choices: Choice[];
  images?: QuestionImage[];
}

/**
 * 複数選択問題
 */
export interface MultipleChoiceQuestion extends BaseQuestion {
  question_format: 'multiple_choice';
  format_config: MultipleChoiceConfig;
  choices: Choice[];
  images?: QuestionImage[];
}

/**
 * 並べ替え問題
 */
export interface OrderingQuestion extends BaseQuestion {
  question_format: 'ordering';
  format_config: OrderingConfig;
  choices?: Choice[]; // 並べ替えの場合、choicesは使わない（format_config.itemsを使用）
  images?: QuestionImage[];
}

/**
 * 自由記述問題
 */
export interface FreeTextQuestion extends BaseQuestion {
  question_format: 'free_text';
  format_config: FreeTextConfig;
  images?: QuestionImage[];
}

/**
 * 数値入力問題
 */
export interface NumericQuestion extends BaseQuestion {
  question_format: 'numeric';
  format_config: NumericConfig;
  correct_answer: number;
  choices?: Choice[]; // 数値問題の場合、choicesは使わない
  images?: QuestionImage[];
}

/**
 * 全ての問題形式のユニオン型
 */
export type Question = 
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | OrderingQuestion
  | FreeTextQuestion
  | NumericQuestion;

// ========================================
// JSON形式（インポート用）
// ========================================

/**
 * JSONインポート用の4択問題
 */
export interface SingleChoiceQuestionJSON {
  question_format: 'single_choice';
  story_arc_id: number;
  learning_mode?: LearningMode;
  knowledge_category?: KnowledgeCategory;
  question_text: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  verified?: boolean;
  ai_generated?: boolean;
  choices: Array<{
    text: string;
    is_correct: boolean;
  }>;
  images?: string[]; // 画像パスの配列
}

/**
 * JSONインポート用の複数選択問題
 */
export interface MultipleChoiceQuestionJSON {
  question_format: 'multiple_choice';
  story_arc_id: number;
  learning_mode?: LearningMode;
  knowledge_category?: KnowledgeCategory;
  question_text: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  verified?: boolean;
  ai_generated?: boolean;
  format_config: MultipleChoiceConfig;
  choices: Array<{
    text: string;
    is_correct: boolean;
  }>;
  images?: string[];
}

/**
 * JSONインポート用の並べ替え問題
 */
export interface OrderingQuestionJSON {
  question_format: 'ordering';
  story_arc_id: number;
  learning_mode?: LearningMode;
  knowledge_category?: KnowledgeCategory;
  question_text: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  verified?: boolean;
  ai_generated?: boolean;
  format_config: OrderingConfig;
  images?: string[];
}

/**
 * JSONインポート用の自由記述問題
 */
export interface FreeTextQuestionJSON {
  question_format: 'free_text';
  story_arc_id: number;
  learning_mode?: LearningMode;
  knowledge_category?: KnowledgeCategory;
  question_text: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  verified?: boolean;
  ai_generated?: boolean;
  format_config: FreeTextConfig;
  images?: string[];
}

/**
 * JSONインポート用の数値入力問題
 */
export interface NumericQuestionJSON {
  question_format: 'numeric';
  story_arc_id: number;
  learning_mode?: LearningMode;
  knowledge_category?: KnowledgeCategory;
  question_text: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  verified?: boolean;
  ai_generated?: boolean;
  format_config: NumericConfig;
  images?: string[];
}

/**
 * JSONインポート用の全問題形式のユニオン型
 */
export type QuestionJSON = 
  | SingleChoiceQuestionJSON
  | MultipleChoiceQuestionJSON
  | OrderingQuestionJSON
  | FreeTextQuestionJSON
  | NumericQuestionJSON;

// ========================================
// ユーティリティ型
// ========================================

/**
 * 型ガード: 4択問題かどうか
 */
export function isSingleChoice(question: Question): question is SingleChoiceQuestion {
  return question.question_format === 'single_choice';
}

/**
 * 型ガード: 複数選択問題かどうか
 */
export function isMultipleChoice(question: Question): question is MultipleChoiceQuestion {
  return question.question_format === 'multiple_choice';
}

/**
 * 型ガード: 並べ替え問題かどうか
 */
export function isOrdering(question: Question): question is OrderingQuestion {
  return question.question_format === 'ordering';
}

/**
 * 型ガード: 自由記述問題かどうか
 */
export function isFreeText(question: Question): question is FreeTextQuestion {
  return question.question_format === 'free_text';
}

/**
 * 型ガード: 数値入力問題かどうか
 */
export function isNumeric(question: Question): question is NumericQuestion {
  return question.question_format === 'numeric';
}

// ========================================
// 問題形式の表示名
// ========================================

export const QUESTION_FORMAT_LABELS: Record<QuestionFormat, string> = {
  single_choice: '4択問題',
  multiple_choice: '複数選択',
  ordering: '並べ替え',
  free_text: '自由記述',
  numeric: '数値入力',
};

export const LEARNING_MODE_LABELS: Record<LearningMode, string> = {
  story_arc: 'ストーリーアーク別',
  knowledge_base: '基礎知識',
};

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  face_to_name: '👤 顔→名前',
  vivre_card: '📖 ビブルカード',
  technique_reading: '⚔️ 技の読み書き',
  technique_usage: '🔢 技の使用順・回数',
  location: '🏝️ 地名',
  term: '📖 専門用語',
  narration: '📜 ナレーション',
};