<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ta'lim Platforma - Neon UI</title>
  <style>
    :root {
      --bg: #050714;
      --neon-blue: #00f0ff;
      --neon-pink: #ff007f;
      --neon-purple: #a855f7;
      --gold: #ffcc00;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    body {
      background-color: var(--bg);
      color: #fff;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 40%, rgba(255, 0, 127, 0.1) 0%, transparent 40%);
    }

    .app-container {
      width: 100%;
      max-width: 440px;
      padding: 24px 18px 100px;
    }

    /* Header Section */
    .sub-title {
      color: var(--gold);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
      margin-bottom: 6px;
    }

    .main-title {
      font-size: 32px;
      font-weight: 900;
      background: linear-gradient(180deg, #ffffff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }

    .desc {
      color: #94a3b8;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 28px;
    }

    /* Cards Wrapper */
    .cards-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .card {
      position: relative;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-decoration: none;
      color: #fff;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Card 1: Blue Neon */
    .card-blue {
      border: 1px solid rgba(0, 240, 255, 0.3);
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(0, 240, 255, 0.05);
    }

    .card-blue:hover {
      border-color: var(--neon-blue);
      box-shadow: 0 0 35px rgba(0, 240, 255, 0.35), inset 0 0 20px rgba(0, 240, 255, 0.1);
      transform: translateY(-2px);
    }

    /* Card 2: Pink/Purple Neon */
    .card-purple {
      border: 1px solid rgba(255, 0, 127, 0.3);
      box-shadow: 0 0 25px rgba(255, 0, 127, 0.15), inset 0 0 15px rgba(255, 0, 127, 0.05);
    }

    .card-purple:hover {
      border-color: var(--neon-pink);
      box-shadow: 0 0 35px rgba(255, 0, 127, 0.35), inset 0 0 20px rgba(255, 0, 127, 0.1);
      transform: translateY(-2px);
    }

    .card-info {
      flex: 1;
      z-index: 2;
      padding-right: 10px;
    }

    .badge {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }

    .badge-blue {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--neon-blue);
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
    }

    .badge-purple {
      background: rgba(255, 0, 127, 0.1);
      border: 1px solid var(--neon-pink);
      box-shadow: 0 0 15px rgba(255, 0, 127, 0.4);
    }

    .card-title {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    .card-desc {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.4;
      margin-bottom: 14px;
    }

    .card-tags {
      display: flex;
      gap: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
    }

    /* Neon Orb / Visual Graphics */
    .visual-wrapper {
      position: relative;
      width: 90px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .neon-orb-blue {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: radial-gradient(circle, #00f0ff 0%, #0040ff 60%, transparent 100%);
      filter: blur(10px);
      opacity: 0.6;
      position: absolute;
    }

    .neon-orb-pink {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: radial-gradient(circle, #ff007f 0%, #7928ca 60%, transparent 100%);
      filter: blur(10px);
      opacity: 0.6;
      position: absolute;
    }

    .icon-svg {
      position: relative;
      z-index: 2;
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
    }

    /* Bottom Glass Navigation */
    .navbar {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 440px;
      background: rgba(10, 15, 30, 0.85);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-around;
      padding: 12px 0 16px;
      box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.5);
    }

    .nav-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      color: #64748b;
      text-decoration: none;
      font-size: 10px;
      font-weight: 600;
      transition: color 0.2s;
    }

    .nav-link.active {
      color: var(--neon-pink);
      text-shadow: 0 0 10px rgba(255, 0, 127, 0.6);
    }

    .nav-link.active svg {
      filter: drop-shadow(0 0 6px var(--neon-pink));
    }
  </style>
</head>
<body>

  <div class="app-container">
    <div class="sub-title">INTERAKTIV DARS VOSITALARI</div>
    <h1 class="main-title">Guruh o'yinlari</h1>
    <p class="desc">Sinf bilan jonli o'tkaziladigan, jamoaviy bilim musobaqalari</p>

    <div class="cards-container">

      <!-- Bamboozle Card -->
      <a href="/bamboozle" class="card card-blue">
        <div class="card-info">
          <div class="badge badge-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--gold)">
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1c2.19-.38 3.88-2.02 3.98-4.33C19.39 11.23 21 9.22 21 7V5c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div class="card-title">Bamboozle</div>
          <div class="card-desc">Jamoalar savol-javob orqali raqobatlashadi — bonus va jarima mexanikasi bilan.</div>
          <div class="card-tags">
            <span>👥 2–3 jamoa</span>
            <span>🧩 8–30 katak</span>
          </div>
        </div>
        <div class="visual-wrapper">
          <div class="neon-orb-blue"></div>
          <svg class="icon-svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="var(--neon-blue)"/>
            <path d="M3 9h18M9 21V9" stroke="var(--neon-blue)"/>
            <circle cx="15" cy="15" r="2" fill="var(--neon-blue)"/>
          </svg>
        </div>
      </a>

      <!-- Charxpalak Card -->
      <a href="/charxpalak" class="card card-purple">
        <div class="card-info">
          <div class="badge badge-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--neon-pink)">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
          </div>
          <div class="card-title">Omadli Charxpalak</div>
          <div class="card-desc">Tasodifiy tanlash mexanizmi — har bo'limga yashirin savol biriktirish imkoniyati.</div>
        </div>
        <div class="visual-wrapper">
          <div class="neon-orb-pink"></div>
          <svg class="icon-svg" width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.5">
            <circle cx="12" cy="12" r="9" stroke="var(--neon-pink)"/>
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" stroke="var(--neon-pink)"/>
            <circle cx="12" cy="12" r="2" fill="#fff"/>
          </svg>
        </div>
      </a>

    </div>
  </div>

  <!-- Bottom Navigation -->
  <div class="navbar">
    <a href="#" class="nav-link">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>Monitoring</span>
    </a>
    <a href="#" class="nav-item nav-link">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>
      <span>Jadval</span>
    </a>
    <a href="#" class="nav-link active">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2z"/></svg>
      <span>O'yinlar</span>
    </a>
  </div>

</body>
</html>
