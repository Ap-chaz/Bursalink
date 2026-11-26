const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapEmailHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1d2327;">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e6e8eb;border-radius:16px;overflow:hidden;">
    <div style="background:#0f6b4a;padding:18px 24px;color:#ffffff;">
      <strong style="font-size:20px;letter-spacing:-0.01em;">BursaLink Kenya</strong>
    </div>
    <div style="padding:24px;line-height:1.6;font-size:15px;">
      ${bodyHtml}
    </div>
    <div style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e6e8eb;font-size:12px;color:#6a7178;">
      BursaLink Official Student Bursary Portal · Applications are always free.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send a transactional email via Brevo HTTP API v3.
 * Gracefully skips if BREVO_API_KEY is not configured or during automated tests.
 */
export async function sendBrevoEmail({ to, subject, htmlContent, textContent }) {
  if (process.env.NODE_ENV === 'test') {
    return { skipped: true, reason: 'test_env' };
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'BursaLink Kenya';

  if (!apiKey || !senderEmail) {
    console.log(`[BREVO SKIPPED] Set BREVO_API_KEY and BREVO_SENDER_EMAIL in backend/.env to send email to ${to} (${subject})`);
    return { skipped: true, reason: 'missing_credentials' };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent,
        ...(textContent ? { textContent } : {})
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[BREVO ERROR] (${response.status}) Failed sending to ${to}:`, data.message || data);
      return { sent: false, status: response.status, error: data.message || 'Brevo API error' };
    }

    console.log(`[BREVO SENT] Email dispatched to ${to} (messageId: ${data.messageId || 'ok'})`);
    return { sent: true, messageId: data.messageId };
  } catch (err) {
    console.error(`[BREVO NETWORK ERROR] Failed sending to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

export async function sendOtpEmail(email, code, purpose = 'login') {
  const reason = {
    verify_email: 'verify your email address and finish creating your BursaLink account',
    login: 'complete your sign-in to BursaLink',
    reset: 'reset your BursaLink password'
  }[purpose] || 'verify your identity on BursaLink';
  const subject = `${code} is your BursaLink verification code`;
  const htmlContent = wrapEmailHtml(
    subject,
    `<h2 style="margin:0 0 12px;color:#111;font-size:20px;">Your verification code</h2>
     <p style="margin:0 0 16px;">Use the one-time code below to ${escapeHtml(reason)}. This code expires in <strong>10 minutes</strong>.</p>
     <div style="padding:16px 20px;background:#e8f6ee;border:1px solid #b7e4c7;border-radius:12px;text-align:center;font-size:28px;font-weight:700;letter-spacing:6px;color:#0f6b4a;margin:0 0 16px;">
       ${escapeHtml(code)}
     </div>
     <p style="margin:0 0 8px;color:#6a7178;font-size:13px;"><strong>Never share this code.</strong> BursaLink staff will never ask for it.</p>
     <p style="margin:0;color:#6a7178;font-size:13px;">If you did not request this code, you can safely ignore this email. Your password has not been changed.</p>`
  );
  const textContent = `Your BursaLink verification code is: ${code}\n\nUse it to ${reason}. It expires in 10 minutes. Never share this code with anyone.`;

  return sendBrevoEmail({ to: email, subject, htmlContent, textContent });
}

export async function sendExistingAccountNoticeEmail(email) {
  const subject = 'Sign-in help for your BursaLink account';
  const htmlContent = wrapEmailHtml(
    subject,
    `<h2 style="margin:0 0 12px;color:#111;font-size:20px;">You already have a BursaLink account</h2>
     <p style="margin:0 0 12px;">Someone tried to register on BursaLink using this email address.</p>
     <p style="margin:0 0 12px;">If this was you, please go back and use <strong>Sign in</strong> with your password, or select <strong>Forgot password</strong> to reset it.</p>
     <p style="margin:0;color:#6a7178;font-size:13px;">If this was not you, you can safely ignore this email. Your account and password have not changed.</p>`
  );
  const textContent =
    'Someone tried to register on BursaLink using your email address, which already has an account.\n\nIf this was you, use Sign in with your password or click Forgot password to reset it. If not, ignore this email.';

  return sendBrevoEmail({ to: email, subject, htmlContent, textContent });
}

export async function sendApplicationSubmittedEmail({ email, ref, bursaryTitle }) {
  const subject = `Application ${ref} received – ${bursaryTitle || 'BursaLink'}`;
  const htmlContent = wrapEmailHtml(
    subject,
    `<h2 style="margin:0 0 12px;color:#111;font-size:20px;">Application submitted</h2>
     <p style="margin:0 0 12px;">Your application for <strong>${escapeHtml(bursaryTitle || 'Bursary')}</strong> has been received.</p>
     <p style="margin:0 0 16px;">Reference number: <strong style="color:#0f6b4a;">${escapeHtml(ref)}</strong></p>
     <p style="margin:0;color:#6a7178;font-size:13px;">Keep your reference number safe. You can use it anytime on BursaLink to track your application status.</p>`
  );
  const textContent = `Your application for ${bursaryTitle || 'Bursary'} has been submitted.\nReference Number: ${ref}`;

  return sendBrevoEmail({ to: email, subject, htmlContent, textContent });
}

export async function sendStatusUpdateEmail({ email, ref, bursaryTitle, statusLabel, note }) {
  const subject = `Update on application ${ref}: ${statusLabel}`;
  const noteBlock = note
    ? `<div style="margin:16px 0;padding:14px 16px;background:#f9fafb;border-left:4px solid #1fb355;border-radius:8px;">
         <strong style="display:block;margin-bottom:4px;font-size:13px;color:#0f6b4a;">Message from the committee:</strong>
         <span>${escapeHtml(note)}</span>
       </div>`
    : '';

  const htmlContent = wrapEmailHtml(
    subject,
    `<h2 style="margin:0 0 12px;color:#111;font-size:20px;">Application status updated</h2>
     <p style="margin:0 0 10px;">Your application <strong>${escapeHtml(ref)}</strong>${bursaryTitle ? ` for <strong>${escapeHtml(bursaryTitle)}</strong>` : ''} has a new status:</p>
     <p style="margin:0 0 14px;"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:#e8f6ee;color:#0f6b4a;font-weight:600;text-transform:capitalize;">${escapeHtml(statusLabel)}</span></p>
     ${noteBlock}
     <p style="margin:0;color:#6a7178;font-size:13px;">Sign in to your BursaLink account to view full details and next steps.</p>`
  );
  const textContent = `Application ${ref} is now ${statusLabel}.${note ? `\n\nMessage from the committee: "${note}"` : ''}`;

  return sendBrevoEmail({ to: email, subject, htmlContent, textContent });
}
