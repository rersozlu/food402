// remote/src/auth/login-page.ts - HTML login form for TGO credentials

export interface LoginPageParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  error?: string;
}

export function renderLoginPage(params: LoginPageParams): string {
  const errorHtml = params.error
    ? `<div class="error">${escapeHtml(params.error)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TGO Yemek - Giriş Yap</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #ff6b00 0%, #ff8533 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    .logo {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo h1 {
      color: #ff6b00;
      font-size: 28px;
      font-weight: 700;
    }

    .logo p {
      color: #666;
      margin-top: 8px;
      font-size: 14px;
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    input[type="email"],
    input[type="password"] {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    input[type="email"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #ff6b00;
      box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.1);
    }

    button[type="submit"] {
      width: 100%;
      padding: 16px;
      background: #ff6b00;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }

    button[type="submit"]:hover {
      background: #e65c00;
    }

    button[type="submit"]:active {
      transform: scale(0.98);
    }

    button[type="submit"]:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    .info {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }

    .info p {
      color: #6b7280;
      font-size: 13px;
      line-height: 1.6;
    }

    .info a {
      color: #ff6b00;
      text-decoration: none;
    }

    .info a:hover {
      text-decoration: underline;
    }

    .claude-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding: 12px;
      background: #f3f4f6;
      border-radius: 8px;
    }

    .claude-badge svg {
      width: 20px;
      height: 20px;
    }

    .claude-badge span {
      color: #4b5563;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>TGO Yemek</h1>
      <p>Food402 MCP Server ile bağlan</p>
    </div>

    ${errorHtml}

    <form method="POST" action="/oauth/login">
      <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}">
      <input type="hidden" name="state" value="${escapeHtml(params.state)}">
      ${params.codeChallenge ? `<input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}">` : ""}
      ${params.codeChallengeMethod ? `<input type="hidden" name="code_challenge_method" value="${escapeHtml(params.codeChallengeMethod)}">` : ""}

      <div class="form-group">
        <label for="email">E-posta Adresi</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="ornek@email.com"
          required
          autocomplete="email"
        >
      </div>

      <div class="form-group">
        <label for="password">Şifre</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="••••••••"
          required
          autocomplete="current-password"
        >
      </div>

      <button type="submit">Giriş Yap</button>
    </form>

    <div class="info">
      <p>
        TGO Yemek hesabınızla giriş yaparak Claude yapay zekasının sizin adınıza yemek siparişi vermesine izin veriyorsunuz.
      </p>
      <p style="margin-top: 8px;">
        Hesabınız yok mu? <a href="https://tgoyemek.com/uye-ol" target="_blank">Kayıt ol</a>
      </p>
    </div>

    <div class="claude-badge">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Claude.ai için bağlanıyor</span>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

export function renderErrorPage(error: string, description?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Food402</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #dc2626;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #6b7280;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(error)}</h1>
    ${description ? `<p>${escapeHtml(description)}</p>` : ""}
  </div>
</body>
</html>`;
}
