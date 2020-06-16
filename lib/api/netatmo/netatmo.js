/**
 * Import external libraries
 */
const Skills = require('restify-router').Router;
const serviceHelper = require('alfred-helper');

const skill = new Skills();

/**
 * @type get
 * @path /sensors/:roomID
 */
async function sensors(req, res, next) {
  serviceHelper.log(
    'info',
    'Display Netatmo data API called',
  );

  let location = null;
  let SQL;

  const { roomID } = req.params;
  const { durationSpan } = req.query;

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

  let durationTitle;
  let timeBucket;
  let interval;

  try {
    switch (durationSpan) {
      case 'year':
        timeBucket = '6 hours';
        interval = '1 year';
        durationTitle = 'Last year';
        break;
      case 'month':
        timeBucket = '3 hours';
        interval = '1 month';
        durationTitle = 'Last month';
        break;
      case 'week':
        timeBucket = '1 hour';
        interval = '1 week';
        durationTitle = 'Last week';
        break;
      case 'day':
        timeBucket = '30 minutes';
        interval = '1 day';
        durationTitle = 'Last 24 hours';
        break;
      default: // Hour
        timeBucket = '1 minute';
        interval = '1 hour';
        durationTitle = 'Last hour';
        break;
    }

    const sql = `SELECT time_bucket('${timeBucket}', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '${interval}' GROUP BY timeofday ORDER BY timeofday DESC`;

    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('netatmo');
    serviceHelper.log(
      'trace',
      'Get sensor values',
    );
    const results = await dbConnection.query(sql);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      serviceHelper.log(
        'trace',
        'No data to return',
      );
      serviceHelper.sendResponse(
        res,
        200,
        [],
      );
      return;
    }
    serviceHelper.log(
      'trace',
      'Return data back to caller',
    );
    results.rows.reverse();
    serviceHelper.sendResponse(
      res,
      200,
      results.rows,
    );
    next();
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    serviceHelper.sendResponse(
      res,
      500,
      err,
    );
    next();
  }
}
skill.get(
  '/sensors/:roomID',
  sensors,
);

/**
 * @type get
 * @path /sensors/current
 */
async function current(req, res, next) {
  serviceHelper.log(
    'info',
    'Display Netatmo latest readings API called',
  );

  try {
    const sql = "SELECT location, last(battery, time) as battery, last(temperature, time) as temperature, last(humidity, time) as humidity, last(pressure, time) as pressure, last(co2, time) as co2 FROM netatmo WHERE time > NOW() - interval '1 hour' GROUP BY location";
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('netatmo');
    serviceHelper.log(
      'trace',
      'Get sensor values',
    );
    const results = await dbConnection.query(sql);
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount === 0) {
      serviceHelper.log(
        'trace',
        'No data exists in the last hour',
      );
      serviceHelper.sendResponse(
        res,
        200,
        [],
      );
      next();
      return;
    }
    serviceHelper.log(
      'trace',
      'Return data back to caller',
    );

    const returnData = results.rows;
    serviceHelper.sendResponse(
      res,
      200,
      returnData,
    );
    next();
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
    serviceHelper.sendResponse(
      res,
      500,
      err,
    );
    next();
  }
}
skill.get(
  '/sensors/current',
  current,
);

module.exports = skill;
