const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req?.cookies.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}



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

    // auth related apis
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '5h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false
        })
        .send({ success: true })
    })

    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false
      })
        .send({ success: true })
    })

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
      if (job.applicationCount) {
        count = job.applicationCount + 1;
      }
      else {
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

    app.get("/job-applications/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { job_id: id };
      const result = await applicationCollection.find(query).toArray();
      res.send(result)
    })
    //  notice some thing in this get operation that, in application db here save the id of the job is name of job_id so, in query we need to put here job_id in the query object as property. and also notice that params name just id and we take the id by req.params.id; so this is the noticable thing. thank you. But if you match the id with dbs object id then you need to convert it by {_id: new objectId(id)}.

    app.delete('/job-application/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/job-applications', verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };

      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
      }

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

    app.patch('/job-application/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateStatus = {
        $set: {
          status: data
        }
      }
      const result = await applicationCollection.updateOne(query, updateStatus);
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


