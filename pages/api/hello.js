// // Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// export default function handler(req, res) {
//   res.status(200).json({ name: "John Doe" });
// }
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// export default (req, res) => {
//   res.status(200).json({ name: 'John Doe' })
// }

import { MongoClient } from 'mongodb';

async function myapi (req, res) {
  if(req.method === 'POST'){
    const data = req.body;
    // 
    
    const { title, image, address, description } = data;
    const client = await MongoClient.connect(process.env.API_URL);
    const db = client.db();

    const meetupsCollection = db.collection('meetups');
    const result = await meetupsCollection.insertOne(data);
    
    console.log(result);

    client.close();
    res.status();

  };
};
export default myapi;