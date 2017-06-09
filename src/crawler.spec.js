'use strcit';

const Crawler = require('./crawler');
const should  = require('chai').should();
const Cheerio = require('cheerio');

const DUMMY_URL = 'https://www.avenuecode.com';

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
      should.fail(error, undefined, 'Should not throw an error');
    }
  });
});
