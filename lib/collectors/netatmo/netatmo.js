/**
 * Import external libraries
 */
const Netatmo = require('netatmo');

const poolingInterval = 15 * 60 * 1000; // 15 minutes

/**
 * Save data to data store
 */
async function saveDeviceData(device) {
  let dbConnection;

  this.logger.trace(
    `${this._traceStack()} - Saving data: ${device.name} (${device.device})`,
  );

  try {
    dbConnection = await this._connectToDB();
    this.logger.trace(`${this._traceStack()} - Insert data`);
    const results = await dbConnection
      .db(this.namespace)
      .collection(this.namespace)
      .insertOne(device);

    // Send data back to caler
    if (results.insertedCount === 1)
      this.logger.info(`Saved data: ${device.name} (${device.device})`);
    else
      this.logger.error(
        `${this._traceStack()} - Failed to save data: ${device.name} (${
          device.device
        })`,
      );
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  } finally {
    this.logger.trace(`${this._traceStack()} - Close DB connection`);
    await dbConnection.close();
  }
}

/**
 * Process device data
 */
async function processData(apiData) {
  let dataValues;

  // Kids room
  try {
    this.logger.trace(`${this._traceStack()} - Filter for Kids room data`);
    const kidsData = apiData.filter((a) => a.station_name === 'Home');

    if (kidsData.length > 0 && kidsData[0].dashboard_data) {
      dataValues = {
        time: new Date(),
        device: kidsData[0]._id,
        location: kidsData[0].module_name,
        battery: 100,
        temperature: kidsData[0].dashboard_data.Temperature || 0,
        humidity: kidsData[0].dashboard_data.Humidity || 0,
        preasure: kidsData[0].dashboard_data.Pressure || 0,
        co2: kidsData[0].dashboard_data.CO2 || 0,
      };

      this.logger.trace(`${this._traceStack()} - Saving kids room data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Kids room sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Kitchen
  try {
    this.logger.trace(`${this._traceStack()} - Filter for kitchen data`);

    let kitchenData = apiData.filter((a) => a.station_name === 'Home');
    kitchenData = kitchenData[0].modules.filter(
      (a) => a.module_name === 'Kitchen',
    );

    if (kitchenData.length > 0 && kitchenData[0].dashboard_data) {
      dataValues = {
        time: new Date(),
        device: kitchenData[0]._id,
        location: kitchenData[0].module_name,
        battery: kitchenData[0].battery_percent || 0,
        temperature: kitchenData[0].dashboard_data.Temperature || 0,
        humidity: kitchenData[0].dashboard_data.Humidity || 0,
        preasure: kitchenData[0].dashboard_data.Pressure || 0,
        co2: kitchenData[0].dashboard_data.CO2 || 0,
      };

      this.logger.trace(`${this._traceStack()} - Saving kitchen data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Kitchen sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Garden
  try {
    this.logger.trace(`${this._traceStack()} - Filter for garden data`);

    let gardenData = apiData.filter((a) => a.station_name === 'Home');
    gardenData = gardenData[0].modules.filter(
      (a) => a.module_name === 'Garden',
    );

    if (gardenData.length > 0 && gardenData[0].dashboard_data) {
      dataValues = {
        time: new Date(),
        device: gardenData[0]._id,
        location: gardenData[0].module_name,
        battery: gardenData[0].battery_percent || 0,
        temperature: gardenData[0].dashboard_data.Temperature || 0,
        humidity: gardenData[0].dashboard_data.Humidity || 0,
      };

      this.logger.trace(`${this._traceStack()} - Saving garden data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Garden sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }

  // Living room
  try {
    this.logger.trace(`${this._traceStack()} - Filter for Living room data`);

    const livingRoomData = apiData.filter(
      (a) => a.station_name === 'Living room',
    );

    if (livingRoomData.length > 0 && livingRoomData[0].dashboard_data) {
      dataValues = {
        time: new Date(),
        device: livingRoomData[0]._id,
        location: livingRoomData[0].station_name,
        battery: 100,
        temperature: livingRoomData[0].dashboard_data.Temperature || 0,
        humidity: livingRoomData[0].dashboard_data.Humidity || 0,
        preasure: livingRoomData[0].dashboard_data.Pressure || 0,
        co2: livingRoomData[0].dashboard_data.CO2 || 0,
      };

      this.logger.trace(`${this._traceStack()} - Saving living room data`);
      await saveDeviceData.call(this, dataValues);
    } else {
      this.logger.error(`${this._traceStack()} - Living room sensor off line`);
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

/**
 * Get device data
 */
function getData(auth) {
  let api = new Netatmo(auth); // Connect to api service
  api.getStationsData(async (err, apiData) => {
    if (err) {
      this.logger.error(`${this._traceStack()} - ${err.message}`);
      return;
    }
    this.logger.trace(`${this._traceStack()} - Got data, now process it`);
    await processData.call(this, apiData); // Process the device data
  });
  api = null;
}

/**
 * Process devices
 */
async function _getNetatmoDevices() {
  try {
    const NetatmoClientKey = await this._getVaultSecret('NetatmoClientKey');
    const NetatmoClientSecret = await this._getVaultSecret(
      'NetatmoClientSecret',
    );
    const NetatmoUserName = await this._getVaultSecret('NetatmoUserName');
    const NetatmoPassword = await this._getVaultSecret('NetatmoPassword');
    const auth = {
      client_id: NetatmoClientKey,
      client_secret: NetatmoClientSecret,
      username: NetatmoUserName,
      password: NetatmoPassword,
    };

    await getData.call(this, auth);

    // Setup intival
    setInterval(async () => {
      await getData.call(this, auth);
    }, poolingInterval);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

module.exports = {
  _getNetatmoDevices,
};
