import { MongoClient } from 'mongodb';

async function login (req, res) {
    const data = req.body;
    // 
    
    const { email, password } = data;
    console.log('aa',email, password)
    console.log(process.env.API_URL);
    const client = await MongoClient.connect(process.env.API_URL);
    const db = client.db();
    const userCollection = db.collection('users');
    // const result = await userCollection.find({ "email": email}).toArray();
    const result = await userCollection.find().toArray();

    console.log(result);

    client.close();
    // return result.toArray();
    // res.status();

//   };
}
export default login;