#!/usr/bin/env node
/* eslint-disable max-len */
const IssueUpdater = require('./modules/IssueUpdater');

const NUM_ISSUES = 20;

// let's go!
(async function() {
  const issueUpdater = new IssueUpdater(NUM_ISSUES);

  // create new Github issues
  const issuedUpdated = await issueUpdater.updateNotetakers();
  console.log(`Updated ${issuedUpdated} new issues!`);

})();
