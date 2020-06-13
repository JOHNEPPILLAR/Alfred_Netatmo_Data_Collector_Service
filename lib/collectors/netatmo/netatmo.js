/**
 * Import external libraries
 */
const Netatmo = require('netatmo');

/**
 * Import helper libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Save data to data store
 */
async function saveDeviceData(sqlValues) {
  try {
    const sql = 'INSERT INTO netatmo("time", sender, address, location, battery, temperature, humidity, pressure, co2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    serviceHelper.log(
      'trace',
      'Connect to data store connection pool',
    );
    const dbConnection = await serviceHelper.connectToDB('netatmo');
    serviceHelper.log(
      'trace',
      'Save sensor values',
    );
    const results = await dbConnection.query(
      sql,
      sqlValues,
    );
    serviceHelper.log(
      'trace',
      'Release the data store connection back to the pool',
    );
    await dbConnection.end(); // Close data store connection
    if (results.rowCount !== 1) {
      serviceHelper.log(
        'error',
        `Failed to insert data for device: ${sqlValues[3]}`,
      );
      return;
    }
    serviceHelper.log(
      'trace',
      `Saved data for device: ${sqlValues[3]}`,
    );
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }
}

/**
 * Process device data
 */
async function processData(apiData) {
  let dataValues;

  // Kids room
  try {
    serviceHelper.log(
      'trace',
      'Filter for Kids room data',
    );

    KidsData = apiData.filter(
      (a) => a.station_name === "Home",
    );

    if (KidsData.length  > 0) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        // eslint-disable-next-line no-underscore-dangle
        KidsData[0]._id,
        KidsData[0].module_name,
        100,
        KidsData[0].dashboard_data.Temperature,
        KidsData[0].dashboard_data.Humidity,
        KidsData[0].dashboard_data.Pressure,
        KidsData[0].dashboard_data.CO2,
      ];
      serviceHelper.log(
        'trace',
        'Saving kids room data',
      );
      await saveDeviceData(dataValues);
      serviceHelper.log(
        'info',
        'Saved kids room data',
      );
    } else {
      serviceHelper.log(
        'error',
        'Kids room sensor off line',
      );
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }

  // Kitchen
  try {
    serviceHelper.log(
      'trace',
      'Filter for kitchen data',
    );

    KitchenData = apiData.filter(
      (a) => a.station_name === "Home",
    );
    KitchenData = KitchenData[0].modules.filter(
      (a) => a.module_name === "Kitchen",
    );

    if (KitchenData.length  > 0) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        // eslint-disable-next-line no-underscore-dangle
        KitchenData[0]._id,
        KitchenData[0].module_name,
        KitchenData[0].battery_percent,
        KitchenData[0].dashboard_data.Temperature,
        KitchenData[0].dashboard_data.Humidity,
        KitchenData[0].dashboard_data.Pressure,
        KitchenData[0].dashboard_data.CO2,
      ];
      serviceHelper.log(
        'trace',
        'Saving kitchen room data',
      );
      await saveDeviceData(dataValues);
      serviceHelper.log(
        'info',
        'Saved kitchen room data',
      );
    } else {
      serviceHelper.log(
        'error',
        'Kitchen sensor off line',
      );
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }


  // Garden
  try {
    serviceHelper.log(
      'trace',
      'Filter for garden data',
    );

    GardenData = apiData.filter(
      (a) => a.station_name === "Home",
    );
    GardenData = GardenData[0].modules.filter(
      (a) => a.module_name === "Garden",
    );

    if (GardenData.length  > 0) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        // eslint-disable-next-line no-underscore-dangle
        GardenData[0]._id,
        GardenData[0].module_name,
        GardenData[0].battery_percent,
        GardenData[0].dashboard_data.Temperature,
        GardenData[0].dashboard_data.Humidity,
        null,
        null,
      ];
      serviceHelper.log(
        'trace',
        'Saving garden data',
      );
      await saveDeviceData(dataValues);
      serviceHelper.log(
        'info',
        'Saved garden data',
      );
    } else {
      serviceHelper.log(
        'error',
        'Garden sensor off line',
      );
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }

  // Living room
  try {
    serviceHelper.log(
      'trace',
      'Filter for living room data',
    );

    const livingRoomData = apiData.filter(
      (a) => a.station_name === "Living room",
    );

    if (livingRoomData.length  > 0) {
      dataValues = [
        new Date(),
        process.env.ENVIRONMENT,
        // eslint-disable-next-line no-underscore-dangle
        livingRoomData[0]._id,
        livingRoomData[0].station_name,
        100,
        livingRoomData[0].dashboard_data.Temperature,
        livingRoomData[0].dashboard_data.Humidity,
        livingRoomData[0].dashboard_data.Pressure,
        livingRoomData[0].dashboard_data.CO2,
      ];
      serviceHelper.log(
        'trace',
        'Saving living room data',
      );
      await saveDeviceData(dataValues);
      serviceHelper.log(
        'info',
        'Saved living room data',
      );
    } else {
      serviceHelper.log(
        'error',
        'Living room sensor off line',
      );
    }
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }
}

exports.getNatemoData = async function getNatemoData() {
  try {
    const NetatmoClientKey = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoClientKey',
    );
    const NetatmoClientSecret = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoClientSecret',
    );
    const NetatmoUserName = await serviceHelper.vaultSecret(
      process.env.ENVIRONMENT,
      'NetatmoUserName',
    );
    const NetatmoPassword = await serviceHelper.vaultSecret(
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
      // Get data from device
      if (err) {
        serviceHelper.log(
          'error',
          err.message,
        );
        return;
      }
      serviceHelper.log(
        'trace',
        'Got data, now processing it',
      );
      processData(apiData); // Process the device data
    });
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }
};
