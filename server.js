const express = require('express');
const request = require('request');
const dotenv = require('dotenv');
const path = require('path');
const port = 5000;

dotenv.config();

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const spotify_redirect_uri = 'http://localhost:3000/auth/callback';

const app = express();

app.use(express.static(path.join(__dirname, 'build')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/auth/login', (req, res) => {
  const scope = 'streaming user-read-email user-read-private';
  const state = generateRandomString(16);
  const auth_query_parameters = new URLSearchParams({
    response_type: 'code',
    client_id: spotify_client_id,
    scope: scope,
    redirect_uri: spotify_redirect_uri,
    state: state,
  });

  res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/auth/callback', (req, res) => {
  const code = req.query.code;

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: spotify_redirect_uri,
      grant_type: 'authorization_code',
    },
    headers: {
      'Authorization': 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (error) {
      console.error('Error:', error);
      return res.sendStatus(500);
    }
    if (response.statusCode !== 200) {
      console.error('Invalid response from Spotify:', response.statusCode, body);
      return res.sendStatus(response.statusCode);
    }
    global.access_token = body.access_token;
    res.redirect('/');
  });
});

app.get('/auth/token', (req, res) => {
  res.cookie('access_token', global.access_token, {
    httpOnly: true,
    secure: true, // Ensure secure if using HTTPS
    sameSite: 'None',
  });
  res.json({ access_token: global.access_token });
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
