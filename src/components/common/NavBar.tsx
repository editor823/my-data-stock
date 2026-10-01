'use client';

// ============================================================
// [컴포넌트] 글로벌 내비게이션 바
// 0~6번 메뉴 라우팅 처리
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/stock.html',             label: '🏠 홈',       short: '홈' },
  { href: '/stock.html#news',        label: '0. 실시간 뉴스',  short: '뉴스' },
  { href: '/stock.html#technique',   label: '1. 미국 증시',    short: '미국' },
  { href: '/stock.html#compare',     label: '2. 재료·테마',    short: '테마' },
  { href: '/stock.html#calendar',    label: '3. 증시 캘린더',  short: '캘린더' },
  { href: '/stock.html#deep',        label: '4-5. 종목 분석',  short: '분석' },
  { href: '/stock.html#youtube',     label: '6. 유튜브 브리핑', short: '브리핑' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="navbar" role="navigation" aria-label="주요 메뉴">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <span className="brand-icon">📊</span>
          <span className="brand-name">주식 인텔리전스</span>
        </div>

        <ul className="navbar-menu" role="list">
          {NAV_ITEMS.map(item => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="nav-label-full">{item.label}</span>
                  <span className="nav-label-short">{item.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
