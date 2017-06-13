# Page Crawler
This is a web crawler which will crawl (duh) over a page to get all assets (JS and Images) used. He will avoid subdomains and any link with any
fragment or query parameter. However, ignoring the query parameter is optional, so it can be toggled to crawl over any link with it.

## Dependecies
This project was developed with Node v8.1.0. And we are using these packages:
 * [Cheerio](https://github.com/cheeriojs/cheerio)
 * [Request](https://www.npmjs.com/package/request)
 * [Request-Promise](https://github.com/request/request-promise)

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

## Testing
Our test suite consists of:
 * [Mocha](https://mochajs.org/)
 * [Chai](http://chaijs.com/)
 * [Mock-Require](https://www.npmjs.com/package/mock-require)

**Mocha** is our test runner and **ChaiJs** is our BDD framework. **Mock-Require** is taking care of mocking outside code when we need to.
To run the tests you have to execute this in your terminal form the root folder:
```
npm test
```

## Considerations
 * No config file was created due to how small was this project. I would end up creating more complexity by creating it;
 * I did this not concurrently because this was what was asked for me to do;
 * The test file is in the same folder as the source file to cimplify things too. I'm used to have a separate folder for testing but, again, to keep things simple I let it be there;
 * I do believe that JavaScript can be better coded using object composition, that is why I did not use Classes.