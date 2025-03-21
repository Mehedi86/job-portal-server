const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kpht8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobCollection = client.db('jobPortal').collection('jobs');
    const applicationCollection = client.db('jobPortal').collection('application');

    app.get('/jobs', async (req, res) => {
      const email = req.query.email;

      let query = {};
      if (email) {
        query = { hr_email: email }
      }

      const cursor = jobCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/addJobs', async (req, res) => {
      const newJobs = req.body;
      const result = await jobCollection.insertOne(newJobs);
      res.send(result)
    })

    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobCollection.findOne(query);
      res.send(result);
    })

    // noticed that filter and query is same things, it used for search a data by condition or as you think that you provide a information for search the data like email, id etc

    app.post('/job-application', async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobCollection.findOne(query);
      let count = 0;
      if(job.applicationCount){
        count = job.applicationCount + 1;
      }
      else{
        count = 1;
      }
      console.log(count)
      const updateCount = {
        $set: {
          applicationCount: count
        }
      }

      const updateResult = await jobCollection.updateOne(query, updateCount)

      res.send(result);
    })

    app.delete('/job-application/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/job-applications', async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };
      const result = await applicationCollection.find(query).toArray();

      for (const application of result) {
        const query2 = { _id: new ObjectId(application.job_id) }
        const job = await jobCollection.findOne(query2);
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }

      }
      res.send(result);
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
  res.send("Hello this is the job portal server");
})

app.listen(port, () => {
  console.log(`The server is running from the port number: ${port}`)
})