const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')
const id = require('shortid');
id.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', { useNewUrlParser: true });

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/*
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})
*/
// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

// My code
// 0.   Create Model 
var userSchema = mongoose.Schema;
var users = new userSchema({
  _id: String,
  username: String,
  count: Number,
  log: [{description: String, duration: Number, date: String}],
});

var User = mongoose.model('User', users);

// 1. Create a new user
app.post('/api/exercise/new-user', (req, res) => {
  var newId = id.generate();
  res.json({'username': req.body.username, '_id': newId});
  var newUser = new User({username: req.body.username, _id: newId, count: 0});
  newUser.save((err, data) => {
    if(err)
      console.log(err);
  });
});
// 2. get /api/exercise/users return an array of all users
app.get('/api/exercise/users', (req, res) => {
  User.find({},function(err,data){
    if(err){
      console.log(err);
    }
    else {
      res.send(data);
   }
});

});
// 3. Add excercise
// format time to yyyy-mm-dd
function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

app.post('/api/exercise/add', (req, res) => {
  
  User.findOne({_id: req.body.userId}, (err, data) => {
    if(err)
      console.log(err);
    else if (data === null)
      res.send('unknown _id');
    else if (req.body.description === '')  
      res.send('description is required');
    else if (req.body.duration === '')  
      res.send('duration is required');
    else {
      var addTime = req.body.date === '' ? formatDate(new Date()) : req.body.date;
      User.updateOne({_id: req.body.userId},
                 {$push: {log: {description: req.body.description, duration: req.body.duration, date: addTime}}, $inc:{count: 1}}, 
                     function (err) {
        if(err)
          console.log('this is error: ' + err);
        else 
          res.json({username: data.username, _id: data._id, description: req.body.description, duration: req.body.duration, date: addTime});  
      });
      
  }
  });  
  
});

// 4, 5. retrieve full exercise of user
app.get('/api/exercise/log', (req, res) => {
  var fromTime = req.query.from;
  var toTime = req.query.to;
  var limit = req.query.limit;
  var numOfItems = 0;
  User.findOne({_id: req.query.userId}, (err, data) => {
    if(err) 
      console.log(err);
    else if (data === null)
      res.json('unknown user Id');
    else {
      var result = data.log.filter(function (item) {
          return Date.parse(item.date) >= Date.parse(fromTime) && Date.parse(item.date) <= Date.parse(toTime) && numOfItems++ < limit
        });
      console.log(data.log);
      res.json({_id: data._id, username: data.username, count: result.length, log: result});
    }
  });
  
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
