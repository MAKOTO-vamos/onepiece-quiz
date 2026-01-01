'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignUpForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('=== 新規登録開始 ===');
    console.log('Email:', email);
    console.log('Display Name:', displayName);

    try {
      // Supabase SDKで新規登録
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      console.log('Response data:', data);
      console.log('Response error:', signUpError);

      if (signUpError) {
        console.log('SignUp error:', signUpError);
        setError('登録に失敗しました: ' + signUpError.message);
      } else if (data.session && data.user) {
        console.log('SignUp success!');
        console.log('Session:', data.session);
        console.log('User:', data.user);
        
        // セッション情報を保存
        localStorage.setItem('supabase_token', data.session.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        
        // user_progressデータを作成
        await createUserProgress(data.user.id);
        
        console.log('LocalStorage saved, redirecting...');
        
        // ページをリロードして航海マップへ
        window.location.href = '/';
      } else {
        setError('登録に失敗しました');
      }
    } catch (error) {
      console.error('登録エラー:', error);
      setError('登録に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  // user_progressデータを作成する関数
  const createUserProgress = async (userId: string) => {
    try {
      console.log('Creating user_progress for user:', userId);
      
      // story_arcsを取得
      const { data: arcs } = await supabase
        .from('story_arcs')
        .select('id, total_questions, order_num')
        .order('order_num');

      if (!arcs || arcs.length === 0) {
        console.error('No story arcs found');
        return;
      }

      // user_progressレコードを作成
      const progressRecords = arcs.map((arc) => ({
        user_id: userId,
        story_arc_id: arc.id,
        total_questions: arc.total_questions,
        is_unlocked: arc.order_num === 1, // 最初のエリアだけ解放
        unlocked_at: arc.order_num === 1 ? new Date().toISOString() : null,
      }));

      const { error } = await supabase
        .from('user_progress')
        .insert(progressRecords);

      if (error) {
        console.error('Error creating user_progress:', error);
      } else {
        console.log('User progress created successfully');
      }
    } catch (error) {
      console.error('Error in createUserProgress:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF6E3] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#2C3E50] mb-2">
            ⚓ 新しい海賊として
          </h1>
          <p className="text-2xl text-[#E74C3C] font-bold">仲間に加わる</p>
        </div>

        <form onSubmit={handleSignUp} className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="displayName" className="block text-[#2C3E50] font-bold mb-2">
              海賊名（ニックネーム）
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#95A5A6] rounded-lg focus:outline-none focus:border-[#3498DB] text-[#2C3E50] placeholder:text-gray-400"
              placeholder="ルフィ"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="email" className="block text-[#2C3E50] font-bold mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#95A5A6] rounded-lg focus:outline-none focus:border-[#3498DB] text-[#2C3E50] placeholder:text-gray-400"
              placeholder="luffy@onepiece.com"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-[#2C3E50] font-bold mb-2">
              パスワード (6文字以上)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#95A5A6] rounded-lg focus:outline-none focus:border-[#3498DB] text-[#2C3E50] placeholder:text-gray-400"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C0392B] hover:bg-[#E74C3C] text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⚓ 登録中...' : '⚓ 仲間に加わる'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-[#7F8C8D] mb-2">すでに仲間？</p>
            <a href="/login" className="text-[#E74C3C] font-bold hover:underline">
              ログインする
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}