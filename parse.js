const args = require("node-args-parser")(process.argv)
let number = args.number;
if (number === 'undefined') process.exit();
console.log("\007");
let posix = require('posix');
posix.setrlimit('nofile', {soft: 10000});  // multiple connections require a lot of open session files

let RateLimiter = require('request-rate-limiter');
let limiter = new RateLimiter({
    rate: 200              // requests per interval,
    // defaults to 60
    , interval: 30          // interval for the rate, x
                            // requests per interval,
                            // defaults to 60
    , backoffCode: 429      // back off when this status is
                            // returned, defaults to 429
    , backoffTime: 20       // back off for n seconds,
                            // defauts to rate/5
    , maxWaitingTime: 3000   // return errors for requests
    // that will have to wait for
    // n seconds or more. defaults
    // to 5 minutes
});
let fs = require('fs'),
    JSONStream = require('JSONStream'),  // we will use Streams beacuse of large files
    es = require('event-stream');
let request = require('request');
let getStream = function () {
    let jsonData = 'all' + number + '.json',
        stream = fs.createReadStream(jsonData, {encoding: 'utf8'}),
        parser = JSONStream.parse('*');
    return stream.pipe(parser);
};
let csvWriter = require('csv-write-stream')   // we will write to Stream also
let writer = csvWriter(
    {
        separator: '\t',
        newline: '\n',
        headers: undefined,
        sendHeaders: false
    }
);
writer.pipe(fs.createWriteStream('all' + number + '.csv'));

getStream()
    .pipe(es.mapSync(function (data) {
            // console.log(data);
            for (let i in data) {
                (i => {   // create anonymoues function to collect data from file and corresponding request (

                    let firmaUrl = 'https://dom.gosuslugi.ru/ppa/api/rest/services/ppa/public/organizations/orgByGuid?organizationGuid=' + data[i].guid;
                    limiter.request(function (err, backoff) {   // use request Rate limiter, beacuse nodejs tries to open all requests at once, and the last ones - fail due to timeout.
                        if (err) {
                            console.log('the err object is set if the limiter is overflowing or is not able to execute your request in time');
                        }
                        else {
                            request(
                                {
                                    json: true,
                                    url: firmaUrl,
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'user-agent': 'node.js',
                                    }
                                }, function (error, response, body) {
                                    // Do more stuff with 'body' here
                                    console.log(i);
                                    if (err) {
                                        console.log(error);
                                    }
                                    else if (response.statusCode === 429) {
                                        // we have to back off. this callback will be called again as soon as the remote enpoint
                                        // should accept requests again. no need to queue your callback another time on the limiter.
                                        backoff();
                                    }
                                    else {
                                        if ((body !== null) && (typeof(body) !== 'undefined')) {
                                            if (data[i].factualAddress.city !== null) factualAdress = data[i].factualAddress.city.offName; else factualAdress = '';
                                            if (body.postalAddress.city !== null) cityPostal = body.postalAddress.city.offName; else  cityPostal = '';
                                            if (data[i].factualAddress.region !== null) factualRegion = data[i].factualAddress.region.offName; else factualRegion = '';
                                            if (body.postalAddress.region !== null) oblastPostal = body.postalAddress.region.offName; else oblastPostal = '';
                                            let org = {
                                                'fullName': data[i].fullName,
                                                'shortName': data[i].shortName,
                                                'phone': data[i].phone,
                                                'inn': data[i].inn,
                                                'url': data[i].url,
                                                'orgAddress': data[i].orgAddress, /// юр
                                                'physicalAdress': data[i].factualAddress.formattedAddress, /// юр
                                                'oblastFact': factualRegion,
                                                'cityFact': factualAdress,
                                                'postalAdress': body.postalAddress.formattedAddress, /// юр
                                                'oblastPostal': oblastPostal,
                                                'cityPostal': cityPostal,
                                                'guid': data[i].guid,
                                                'firstName': body.chiefFirstName,
                                                'lastName': body.chiefLastName,
                                                'middleName': body.chiefMiddleName,
                                                'email': body.orgEmail,
                                            };
                                            writer.write(org);
                                        }
                                        else {
                                            console.log('body undefined in', i);
                                            console.log(response);
                                            console.log(error);
                                            console.log(body);
                                        }
                                    }

                                });
                        }
                    });
                })(i, data);
            }
        }
    ));
