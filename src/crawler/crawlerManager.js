'use strict';

const cluster = require('cluster');
const os      = require('os');

const CrawlerManager = {
  setUpWorkers,
  _crawlOverQueryStrings: false
};

function setUpWorkers (startingUrls) {
  let pagesToVisit = startingUrls;
  const idleWorkers = [];
  const pagesVisited = {};

  const cpusNum = 2; //os.cpus().length;

  for (let i = cpusNum - 1; i >= 0; i--) {
    cluster.fork();
  }

  cluster.on('online', function () {
    console.log('I\'ve just became online!');
  });

  cluster.on('exit', function (worker, code, signal) {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
  });

  cluster.on('message', function (worker, msg) {
    if (msg.type === 'nextTask') {
      console.log('Fetching next url');

      if (msg.data.page) {
        const page = msg.data.page;

        console.log('There is data to be saved')
        const pageDetails = page.details;

        pagesVisited[pageDetails.url] = pageDetails;

        pagesToVisit = pagesToVisit.concat(page.links.reduce((links, link) => {
          // Removing fragment
          const validLink = _clearLink(link, this._crawlOverQueryStrings);

          if (pagesVisited[validLink]) {
            return links;
          } else {
            pagesVisited[validLink] = true;
            return links.concat(validLink);
          }
        }, []));
      } else {
        console.log('No data to be saved')
      }

      if (pagesToVisit.length === 0) {
        idleWorkers.push(worker);
        console.log(`We have ${idleWorkers.length} workers idle`);
      } else {
        console.log('Putting workers to work');
        let working = 0;
        while(idleWorkers.length > 0 || pagesToVisit.length > 0) {
          const currentWorker = idleWorkers.shift();

          worker.send({
            type: 'crawlPage',
            from: 'master',
            data: {
              url: pagesToVisit.pop()
            }
          });

          working++;
        }

        console.log(`We have ${working} workers working`);
      }
    }
  });
}

function _manageWorker (worker, msg) {
  
}

function _clearLink (link, crawlOverQueryStrings) {
  let validLink = link.split('#')[0];

  if (!crawlOverQueryStrings && validLink.indexOf('?') > -1) {
    validLink = validLink.split('?')[0];
  }

  return validLink;
}

module.exports = function factory(opts) {
  return Object.assign({}, CrawlerManager, opts);
};
