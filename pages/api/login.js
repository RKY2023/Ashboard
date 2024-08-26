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
    const result = await userCollection.findOne({ "email": email});
    // const result = await userCollection.find().toArray();
    // return result.toArray();
    console.log(result);
    client.close();
    
    const defaultResponse = {
        success: false,
        error: {
            msg: 'Something went wrong!'
        }
    }
    if(result) {  
        // console.log(result, result._id == true)
        // result._id  
        if(result._id) {
            defaultResponse.success = true;
            delete defaultResponse['error'];

            defaultResponse.data = {
                msg : 'success',
                name: result.name,
                email: result.email,
            }
            res.status(200).json(defaultResponse);
        } else {
            defaultResponse.error = {
                msg : 'user not found'
            }
            res.status(200).json(defaultResponse);
        }
    } else {
        res.status(404).json(defaultResponse);
    }
    
}
export default login;