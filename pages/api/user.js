import { MongoClient } from 'mongodb';

async function getUsers (req, res) {
//   if(req.method === 'GET'){
    // const data = req.body;
    console.log(process.env.API_URL);
    // const { title, image, address, description } = data;
    const client = await MongoClient.connect(process.env.API_URL);
    const db = client.db();

    const meetupsCollection = db.collection('users');
    const result = await meetupsCollection.find().toArray();

    console.log(result);

    client.close();
    // return result.toArray();
    // res.status();

//   };
};

async function createUser (req, res) {
    console.log(process.env.API_URL);
    if(req.method === 'POST'){
        const data = req.body;        
        const { name, email, password, phoneno } = data;
        const client = await MongoClient.connect(process.env.API_URL);
        const db = client.db();
    
        const meetupsCollection = db.collection('users');
        // const result = await meetupsCollection.insertOne(data);
        const result = await meetupsCollection.update(data, data, {upsert:true});
        
        console.log(result);
    
        client.close();
        res.status();
    
    };
}
export default createUser;