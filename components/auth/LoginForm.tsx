'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('=== ログイン開始 ===');
    console.log('Email:', email);

    try {
      // Supabase SDKでログイン
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Response data:', data);
      console.log('Response error:', signInError);

      if (signInError) {
        console.log('Login error:', signInError);
        setError('メールアドレスまたはパスワードが正しくありません');
      } else if (data.session) {
        console.log('Login success!');
        console.log('Session:', data.session);
        console.log('User:', data.user);
        
        // セッション情報を保存
        localStorage.setItem('supabase_token', data.session.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        
        console.log('LocalStorage saved, redirecting...');
        
        // ページをリロードして航海マップへ
        window.location.href = '/';
      } else {
        setError('ログインに失敗しました');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setError('ログインに失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF6E3] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#2C3E50] mb-2">
            ⚓ ONE PIECE
          </h1>
          <p className="text-2xl text-[#E74C3C] font-bold">ナレッジキング</p>
          <p className="text-[#34495E] mt-4">海賊王を目指す者よ、ログインせよ</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-lg border-4 border-[#2C3E50]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

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
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#95A5A6] rounded-lg focus:outline-none focus:border-[#3498DB] text-[#2C3E50] placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C0392B] hover:bg-[#E74C3C] text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⚓ ログイン中...' : '⚓ ログイン'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-[#7F8C8D] mb-2">まだアカウントを持っていない？</p>
            <a href="/signup" className="text-[#E74C3C] font-bold hover:underline">
              新しい海賊として登録する
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}