import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ACCOUNTS_FILE = path.join(process.cwd(), ".tattva_secure_accounts.json");

function getAccounts(): Record<string, { hash: string; salt: string; name?: string; createdAt: number }> {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const data = fs.readFileSync(ACCOUNTS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read accounts file:", err);
  }
  return {};
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const accounts = getAccounts();
    const accountEntry = accounts[normalizedEmail];

    let isAuthenticated = false;
    let resolvedName = accountEntry?.name || normalizedEmail.split("@")[0];

    // 1. Verify against server's PBKDF2 hashed accounts
    if (accountEntry) {
      const computedHash = hashPassword(password, accountEntry.salt);
      if (computedHash === accountEntry.hash) {
        isAuthenticated = true;
      }
    }

    // 2. Also check Supabase Auth in parallel
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (cs) => cs.forEach((c) => cookieStore.set(c.name, c.value, c.options)),
          },
        }
      );

      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!supaError && supaData?.user) {
        isAuthenticated = true;
        resolvedName = supaData.user.user_metadata?.full_name || resolvedName;
      }
    } catch (e) {
      console.warn("Supabase login check notice:", e);
    }

    if (!isAuthenticated) {
      if (accountEntry) {
        return NextResponse.json(
          {
            error: "Incorrect password. Please verify your credentials or use 'Forgot password?'.",
            code: "INVALID_PASSWORD",
          },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          {
            error: "No account found with this email. Click 'Create Account' to sign up.",
            code: "ACCOUNT_NOT_FOUND",
          },
          { status: 404 }
        );
      }
    }

    const sessionPayload = {
      email: normalizedEmail,
      name: resolvedName,
      timestamp: Date.now(),
    };
    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully! Welcome back to TATTVA AI.",
      user: {
        email: normalizedEmail,
        name: resolvedName,
      },
    });

    response.cookies.set("tattva_session", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred during login." },
      { status: 500 }
    );
  }
}
