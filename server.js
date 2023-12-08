const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const session = require('express-session');

const mongoURL = "mongodb+srv://fyp:Test1234@cluster0.jldsbhe.mongodb.net/?retryWrites=true&w=majority";

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));

// Render the EJS login template
app.get('/login', (req, res) => {
  res.render('login');
});

// Render the EJS registration template
app.get('/registration', (req, res) => {
  res.render('registration');
});

// Handle registration form submissions
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = new MongoClient(mongoURL, { useUnifiedTopology: true });
    await client.connect();

    const db = client.db();
    const collection = db.collection('test.users');

    // Check if the username already exists
    const existingUser = await collection.findOne({ username });
    if (existingUser) {
      console.log('User already exists');
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with the hashed password
    await collection.insertOne({ username, password: hashedPassword });
    console.log('Registration successful');

    // Redirect to the dashboard page after successful registration
    res.redirect('/dashboard');

    client.close();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Handle login form submissions
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const client = new MongoClient(mongoURL, { useUnifiedTopology: true });
    await client.connect();

    const db = client.db();
    const collection = db.collection('test.users');

    // Check if the username exists
    const user = await collection.findOne({ username });
    if (user) {
      console.log('Entered password:', password);
      console.log('Hashed password from the database:', user.password);

      // Compare the hashed password
      const passwordMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', passwordMatch);

      if (passwordMatch) {
        // Set the user in the session
        req.session.user = user;
        console.log('Login successful');
        // Redirect to the dashboard page after successful login
        return res.redirect('/dashboard');
      }
    }

    console.log('Login failed');
    // Redirect to the login page if the username or password is incorrect
    res.redirect('/login');

    client.close();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Serve the HTML dashboard page
app.get('/dashboard', (req, res) => {
  // Check if the user is authenticated
  if (req.session.user) {
    res.render('dashboard');  // Update this line
  } else {
    res.redirect('/login');
  }
});

// Handle quiz submissions and update scores
app.post('/submitQuiz', async (req, res) => {
  const { quizName, score } = req.body;
  const userId = req.session.user._id; // Assuming _id is available in the user object

  try {
    // Connect to the database
    const client = new MongoClient(mongoURL, { useUnifiedTopology: true });
    await client.connect();

    // Access the database and create a collection for quiz scores
    const db = client.db();
    const quizScoresCollection = db.collection('quizScores');

    // Check if the user has an existing score for the quiz
    const existingScore = await quizScoresCollection.findOne({ userId, quizName });

    if (!existingScore || score > existingScore.score) {
      // If the user doesn't have a score or the new score is higher, update it
      await quizScoresCollection.updateOne(
        { userId, quizName },
        { $set: { userId, quizName, score } },
        { upsert: true }
      );

      // Check conditions for earning an award
      let award = '';
      if (quizName === 'anatomy_quiz' && score === 3) {
        award = 'Anatomy Expert';
      }
      if (quizName === 'technology_quiz' && score === 3) {
        award = 'Technology Expert';
      }
      if (quizName === 'math_quiz' && score === 3) {
        award = 'Maths Expert';
      }
      if (quizName === 'engineering_quiz' && score === 3) {
        award = 'Engineering Expert';
      }

      if (award) {
        console.log('Award:', award); // Log the award to see if it's being assigned

        // Update or add the award to the user's profile
        const usersCollection = db.collection('test.users');
        await usersCollection.updateOne(
          { _id: userId },
          { $addToSet: { awards: award } }
        );
      }
    }

    res.status(200).json({ success: true });

    // Close the database connection
    client.close();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Function to check for awards and update user profile
async function checkForAwards(userId, db) {
  const quizScoresCollection = db.collection('quizScores');
  const userCollection = db.collection('test.users'); // Assuming the user collection name

  const userScores = await quizScoresCollection.find({ userId }).toArray();

  // Example awards definition
  const awards = [
    { quizName: 'anatomy_quiz', requiredScore: 3, awardName: 'Anatomy Expert' },
    { quizName: 'technology_quiz', requiredScore: 3, awardName: 'Technology Expert' },
    { quizName: 'engineering_quiz', requiredScore: 3, awardName: 'Engineering Expert' },
    { quizName: 'math_quiz', requiredScore: 3, awardName: 'Maths Expert' }
  ];

  const userAwards = [];

  awards.forEach((award) => {
    const userScore = userScores.find((score) => score.quizName === award.quizName);

    if (userScore && userScore.score === award.requiredScore) {
      userAwards.push(award.awardName);
    }
  });

  // Update user profile with awards
  await userCollection.updateOne(
    { _id: userId },
    { $set: { awards: userAwards } }
  );
}


// Serve the HTML profile page
app.get('/profile', async (req, res) => {
  // Check if the user is authenticated
  if (req.session.user) {
    try {
      const userId = req.session.user._id; // Assuming _id is available in the user object

      // Connect to the database
      const client = new MongoClient(mongoURL, { useUnifiedTopology: true });
      await client.connect();

      // Access the database and create a collection for quiz scores
      const db = client.db();
      const quizScoresCollection = db.collection('quizScores');

      // Retrieve quiz scores for the user
      const quizScores = await quizScoresCollection.find({ userId }).toArray();

      // Pass the user and quizScores variables to the profile template
      res.render('profile', { user: req.session.user, quizScores });

      // Close the database connection
      client.close();
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Database error' });
    }
  } else {
    res.redirect('/login');
  }
});


app.get('/science', (req, res) => {
  res.render('science');
});

app.get('/technology', (req, res) => {
  res.render('technology');
});

app.get('/engineering', (req, res) => {
  res.render('engineering');
});

app.get('/math', (req, res) => {
  res.render('math');
});

app.get('/anatomy_quiz', (req, res) => {
  res.render('anatomy_quiz');
});

app.get('/technology_quiz', (req, res) => {
  res.render('technology_quiz');
});

app.get('/engineering_quiz', (req, res) => {
  res.render('engineering_quiz');
});

app.get('/math_quiz', (req, res) => {
  res.render('math_quiz');
});

// Define a route to handle requests to the root URL
app.get('/', (req, res) => {
  res.send('Welcome to the root of the application');
});

const port = 3003;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});