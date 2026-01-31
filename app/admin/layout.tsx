'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin', label: 'ダッシュボード', icon: '📊' },
    { href: '/admin/import', label: '問題インポート', icon: '📥' },
    { href: '/admin/questions', label: '問題編集', icon: '✏️' },
    { href: '/admin/arc-settings', label: 'エリア設定', icon: '🗺️' },
    { href: '/', label: 'トップに戻る', icon: '🏠' },
  ];

  return (
    <div className="min-h-screen bg-[#FDF6E3] flex">
      {/* サイドバー - 固定 */}
      <aside className="w-64 bg-[#2C3E50] text-white flex-shrink-0 fixed left-0 top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-8 text-center">
            ⚙️ 管理画面
          </h1>
          
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-3 rounded-lg font-bold transition-colors ${
                        isActive
                          ? 'bg-[#3498DB] text-white'
                          : 'hover:bg-[#34495E] text-gray-300'
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* バージョン情報 */}
          <div className="mt-8 p-4 bg-[#34495E] rounded-lg">
            <h3 className="text-sm font-bold mb-2 text-gray-400">
              システム情報
            </h3>
            <div className="text-xs text-gray-300 space-y-1">
              <p>💡 Version 1.0.0</p>
              <p>🎯 ONE PIECE Quiz</p>
            </div>
          </div>
        </div>
      </aside>

      {/* メインコンテンツ - サイドバー分の左マージン */}
      <main className="flex-1 overflow-auto ml-64">
        {children}
      </main>
    </div>
  );
}