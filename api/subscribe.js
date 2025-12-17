// api/subscribe.js
// Vercel Serverless Function

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ 
        error: 'Server configuration error. Please contact support.' 
      });
    }

    // Make direct API call to Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Check if email already exists
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/waitlist?email=eq.${cleanEmail}&select=email`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const existing = await checkResponse.json();

    if (existing && existing.length > 0) {
      return res.status(200).json({ 
        message: "You're already on the waitlist! We'll be in touch soon." 
      });
    }

    // Insert new signup
    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/waitlist`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          email: cleanEmail,
          metadata: {
            source: req.headers.referer || 'direct',
            userAgent: req.headers['user-agent']
          }
        })
      }
    );

    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      console.error('Supabase insert error:', error);
      throw new Error('Failed to save email');
    }

    // Send welcome email via Resend
    try {
      await sendWelcomeEmail(cleanEmail);
    } catch (emailError) {
      console.error('Email send error:', emailError);
    }

    return res.status(200).json({ 
      message: "You're on the list! Check your email for confirmation.",
      success: true 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Something went wrong. Please try again.' 
    });
  }
}

async function sendWelcomeEmail(email) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.log('Resend API key not configured, skipping email');
    return;
  }

  const emailData = {
    from: 'Serenica <onboarding@resend.dev>',
    to: email,
    subject: '🧘 Welcome to Serenica - You\'re on the waitlist!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 40px 0;
            background: linear-gradient(135deg, #FFF8F0 0%, #F5E6D8 100%);
            border-radius: 16px;
            margin-bottom: 30px;
          }
          .logo { font-size: 48px; margin-bottom: 10px; }
          .title { font-size: 28px; font-weight: 700; color: #2C3E50; margin: 0; }
          .content { padding: 20px 0; }
          .footer {
            text-align: center;
            padding: 20px 0;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #eee;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🧘</div>
          <h1 class="title">Welcome to Serenica</h1>
        </div>
        <div class="content">
          <h2>You're on the waitlist! 🎉</h2>
          <p>Hi there,</p>
          <p>Thank you for joining the Serenica waitlist! We're excited to help you on your mental wellness journey.</p>
          <p><strong>What's next?</strong></p>
          <ul>
            <li>We're building something special for daily reflection and emotional tracking</li>
            <li>Early access members get lifetime perks and exclusive features</li>
            <li>You'll be among the first to know when we launch</li>
          </ul>
          <p>Take care,<br><strong>The Serenica Team</strong></p>
        </div>
        <div class="footer">
          <p>You're receiving this because you signed up for the Serenica waitlist.</p>
        </div>
      </body>
      </html>
    `,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    throw new Error('Email send failed');
  }

  return await response.json();
}
```

---

## ✅ After You Create the File:

1. **Vercel will auto-deploy** (wait 1-2 minutes)
2. **Test your site** - the form should work!
3. **You'll be live!** 🎉

Your folder structure should be:
```
serenica-waitlist/
├── api/
│   └── subscribe.js  ← THIS IS KEY!
├── index.html
├── package.json
└── vercel.json