/**
 * @license
 * Copyright Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {promisify} = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

readline.Interface.prototype.question[promisify.custom] = function(prompt) {
  return new Promise((resolve) =>
    readline.Interface.prototype.question.call(this, prompt, resolve),
  );
};
readline.Interface.prototype.questionAsync = promisify(
    readline.Interface.prototype.question,
);

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './config/token.json';

/**
 * Helper to talk to my calendar.
 */
class CalendarConnector {
  /**
   * Initializes the class.
   */
  constructor() {
  }

  /**
   * @return {Boolean}
   */
  async init() {
    // Load client secrets from a local file.
    this._credentials = await readFile('./config/credentials.json');

    // Authorize a client with credentials, then call the Google Calendar API.
    this._auth = await this.authorize(JSON.parse(this._credentials));

    this._calendar = google.calendar({version: 'v3', auth: this._auth});
    return true;
  }

  /**
   * Lists the next 10 events on the user's primary calendar.
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  async getEvents() {
    const response = await this._calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.forEach((event, i) => {
        event.dateString = (event.start.dateTime || event.start.date)
            .replace(/T.*/, '');
      });
    } else {
      console.log('No upcoming events found.');
    }

    return events;
  }

  /**
   *
   * @param {*} event
   */
  async updateEvent(event) {
    await this._calendar.events.patch({
      calendarId: 'primary',
      eventId: event.id,
      resource: event,
    });
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  async authorize(credentials) {
    // eslint-disable-next-line camelcase
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    let token;
    try {
      token = await readFile(TOKEN_PATH);
    } catch (err) {
      return await this.getAccessToken(oAuth2Client);
    }

    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for
   */
  async getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await rl.questionAsync('Enter the code from that page here: ');
    rl.close();

    const {tokens} = await oAuth2Client.getToken(code);
    // if (err) return console.error('Error retrieving access token', err);
    oAuth2Client.setCredentials(tokens);

    // Store the token to disk for later program executions
    await writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);
    return oAuth2Client;
  }
}

module.exports = CalendarConnector;
