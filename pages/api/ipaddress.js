import { MongoClient } from 'mongodb';
import { checkDefaultRateLimit, getClientIp } from '@/lib/rateLimit';

async function getIPaddress(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: { msg: 'Method not allowed' }
        });
    }

    try {
        // Rate limiting check
        const clientIp = getClientIp(req);
        const rateLimit = await checkDefaultRateLimit(clientIp);

        if (!rateLimit.allowed) {
            return res.status(429).json({
                success: false,
                error: {
                    msg: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds`
                }
            }).setHeader('Retry-After', rateLimit.retryAfter);
        }

        // Note: This route uses API_URL2 for a different database (sysinfo)
        if (!process.env.API_URL2) {
            throw new Error('API_URL2 environment variable is not defined');
        }

        const client = await MongoClient.connect(process.env.API_URL2);
        const db = client.db('sysinfo');

        const ipaddressesCollection = db.collection('ipaddress');
        const result = await ipaddressesCollection.find().toArray();

        client.close();

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('IP address fetch error:', error);
        res.status(500).json({
            success: false,
            error: { msg: 'Internal server error' }
        });
    }
}

export default getIPaddress;