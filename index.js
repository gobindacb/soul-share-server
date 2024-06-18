const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express()

// middleware
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://soul-share-23173.web.app'
    ],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jakl9vf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {

        const postsCollection = client.db('soulShare').collection('posts')
        const requestsCollection = client.db('soulShare').collection('requests')

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // jwt authentication
        app.post('/jwt', async(req, res) =>{
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})

            res
            .cookie('token', token, {
                httpOnly: true,
                secure: true
                
            })
            .send({success: true})
        })
        

        // get volunteer for volunteers needs now max 6 data according deadline
        app.get('/needs', async (req, res) => {
            console.log('get token', req.cookies.token)
            const result = await postsCollection.find().sort({ deadline: 1 }).limit(6).toArray();
            res.send(result);
        });

        // get all volunteer posts from db
        app.get('/posts', async (rq, res) => {
            const result = await postsCollection.find().toArray()
            res.send(result)
        })

        // get single volunteer needs post by id for details page
        app.get('/post/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await postsCollection.findOne(query)
            res.send(result)
        })

        // save a request data to db
        app.post('/request', async (req, res) => {
            const requestData = req.body

            // check if its a duplicate request
            const query = {
                email: requestData.email,
                postId: requestData.postId
            }
            const alreadyRequested = await requestsCollection.findOne(query)
            console.log(alreadyRequested)
            if (alreadyRequested) {
                return res
                .status (400)
                .send('You have already request for this volunteer post')
            }
            const result = await requestsCollection.insertOne(requestData)

            // update no_of_volunteer_needs in posts collection
            const updateDoc={
                 $inc: { no_of_volunteer_needs: -1}
            }
            const postQuery = {_id: new ObjectId(requestData.postId)}
            const updateRequestCount = await postsCollection.updateOne(postQuery, updateDoc)
            console.log(updateRequestCount)
            res.send(result)
        })


        // save a post data to db
        app.post('/post', async (req, res) => {
            const postData = req.body
            const result = await postsCollection.insertOne(postData)
            res.send(result)
        })

        // get post by specific user bt email
        app.get('/posts/:email', async (req, res) => {
            const email = req.params.email
            const query = { 'organizer.email': email }
            const result = await postsCollection.find(query).toArray()
            res.send(result)
        })

        // delete a post data from db
        app.delete('/post/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await postsCollection.deleteOne(query)
            res.send(result)
        })

        // update or edit a post on db
        app.put('/post/:id', async (req, res) => {
            const id = req.params.id
            const postData = req.body
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...postData,
                }
            }
            const result = await postsCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        // get request by specific user with email
        app.get('/my-request/:email', async (req, res) => {
            const email = req.params.email
            const query = { request_email: email }
            const result = await requestsCollection.find(query).toArray()
            res.send(result)
        })

        // get all volunteer request from db for who post need volunteer
        app.get('/volunteer-request/:email', async (req, res) => {
            const email = req.params.email
            const query = { request_organizer_email: email }
            const result = await requestsCollection.find(query).toArray()
            res.send(result)
        })

        // delete a request data from db
        app.delete('/request/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await requestsCollection.deleteOne(query)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from Soul-Share-Volunteering server')
})


app.listen(port, () => console.log(`soul-share server running on port ${port}`))