/* eslint-disable max-len */
const octonode = require('octonode');

const CLIENT_TOKEN = process.env.AMP_DOC_TOKEN;
const CLIENT_SECRET = process.env.AMP_DOC_SECRET;
const CLIENT_ID = process.env.AMP_DOC_ID;

const DEFAULT_REPOSITORY = 'ampproject/wg-outreach';
const NUM_ISSUES = 20;

const ISSUE_TEMPLATE_TITLE = '📅Weekly meeting (YYYY-MM-DD)';
const ISSUE_TEMPLATE_BODY = `This is wg-outreach's regular weekly meeting with varying agenda, usually presented by wg-outreach members. Mostly meant for wg-outreach regulars, but open for anyone who'd like to contribute to AMP outreach.

**Meeting date/time (UTC)**
17:00 (10am PT)

**Instructions for joining the meeting**
Please join us on Google Meet with [this link](https://meet.google.com/hvn-ihfs-tnz).

**Agenda**
*Note: Add a comment on this issue to propose items for the agenda.*

-  Nothing yet!
`;

/**
 * Checks Github credentials.
 */
function checkCredentials() {
  if (!CLIENT_TOKEN && !(CLIENT_SECRET && CLIENT_ID)) {
    console.error('Please provide either a GitHub personal access token (AMP_DOC_TOKEN) or ' +
        'GitHub application id/secret (AMP_DOC_ID and AMP_DOC_SECRET). See README.md for more ' +
        'information.');

    throw new Error('Error: No GitHub credentials provided.');
  }
}

/**
 * Class that automatically creates 10 new meeting issues.
 */
class IssueUpdater {
  /**
   * @param {string} numIssues
   */
  constructor(numIssues = NUM_ISSUES) {
    // set up Github connection
    checkCredentials();
    this._github = octonode.client(CLIENT_TOKEN || {
      'id': CLIENT_ID,
      'secret': CLIENT_SECRET,
    });
    this._numIssues = numIssues;
    this._repo = this._github.repo(DEFAULT_REPOSITORY);
  }

  /**
   * @return {Date} latestIssueDate
   */
  async getLatestIssueDate() {
    const result = await this._repo.issuesAsync({
      per_page: 100,
      state: 'open',
    });

    // filter to only process meeting issues
    this._issues = result[0]
        .filter((item, index) => item.title.indexOf('Weekly meeting') > -1 );

    this._issues.forEach((item) => {
      item.dateString = item.title.match(/\d{4}-\d{2}-\d{2}/)[0];
      item.dateObj = new Date(item.dateString);
    });

    this._issues.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime() );
    return this._issues[0];
  }

  /**
   * @return {Number} totalnewIssues
   */
  async createNewIssues() {
    // find out what the latest generated meeting item was
    const latestDate = await this.getLatestIssueDate();
    const totalNewIssues = Math.max(this._numIssues - this._issues.length, 0);

    for (let index = 1; index < totalNewIssues+1; index++) {
      const issueDate = new Date(latestDate.dateObj.getTime() +
      (7 * 24 * 60 * 60 * 1000 * index));
      const issue = await this._repo.issueAsync({
        'title': ISSUE_TEMPLATE_TITLE.replace(
            'YYYY-MM-DD',
            issueDate.toISOString().replace(/T.*/, '')),
        'body': ISSUE_TEMPLATE_BODY,
        'assignee': 'pbakaus',
        'labels': ['Type: Meeting'],
      });
      this._issues.push(issue);
    }

    return totalNewIssues;
  }
  /**
   * @param {String} dateString
   * @return {Array} issue
   */
  getIssueByDateString(dateString = '') {
    for (let index = 0; index < this._issues.length; index++) {
      const issue = this._issues[index];
      if (issue.dateString === dateString) {
        return issue;
      }
    }

    return null;
  }
}

module.exports = IssueUpdater;
