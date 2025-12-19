export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Basic validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing env vars');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Insert into Supabase
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: cleanEmail
      })
    });

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('Supabase error:', errorText);
      
      // Check if it's a duplicate
      if (errorText.includes('duplicate') || errorText.includes('unique')) {
        return res.status(200).json({ 
          message: "You're already on the waitlist!",
          success: true 
        });
      }
      
      throw new Error('Database error');
    }

    // Success
    return res.status(200).json({ 
      message: "You're on the list! We'll be in touch soon.",
      success: true 
    });

  } catch (error) {
    console.error('Handler error:', error.message);
    return res.status(500).json({ 
      error: 'Something went wrong. Please try again.' 
    });
  }
}
