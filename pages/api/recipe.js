import { MongoClient } from 'mongodb';

async function getRecipe (req, res) {
//   if(req.method === 'GET'){
    // const data = req.body;
    // console.log(process.env.API_URL);
    // const { title, image, address, description } = data;
    const client = await MongoClient.connect(process.env.API_URL);
    const db = client.db('CSV');

    const groceries = db.collection('recipe');
    const result = await groceries.find().toArray();

    console.log(result);
    

    client.close();
    // return result.toArray();
    return res.status(200).json(result);

//   };
};

async function createUser (req, res) {
    console.log(process.env.API_URL);
    if(req.method === 'POST'){
        const data = req.body;        
        const { name, email, password, phoneno } = data;
        const client = await MongoClient.connect(process.env.API_URL);
        const db = client.db('CSV');
    
        const groceries = db.collection('recipe');
        // const result = await groceries.insertOne(data);
        const result = await groceries.update(data, data, {upsert:true});
        
        console.log(result);
    
        client.close();
        res.status();
    
    };
}
export default getRecipe;