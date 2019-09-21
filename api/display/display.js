/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred_helper');

const skill = new Skills();

/**
 * @api {get} /current
 * @apiName current
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
async function current(req, res, next) {
  serviceHelper.log('trace', 'Display Netatmo latest readings API called');
  try {
    const SQL =
      "SELECT location, last(battery, time) as battery, last(temperature, time) as temperature, last(humidity, time) as humidity, last(pressure, time) as pressure, last(co2, time) as co2 FROM netatmo WHERE time > NOW() - interval '1 hour' GROUP BY location";
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'No data exists in the last hour');
      serviceHelper.sendResponse(res, false, 'No results');
      next();
      return;
    }
    serviceHelper.log('trace', 'Return data back to caller');

    const returnData = results.rows;
    serviceHelper.sendResponse(res, true, returnData);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/current', current);

/**
 * @api {get} /all
 * @apiName all
 * @apiGroup Display
 *
 * @apiSuccessExample {json} Success-Response:
 *   HTTPS/1.1 200 OK
 *   {
 *     "data": [
 *           {
 *              "time": "2018-10-21T08:50:06.369Z",
 *              "air_quality": 2,
 *              "temperature": 19,
 *              "humidity": 75
 *           },
 *           ...
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
async function all(req, res, next) {
  serviceHelper.log('trace', 'Display Netatmo data API called');

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
    case '8':
      location = 'Living room';
      break;
    case '9':
      location = 'Kitchen';
      break;
    case 'G':
      location = 'Garden';
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

    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await global.devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Get sensor values');
    const results = await dbClient.query(SQL);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount === 0) {
      serviceHelper.log('trace', 'No data to return');
      serviceHelper.sendResponse(res, true, 'No data to return');
      return;
    }
    serviceHelper.log('trace', 'Return data back to caller');
    results.DurationTitle = durationTitle;
    results.rows.reverse();
    serviceHelper.sendResponse(res, true, results.rows);
    next();
  } catch (err) {
    serviceHelper.log('error', err.message);
    serviceHelper.sendResponse(res, false, err);
    next();
  }
}
skill.get('/all', all);

module.exports = skill;
