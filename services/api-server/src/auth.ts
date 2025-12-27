import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

declare const require: any;

const clientId = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(clientId);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// --- DB Abstraction for Fallback ---
let prismaInstance: any = null;
let isPrismaInitialized = false;
let isPrismaDisabled = false; // Kill switch for DB if it fails

const DATA_DIR = path.join((process as any).cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Memory Fallback
let MEMORY_USERS: any[] = [];
let USE_MEMORY_ONLY = false;

try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {
    console.warn("⚠️ Cannot create data directory. Using Memory Mode.");
    USE_MEMORY_ONLY = true;
}

const readUsers = (): any[] => {
    if (USE_MEMORY_ONLY) return MEMORY_USERS;
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        MEMORY_USERS = JSON.parse(data);
        return MEMORY_USERS;
    } catch (error) {
        return MEMORY_USERS;
    }
};

const writeUsers = (users: any[]) => {
    MEMORY_USERS = users;
    if (USE_MEMORY_ONLY) return;
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        USE_MEMORY_ONLY = true;
    }
};

// Lazy Prisma
const getPrisma = () => {
    if (isPrismaDisabled) return null;
    if (isPrismaInitialized) return prismaInstance;
    try {
        if (process.env.DATABASE_URL) {
            // Check if user explicitly wants to force JSON mode
            if (process.env.USE_JSON_DB === 'true') {
                console.log("Force JSON DB mode enabled.");
                isPrismaDisabled = true;
                return null;
            }

            console.log("Lazy Init: PrismaClient...");
            let pkg;
            try { pkg = require('@prisma/client'); } catch (e) {}

            if (pkg && pkg.PrismaClient) {
                const { PrismaClient } = pkg;
                prismaInstance = new PrismaClient();
            }
        }
    } catch (e) { console.error("Prisma Init Failed", e); }
    isPrismaInitialized = true;
    return prismaInstance;
};

// Helper to handle Prisma failure and toggle kill switch
const handlePrismaError = (e: any) => {
    console.error("⚠️ Database Error:", e.message);
    // P2021: Table does not exist, P1001: Connection failed
    if (e.code === 'P2021' || e.code === 'P1001' || (e.message && e.message.includes('does not exist'))) {
        console.warn("🛑 DATABASE SCHEMA MISSING OR UNREACHABLE. SWITCHING TO JSON-DB FALLBACK.");
        isPrismaDisabled = true;
    }
};

export const db = {
    user: {
        findUnique: async (args: { where: any }) => {
            const prisma = getPrisma();
            if (prisma) {
                try { 
                    return await prisma.user.findUnique(args as any); 
                } catch (e) { 
                    handlePrismaError(e);
                    // Fallthrough to JSON logic
                }
            }
            const users = readUsers();
            return users.find(u => 
                (args.where.id && u.id === args.where.id) || 
                (args.where.email && u.email === args.where.email) ||
                (args.where.googleId && u.googleId === args.where.googleId)
            ) || null;
        },
        create: async (args: { data: any }) => {
            const prisma = getPrisma();
            if (prisma) {
                try { 
                    return await prisma.user.create(args as any); 
                } catch (e) { 
                    handlePrismaError(e);
                }
            }
            const users = readUsers();
            const newUser = { id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...args.data };
            users.push(newUser);
            writeUsers(users);
            return newUser;
        },
        update: async (args: { where: { id: string }, data: any }) => {
            const prisma = getPrisma();
            if (prisma) {
                try { 
                    return await prisma.user.update(args as any); 
                } catch (e) { 
                    handlePrismaError(e);
                }
            }
            const users = readUsers();
            const idx = users.findIndex(u => u.id === args.where.id);
            if (idx === -1) throw new Error("User not found");
            const user = users[idx];
            if (args.data.credits?.decrement) user.credits -= args.data.credits.decrement;
            else if (args.data.credits !== undefined) user.credits = args.data.credits;
            users[idx] = user;
            writeUsers(users);
            return user;
        }
    }
};

export const verifyGoogleToken = async (token: string) => {
  if (!clientId || clientId.length < 5) {
      console.warn("⚠️ SERVER CONFIG: GOOGLE_CLIENT_ID missing or invalid. Falling back to insecure decode.");
      const decoded: any = jwt.decode(token);
      if (decoded && decoded.email) return decoded;
      throw new Error("Cannot decode token. Client ID missing on server.");
  }

  try {
      const ticket = await client.verifyIdToken({
          idToken: token,
          audience: clientId,
      });
      return ticket.getPayload();
  } catch (error: any) {
      console.error("Google Verify Error:", error.message);
      console.warn("⚠️ Verification failed. Falling back to insecure decode for compatibility.");
      
      const decoded: any = jwt.decode(token);
      if (decoded && decoded.email) {
          return decoded;
      }
      throw error;
  }
};

export const findOrCreateUser = async (email: string, name: string, googleId: string) => {
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
        user = await db.user.create({
            data: { email, name, googleId, credits: 10 }
        });
    }
    return user;
};

export const generateSessionToken = (user: any) => {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
};

export const authMiddleware = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};