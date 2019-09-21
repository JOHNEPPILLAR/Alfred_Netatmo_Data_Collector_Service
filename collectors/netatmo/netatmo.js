/**
 * Import external libraries
 */
const Netatmo = require('netatmo');
const { Pool } = require('pg');
const serviceHelper = require('alfred_helper');

const devicesDataClient = new Pool({
  host: process.env.DataStore,
  database: 'devices',
  user: process.env.DataStoreUser,
  password: process.env.DataStoreUserPassword,
  port: 5432,
});

const auth = {
  client_id: process.env.NetatmoClientKey,
  client_secret: process.env.NetatmoClientSecret,
  username: process.env.NetatmpUserName,
  password: process.env.NetatmoPassword,
};

/**
 * Tidy up when exit or crytical error raised
 */
async function cleanExit() {
  serviceHelper.log('trace', 'Closing the data store pools');
  try {
    await devicesDataClient.end();
  } catch (err) {
    serviceHelper.log('trace', 'Failed to close the data store connection');
  }
  serviceHelper.log('trace', 'Finished collecting Netatmo data');
}
process.on('exit', () => {
  cleanExit();
});
process.on('SIGINT', () => {
  cleanExit();
});
process.on('SIGTERM', () => {
  cleanExit();
});
process.on('uncaughtException', (err) => {
  if (err) serviceHelper.log('error', err.message); // log the error
  cleanExit();
});

/**
 * Data store error events
 */
devicesDataClient.on('error', (err) => {
  serviceHelper.log('error', 'Devices data store: Unexpected error on idle client');
  serviceHelper.log('error', err.message);
  cleanExit();
});

/**
 * Save data to data store
 */
async function saveDeviceData(SQLValues) {
  try {
    const SQL = 'INSERT INTO netatmo("time", sender, address, location, battery, temperature, humidity, pressure, co2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbClient = await devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Save sensor values');
    const results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount !== 1) {
      serviceHelper.log('error', `Failed to insert data for device: ${SQLValues[3]}`);
      return;
    }
    serviceHelper.log('trace', `Saved data for device: ${SQLValues[3]}`);
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
}

/**
 * Process device data
 */
async function processData(apiData) {
  let dataValues;

  // Kids room
  try {
    if (typeof apiData[0].dashboard_data !== 'undefined') {
      dataValues = [
        new Date(),
        process.env.Environment,
        // eslint-disable-next-line no-underscore-dangle
        apiData[0]._id,
        apiData[0].module_name,
        100,
        apiData[0].dashboard_data.Temperature,
        apiData[0].dashboard_data.Humidity,
        apiData[0].dashboard_data.Pressure,
        apiData[0].dashboard_data.CO2,
      ];
      serviceHelper.log('trace', 'Saving kids room data');
      await saveDeviceData(dataValues);
      serviceHelper.log('info', 'Saved kids room data');
    } else {
      serviceHelper.log('error', 'Kids room sensor off line');
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }

  // Kitchen
  try {
    if (typeof apiData[0].modules[1].dashboard_data !== 'undefined') {
      dataValues = [
        new Date(),
        process.env.Environment,
        // eslint-disable-next-line no-underscore-dangle
        apiData[0].modules[1]._id,
        apiData[0].modules[1].module_name,
        apiData[0].modules[1].battery_percent,
        apiData[0].modules[1].dashboard_data.Temperature,
        apiData[0].modules[1].dashboard_data.Humidity,
        apiData[0].modules[1].dashboard_data.Pressure,
        apiData[0].modules[1].dashboard_data.CO2,
      ];
      serviceHelper.log('trace', 'Saving kitchen room data');
      await saveDeviceData(dataValues);
      serviceHelper.log('info', 'Saved kitchen room data');
    } else {
      serviceHelper.log('error', 'Kitchen sensor off line');
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }

  // Garden
  try {
    if (typeof apiData[0].modules[0] !== 'undefined') {
      dataValues = [
        new Date(),
        process.env.Environment,
        // eslint-disable-next-line no-underscore-dangle
        apiData[0].modules[0]._id,
        apiData[0].modules[0].module_name,
        apiData[0].modules[0].battery_percent,
        apiData[0].modules[0].dashboard_data.Temperature,
        apiData[0].modules[0].dashboard_data.Humidity,
        null,
        null,
      ];
      serviceHelper.log('trace', 'Saving garden data');
      await saveDeviceData(dataValues);
      serviceHelper.log('info', 'Saved garden data');
    } else {
      serviceHelper.log('error', 'Garden sensor off line');
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }

  // Living room
  try {
    if (typeof apiData[1].dashboard_data !== 'undefined') {
      dataValues = [
        new Date(),
        process.env.Environment,
        // eslint-disable-next-line no-underscore-dangle
        apiData[1]._id,
        apiData[1].module_name,
        100,
        apiData[1].dashboard_data.Temperature,
        apiData[1].dashboard_data.Humidity,
        apiData[1].dashboard_data.Pressure,
        apiData[1].dashboard_data.CO2,
      ];
      serviceHelper.log('trace', 'Saving living room data');
      await saveDeviceData(dataValues);
      serviceHelper.log('info', 'Saved living room data');
    } else {
      serviceHelper.log('error', 'Living room sensor off line');
    }
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
}

exports.getNatemoData = function getNatemoData() {
  try {
    const api = new Netatmo(auth); // Connect to api service
    api.getStationsData((err, apiData) => {
      // Get data from device
      if (err) {
        serviceHelper.log('error', err.message);
        cleanExit();
      }
      serviceHelper.log('trace', 'Got data, now processing it');

      processData(apiData); // Process the device data
    });
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
};
