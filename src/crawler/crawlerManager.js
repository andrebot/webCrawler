'use strict';

const cluster = require('cluster');
const os      = require('os');
const uniq    = require('lodash/uniq');

const CrawlerManager = {
  initCrawlers,
  _crawlOverQueryStrings: false
};

function initCrawlers (startingUrl) {
  const crawlerState = {
    pagesToVisit: [startingUrl],
    idleWorkers: [],
    pagesVisited: {},
    totalWorkers: os.cpus().length
  };

  for (let i = crawlerState.totalWorkers; i > 0; i--) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
  });

  cluster.on('message', _handleMessage(crawlerState, this._crawlOverQueryStrings));

  console.log('Events hooked');
}

function _handleMessage (crawlerState, crawlOverQueryStrings) {
  return function (worker, msg) {
    const {
      details,
      additionalPages,
      idle
    } = _manageWorker(worker, msg, crawlerState.pagesVisited, crawlOverQueryStrings);

    if (details) {
      crawlerState.pagesVisited[details.url] = details
    }

    if (additionalPages.length > 0) {
      crawlerState.pagesToVisit = uniq(crawlerState.pagesToVisit.concat(additionalPages));
    }

    crawlerState.idleWorkers.push(worker);

    if (crawlerState.idleWorkers.length > 0 && crawlerState.pagesToVisit.length > 0) {
      while(crawlerState.idleWorkers.length > 0 && crawlerState.pagesToVisit.length > 0) {
        const currentWorker = crawlerState.idleWorkers.shift();

        currentWorker.send({
          type: 'crawlPage',
          from: 'master',
          data: {
            url: crawlerState.pagesToVisit.pop()
          }
        });
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

function _manageWorker (worker, msg, pagesVisited, crawlOverQueryStrings) {
  let workerState = {
    details: null,
    additionalPages: []
  };

  if (msg.type === 'nextTask') {
    workerState = _formatWorkerState(msg, pagesVisited, crawlOverQueryStrings);
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
    page.details = pageContent.details;

    page.additionalPages = pageContent.links.reduce((links, link) => {
       const validLink = _clearLink(link, crawlOverQueryStrings);

      if (pagesVisited[validLink]) {
        return links;
      } else {
        pagesVisited[validLink] = true;
        return links.concat(validLink);
      }
    }, []);
  }

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
