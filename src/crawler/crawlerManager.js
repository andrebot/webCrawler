'use strict';

const cluster = require('cluster');
const os      = require('os');
const uniq    = require('lodash/uniq');

const CrawlerManager = {
  initCrawlers,
  _crawlOverQueryStrings: false
};

const crawlerState = {
  pagesToVisit: [],
  idleWorkers: [],
  pagesVisited: {},
  totalWorkers: os.cpus().length
};

function initCrawlers (startingUrl) {
  crawlerState.pagesToVisit.push(startingUrl);

  for (let i = crawlerState.totalWorkers; i > 0; i--) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
  });

  cluster.on('message', _handleMessage(this._crawlOverQueryStrings));

  console.log('Events hooked');
}

function _handleMessage (crawlOverQueryStrings) {
  return function (worker, msg) {
    const {details, additionalPages, idle} = _manageWorker(worker, msg, crawlOverQueryStrings);

    if (details) {
      crawlerState.pagesVisited[details.url] = details
    }

    if (additionalPages.length > 0) {
      crawlerState.pagesToVisit = uniq(crawlerState.pagesToVisit.concat(additionalPages));
    }

    console.log(`Worker ${worker.process.pid} idle, adding in the queue`);
    crawlerState.idleWorkers.push(worker);

    if (crawlerState.idleWorkers.length > 0 && crawlerState.pagesToVisit.length > 0) {
      console.log(`There is page to crawl! Go ${worker.process.pid}`);
      while(crawlerState.idleWorkers.length > 0 && crawlerState.pagesToVisit.length > 0) {
        const currentWorker = crawlerState.idleWorkers.shift();

        currentWorker.send({
          type: 'crawlPage',
          from: 'master',
          data: {
            url: crawlerState.pagesToVisit.pop()
          }
        });

        console.log(`Crawler ${worker.process.pid} initiated. Remaining ${crawlerState.pagesToVisit.length} pages`);
      }
    }

    if (crawlerState.idleWorkers.length === crawlerState.totalWorkers) {
      crawlerState.idleWorkers.forEach(function (crawler) {
        crawler.disconnect();
      });

      console.log(crawlerState.pagesVisited);
    }
  }
}

function _manageWorker (worker, msg, crawlOverQueryStrings) {
  let workerState = {
    details: null,
    additionalPages: []
  };

  console.log(`Managing worker ${worker.process.pid}`);

  if (msg.type === 'nextTask') {
    workerState = _formatWorkerState(msg, crawlOverQueryStrings);
  }

  return workerState;
}

function _formatWorkerState(msg, pagesVisited, crawlOverQueryStrings) {
  const page = {
    details: {},
    additionalPages: []
  };
  const pageContent = msg.data.page;

  if (pageContent && pageContent.details) {
    console.log(`New content arrived! ${msg.from}`);
    page.details = pageContent.details;

    page.additionalPages = pageContent.links.reduce((links, link) => {
       const validLink = _clearLink(link, crawlOverQueryStrings);

      if (crawlerState.pagesVisited[validLink]) {
        return links;
      } else {
        crawlerState.pagesVisited[validLink] = true;
        return links.concat(validLink);
      }
    }, []);

    console.log(`New content from ${msg.from} saved`);
  }

  console.log(`Sending back content from ${msg.from}`)
  return page;
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
