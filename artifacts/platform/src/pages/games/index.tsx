<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ta'lim Platformasi</title>
  <style>
    :root {
      --bg-dark: #070a14;
      --card-bg: rgba(20, 26, 48, 0.7);
      --border-blue: rgba(56, 189, 248, 0.35);
      --border-purple: rgba(192, 132, 252, 0.35);
      --text-main: #ffffff;
      --text-muted: #8b9bb4;
      --gold: #facc15;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }

    .app-container {
      width: 100%;
      max-width: 480px;
      padding: 24px 16px 90px 16px;
      background: radial-gradient(circle at top, #131c38 0%, #070a14 75%);
    }

    .header-sub {
      color: var(--gold);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }

    .header-title {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .header-desc {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 24px;
    }

    .cards-wrapper {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .game-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-decoration: none;
      color: inherit;
    }

    .card-blue {
      border: 1px solid var(--border-blue);
      box-shadow: 0 10px 30px rgba(56, 189, 248, 0.1);
    }

    .card-purple {
      border: 1px solid var(--border-purple);
      box-shadow: 0 10px 30px rgba(192, 132, 252, 0.1);
    }

    .card-content {
      flex: 1;
      padding-right: 12px;
    }

    .icon-badge {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }

    .badge-blue {
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid var(--border-blue);
    }

    .badge-purple {
      background: rgba(192, 132, 252, 0.15);
      border: 1px solid var(--border-purple);
    }

    .card-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .card-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
      margin-bottom: 14px;
    }

    .card-tags {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #a0aec0;
    }

    /* PNG'siz Sof CSS Vizual Effectlar */
    .visual-box {
      width: 90px;
      height: 90px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .visual-blue {
      background: radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(0,0,0,0) 70%);
    }

    .visual-purple {
      background: radial-gradient(circle, rgba(192,132,252,0.25) 0%, rgba(0,0,0,0) 70%);
    }

    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 480px;
      background: rgba(10, 14, 26, 0.95);
      backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-around;
      padding: 12px 0;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 10px;
    }

    .nav-item.active {
      color: #ec4899;
    }
  </style>
</head>
<body>

  <div class="app-container">
    <div class="header-sub">INTERAKTIV DARS VOSITALARI</div>
    <h1 class="header-title">Guruh o'yinlari</h1>
    <p class="header-desc">Sinf bilan jonli o'tkaziladigan, jamoaviy bilim musobaqalari</p>

    <div class="cards-wrapper">

      <!-- Bamboozle Card -->
      <a href="/bamboozle" class="game-card card-blue">
        <div class="card-content">
          <div class="icon-badge badge-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#facc15"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c2.19-.38 3.88-2.02 3.98-4.33C19.39 11.23 21 9.22 21 7V5c0-1.1-.9-2-2-2z"/></svg>
          </div>
          <div class="card-title">Bamboozle</div>
          <div class="card-desc">Jamoalar savol-javob orqali raqobatlashadi — bonus va jarima mexanikasi bilan.</div>
          <div class="card-tags">
            <span>👥 2–3 jamoa</span>
            <span>🧩 8–30 katak</span>
          </div>
        </div>
        <div class="visual-box visual-blue">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
      </a>

      <!-- Charxpalak Card -->
      <a href="/charxpalak" class="game-card card-purple">
        <div class="card-content">
          <div class="icon-badge badge-purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#c084fc"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
          </div>
          <div class="card-title">Omadli Charxpalak</div>
          <div class="card-desc">Tasodifiy tanlash mexanizmi — har bo'limga yashirin savol biriktirish imkoniyati.</div>
        </div>
        <div class="visual-box visual-purple">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><circle cx="12" cy="12" r="2" fill="#c084fc"/></svg>
        </div>
      </a>

    </div>
  </div>

  <!-- Bottom Nav -->
  <div class="bottom-nav">
    <a href="#" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>Monitoring</span>
    </a>
    <a href="#" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>
      <span>Jadval</span>
    </a>
    <a href="#" class="nav-item active">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2z"/></svg>
      <span>O'yinlar</span>
    </a>
  </div>

</body>
</html>
