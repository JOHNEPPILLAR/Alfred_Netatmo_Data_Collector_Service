/**
 * Import external libraries
 */
const Netatmo = require('netatmo');

/**
 * Save data to data store
 */
async function saveDeviceData(sqlValues) {
  try {
    const sql =
      'INSERT INTO netatmo("time", sender, address, location, battery, temperature, humidity, pressure, co2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    const dbConnection = await this._connectToDB('netatmo');
    this.logger.debug(`${this._traceStack()} - Save sensor values`);
    const results = await dbConnection.query(sql, sqlValues);
    this.logger.debug(
      `${this._traceStack()} - Release the data store connection back to the pool`,
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount !== 1) {
      this.logger.error(
        `${this._traceStack()} - Failed to insert data for device ${
          sqlValues[2]
        }`,
      );
      return;
    }
    this.logger.info(`Saved data for device ${sqlValues[3]}`);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

/**
 * Process device data
 */
async function processData(apiData) {
  let dataValues;

  // Kids room
  try {
    this.logger.debug(`${this._traceStack()} - Filter for Kids room data`);
    const kidsData = apiData.filter((a) => a.station_name === 'Home');

    if (kidsData.length > 0 && kidsData[0].dashboard_data) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        kidsData[0]._id,
        kidsData[0].module_name,
        100,
        kidsData[0].dashboard_data.Temperature || 0,
        kidsData[0].dashboard_data.Humidity || 0,
        kidsData[0].dashboard_data.Pressure || 0,
        kidsData[0].dashboard_data.CO2 || 0,
      ];
      this.logger.debug(`${this._traceStack()} - Saving kids room data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Kids room sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Kitchen
  try {
    this.logger.debug(`${this._traceStack()} - Filter for kitchen data`);

    let kitchenData = apiData.filter((a) => a.station_name === 'Home');
    kitchenData = kitchenData[0].modules.filter(
      (a) => a.module_name === 'Kitchen',
    );

    if (kitchenData.length > 0 && kitchenData[0].dashboard_data) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        kitchenData[0]._id,
        kitchenData[0].module_name,
        kitchenData[0].battery_percent || 0,
        kitchenData[0].dashboard_data.Temperature || 0,
        kitchenData[0].dashboard_data.Humidity || 0,
        kitchenData[0].dashboard_data.Pressure || 0,
        kitchenData[0].dashboard_data.CO2 || 0,
      ];

      this.logger.debug(`${this._traceStack()} - Saving kitchen data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Kitchen sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Garden
  try {
    this.logger.debug(`${this._traceStack()} - Filter for garden data`);

    let gardenData = apiData.filter((a) => a.station_name === 'Home');
    gardenData = gardenData[0].modules.filter(
      (a) => a.module_name === 'Garden',
    );

    if (gardenData.length > 0 && gardenData[0].dashboard_data) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        gardenData[0]._id,
        gardenData[0].module_name,
        gardenData[0].battery_percent || 0,
        gardenData[0].dashboard_data.Temperature || 0,
        gardenData[0].dashboard_data.Humidity || 0,
        null,
        null,
      ];
      this.logger.debug(`${this._traceStack()} - Saving garden data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Garden sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Living room
  try {
    this.logger.debug(`${this._traceStack()} - Filter for Living room data`);

    const livingRoomData = apiData.filter(
      (a) => a.station_name === 'Living room',
    );

    if (livingRoomData.length > 0 && livingRoomData[0].dashboard_data) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        // eslint-disable-next-line no-underscore-dangle
        livingRoomData[0]._id,
        livingRoomData[0].station_name,
        100,
        livingRoomData[0].dashboard_data.Temperature || 0,
        livingRoomData[0].dashboard_data.Humidity || 0,
        livingRoomData[0].dashboard_data.Pressure || 0,
        livingRoomData[0].dashboard_data.CO2 || 0,
      ];
      this.logger.debug(`${this._traceStack()} - Saving living room data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Living room sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

async function _getNetatmoData() {
  try {
    const NetatmoClientKey = await this._getVaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoClientKey',
    );
    const NetatmoClientSecret = await this._getVaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoClientSecret',
    );
    const NetatmoUserName = await this._getVaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoUserName',
    );
    const NetatmoPassword = await this._getVaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoPassword',
    );
    const auth = {
      client_id: NetatmoClientKey,
      client_secret: NetatmoClientSecret,
      username: NetatmoUserName,
      password: NetatmoPassword,
    };
    const api = new Netatmo(auth); // Connect to api service
    api.getStationsData((err, apiData) => {
      if (err) {
        this.logger.error(`${this._traceStack()} - ${err.message}`);
        return;
      }
      this.logger.debug(`${this._traceStack()} - Got data, now processing it`);
      processData.call(this, apiData); // Process the device data
    });

    const poolingInterval = 5 * 60 * 1000; // 5 minutes
    setTimeout(() => {
      _getNetatmoData.call(this);
    }, poolingInterval); // Wait then run function again
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

module.exports = {
  _getNetatmoData,
};
