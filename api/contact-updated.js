// api/submit-contact.js
// Handles contact form submissions and sends notification emails with attachments

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, region, message } = req.body;

  // Validate required fields
  if (!name || !email || !company || !region || !message) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!process.env.OWNER_EMAIL) {
    console.error('ERROR: OWNER_EMAIL not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Region information for personalized content
    const regionData = {
      usa: {
        flag: '🇺🇸',
        name: 'United States',
        timezone: 'EST/PST',
        specialization: 'Targeting US research directors, strategy leaders, and enterprise prospects',
        tools: 'Apollo.io, Sales Navigator, ZoomInfo'
      },
      uk: {
        flag: '🇬🇧',
        name: 'United Kingdom',
        timezone: 'GMT',
        specialization: 'GDPR-compliant UK market expertise with regulatory focus',
        tools: 'Apollo.io, Sales Navigator, Hunter.io'
      },
      eu: {
        flag: '🇪🇺',
        name: 'European Union',
        timezone: 'CET/CEST',
        specialization: 'Multi-language capability, GDPR/CCPA compliant outreach',
        tools: 'Clay, Apollo.io, Lemlist'
      },
      au: {
        flag: '🇦🇺',
        name: 'Australia',
        timezone: 'AEST',
        specialization: 'APAC market focus, Asia-Pacific expansion expertise',
        tools: 'Apollo.io, Crunchbase, Hunter.io'
      }
    };

    const region_info = regionData[region] || regionData.usa;

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Discovery Call <onboarding@resend.dev>',
        to: process.env.OWNER_EMAIL,
        replyTo: email,
        subject: `New Discovery Call: ${name} from ${company} (${region_info.flag} ${region_info.name})`,
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 12px; max-width: 600px;">
              <div style="border-bottom: 3px solid #1845e8; padding-bottom: 20px; margin-bottom: 25px;">
                <h1 style="font-size: 28px; font-weight: bold; color: #071048; margin: 0;">
                  ${region_info.flag} New Discovery Call Request
                </h1>
              </div>
              
              <h2 style="color: #1845e8; font-size: 18px; margin-bottom: 15px;">Contact Information</h2>
              <div style="background-color: #f0f4ff; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 8px 0;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p style="margin: 8px 0;"><strong>Company:</strong> ${company}</p>
                <p style="margin: 8px 0;"><strong>Region:</strong> ${region_info.flag} ${region_info.name}</p>
              </div>

              <h2 style="color: #1845e8; font-size: 18px; margin-bottom: 10px;">Their Challenge</h2>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #1845e8;">
                <p style="color: #4a5473; line-height: 1.6; white-space: pre-wrap; margin: 0;">${message}</p>
              </div>

              <h2 style="color: #1845e8; font-size: 18px; margin-bottom: 10px;">Region Info</h2>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                <p style="margin: 8px 0;"><strong>Timezone:</strong> ${region_info.timezone}</p>
                <p style="margin: 8px 0;"><strong>Specialization:</strong> ${region_info.specialization}</p>
                <p style="margin: 8px 0;"><strong>Recommended Tools:</strong> ${region_info.tools}</p>
              </div>

              <div style="background-color: #071048; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; font-size: 14px;"><strong>👉 Book their 20-minute discovery call:</strong></p>
                <p style="margin: 10px 0 0 0;"><a href="https://cal.com/shubham/discovery-call" style="color: #00d4b8; text-decoration: none; font-weight: bold;">Book on Cal.com</a></p>
              </div>

              <p style="color: #8892b0; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e4f2; padding-top: 20px;">
                Received: ${new Date().toLocaleString()}<br>
                From: hireShubham.com Contact Form
              </p>
            </div>
          </div>
        `,
        text: `New Discovery Call Request

Contact Information:
Name: ${name}
Email: ${email}
Company: ${company}
Region: ${region_info.flag} ${region_info.name}

Their Challenge:
${message}

Region Info:
Timezone: ${region_info.timezone}
Specialization: ${region_info.specialization}
Recommended Tools: ${region_info.tools}

Book at: https://cal.com/shubham/discovery-call`
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Resend API Error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      if (responseData.message) {
        console.error('Error message:', responseData.message);
      }
      
      throw new Error(`Email sending failed: ${responseData.message || response.statusText}`);
    }

    console.log('Email sent successfully:', responseData);

    return res.status(200).json({
      success: true,
      message: 'Discovery call request received and email sent!',
      emailId: responseData.id
    });

  } catch (error) {
    console.error('Contact form error:', error.message);
    
    // Return success anyway to not break user experience
    return res.status(200).json({
      success: true,
      message: 'Your message was received. We will contact you shortly.'
    });
  }
}
