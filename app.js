const express = require('express');
const { google } = require('googleapis');
const OAuth2Data = require('./credentials.json');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// OAuth2 Configuration
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

let isAuthenticated = false;
const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile'
];


// Multer Configuration for File Upload
const storage = multer.diskStorage({
  destination: './videos',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage }).single('videoFile');

// Routes

// Home Page Route
app.get('/', (req, res) => {
  if (!isAuthenticated) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    res.render('index', { url: authUrl });
  } else {
    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
    oauth2.userinfo.get((err, response) => {
      if (err) {
        console.error("Error fetching user info:", err);
        return res.status(500).send("Failed to retrieve user info.");
      }
      const { name, picture: pic } = response.data;
      res.render('success', { name, pic, success: false });
    });
  }
});

// Video Upload Route
app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).send('File upload failed.');
    }

    const { title, description, tags } = req.body;
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    youtube.videos.insert(
      {
        resource: {
          snippet: {
            title,
            description,
            tags: tags ? tags.split(',') : [],
          },
          status: {
            privacyStatus: 'private', // Set video privacy
          },
        },
        part: 'snippet,status',
        media: {
          body: fs.createReadStream(req.file.path),
        },
      },
      (err, data) => {
        if (err) {
          console.error('YouTube API error:', err);
          return res.status(500).send('Video upload failed.');
        }
        fs.unlinkSync(req.file.path); // Delete file after upload
        console.log('Video uploaded successfully:', data.data);
        res.render('success', { name: 'User', pic: 'https://via.placeholder.com/150', success: true });
      }
    );
  });
});

// Google OAuth Callback Route
app.get('/google/callback', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Authorization code not found.');

  oAuth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error('Error retrieving access token:', err);
      return res.status(500).send('Authentication failed.');
    }
    oAuth2Client.setCredentials(tokens);
    isAuthenticated = true;
    res.redirect('/');
  });
});


app.get('/videos', async (req, res) => {
  if (!isAuthenticated) {
    return res.redirect('/'); // Redirect to login if not authenticated
  }

  try {
    // Initialize the YouTube API
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // Get the "Uploads" playlist ID
    const channelResponse = await youtube.channels.list({
      part: 'contentDetails',
      mine: true,
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(404).send('No channel found.');
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Fetch videos from the "Uploads" playlist
    const videosResponse = await youtube.playlistItems.list({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 50, // Maximum number of videos to fetch
    });

    const videos = videosResponse.data.items.map((item) => ({
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      videoId: item.snippet.resourceId.videoId,
    }));

    // Render the videos.ejs view and pass the videos list
    res.render('videos', { videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).send('Failed to fetch video list.');
  }
});


app.get('/videos/edit/:videoId', async (req, res) => {
  if (!isAuthenticated) {
    return res.redirect('/');
  }

  const { videoId } = req.params;

  try {
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // Fetch video details
    const videoResponse = await youtube.videos.list({
      part: 'snippet',
      id: videoId,
    });

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return res.status(404).send('Video not found.');
    }

    const video = videoResponse.data.items[0];
    res.render('editVideo', {
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      tags: video.snippet.tags || [],
    });
  } catch (error) {
    console.error('Error fetching video details:', error.response?.data || error.message);
    res.status(500).send('Failed to fetch video details.');
  }
});
app.post('/videos/edit/:videoId', async (req, res) => {
  if (!isAuthenticated) {
    return res.redirect('/');
  }

  const { videoId } = req.params;
  const { title, description, tags } = req.body;

  try {
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // Update video metadata
    await youtube.videos.update({
      part: 'snippet',
      requestBody: {
        id: videoId,
        snippet: {
          title,
          description,
          tags: tags ? tags.split(',') : [],
        },
      },
    });

    console.log('Video updated successfully.');
    res.redirect('/videos'); // Redirect back to the video list
  } catch (error) {
    console.error('Error updating video:', error.response?.data || error.message);
    res.status(500).send('Failed to update video.');
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  isAuthenticated = false;
  res.redirect('/');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
