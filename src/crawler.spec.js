'use strcit';

const Crawler = require('./crawler');
require('chai').should();

describe('Crawler', function () {
  before(function () {
    this.crawler = Crawler();
  });

  it('Should be able to request a website', async function (done) {
    try {
      await this.crawler.request('https://www.avenuecode.com');

      done();
    } catch(error) {
      done(error);
    }
  });
});
