// src/lib/emailTemplates.ts

interface BookingEmailData {
  name: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  experience: string;
  duration: number;
  weddingDate?: string;
  guestCount?: string;
  shortlist?: string;
  notes?: string;
  accessoriesNeeded?: string;
  isVIBPaid?: boolean;
}

export function generateBookingConfirmationHtml(data: BookingEmailData): string {
  const isAccessory = data.experience.includes('Accessory') || data.experience.includes('Veil');

  return `
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <title>Boutique Fitting Confirmation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FAF8F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #262928;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #FAF8F5;
      padding: 40px 15px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E2DBD2;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }
    .header {
      background-color: #EBF1EE;
      border-bottom: 1px solid #DCE6E1;
      padding: 32px 24px;
      text-align: center;
    }
    .brand-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 24px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #172420;
      margin: 0 0 6px 0;
      font-weight: 400;
    }
    .brand-subtitle {
      font-size: 10px;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: #626A66;
      margin: 0;
    }
    .content {
      padding: 32px 28px;
    }
    h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 21px;
      color: #2D4A3E;
      margin: 0 0 16px 0;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #4A4E4D;
      margin: 0 0 16px 0;
    }
    .meta-box {
      background-color: #FAF8F5;
      border: 1px solid #ECE7E1;
      border-radius: 2px;
      padding: 16px 20px;
      margin: 20px 0 24px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #EEE8E0;
      font-size: 12px;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-label {
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 10px;
      font-weight: 500;
    }
    .meta-value {
      color: #172420;
      font-weight: 500;
    }
    .parking-box {
      border-left: 3px solid #2D4A3E;
      background-color: #F4F7F5;
      padding: 14px 18px;
      margin: 24px 0;
    }
    .parking-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #2D4A3E;
      font-weight: 600;
      margin: 0 0 4px 0;
    }
    .parking-text {
      font-size: 12px;
      color: #38423F;
      line-height: 1.5;
      margin: 0;
    }
    .shortlist-box {
      background-color: #FFFFFF;
      border: 1px dashed #DCE6E1;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 12px;
      color: #4A4E4D;
    }
    .footer {
      border-top: 1px solid #EEE8E0;
      background-color: #FAF8F5;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      color: #8C9390;
      line-height: 1.6;
    }
    .footer-tel {
      color: #2D4A3E;
      font-weight: 600;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Brand Header -->
      <div class="header">
        <h1 class="brand-title">The Bridal Room</h1>
        <p class="brand-subtitle">Atherstone &bull; Warwickshire</p>
      </div>

      <!-- Main Content -->
      <div class="content">
        <h2>Your Suite Is Confirmed</h2>
        <p>
          Dear ${data.name},
        </p>
        <p>
          Thank you for reserving your private 1-to-1 styling consultation with Vicky and Samantha. Our boudoir suite and showroom will be prepared exclusively for you and your guests.
        </p>

        <!-- Appointment Meta Table -->
        <div class="meta-box">
          <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 12px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; width: 40%;">Appointment</td>
              <td style="color: #172420; font-weight: 600;">${data.experience}</td>
            </tr>
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Date & Time</td>
              <td style="color: #2D4A3E; font-weight: 600;">${data.appointmentDate} at ${data.appointmentTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Duration</td>
              <td style="color: #172420;">${data.duration} Minutes (Private Suite)</td>
            </tr>
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Guests Attending</td>
              <td style="color: #172420;">${data.guestCount || 'Up to 3 guests'}</td>
            </tr>
            ${data.weddingDate ? `
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em;">Wedding Date</td>
              <td style="color: #172420;">${data.weddingDate}</td>
            </tr>` : ''}
            ${data.isVIBPaid ? `
            <tr>
              <td style="color: #2D4A3E; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; font-weight: 600;">Deposit Status</td>
              <td style="color: #2D4A3E; font-weight: 600;">£50 Paid (&pound;75 Gown Voucher Credited)</td>
            </tr>` : ''}
          </table>
        </div>

        ${data.shortlist && data.shortlist !== 'None selected' ? `
        <div class="shortlist-box">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #2D4A3E; margin-bottom: 4px;">
            Your Shortlisted Gowns Attached:
          </strong>
          <span style="color: #38423F;">${data.shortlist}</span>
        </div>` : ''}

        ${isAccessory && data.accessoriesNeeded ? `
        <div class="shortlist-box">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #2D4A3E; margin-bottom: 4px;">
            Accessories You Wish to Try:
          </strong>
          <span style="color: #38423F;">${data.accessoriesNeeded}</span>
        </div>` : ''}

        <!-- Parking & Location Block -->
        <div class="parking-box">
          <p class="parking-title">Boutique Location & Stress-Free Parking</p>
          <p class="parking-text">
            <strong>Boutique Address:</strong> 65 Station Street, Atherstone, Warwickshire CV9 1DB.<br />
            <strong>Free 2-Hour Parking:</strong> <em>Cattle Market Car Park</em> (Sat Nav: <strong>CV9 1DD</strong>, RingGo code <strong>3611082</strong>) is situated just 1 minute level walk from our front door.
          </p>
        </div>

        <p style="font-size: 12px; color: #6B7280; font-style: italic;">
          <strong>Preparation Tip:</strong> We recommend wearing seamless, nude underwear. We kindly ask that you do not apply fresh fake tan or heavy body oils on the day of your fitting to protect our sample dresses.
        </p>

        <p style="margin-top: 24px;">
          Warmest regards,<br />
          <strong>Vicky & Samantha</strong><br />
          <span style="font-size: 11px; color: #8C9390;">The Bridal Room Atherstone</span>
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        Questions or need to reschedule? Phone us directly on <a href="tel:01827946098" class="footer-tel">01827 946 098</a><br />
        &copy; 2026 The Bridal Room Atherstone &bull; 65 Station Street, CV9 1DB
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}