const newman = require('newman'); // require newman in your project
const fs = require('fs');
const treeify = require('treeify');

runCollections();

function runCollections() {
  var username = "", password = "";

  fs.readdir('./pm_collection', function (err, files) {
    if (err) { throw err; }

    processFiles(files, username, password);
  });
}


function processFiles(files, username, password) {

  let status = false;
  let counter = 0;
  let len = files.length;

  function* loopFiles() {
    for (let i = 0; i < files.length; i++)
      yield runPostmanCollection(files[i]);
    console.log("Postman Test completed!!!");
  }

  var resume = loopFiles();

  resume.next();

  function runPostmanCollection(file) {
    newman.run({
      // folder: "stable",
      abortOnFailure: false,
      abortOnError: true,
      insecure: true,
      collection: require(`${__dirname}/pm_collection/${file}`),
      iterationData: [{ "username": username, "password": password }],
      environment: require('./pm_environment/development.postman_environment.json')
    }).on('start', function (err, args) { // on start of run, log to console
      console.log('Running a postman collection...', file, "\n");
    }).on('done', function (err, summary) {
      if (err) {
        console.error('Collection run encountered an unexpected error:', err);

        exitCall(++counter, len, true);

        resume.next();
      }

      if (summary) {
        if (summary.error) {
          console.error('Collection run encountered an error.');

          status = true;
        }

        if (summary.run.failures.length) {
          const failureCount = summary.run.failures.length;
          summary.run.failures.forEach((element, index) => {
            const header = `${'='.repeat(32)}[ Error-${index + 1} ]${'='.repeat(32)}`;
            console.error(header);
            console.error('Tag    : ', element.parent.name);
            console.error('Source : ', element.source.name);
            console.error('Type   : ', element.error.name);
            console.error('Test   : ', element.error.test);
            console.error('Error  : ', element.error.message);
            if (index === failureCount - 1) console.error('~'.repeat(header.length));
          });

          status = true;
        }

        console.log('Postman collection execution summary: \n');

        // summary.run.executions.forEach(function (item, index) {
        //   const header = `[ ${item.item.name} ]`;
        //   console.error(header);
        //   console.error('Code   : ', item.response.code);
        //   console.error('Status : ', item.response.status);
        //   // console.error('Detail : ', item.response._details.detail);
        // });

        if (status) {
          console.log('Collection run was unsuccessfull.');
          console.error(treeify.asTree(summary.run.stats, true));

          exitCall(++counter, len, true);

          resume.next();
        } else {
          console.log('Collection run completed.');
          console.log("\n" + treeify.asTree(summary.run.stats, true));

          exitCall(++counter, len, false);

          resume.next();
        }
      }
    });
  }

  function exitCall(cnt, len, status) {
    if (cnt === len) {
      if (status) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    }
  }
}