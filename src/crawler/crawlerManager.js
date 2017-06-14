'use strict';

const cluster = require('cluster');
const os      = require('os');
const uniq    = require('lodash/uniq');

/**
 * This is the Crawler manager. It is responsible for manage all cralwer's and distribute all
 * data between its children.
 * 
 * @namespace {Object}
 */

/**
 * @typedef {Object} CrawlerState
 * @property {String[]} pagesToVisit Array with all pages not yet crawled
 * @property {cluster.Worker[]} idleWorkers workers which are not crawling
 * @property {CrawlerWorker#PageAssets} pagesVisited Map with all data from each page visited
 * @property {Number} totalWorkers Total of workers available
 */

const CrawlerManager = {
  initCrawlers,
  _crawlOverQueryStrings: false
};

/**
 * This will setup a worker farm to crawl over pages. Each new farm will have it own state due to 
 * clojure. This method will hook two handler, one for each events: message and exit.
 * 
 * @param {String} startingUrl first URL to be crawled
 */
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

  console.log(`${crawlerState.totalWorkers} workers were created. Waiting to be started.`);
}

/**
 * Creates a handler for the 'message' event from the workers, adding the crawlerState in the 
 * scope. The handler will format any data which comes with the event, increment the 
 * crawlerState if needed and manage idle workers. When assiging an URL to a worker it
 * sends a 'message' event to it with the URL to be used
 * 
 * @fires cluster.Worker#message Node process event which will be listened by a worker.
 * @param {CrawlerState} crawlerState 
 * @param {Boolean} crawlOverQueryStrings 
 */
function _handleMessage (crawlerState, crawlOverQueryStrings) {
  return function (worker, msg) {
    const {
      details,
      additionalPages,
      idle
    } = _manageWorker(worker, msg, crawlerState.pagesVisited, crawlOverQueryStrings);

    _incrementCrawlerState(crawlerState, details, additionalPages, worker);

    _assignWorkToWorkers(crawlerState);

    _checkStopCondition(crawlerState);
  }
}

function _incrementCrawlerState (crawlerState, details, additionalPages, worker) {
  if (details) {
    crawlerState.pagesVisited[details.url] = details
  }

  if (additionalPages.length > 0) {
    crawlerState.pagesToVisit = uniq(crawlerState.pagesToVisit.concat(additionalPages));
  }

  crawlerState.idleWorkers.push(worker);
}

function _assignWorkToWorkers (crawlerState) {
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

      console.log(`${crawlerState.pagesToVisit.length} pages remaining`);
    }
  }
}

function _checkStopCondition (crawlerState) {
  if (crawlerState.idleWorkers.length === crawlerState.totalWorkers) {
    crawlerState.idleWorkers.forEach(function (crawler) {
      crawler.disconnect();
    });

    console.log(crawlerState.pagesVisited);
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
