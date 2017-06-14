# Page Crawler
This is a web crawler which will crawl (duh) over a page to get all assets (JS and Images) used. He will avoid subdomains and any link with any
fragment or query parameter. However, ignoring the query parameter is optional, so it can be toggled to crawl over any link with it.

## Dependecies
This project was developed with Node v8.1.0. And we are using these packages:
 * [Cheerio](https://github.com/cheeriojs/cheerio)
 * [Request](https://www.npmjs.com/package/request)
 * [lodash](https://lodash.com/)

## Installing
 First thing to do is to clone this repo into your machine. After that run in your terminal from the root folder:
 ```
 npm install
 ```

## Running
In the root folder run this in your terminal:
```
npm start -- url=http://www.yourUrl.com
```
the **url** parameter is the crawling starting point to our application. Tehre is an optional parameter that you can set, which is **query**, this parameter
decides if the application will crawl over links with query parameters or not.
```
npm start -- url=http://www.yourUrl.com --query=true
```

## Testing
**DISCLAIMER** Tests are not working because I did not have time to do it yet. Since this was just a refactoring I did not use TDD on this.
Our test suite consists of:
 * [Mocha](https://mochajs.org/)
 * [Chai](http://chaijs.com/)
 * [Mock-Require](https://www.npmjs.com/package/mock-require)
 * [NYC](https://github.com/istanbuljs/nyc)

**Mocha** is our test runner and **ChaiJs** is our BDD framework. **Mock-Require** is taking care of mocking outside code when we need to.
To run the tests you have to execute this in your terminal form the root folder:
```
npm test
```
### Coverage
You can run the code coverage excuting this command in your terminal from the root folder:
```
npm run coverage
```
It will create two new folders: **.nyc_output** and **coverage**. The human readable one is inside **coverage** folder. You can open the 
*index.html* with your favorite browser.

### TDD
For those who are interested in developing, there is a **tdd** task to help you to develop with your tests running. You can execute this from your root folder:
```
npm run tdd
```

 ## Considerations
 * No config file was created due to how small was this project. I would end up creating more complexity by creating it;
 * This version was coded just for fun;
 * Test files are in its own folder to better integrate with nyc;
 * I do believe that JavaScript can be better coded using object composition, that is why I did not use Classes;
 * No task automator was added because *NPM* took care of everything. No need of complex task handling;
 * We are not crawling over URLs with query parameters because this is usally a page listing data. This would generate a bunch of equals assets with little differences. However, feel free to toggle it on.