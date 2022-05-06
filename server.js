const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

mongoose.connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true});


const conSuccess = mongoose.connection
conSuccess.once('open', _ => {
  console.log('Database connected:', process.env.MONGO_URL)
})

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));

const {Schema} = mongoose;

const userSchema = new Schema({
  username: String
})

const exerciseSchema = new Schema({
  user_id: String,
  username: String,
  description: String,
  duration: Number,
  date: Date,
})

let User = mongoose.model('user', userSchema);
let Exercise = mongoose.model('exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  let userName = req.body.username;
  
  let user = new User({
    username: userName
  });
  

  user.save((error, data) => {
    if (error) {
      console.log(error);
      res.json({error: error});
    } else {
      res.json({username: data.username, _id: data._id});
    }
  })

});

app.get('/api/users', (_, res) => {
  User.find({}, (err, data) => {
    if (err) {
      console.log(err);
      res.json(err);
    } else {
      res.json(data);
    }
  })
});


app.post("/api/users/:_id/exercises", (req, res) => {
  User.findById({_id: req.params._id}, (err, user) => {
    if (err) {
      console.log(err);
      res.json(err);
    } else {
      let exercise = new Exercise({
        user_id: req.params._id,
        username: user.username,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: req.body.date ? new Date(req.body.date) : new Date(),
      })

      exercise.save((err, data) => {
        if (err) {
          console.log(err);
          res.json(err);
        } else {
          res.json({
            username: data.username,
            description: data.description,
            duration: data.duration,
            date: data.date.toDateString(),
            _id: req.params._id
          });
        }
      })
    }
  });
})


// ex:   /api/users/:_id/logs?2022-05-7&2022-05-08&5
app.get('/api/users/:_id/logs', (req, res) => {
  console.log("LOGS", req.query?.from, req.query.to);
  let query = {
    user_id: req.params._id,
    from: new Date(req.query?.from),
    to: new Date(req.query?.to),
    limit: req.query.limit
  }
  console.log(query);
  Exercise.find(
    {
      user_id: query.user_id,
        ...((req.query.to || req.query.from) && {date: {
        ...(req.query.from && {$gte: query.from}), 
        ...(req.query.to && {$lte: query.to})
      }})
    })
        .limit(query.limit)
        .exec((err, exercise) => {
          if (err) {
            console.log('error', err);
            res.json(err);
          } else {
            console.log(exercise);
            console.log(exercise.username);
            User.findById(query.user_id, (err, user)=>{
              res.json({
                username: user.username,
                count: Object.keys(exercise).length,
                _id: query.user_id,
                log: exercise.map(v => ({
                        description: v.description,
                        duration: v.duration,
                        date: v.date.toDateString()
                  }))
              });
            })
          }
        })
})




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
