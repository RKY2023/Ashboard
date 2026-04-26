import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getDatabase } from '@/lib/mongodb';
import { validateUserRegistration, ValidationError } from '@/lib/validation';
import { getClientIp, checkRegisterRateLimit } from '@/lib/rateLimit';
import type { ApiResponse, RegisterResponse } from '@/types';

async function createUser(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RegisterResponse>>
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
        const rateLimit = await checkRegisterRateLimit(clientIp);

        if (!rateLimit.allowed) {
            res.setHeader('Retry-After', rateLimit.retryAfter || 0);
            return res.status(429).json({
                success: false,
                error: {
                    msg: `Too many registration attempts. Please try again in ${rateLimit.retryAfter} seconds`
                }
            });
        }

        // Validate input
        const validatedData = validateUserRegistration(req.body);
        const { name, email, password, phoneno } = validatedData;

        // Get database connection
        const db = await getDatabase();
        const usersCollection = db.collection('users');

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: { msg: 'User with this email already exists' }
            });
        }

        // Hash password with bcrypt (12 rounds)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user document
        const userDocument = {
            name,
            email,
            password: hashedPassword,
            phoneno: phoneno || null,
            createdAt: new Date()
        };

        // Insert user into database
        const result = await usersCollection.insertOne(userDocument);

        if (!result.acknowledged || !result.insertedId) {
            return res.status(500).json({
                success: false,
                error: { msg: 'Failed to create user' }
            });
        }

        // Return success response without password
        res.status(201).json({
            success: true,
            data: {
                msg: 'User created successfully',
                userId: result.insertedId.toString()
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

        console.error('User creation error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default createUser;