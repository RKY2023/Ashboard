import { MongoClient } from 'mongodb';

async function createUser (req, res) {
    console.log(process.env.API_URL);
    if(req.method === 'POST'){
        const data = req.body;        
        const { name, email, password, phoneno } = data;
        const client = await MongoClient.connect(process.env.API_URL);
        const db = client.db();
    
        const meetupsCollection = db.collection('users');
        const isAlreadyUser = await meetupsCollection.findOne({ "email": email});
        // const result = meetupsCollection.update({
        //     name,
        //     email,
        //     password,
        //     phoneno
        // }, {upsert:true});
        console.log(result);
        const defaultResponse = {
            success: false,
            error: {
                msg: 'Something went wrong!'
            }
        }
        // If user already exist
        if(isAlreadyUser && isAlreadyUser._id) {
            defaultResponse.error = {
                msg : 'User already exist'
            }
            res.status(204).json(defaultResponse);
        } else {
            const result = await meetupsCollection.insertOne(data);
            // create user
            if(result.acknowledged) {
                if(result.insertedId) {
                    defaultResponse.success = true;
                    delete defaultResponse['error'];

                    defaultResponse.data = {
                        msg : 'User created successfully'
                    }
                    res.status(204).json(defaultResponse);
                } else {
                    defaultResponse.error = {
                        msg : 'User creation failed!'
                    }
                    res.status(204).json(defaultResponse);
                }
            } else {
                res.status(404).json(defaultResponse);
            }
        }
        client.close();
    };
}

async function User (req, res) {
    console.log(process.env.API_URL);
    // initURL: 'http://localhost:3000/api/user',
    // initQuery: {},
    // initProtocol: 'http',
    if(req.url === '/api/user'){
        console.log('signup');
        // console.log(req);
        // createUser(req, res);
    };
    if(req.method === 'GET'){
        console.log('login');
        const data = req.body;        
        const { name, email, password, phoneno } = data;
        // getUsers(req, res);
    };
}
export default createUser;