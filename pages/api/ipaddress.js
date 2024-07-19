import { MongoClient } from 'mongodb';

async function getIPaddress (req, res) {
    const client = await MongoClient.connect(process.env.API_URL2);
    const db = client.db('sysinfo');

    const ipaddresses = db.collection('ipaddress');
    const result = await ipaddresses.find().toArray();
    client.close();
    return res.status(200).json(result);
};

export default getIPaddress;