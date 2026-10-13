// RSVP Script template — with confirmation email
//
// 1. Go to https://script.google.com → New project
// 2. Replace all code with this file
// 3. Replace SHEET_ID below with the couple's actual Google Sheet ID
//    (the long string in the sheet's URL between /d/ and /edit)
// 4. Replace the "from" address in sendConfirmationEmail with a verified
//    Send As alias (Gmail → Settings → Accounts → Send mail as), or
//    remove the "from"/"name" options entirely to send as the account's
//    own address
// 5. In the function dropdown at the top of the editor, select testAuth
//    and click Run ▶ once — this triggers the one-time authorization
//    prompt for GmailApp (deploying a new version does NOT trigger this,
//    only running a function manually in the editor does)
// 6. Deploy → New Deployment → Web App → Execute as: Me →
//    Who has access: Anyone → Deploy
// 7. Copy the Web App URL → paste it as googleScriptUrl in the couple's
//    wedding data JSON
//
// Requires the website to send groom_name/bride_name with each RSVP
// submission (already wired up in RsvpForm.tsx) so this exact same code
// works for any couple without per-deployment editing beyond SHEET_ID.

const SHEET_ID = 'PASTE_SHEET_ID_HERE';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Attendance",
        "Full Name",
        "Email",
        "Phone",
        "Guests",
        "Guest Info",
        "Allergies",
        "Message"
      ]);
    }

    var p = e.parameter;

    sheet.appendRow([
      new Date(),
      p.attendance || '',
      p.full_name || '',
      p.email || '',
      p.phone || '',
      p.guests || '',
      p.guest_info || '',
      p.allergies || '',
      p.message || ''
    ]);

    try {
      sendConfirmationEmail(p);
    } catch (emailErr) {
      // Don't fail the RSVP if the email send has a problem — the row is already saved.
      console.error('Confirmation email failed: ' + emailErr.message);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('RSVP endpoint is live.');
}

function sendConfirmationEmail(p) {
  if (!p.email) return; // nothing to send to

  var coupleNames = [p.groom_name, p.bride_name].filter(Boolean).join(' & ') || 'Us';
  var attending = (p.attendance || '').toLowerCase() === 'attend';
  var greeting = p.full_name ? ('Dear ' + p.full_name + ',') : 'Hello,';

  var statusLine = attending
    ? "We're delighted you'll be joining us!"
    : "We're sorry you won't be able to join us, but thank you for letting us know.";

  var detailsLines = [];
  if (attending && p.guests) detailsLines.push('Guests: ' + p.guests);
  if (attending && p.allergies) detailsLines.push('Dietary notes: ' + p.allergies);

  var body = greeting + '\n\n'
    + 'Thank you for responding to our wedding invitation.\n\n'
    + statusLine + '\n\n'
    + (detailsLines.length ? (detailsLines.join('\n') + '\n\n') : '')
    + 'With love,\n' + coupleNames
    + '\n\n---\nThis is an automated confirmation — please do not reply to this email.';

  GmailApp.sendEmail(p.email, 'RSVP Confirmation — ' + coupleNames, body, {
    from: "your-other-address@gmail.com",   // must match a verified Send As alias exactly
    name: coupleNames
  });
}

// --- One-time setup helper ---
// Run THIS function manually from the Apps Script editor (select it in the
// function dropdown, click Run ▶) to trigger the GmailApp authorization
// prompt. Safe to leave in the script afterward — nothing else calls it.
function testAuth() {
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), "Test", "Auth test successful");
}
