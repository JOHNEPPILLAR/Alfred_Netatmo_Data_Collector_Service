/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;

/**
 * Import helper libraries
 */
const serviceHelper = require('../../lib/helper.js');

const skill = new Skills();

/**
 * @api {get} /displaydysonpurecooldata
 * @apiName displaydysonpurecooldata
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": {
 *       "command": "SELECT",
 *       "rowCount": 2,
 *       "oid": null,
 *       "DurationTitle": "Daily"
 *       "rows": [
 *           {
 *              "time": "2018-10-21T08:50:06.369Z",
 *              "air_quality": 2,
 *              "temperature": 19,
 *              "humidity": 75
 *           },
 *           ...
 *         }
 *     ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 400 Bad Request
 *   {
 *     data: Error message
 *   }
 *
 */
async function displayDysonPureCoolData(req, res, next) {
  serviceHelper.log('trace', 'displayDysonPureCoolData', 'Display Dyson PureCool data API called');

  let durationSpan = null;
  if (typeof req.query !== 'undefined') ({ durationSpan } = req.query);

  let durationTitle;
  let SQL;

  try {
    switch (durationSpan) {
      case 'month':
        SQL = 'SELECT time_bucket(\'6 hours\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 month\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last month';
        break;
      case 'week':
        SQL = 'SELECT time_bucket(\'3 hours\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 week\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last weeks';
        break;
      case 'day':
        SQL = 'SELECT time_bucket(\'30 minutes\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 day\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Today';
        break;
      case 'hour':
        SQL = 'SELECT time_bucket(\'1 minute\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 hour\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last hour';
        break;
      default:
        SQL = 'SELECT time_bucket(\'1 minute\', time) AS timeofday, avg(temperature) as temperature, avg(humidity) as humidity, min(air) as air_quality, avg(nitrogen) as nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 hour\' GROUP BY timeofday ORDER BY timeofday DESC';
        durationTitle = 'Last hour';
        break;
    }

    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'displayDysonPureCoolData', 'No data to return');
      serviceHelper.sendResponse(res, true, 'No data to return');
      return;
    }
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Return data back to caller');
    results.DurationTitle = durationTitle;
    results.rows.reverse();
    serviceHelper.sendResponse(res, true, results);
    next();
  } catch (err) {
    serviceHelper.log('error', 'displayDysonPureCoolData', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/displaydysonpurecooldata', displayDysonPureCoolData);

/**
 * @api {get} /displaydysonpurecool
 * @apiName displaydysonpurecool
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": {
 *       "AirQuality": 2,
 *       "Temperature": 18.4,
 *       "Humidity": 63,
 *       "NitrogenDioxide": 0
 *     }
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 400 Bad Request
 *   {
 *     data: Error message
 *   }
 *
 */
async function dysonPureCoolLatest(req, res, next) {
  serviceHelper.log('trace', 'dysonPureCoolLatest', 'Display Dyson PureCool latest readings API called');
  try {
    const SQL = 'SELECT location, air, temperature, humidity, nitrogen FROM dyson_purecool WHERE time > NOW() - interval \'1 hour\' ORDER BY time LIMIT 1';
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'displayDysonPureCoolData', 'No data exists in the last hour');
      serviceHelper.sendResponse(res, false, 'No results');
      next();
      return;
    }
    serviceHelper.log('trace', 'displayDysonPureCoolData', 'Return data back to caller');

    const returnData = results.rows;
    serviceHelper.sendResponse(res, true, returnData);
    next();
  } catch (err) {
    serviceHelper.log('error', 'dysonPureCoolLatest', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/dysonpurecoollatest', dysonPureCoolLatest);

/**
 * @api {get} /netatmolatest
 * @apiName netatmolatest
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *   "data": [
 *       {
 *           "location": "Kitchen",
 *           "battery": 100,
 *           "temperature": 21,
 *           "humidity": 59,
 *           "pressure": null,
 *           "co2": 1042
 *       },
 *       ...
 *   ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 400 Bad Request
 *   {
 *     data: Error message
 *   }
 *
 */
async function netatmolatest(req, res, next) {
  serviceHelper.log('trace', 'netatmolatest', 'Display Dyson PureCool latest readings API called');
  try {
    const SQL = 'SELECT location, last(battery, time) as battery, last(temperature, time) as temperature, last(humidity, time) as humidity, last(pressure, time) as pressure, last(co2, time) as co2 WHERE time > NOW() - interval \'1 hour\' FROM netatmo GROUP BY location';
    serviceHelper.log('trace', 'netatmolatest', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'netatmolatest', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'netatmolatest', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'netatmolatest', 'No data exists in the last hour');
      serviceHelper.sendResponse(res, false, 'No results');
      next();
      return;
    }
    serviceHelper.log('trace', 'netatmolatest', 'Return data back to caller');

    const returnData = results.rows;
    serviceHelper.sendResponse(res, true, returnData);
    next();
  } catch (err) {
    serviceHelper.log('error', 'netatmolatest', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/netatmolatest', netatmolatest);

/**
 * @api {get} /displaynetatmodata
 * @apiName displaynetatmodata
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": {
 *       "command": "SELECT",
 *       "rowCount": 2,
 *       "oid": null,
 *       "DurationTitle": "Daily"
 *       "rows": [
 *           {
 *              "time": "2018-10-21T08:50:06.369Z",
 *              "air_quality": 2,
 *              "temperature": 19,
 *              "humidity": 75
 *           },
 *           ...
 *         }
 *     ]
 *   }
 *
 * @apiErrorExample {json} Error-Response:
 *   HTTPS/1.1 400 Bad Request
 *   {
 *     data: Error message
 *   }
 *
 */
async function displayNetatmoData(req, res, next) {
  serviceHelper.log('trace', 'displayNetatmoData', 'Display Dyson PureCool data API called');

  let durationSpan = null;
  let roomID = null;
  let location = null;
  let durationTitle;
  let SQL;

  if (typeof req.query !== 'undefined') ({ durationSpan, roomID } = req.query);

  switch (roomID) {
    case '4':
      location = 'Kids room';
      break;
    case '9':
      location = 'Kitchen';
      break;
    default:
      location = 'Kids room';
      break;
  }

  try {
    switch (durationSpan) {
      case 'month':
        SQL = `SELECT time_bucket('6 hours', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 month' GROUP BY timeofday ORDER BY timeofday DESC`;
        durationTitle = 'Last month';
        break;
      case 'week':
        SQL = `SELECT time_bucket('3 hours', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 week' GROUP BY timeofday ORDER BY timeofday DESC`;
        durationTitle = 'Last weeks';
        break;
      case 'day':
        SQL = `SELECT time_bucket('30 minutes', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 day' GROUP BY timeofday ORDER BY timeofday DESC`;
        durationTitle = 'Today';
        break;
      case 'hour':
        SQL = `SELECT time_bucket('1 minute', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 hour' GROUP BY timeofday ORDER BY timeofday DESC`;
        durationTitle = 'Last hour';
        break;
      default:
        SQL = `SELECT time_bucket('1 minute', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 hour' GROUP BY timeofday ORDER BY timeofday DESC`;
        durationTitle = 'Last hour';
        break;
    }

    serviceHelper.log('trace', 'displayNetatmoData', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'displayNetatmoData', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log('trace', 'displayNetatmoData', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'displayNetatmoData', 'No data to return');
      serviceHelper.sendResponse(res, true, 'No data to return');
      return;
    }
    serviceHelper.log('trace', 'displayNetatmoData', 'Return data back to caller');
    results.DurationTitle = durationTitle;
    results.rows.reverse();
    serviceHelper.sendResponse(res, true, results);
    next();
  } catch (err) {
    serviceHelper.log('error', 'displayNetatmoData', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/displaynetatmodata', displayNetatmoData);

module.exports = skill;
