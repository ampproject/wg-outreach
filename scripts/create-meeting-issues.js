#!/usr/bin/env node
/* eslint-disable max-len */
const CalendarConnector = require('./modules/CalendarConnector');
const IssueUpdater = require('./modules/IssueUpdater');

const NUM_ISSUES = 20;

// let's go!
(async function() {
  const issueUpdater = new IssueUpdater(NUM_ISSUES);
  const calendarConnector = new CalendarConnector(NUM_ISSUES);

  // create new Github issues
  const newIssuesCreated = await issueUpdater.createNewIssues();
  console.log(`Created ${newIssuesCreated} new issues!`);

  // attach Github issues to calendar events
  await calendarConnector.init();
  const events = await calendarConnector.getEvents();

  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const associatedIssue = issueUpdater.getIssueByDateString(event.dateString);

    if (!associatedIssue) {
      console.warn('Warning: no associated issue found for ', event.dateString);
      continue;
    }

    if (event.description.indexOf('github') === -1) {
      event.description = event.description.replace('Please add agenda items to the relevant issue on the ampproject/wg-outreach repository on Github.', 'Please add agenda items to the this issue: ' + associatedIssue.html_url);
      await calendarConnector.updateEvent(event);
    }
  }
})();
