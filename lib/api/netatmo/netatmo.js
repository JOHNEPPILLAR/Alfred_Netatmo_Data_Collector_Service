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
    'trace',
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

  try {
    switch (durationSpan) {
      case 'month':
        SQL = `SELECT time_bucket('6 hours', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 month' GROUP BY timeofday ORDER BY timeofday DESC`;
        break;
      case 'week':
        SQL = `SELECT time_bucket('3 hours', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 week' GROUP BY timeofday ORDER BY timeofday DESC`;
        break;
      case 'day':
        SQL = `SELECT time_bucket('30 minutes', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 day' GROUP BY timeofday ORDER BY timeofday DESC`;
        break;
      case 'hour':
        SQL = `SELECT time_bucket('1 minute', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 hour' GROUP BY timeofday ORDER BY timeofday DESC`;
        break;
      default:
        SQL = `SELECT time_bucket('1 minute', time) AS timeofday, avg(battery) as battery, avg(temperature) as temperature, avg(humidity) as humidity, avg(co2) as co2 FROM netatmo WHERE location = '${location}' AND time > NOW() - interval '1 hour' GROUP BY timeofday ORDER BY timeofday DESC`;
        break;
    }

    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('netatmo');
    serviceHelper.log(
      'trace',
      'Get sensor values',
    );
    const results = await dbConnection.query(SQL);
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
    'trace',
    'Display Netatmo latest readings API called',
  );

  try {
    const SQL = "SELECT location, last(battery, time) as battery, last(temperature, time) as temperature, last(humidity, time) as humidity, last(pressure, time) as pressure, last(co2, time) as co2 FROM netatmo WHERE time > NOW() - interval '1 hour' GROUP BY location";
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('netatmo');
    serviceHelper.log(
      'trace',
      'Get sensor values',
    );
    const results = await dbConnection.query(SQL);
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