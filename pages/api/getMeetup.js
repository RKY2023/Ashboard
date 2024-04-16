import { MongoClient } from 'mongodb';

async function getMeetup (req, res) {
//   if(req.method === 'GET'){
    // const data = req.body;
    
    // const { title, image, address, description } = data;
    const client = await MongoClient.connect(process.env.API_URL);
    const db = client.db();

    const meetupsCollection = db.collection('meetups');
    const result = await meetupsCollection.find().toArray();

    client.close();
    // return result.toArray();
    // res.status();

//   };
};
export default getMeetup;