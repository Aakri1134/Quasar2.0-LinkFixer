export const verificationMailHTMLTemplate = (verificationUrl: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your email</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f7f5; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f5; padding: 40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background-color:#0f3d2a; padding: 28px 32px;">
                <span style="color:#ffffff; font-size: 20px; font-weight: bold; letter-spacing: 1px;">
                  MAKORA
                </span>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 40px 32px;">
                <h1 style="margin: 0 0 16px; color:#0f3d2a; font-size: 24px; font-weight: bold;">
                  Verify your email
                </h1>
                <p style="margin: 0 0 24px; color:#4b5a52; font-size: 15px; line-height: 1.6;">
                  Thanks for signing up. Please confirm this is your email address by clicking the button below.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius: 8px; background: linear-gradient(90deg, #f7941d, #f5c518);">
                      <a href="${verificationUrl}"
                         style="display:inline-block; padding: 14px 32px; color:#0f3d2a; font-size: 15px; font-weight: bold; text-decoration:none; border-radius: 8px;">
                        Verify Email
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin: 28px 0 0; color:#8a978f; font-size: 13px; line-height: 1.6;">
                  This link will expire in 24 hours. If you didn't create an account with Makora, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px; background-color:#f4f7f5;">
                <p style="margin:0; color:#a3ada6; font-size: 12px;">
                  © ${new Date().getFullYear()} Makora. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`