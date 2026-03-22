// api/submit-contact.js
// Simple, working contact form handler

export default async function handler(req, res) {
  console.log('🟢 API Called:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, region, message } = req.body;
  
  console.log('📥 Received data:', { name, email, company, region, message });

  // Validate
  if (!name || !email || !company || !message) {
    console.log('❌ Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Get env vars
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const OWNER_EMAIL = process.env.OWNER_EMAIL;

  console.log('🔑 Env Check:');
  console.log('   RESEND_API_KEY:', RESEND_KEY ? '✅ SET' : '❌ MISSING');
  console.log('   OWNER_EMAIL:', OWNER_EMAIL ? `✅ SET (${OWNER_EMAIL})` : '❌ MISSING');

  if (!RESEND_KEY || !OWNER_EMAIL) {
    console.error('❌ Missing environment variables!');
    return res.status(500).json({ 
      error: 'Server config error. Check Vercel environment variables.' 
    });
  }

  try {
    // Create simple email with ALL details visible
    const emailBody = `
NEW DISCOVERY CALL REQUEST

═══════════════════════════════════════════

👤 SENDER DETAILS:
   Name: ${name}
   Email: ${email}
   Company: ${company}
   Region: ${region}

═══════════════════════════════════════════

📝 THEIR MESSAGE:
${message}

═══════════════════════════════════════════

📅 RECEIVED: ${new Date().toLocaleString()}

═══════════════════════════════════════════

✅ REPLY TO: ${email}
📞 BOOK CALL: https://cal.com/shubham/discovery-call

═══════════════════════════════════════════
    `;

    console.log('📧 Sending email...');
    console.log('   To:', OWNER_EMAIL);
    console.log('   Subject: New Discovery Call - ' + name);

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Discovery Call <onboarding@resend.dev>',
        to: OWNER_EMAIL,
        replyTo: email,
        subject: `🎯 New Discovery Call - ${name} (${region})`,
        text: emailBody
      })
    });

    const data = await response.json();

    console.log('📬 Resend Response:', response.status);
    console.log('   Data:', data);

    if (!response.ok) {
      console.error('❌ Resend Error:', data);
      return res.status(500).json({ 
        error: 'Email failed: ' + (data.message || 'Unknown error') 
      });
    }

    console.log('✅ EMAIL SENT! ID:', data.id);

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully!'
    });

  } catch (error) {
    console.error('💥 ERROR:', error.message);
    console.error('Stack:', error);
    
    return res.status(500).json({ 
      error: 'Server error: ' + error.message 
    });
  }
}
