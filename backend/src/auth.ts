
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

// Safely initialize OAuth Client
const clientId = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(clientId);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// --- DB Abstraction for Fallback ---
let prismaInstance: any = null;
const memoryUsers: any[] = [];

try {
    if (process.env.DATABASE_URL) {
        // Dynamically require PrismaClient to avoid compilation errors if not generated
        const { PrismaClient } = require('@prisma/client');
        prismaInstance = new PrismaClient();
    } else {
        console.log("----------------------------------------------------------------");
        console.log("NOTICE: DATABASE_URL is not set.");
        console.log("App is running in IN-MEMORY MODE.");
        console.log("User data will be lost when the server restarts.");
        console.log("----------------------------------------------------------------");
    }
} catch (e) {
    console.error("Failed to initialize PrismaClient", e);
}

export const db = {
    user: {
        // Fix: Use 'any' for where clause to avoid TS strict type mismatch with generated Prisma Client
        findUnique: async (args: { where: any }) => {
            if (prismaInstance) return prismaInstance.user.findUnique(args as any);
            
            return memoryUsers.find(u => 
                (args.where.id && u.id === args.where.id) || 
                (args.where.email && u.email === args.where.email) ||
                (args.where.googleId && u.googleId === args.where.googleId)
            ) || null;
        },
        create: async (args: { data: any }) => {
            if (prismaInstance) return prismaInstance.user.create(args as any);
            // Mock ID generation
            const newUser = { id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...args.data };
            memoryUsers.push(newUser);
            return newUser;
        },
        update: async (args: { where: { id: string }, data: any }) => {
            if (prismaInstance) return prismaInstance.user.update(args as any);
            const idx = memoryUsers.findIndex(u => u.id === args.where.id);
            if (idx === -1) throw new Error("User not found");
            
            const user = memoryUsers[idx];
            
            // Handle simple decrement logic for credits (specific to this app)
            if (args.data.credits && typeof args.data.credits === 'object' && args.data.credits.decrement) {
                user.credits -= args.data.credits.decrement;
            } else if (args.data.credits !== undefined) {
                user.credits = args.data.credits;
            }
            
            memoryUsers[idx] = user;
            return user;
        }
    }
};

export const verifyGoogleToken = async (token: string) => {
  if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID is not configured on the server.");
  }
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
  });
  return ticket.getPayload();
};

export const findOrCreateUser = async (email: string, name: string, googleId: string) => {
    let user = await db.user.findUnique({ where: { email } });
    
    if (!user) {
        // New User: Gets 10 credits by default schema
        user = await db.user.create({
            data: {
                email,
                name,
                googleId,
                credits: 10 
            }
        });
    }
    return user;
};

export const generateSessionToken = (user: any) => {
    return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
};

// Middleware to check JWT from frontend requests
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
