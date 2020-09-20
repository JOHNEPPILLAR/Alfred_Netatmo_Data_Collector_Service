/**
 * Import external libraries
 */
const moment = require('moment');

/**
 * @type get
 * @path /sensor/:roomID
 */
async function _sensors(req, res, next) {
  this.logger.debug(`${this._traceStack()} - Display Netatmo data API called`);

  let dbConnection;
  let aggregate;
  let timeBucket;
  let location = null;

  const { roomID, duration } = req.params;

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

  try {
    switch (duration) {
      case 'year':
        timeBucket = moment().utc().subtract(1, 'year').toDate();
        aggregate = [
          {
            $addFields: {
              Year: { $year: '$time' },
              lower_name: { $toLower: '$name' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_name: location } },
          {
            $group: {
              _id: '$Year',
              device: { $last: '$device' },
              name: { $last: '$name' },
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
              Month: { $month: '$time' },
              lower_name: { $toLower: '$name' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_name: location } },
          {
            $group: {
              _id: '$Month',
              device: { $last: '$device' },
              name: { $last: '$name' },
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
              lower_name: { $toLower: '$name' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_name: location } },
          {
            $group: {
              _id: '$Day',
              device: { $last: '$device' },
              name: { $last: '$name' },
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
              Hour: { $hour: '$time' },
              lower_name: { $toLower: '$name' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_name: location } },
          {
            $group: {
              _id: '$Hour',
              device: { $last: '$device' },
              name: { $last: '$name' },
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
      default:
        // Hour
        timeBucket = moment().utc().subtract(1, 'hour').toDate();
        aggregate = [
          {
            $addFields: {
              Minute: { $minute: '$time' },
              lower_name: { $toLower: '$name' },
            },
          },
          { $match: { time: { $gt: timeBucket }, lower_name: location } },
          {
            $group: {
              _id: '$Minute',
              device: { $last: '$device' },
              name: { $last: '$name' },
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
    }

    this.logger.trace(`${this._traceStack()} - Connect to db`);
    dbConnection = await this._connectToDB();
    this.logger.trace(`${this._traceStack()} - Execute query`);
    const results = await dbConnection
      .db(this.namespace)
      .collection(this.namespace)
      .aggregate(aggregate)
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      this.logger.info('No data exists in the last hour');
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
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
  return true;
}

/**
 * @type get
 * @path /sensors/current
 */
async function _current(req, res, next) {
  this.logger.debug(
    `${this._traceStack()} - Display Netatmo latest readings API called`,
  );

  let dbConnection;

  try {
    this.logger.trace(`${this._traceStack()} - Connect to db`);
    dbConnection = await this._connectToDB();
    this.logger.trace(`${this._traceStack()} - Execute query`);
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
            name: { $last: '$name' },
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
      this.logger.info('No data exists in the last hour');
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
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
  return true;
}

module.exports = {
  _sensors,
  _current,
};
