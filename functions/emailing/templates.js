// Adapted from the table layout in the reference project's emailing/otpauth.js.
// All user content is escaped; emails include a plain-text version as well.
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function renderNotification(payload, baseUrl) {
  const {
    title, heading = title, message, name, details = [], actionLabel, actionPath,
    preheader = message, note, preferences = true,
  } = payload;
  const base = new URL(baseUrl);
  const action = actionPath ? new URL(actionPath, base) : null;
  if (action && (action.origin !== base.origin || !actionPath.startsWith('/') || actionPath.startsWith('//'))) throw new Error('Invalid email action URL.');
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const url = action?.href;
  const settings = new URL('/dashboard/settings?tab=notifications', base).href;
  const context = details.filter(([, value]) => value !== undefined && value !== null && value !== '');
  const contextRows = context.map(([label, value]) => `
    <tr>
      <th scope="row" align="left" valign="top" width="112" style="padding:5px 16px 5px 0;font-size:13px;line-height:20px;font-weight:normal;color:#606978">${escapeHtml(label)}</th>
      <td valign="top" style="padding:5px 0;font-size:14px;line-height:20px;color:#20242d;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td>
    </tr>`).join('');
  return {
    subject: String(title).replace(/[\r\n]/g, ' ').slice(0, 200),
    text: [
      heading, greeting, message,
      context.length && context.map(([label, value]) => `${label}: ${value}`).join('\n'),
      url && `${actionLabel || 'Open in your browser'}: ${url}`, note,
      preferences && `Email preferences: ${settings}`, 'Abyuday',
    ].filter(Boolean).join('\n\n'),
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width:480px) {
      .email-outer { padding:20px 12px !important; }
      .email-content { padding:24px 20px !important; }
      .email-brand { padding:20px 20px !important; }
      .email-title { font-size:23px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#20242d;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(String(preheader || '').replace(/\s+/g, ' ').slice(0, 180))}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f6f8">
    <tr><td class="email-outer" align="center" style="padding:40px 16px">
      <!--[if mso]><table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px">
        <tr><td>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #dfe3ea;border-radius:12px">
            <tr><td class="email-brand" style="padding:22px 32px;border-bottom:1px solid #eef0f4;font-size:20px;line-height:26px;font-weight:bold;letter-spacing:-0.5px;color:#2859d8">abyuday.</td></tr>
            <tr><td class="email-content" style="padding:32px">
              <h1 class="email-title" style="margin:0 0 24px;font-size:25px;line-height:1.3;letter-spacing:-0.4px;font-weight:bold;color:#20242d;overflow-wrap:anywhere">${escapeHtml(heading)}</h1>
              <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#20242d">${escapeHtml(greeting)}</p>
              <p style="margin:0;font-size:14px;line-height:23px;color:#414957;overflow-wrap:anywhere">${escapeHtml(message)}</p>
              ${context.length ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px"><tr><td style="padding:12px 16px;background:#f5f6f8;border-radius:8px"><table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse">${contextRows}</table></td></tr></table>` : ''}
              ${url ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px"><tr><td align="center" bgcolor="#2859d8" style="border-radius:6px;mso-padding-alt:14px 22px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:14px;line-height:20px;font-weight:bold;text-align:center;text-decoration:none;border-radius:6px">${escapeHtml(actionLabel || 'Open in your browser')}</a></td></tr></table><p style="margin:14px 0 0;font-size:12px;line-height:20px"><a href="${escapeHtml(url)}" style="color:#606978;text-decoration:underline">Open in your browser</a></p>` : ''}
              ${note ? `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #eef0f4;font-size:12px;line-height:20px;color:#606978;overflow-wrap:anywhere">${escapeHtml(note)}</p>` : ''}
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:20px 12px;font-size:12px;line-height:20px;color:#606978">
          <p style="margin:0">© ${new Date().getFullYear()} Abyuday</p>
          ${preferences ? `<p style="margin:6px 0 0"><a href="${escapeHtml(settings)}" style="color:#606978;text-decoration:underline">Email preferences</a></p>` : ''}
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`,
  };
}
