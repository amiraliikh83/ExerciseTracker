const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new Schema({
  username: String,
});

const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: String,
  duration: Number, // تغییر نوع به Number
  date: Date,
});

const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No Users");
  } else {
    res.json(users);
  }
});

app.post("/api/users", async (req, res) => {
  console.log(req.body);
  const userobj = new User({
    username: req.body.username,
  });
  try {
    const user = await userobj.save();
    console.log(user);
    res.json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "There was an error creating the user" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.send("Could not find user");
    } else {
      const exerciseobj = new Exercise({
        user_id: user._id,
        description,
        duration: Number(duration), // تبدیل به عدد
        date: date ? new Date(date) : new Date(),
      });
      const exercise = await exerciseobj.save();
      return res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration, // duration باید عدد باشد
        date: new Date(exercise.date).toDateString(),
      });
    }
  } catch (err) {
    console.log(err);
    return res.send("There was an error saving the exercise ");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.send("Could not find user");
    return;
  }

  let dateobj = {};
  if (from) {
    dateobj["$gte"] = new Date(from);
  }
  if (to) {
    dateobj["$lte"] = new Date(to);
  }

  console.log('Filter date object:', dateobj);

  let filter = {
    user_id: id,
  };

  if (from || to) {
    filter.date = dateobj;
  }

  const exercise = await Exercise.find(filter).limit(Number(limit) || 500);

  console.log('Exercises found:', exercise);

  const log = exercise.map(e => ({
    description: e.description,
    duration: e.duration, // duration باید عدد باشد
    date: e.date instanceof Date ? e.date.toDateString() : "Invalid Date"
  }));

  res.json({
    username: user.username,
    count: exercise.length,
    _id: user._id,
    log
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
