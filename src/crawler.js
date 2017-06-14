'use strict';

const Crawler = {
  crawlPages,
  _crawlOverQueryStrings: false
};

async function crawlPages(startingUrl) {
  let pagesToVisit = [startingUrl];
  const pagesVisited = {};

  console.log(`Starting crawler on ${startingUrl}`);
  while(pagesToVisit.length > 0) {

    try {
      const pageContent = await crawlPage(page);

      pagesVisited[page] = pageContent.details;

      pagesToVisit = pagesToVisit.concat(pageContent.links.reduce((links, link) => {
        // Removing fragment
        const validLink = _clearLink(link, this._crawlOverQueryStrings);

        if (pagesVisited[validLink]) {
          return links;
        } else {
          pagesVisited[validLink] = true;
          return links.concat(validLink);
        }
      }, []));
    } catch (error) {
      console.error(error);
      console.error(`Could not crawl over ${page}.`);
    } finally {
      console.log(`Remaning pages to crawl ${pagesToVisit.length}`);
    }
  }

  console.info('Crawl finished.');

  return Object.keys(pagesVisited).map(key => pagesVisited[key]);
}



module.exports = function Factory (opt) {
  return Object.assign({}, Crawler, opt);
}
