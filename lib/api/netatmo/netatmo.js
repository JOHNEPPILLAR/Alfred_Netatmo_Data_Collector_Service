/**
 * Import external libraries
 */
const moment = require('moment');
const debug = require('debug')('Netatmo:API_Device');

/**
 * @type get
 * @path /sensor/:roomID
 */
async function _sensors(req, res, next) {
  debug(`Display sensor data API called`);

  let dbConnection;
  let aggregate;
  let timeBucket;
  let location = null;

  const { roomID } = req.params;
  let { duration } = req.params;
  if (typeof duration === 'undefined' || duration === null || duration === '')
    duration = 'hour';

  switch (roomID) {
    case '4':
      location = 'kids room';
      break;
    case '8':
      location = 'living room';
      break;
    case '9':
      location = 'kitchen';
      break;
    case 'G':
      location = 'garden';
      break;
    default:
      location = 'kids room';
      break;
  }
  debug(`Location: ${location}`);

  try {
    switch (duration) {
      case 'year':
        timeBucket = moment().utc().subtract(1, 'year').toDate();
        aggregate = [
          {
            $addFields: {
              Month: { $month: '$time' },
              lower_location: { $toLower: '$location' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_location: location } },
          {
            $group: {
              _id: '$Month',
              device: { $last: '$device' },
              location: { $last: '$location' },
              battery: { $avg: '$battery' },
              temperature: { $avg: '$temperature' },
              humidity: { $avg: '$humidity' },
              preasure: { $avg: '$preasure' },
              co2: { $avg: '$nitrogenDioxideDensity' },
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      case 'month':
        timeBucket = moment().utc().subtract(1, 'month').toDate();
        aggregate = [
          {
            $addFields: {
              Day: { $dayOfMonth: '$time' },
              lower_location: { $toLower: '$location' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_location: location } },
          {
            $group: {
              _id: '$Day',
              device: { $last: '$device' },
              location: { $last: '$location' },
              battery: { $avg: '$battery' },
              temperature: { $avg: '$temperature' },
              humidity: { $avg: '$humidity' },
              preasure: { $avg: '$preasure' },
              co2: { $avg: '$nitrogenDioxideDensity' },
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      case 'week':
        timeBucket = moment().utc().subtract(1, 'week').toDate();
        aggregate = [
          {
            $addFields: {
              Day: { $dayOfMonth: '$time' },
              Hour: { $hour: '$time' },
              lower_location: { $toLower: '$location' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_location: location } },
          {
            $group: {
              _id: { Day: '$Day', Hour: '$Hour' },
              device: { $last: '$device' },
              location: { $last: '$location' },
              battery: { $avg: '$battery' },
              temperature: { $avg: '$temperature' },
              humidity: { $avg: '$humidity' },
              preasure: { $avg: '$preasure' },
              co2: { $avg: '$nitrogenDioxideDensity' },
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      case 'day':
        timeBucket = moment().utc().subtract(1, 'day').toDate();
        aggregate = [
          {
            $addFields: {
              lower_location: { $toLower: '$location' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_location: location } },
          { $sort: { _id: 1 } },
        ];
        break;
      default:
        // Hour
        timeBucket = moment().utc().subtract(1, 'hour').toDate();
        aggregate = [
          {
            $addFields: {
              lower_location: { $toLower: '$location' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_location: location } },
          { $sort: { _id: 1 } },
        ];
        break;
    }

    debug(`Connect to db`);
    dbConnection = await this._connectToDB();
    debug(`Query DB`);
    const results = await dbConnection
      .db(this.namespace)
      .collection(this.namespace)
      .aggregate(aggregate)
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 200, []);
      } else {
        return [];
      }
    }

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    } else {
      return results;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
  return true;
}

/**
 * @type get
 * @path /sensors/current
 */
async function _current(req, res, next) {
  debug(`Display latest readings API called`);

  let dbConnection;

  try {
    debug(`Connect to db`);
    dbConnection = await this._connectToDB();
    debug(`Query DB`);
    const lastHour = moment().utc().subtract(1, 'hour').toDate();
    const results = await dbConnection
      .db(this.namespace)
      .collection(this.namespace)
      .aggregate([
        { $match: { time: { $gt: lastHour } } },
        {
          $group: {
            _id: '$device',
            time: { $last: '$time' },
            device: { $last: '$device' },
            location: { $last: '$location' },
            battery: { $last: '$battery' },
            temperature: { $last: '$temperature' },
            humidity: { $last: '$humidity' },
            preasure: { $last: '$preasure' },
            co2: { $last: '$nitrogenDioxideDensity' },
          },
        },
      ])
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 200, []);
      } else {
        return [];
      }
    }

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    } else {
      return results;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
  return true;
}

module.exports = {
  _sensors,
  _current,
};
