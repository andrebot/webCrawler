'use strcit';

const mockReq = require('mock-require');
const Cheerio = require('cheerio');
const should  = require('chai').should();

function getDummyHtml () {
 const html = 
  `<html>
    <head></head>
    <body>
      <img></img>
      <div>
        <img></img>
      </div>
      <a></a>
      <div>
        <div>
          <a></a>
        </div>
      </div>
    </body>
  </html>`;

  return Cheerio.load(html);
}

mockReq('request-promise', getDummyHtml);
const Crawler = require('./crawler');

const DUMMY_URL = 'https://www.avenuecode.com';
const DUMMY_BAD_URL = 'mamamia';

describe('Crawler', function () {
  before(function () {
    this.crawler = Crawler();
  });

  it('Should be able to request a website', async function () {
    try {
      const $ = await this.crawler.request(DUMMY_URL);

      should.exist($);
      $.should.be.a('function');
      should.exist($('body'));

    } catch(error) {
      should.fail(error, undefined, 'Should have not thrown an error.');
    }
  });

  it('Should not accept invalid urls', async function () {
    try {
      const $ = await this.crawler.request(DUMMY_BAD_URL);
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }

    try {
      const $ = await this.crawler.request();
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }

    try {
      const $ = await this.crawler.request('');
    } catch (error) {
      should.exist(error);
      error.toString().should.be.eq('Error: Invalid url');
    }
  });

  it('Should be able to get all img tags from a document', function () {
    const testHtml = getDummyHtml();

    const imgs = this.crawler.getAllImgs(testHtml);

    should.exist(imgs);
    imgs.length.should.be.gt(0);
    imgs.each(function (index, element) {
      element.should.have.property('name');
      element['name'].should.be.eq('img');
    });
  });

  it('Should be able to get all links from a document', function () {
    const testHtml = getDummyHtml();

    const links = this.crawler.getAllLinks(testHtml);

    should.exist(links);
    links.length.should.be.gt(0);
    links.each(function (index, element) {
      element.should.have.property('name');
      element['name'].should.be.eq('a');
    });

  });
});
