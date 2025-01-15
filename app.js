require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const path = require("path")
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./jwtUtils');
const fs = require("fs");
const { exec } = require('child_process');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());



const getYouTubeVideoId = require("./getid");
const getText = require("./gettext");
const findHighlight = require("./findhighlight")
const downloadHighlight = require('./download');
const cropVideo = require('./crop');
const addSubtitles = require('./addsubs');
const getNewTranscript = require('./whisper')
const addWatermark = require("./addwatermark")

const generations = {};

async function main(genId, url, n, watermark) {

    generations[genId] = { status: "Getting transcript" };
    
	let id
	try {
		console.log("Trying to get id")
		id = getYouTubeVideoId(url);
		console.log("ID is", id)
	}
	catch(error) {
		console.log("Failed to get id")
		console.log(error);
		generations[genId] = { status: "Failed" };
		return
	}
    if (!id) {
		console.log("Failed to get id")
        generations[genId] = { status: "Failed" };
        return
    }

	const downloadTest = await downloadHighlight("Clip", id, 60, 50)
    console.log(downloadTest);
	
    let transcript;
	try {
		console.log("Trying to get trasncript")
		transcript = await getText(id)
		console.log(transcript)
	}
	catch(error) {
		console.log("Failed to get transcritp")
		console.log(error)
		generations[genId] = { status: "Failed" };
		return
	}
    if (!transcript) {
        generations[genId] = { status: "Failed" };
        return
    }

	let transcriptString;
    try {
		transcriptString = JSON.stringify(transcript);
		generations[genId] = { status: "Transcript ok!" };
	}
	catch(error) {
		console.log(error);
		generations[genId] = { status: "Failed" };
		return
	}
    if (!transcriptString) {
        generations[genId] = { status: "Failed" };
        return
    }


    generations[genId] = { status: "Finding highlights" };

    //Majd egy kis prompt engineering még fog kelleni, hogy jobbak legyenek a highlightok
	let highlights;
	try {
		highlights = await findHighlight(transcriptString, n)
	}
	catch (error) {
		console.log(error)
		generations[genId] = { status: "Failed" };
		return
	}
    if (!highlights) {
        generations[genId] = { status: "Failed" };
        return
    }

	generations[genId] = { status: "Downloading highlights" };

	console.log(highlights)

    let i = 0;
	generations[genId].clips = {}
    for (const highlight of highlights) {
        const timestamp = highlight.timestamp;
        const duration = highlight.duration;
    
        const clipName = genId + "_" + i.toString();
       
        generations[genId].status = "Downloading highlights"

		try {

			//Use proxies
			let fileName
			try {
				fileName = await downloadHighlight(clipName, id, timestamp, duration)
			}
			catch {
				continue;
			}
			
			
			generations[genId].clips[clipName] = "Highlight downloaded"

			const cropped = await cropVideo(fileName)

			generations[genId].clips[clipName] = "Highlight cropped"

			const newTranscript = await getNewTranscript(`./downloads/temp_audio_${fileName}.m4a`)

			generations[genId].clips[clipName] = "Transcription created"

			//Get transcript again with whisper for better subtitles
			

			const subs = await addSubtitles(cropped, newTranscript, timestamp)
			console.log(subs);

			if (!watermark) {
				const oldFile = "./downloads/" + subs + "_subs.mp4";
				const newFile = "./downloads/" + subs + "_final.mp4"
				fs.renameSync("./downloads/")
			}
			else {
				const final = await addWatermark(subs);
				console.log(final);
			}



			generations[genId].clips[clipName] = "Finished"
			i++;




		}
		catch (error) {
			console.log("Console logging error:")
			console.log(error)
			generations[genId].clips[clipName] = "Failed"
			continue;
		}
    }

	let oneFinished = false;
	for (const clipName in generations[genId].clips) {
		if (generations[genId].clips[clipName] == "Finished") {
			oneFinished = true;
			break;
		}
	}

	if (oneFinished) {
		generations[genId].status = "Finished"
	}
	else {
		generations[genId].status = "Failed"
	}
}

//main("https://www.youtube.com/watch?v=lx2nFfwM8cI")
//main("https://www.youtube.com/watch?v=por0oXtVw9I")

app.post('/generate', async (req, res) => {
    const url = req.body.url;
    let n = req.body.n;
    let watermark = req.body.watermark;
    const token = req.body.jwt;
    const decodedToken = await verifyToken(token)
    if (!decodedToken) {
        return res.json({success: false})
    }

	console.log(decodedToken)

	console.log(n)

    if (!n || n < 1) {
		n = 1;
    }

    if (decodedToken.subscription != "pro") {
		console.log("not pro")
        n = 1;
        watermark = true;
    }


    const genId = Date.now().toString();

	console.log("Generating video:", n, watermark)

    main(genId, url, n, watermark);
    res.json({success: true, genId: genId})
});

app.post('/status', (req, res) => {
    const genId = req.body.genId;
    const data = generations[genId]
    res.json({genData: data})
})

app.get('/download/:videoName', (req, res) => {
    const videoName = req.params.videoName + "_final.mp4";
    const videoPath = path.join(__dirname, 'downloads', videoName);

    // Check if the file exists
    if (fs.existsSync(videoPath)) {
        res.download(videoPath, videoName, (err) => {
            if (err) {
                res.status(500).send('Could not download the file.');
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
});

const Stripe = require('stripe');
const stripe = Stripe(process.env.Stripe);

app.post('/create-checkout-session', async (req, res) => {

	const email = req.body.email;
	try {

		const user = await User.findOne({ email }); 

		if (user.subscription == "pro") {
			return res.json({success: false, error: "You are already in the pro plan."})
		}

		const updatedSubscription = await stripe.subscriptions.update(user.subId, {
			cancel_at_period_end: false,
		});

		const newUser = await User.findOneAndUpdate(
			{ email: email }, // Query to find the user
			{ $set: { subscription: "pro"} },
			{ new: true } // Options: returns the updated document
		  );

		const token = jwt.sign({ email: newUser.email, subscription: newUser.subscription }, SECRET_KEY, { expiresIn: '24h' });
		console.log("Updated successfully")
		console.log(newUser)
		return res.json({success: true, updated: true, token: token})
	}
	catch (error) {
		console.log(error);
		console.log("No subscription to continue")
	}

	try {

		console.log("Creating checkout session");

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			mode: 'subscription',
			line_items: [
				{
					price: "price_1Qgsl2GVCkssEEUN67UogquX", // The price ID from your Stripe Dashboard
					quantity: 1,
				},
			],
			payment_method_collection: 'always',
			success_url: `${req.headers.origin}/plan?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${req.headers.origin}/plan`,
			customer_email: email
		});

		return res.json({ success: true, updated: false, url: session.url });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});

const alreadyCredited = [];
app.post('/add-subscription', async (req, res) => {
	const session = await stripe.checkout.sessions.retrieve(req.body.sessionId);
	const minutesAgo = (Date.now() - 20 * 60 * 1000)/1000; //20 minutes ago

	if (alreadyCredited.includes(session.id) || session.created < minutesAgo) {
		return res.json({success: false})
	}

	alreadyCredited.push(session.id)

	const user = await User.findOneAndUpdate(
		{ email: session.customer_email }, // Query to find the user
		{ $set: { subscription: "pro", subId: session.subscription } },
		{ new: true } // Options: returns the updated document
	  );

	const token = jwt.sign({ email: session.customer_email , subscription: "pro" }, SECRET_KEY, { expiresIn: '24h' });
	res.json({success: true, token: token})
});

app.post("/cancel-subscription", async (req, res) => {
	const email = req.body.email

	const user = await User.findOne({ email }); 

	if (user.subscription == "starter") {
		return res.json({success: false, error: "You are already in the starter plan."})
	}

	try {
        // Update the subscription to cancel at period end
        const updatedSubscription = await stripe.subscriptions.update(user.subId, {
            cancel_at_period_end: true,
        });

		const newUser = await User.findOneAndUpdate(
			{ email: email }, // Query to find the user
			{ $set: { subscription: "starter"} },
			{ new: true } // Options: returns the updated document
		  );

		const token = jwt.sign({ email: newUser.email, subscription: newUser.subscription }, SECRET_KEY, { expiresIn: '24h' });
		console.log("Canceled successfully")
		console.log(newUser);
		return res.json({success: true, token: token})
	}
	catch (error) {
		console.log(error)
		return res.json({success: false, error: error.message})
	}


})

//Login system
const mongoURI = process.env.mongoURI;
const mongoose = require('mongoose');
const { subscribe } = require('diagnostics_channel');

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Atlas connected'))
  .catch(err => console.error('MongoDB connection error:', err));
  
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subscription: { type: String, default: "starter" },
  subId: { type: String, default: ""},
  ref: { type: String, default: "" }
});

const User = mongoose.model('User', userSchema);

const SECRET_KEY = process.env.JWT;

// Route to register a new user
app.post('/register', async (req, res) => {
  const { email, password, ref } = req.body;

  //console.log(req.body)
  //console.log(email, password);

  try {
    var user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    else {
      
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ email: email, password: hashedPassword, subscription: "starter"});
      await user.save();

      console.log(user);

      const token = jwt.sign({ email: user.email, subscription: "starter" }, SECRET_KEY, { expiresIn: '24h' });

      res.json({ success: true, message: 'User registered successfully', token });
    }
  }
  catch (error) {
    console.log("error occured");
    console.log(error);
    res.json({ success: false, message: 'Error registering user' });
  }
});

// Route to authenticate a user
app.post('/login', async (req, res) => {
  const { email, password } = req.body;


  try {
    const user = await User.findOne({ email });
    console.log(user);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    else {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ success: false,  message: 'Wrong password' });
      }
      else {

        // Generate a JWT token
        const token = jwt.sign({ email: user.email, subscription: user.subscription }, SECRET_KEY, { expiresIn: '24h' });
        res.status(200).json({ success: true, token });
      }
    }
  }
  catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in' });
  }

});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/plan', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'plan.html'));
});

app.get('/tos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tos.html'));
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});


const binFolderPath = path.join(__dirname, 'bin');
const filePath = path.join(binFolderPath, 'yt-dlp_linux');
const fileUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

// Function to check the file and permissions
const checkAndDownloadFile = () => {
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log('The yt-dlp_linux file does not exist. Downloading...');

      // Download the file
      const command = `curl -L ${fileUrl} -o ${filePath} && chmod +x ${filePath}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error downloading the file:', error.message);
        } else {
          console.log('File downloaded successfully.');
          checkPermissions();
        }
      });
    } else {
      console.log('The yt-dlp_linux file exists.');
      checkPermissions();
    }
  });
};

// Function to check permissions
const checkPermissions = () => {
  fs.access(filePath, fs.constants.X_OK, (err) => {
    if (err) {
      console.log('The yt-dlp_linux file does not have executable permissions.');
    } else {
      console.log('The yt-dlp_linux file has executable permissions.');
    }
  });
};


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);

	const binPath = path.join(process.cwd(), 'bin');
	const ytDlpPath = path.join(binPath, 'yt-dlp_linux');
	const command = ytDlpPath + " -U"
	exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Error downloading the file:', error.message);
        } else {
          console.log('File downloaded successfully.');
        }
      });

	
	fs.access(binFolderPath, fs.constants.F_OK, (err) => {
		if (err) {
		  console.log('The bin folder does not exist. Please create it.');
		} else {
		  console.log('The bin folder exists.');
		  checkAndDownloadFile();
		}
	  });

});
