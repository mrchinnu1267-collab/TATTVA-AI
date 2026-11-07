import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthCallbackUrl } from "../../../lib/auth-redirect";

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

function saveAccounts(accounts: Record<string, { hash: string; salt: string; name?: string; createdAt: number }>) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write accounts file:", err);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must contain at least 6 characters." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const accounts = getAccounts();

    // Check if account already registered on server
    if (accounts[normalizedEmail]) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please log in with your password.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 }
      );
    }

    // Generate secure cryptographic salt and hash
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);
    const resolvedName = (name && typeof name === "string" && name.trim()) ? name.trim() : normalizedEmail.split("@")[0];

    accounts[normalizedEmail] = {
      hash,
      salt,
      name: resolvedName,
      createdAt: Date.now(),
    };
    saveAccounts(accounts);

    // Call Supabase auth in background (non-blocking)
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
      const emailRedirectTo = getAuthCallbackUrl("/chat", request);
      await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: resolvedName },
          emailRedirectTo,
        },
      }).catch((e) => console.warn("Supabase background signup warning:", e.message));
    } catch (e) {
      console.warn("Supabase client init warning:", e);
    }

    const sessionPayload = {
      email: normalizedEmail,
      name: resolvedName,
      timestamp: Date.now(),
    };
    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully! Welcome to TATTVA AI.",
      user: {
        email: normalizedEmail,
        name: resolvedName,
      },
    });

    response.cookies.set("tattva_session", sessionToken, {
      httpOnly: false, // Accessible to client-side auth helpers
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while creating your account." },
      { status: 500 }
    );
  }
}
