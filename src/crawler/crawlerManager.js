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
 * @property {Object} pagesVisited map an URL to its {@link CrawlerWorker#PageAssets}
 * @property {Number} totalWorkers Total of workers available
 */

/**
 * @typedef {Object} WorkerState
 * @property {CrawlerWorker#PageAssets} details Data crawled from a page
 * @property {String[]} additionalPages links found in the page crawled
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
  let workersDisconneted = 0;

  for (let i = crawlerState.totalWorkers; i > 0; i--) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    workersDisconneted++;

    if (workersDisconneted === crawlerState.totalWorkers) {
      process.stdout.write('\r');
      console.log(JSON.stringify(crawlerState.pagesVisited, null, 2));
    }
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
 * @private
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

/**
 * Increment the crawler state, adding pages visited, pages to visit and ilde workers.
 * 
 * @private
 * @param {CrawlerState} crawlerState State to be incremented
 * @param {CrawlerWorker#PageAssets} details Page data freshly crawled
 * @param {String[]} additionalPages Links to be crawled
 * @param {cluster.Worker} worker worker responsible to this page
 */
function _incrementCrawlerState (crawlerState, details, additionalPages, worker) {
  if (details) {
    crawlerState.pagesVisited[details.url] = details
  }

  if (additionalPages.length > 0) {
    crawlerState.pagesToVisit = uniq(crawlerState.pagesToVisit.concat(additionalPages));
  }

  crawlerState.idleWorkers.push(worker);
}

/**
 * Go through idle workers and assign new links to each one available.
 * 
 * @private
 * @fires cluster.Worker#message Node process event which will be listened by the worker.
 * @param {CrawlerState} crawlerState state with all idle workers and URLs to be visited
 */
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

       process.stdout.write(`\r${crawlerState.pagesToVisit.length} pages remaining.`);
    }
  }
}

/**
 * Will check if we have any URL to crawl into and if there is any working worker. If everyone of
 * them are idle and we do not have any URL to crawl, there will be no additional URLs to be 
 * crawled, determining the end condition.
 * 
 * @private
 * @param {CrawlerState} crawlerState state with all workers and number of workers
 */
function _checkStopCondition (crawlerState) {
  if (crawlerState.idleWorkers.length === crawlerState.totalWorkers) {
    crawlerState.idleWorkers.forEach(function (crawler) {
      crawler.disconnect();
    });
  }
}

/**
 * Manages worker event types.
 * 
 * @private
 * @param {cluster.Worker} worker worker which crawled the data
 * @param {CrawlerWorker#CrawlerEvent} msg data which was sent by the worker 'message' event
 * @param {Object} pagesVisited map an URL to its {@link CrawlerWorker#PageAssets}
 * @param {Boolean} crawlOverQueryStrings flag to crawl over URL with query parameters
 * @returns {@link WorkerState} data formated
 */
function _manageWorker (worker, msg, pagesVisited, crawlOverQueryStrings) {
  let workerState = {
    details: null,
    additionalPages: []
  };

  // The type 'firstTask was not mapped because it is handled as a default action.
  // We coded this so, if we have more events types in the future, we can increment here
  if (msg.type === 'nextTask') {
    workerState = _formatWorkerState(msg, pagesVisited, crawlOverQueryStrings);
  }

  return workerState;
}

/**
 * Format Workers crawled data.
 * 
 * @param {CrawlerWorker#CrawlerEvent} msg data which was sent by the worker 'message' event
 * @param {Object} pagesVisited map an URL to its {@link CrawlerWorker#PageAssets}
 * @param {Boolean} crawlOverQueryStrings flag to crawl over URL with query parameters
 * @returns {@link WorkerState} data formated
 */
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

/**
 * Removes fragment and query string parameters form the URL. We can toggle the query parameter
 * removal.
 * 
 * @param {String} link 
 * @param {Booler} crawlOverQueryStrings 
 * @returns A formated URL
 */
function _clearLink (link, crawlOverQueryStrings) {
  let validLink = link.split('#')[0];

  if (!crawlOverQueryStrings && validLink.indexOf('?') > -1) {
    validLink = validLink.split('?')[0];
  }

  return validLink;
}

/**
 * CrawlerManager composer. The only variable in the opts object which matters is 
 * _crawlOverQueryStrings, which toggles the ability to crawl over links with 
 * query parameters. Otherwise those links are ignored.
 * 
 * @returns a new CrawlerManager instance.
 */
module.exports = function factory(opts) {
  return Object.assign({}, CrawlerManager, opts);
};
