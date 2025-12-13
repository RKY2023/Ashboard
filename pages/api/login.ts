import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getDatabase } from '@/lib/mongodb';
import { validateLogin, ValidationError } from '@/lib/validation';
import { getClientIp, checkLoginRateLimit } from '@/lib/rateLimit';
import type { ApiResponse, LoginResponse } from '@/types';

async function login(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<LoginResponse>>
) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: { msg: 'Method not allowed' }
        });
    }

    try {
        // Rate limiting check
        const clientIp = getClientIp(req);
        const rateLimit = await checkLoginRateLimit(clientIp);

        if (!rateLimit.allowed) {
            return res.status(429).json({
                success: false,
                error: {
                    msg: `Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds`
                }
            }).setHeader('Retry-After', rateLimit.retryAfter);
        }

        // Validate input
        const validatedData = validateLogin(req.body);
        const { email, password } = validatedData;

        // Get database connection
        const db = await getDatabase();
        const userCollection = db.collection('users');

        // Find user by email
        const user = await userCollection.findOne({ email });

        // User not found or password mismatch
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { msg: 'Invalid email or password' }
            });
        }

        // Compare provided password with hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                error: { msg: 'Invalid email or password' }
            });
        }

        // Successful login - return user data without password
        res.status(200).json({
            success: true,
            data: {
                msg: 'Login successful',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phoneno: user.phoneno
                }
            }
        });

    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: {
                    msg: 'Validation failed',
                    details: error.errors
                }
            });
        }

        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default login;