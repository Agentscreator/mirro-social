import { NextResponse, NextRequest } from "next/server";
import { Resend } from "resend";
import { randomUUID } from "crypto";
import { db } from "@/src/db";
import { usersTable, passwordResetTokensTable } from "@/src/db/schema";
import { eq, and, gt } from "drizzle-orm";

// Ensure the required environment variables exist
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (!RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set. Reset-password emails will not be sent.");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email provided" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, trimmedEmail))
      .limit(1);

    if (!user || user.length === 0) {
      // For security, we don't reveal if the email exists or not
      return NextResponse.json({ ok: true });
    }

    const userId = user[0].id;

    // Clean up any existing expired tokens for this user
    await db
      .delete(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.userId, userId),
          gt(new Date(), passwordResetTokensTable.expiresAt)
        )
      );

    // Generate reset token (valid for 1 hour)
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token in database
    await db.insert(passwordResetTokensTable).values({
      userId,
      token,
      expiresAt,
    });

    // Construct reset link
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    // Send email via Resend if configured
    if (resend) {
      await resend.emails.send({
        from: "noreply@mirro.social", // Update to a domain verified in Resend
        to: trimmedEmail,
        subject: "Reset your Mirro password",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">Mirro</h1>
            </div>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <h2 style="color: #111827; margin-top: 0;">Reset your password</h2>
              <p style="color: #6b7280; margin-bottom: 20px;">We received a request to reset your password for your Mirro account.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">This link will expire in 1 hour for security reasons.</p>
            </div>
            
            <div style="color: #6b7280; font-size: 14px; text-align: center;">
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              <p style="margin-bottom: 0;">— The Mirro Team</p>
            </div>
          </body>
          </html>
        `
      });
      console.log(`Password reset email sent to ${trimmedEmail}`);
    } else {
      console.info(`Reset link for ${trimmedEmail}: ${resetLink}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reset-password API error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
