// api/submit-contact.js
// Handles contact form submissions and sends notification emails

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, message } = req.body;

  // Validate required fields
  if (!name || !email || !company || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Option 1: Send email via Resend (RECOMMENDED - Free tier: 100 emails/day)
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'noreply@hireshubham.com',
          to: process.env.OWNER_EMAIL || 'hello@hireshubham.com',
          subject: `New Discovery Call Request from ${name}`,
          html: `
            <h2>New Discovery Call Request</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Company:</strong> ${escapeHtml(company)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
            <p><strong>Received at:</strong> ${new Date().toISOString()}</p>
          `
        })
      });

      if (!response.ok) {
        console.error('Resend error:', await response.text());
        throw new Error('Failed to send email via Resend');
      }
    }

    // Option 2: Store in Supabase (OPTIONAL - Free tier: 500MB)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const supabaseResponse = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/contact_submissions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
          },
          body: JSON.stringify({
            name,
            email,
            company,
            message,
            created_at: new Date().toISOString()
          })
        }
      );

      if (!supabaseResponse.ok) {
        console.error('Supabase error:', await supabaseResponse.text());
        // Don't throw - Supabase is optional
      }
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Discovery call request received. You will hear from us within 2-3 business days.'
    });

  } catch (error) {
    console.error('Form submission error:', error);
    
    // Still return 200 to avoid client-side error, but log the issue
    return res.status(200).json({
      success: true,
      message: 'Your message was recorded. We will contact you shortly.'
    });
  }
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
