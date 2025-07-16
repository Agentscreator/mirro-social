import { NextResponse, NextRequest } from "next/server";
import { Resend } from "resend";
import { randomUUID } from "crypto";

// Ensure the required environment variables exist
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set. Reset-password emails will not be sent.");
}
if (!APP_URL) {
  console.warn("NEXT_PUBLIC_APP_URL is not set. Reset-password links will not be generated correctly.");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email provided" }, { status: 400 });
    }

    // Generate a simple reset token. In a production app you would persist
    // this to your database with an expiration date and verify it later.
    const token = randomUUID();

    // Construct reset link
    const resetLink = `${APP_URL ?? ""}/reset-password?token=${token}`;

    // Send email via Resend if configured
    if (resend) {
      await resend.emails.send({
        from: "no-reply@mirro.social", // Update to a domain verified in Resend
        to: email,
        subject: "Password reset instructions",
        html: `<!DOCTYPE html><html><body><p>We received a request to reset your password.</p><p>Click the link below to set a new password. This link will expire in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request a password reset, you can safely ignore this email.</p><p>— The Mirro Team</p></body></html>`
      });
    } else {
      console.info(`Reset link for ${email}: ${resetLink}`);
    }

    // TODO: Store token + email + expiry in DB for later verification

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reset-password API error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
