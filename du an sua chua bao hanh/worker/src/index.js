const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dịch vụ 3T - Đang nâng cấp</title>
  <style>
    :root { color-scheme: light; font-family: Georgia, 'Times New Roman', serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
      color: #173b4d; background: radial-gradient(circle at 15% 10%, #fff8e8 0, transparent 35%),
      linear-gradient(135deg, #e7f4f5, #f8fbf7); }
    main { width: min(680px, 100%); padding: clamp(32px, 8vw, 72px) clamp(24px, 8vw, 64px);
      text-align: center; background: rgba(255,255,255,.9); border: 1px solid #d5e6e5;
      border-radius: 24px; box-shadow: 0 24px 70px rgba(23,59,77,.14); }
    .mark { width: 64px; height: 64px; margin: 0 auto 24px; display: grid; place-items: center;
      border-radius: 18px; color: #fff; background: #167d78; font: 700 28px Arial, sans-serif; }
    h1 { margin: 0 0 18px; font-size: clamp(25px, 5vw, 40px); line-height: 1.15; }
    p { margin: 0; font: 16px/1.65 Arial, sans-serif; color: #527080; }
    .support { margin-top: 28px; padding-top: 22px; border-top: 1px solid #d5e6e5; }
    strong { color: #173b4d; }
    .account { display: inline-block; margin-top: 6px; font: 700 19px/1.4 Arial, sans-serif; color: #167d78; letter-spacing: .04em; }
  </style>
</head>
<body><main><div class="mark">3T</div>
  <h1>(!) Trang web đang nâng cấp, vui lòng quay lại sau!</h1>
  <p>Chúng tôi đang hoàn thiện hệ thống để phục vụ bạn tốt hơn.</p>
  <div class="support"><p>Mọi ủng hộ xin gửi về tài khoản Techcombank</p><span class="account">0988282435</span></div>
</main></body></html>`;

export default {
  async fetch(request) {
    return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' } });
  }
};
