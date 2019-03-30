/**
 * Import external libraries
 */
const Netatmo = require('netatmo');
const { Pool } = require('pg');

/**
 * Import helper libraries
 */
const serviceHelper = require('../../lib/helper.js');

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
  serviceHelper.log('trace', 'Netatmo - cleanExit', 'Closing the data store pools');
  try {
    await devicesDataClient.end();
  } catch (err) {
    serviceHelper.log('trace', 'Netatmo - cleanExit', 'Failed to close the data store connection');
  }
  serviceHelper.log('trace', 'Netatmo - cleanExit', 'Finished collecting Netatmo data');
}
process.on('exit', () => { cleanExit(); });
process.on('SIGINT', () => { cleanExit(); });
process.on('SIGTERM', () => { cleanExit(); });
process.on('uncaughtException', (err) => {
  if (err) serviceHelper.log('error', 'Netatmo', err.message); // log the error
  cleanExit();
});

/**
 * Data store error events
 */
devicesDataClient.on('error', (err) => {
  serviceHelper.log('error', 'Netato', 'Devices data store: Unexpected error on idle client');
  serviceHelper.log('error', 'Netatmo', err.message);
  cleanExit();
});

/**
 * Save data to data store
 */
async function saveDeviceData(SQLValues) {
  try {
    const SQL = 'INSERT INTO netatmo("time", sender, address, location, battery, temperature, humidity, pressure, co2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    serviceHelper.log('trace', 'Netatmo - saveData', 'Connect to data store connection pool');
    const dbClient = await devicesDataClient.connect(); // Connect to data store
    serviceHelper.log('trace', 'Netatmo - saveData', 'Save sensor values');
    const results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log('trace', 'Netatmo - saveData', 'Release the data store connection back to the pool');
    await dbClient.release(); // Return data store connection back to pool

    if (results.rowCount !== 1) {
      serviceHelper.log('error', 'Netatmo - saveDeviceData', `Failed to insert data for device: ${SQLValues[3]}`);
      return;
    }
    serviceHelper.log('trace', 'Netatmo - saveDeviceData', `Saved data for device: ${SQLValues[3]}`);
  } catch (err) {
    serviceHelper.log('error', 'Netatmo - saveDeviceData', err.message);
  }
}

/**
 * Process device data
 */
async function processData(apiData) {
  let dataValues;

  // Kids room
  try {
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
    serviceHelper.log('trace', 'Netatmo - processData', 'Saving kids room data');
    await saveDeviceData(dataValues);
    serviceHelper.log('info', 'Netatmo - processData', 'Saved kids room data');
  } catch (err) {
    serviceHelper.log('error', 'Netatmo - processData', err.message);
  }

  // Kitchen
  try {
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
    serviceHelper.log('trace', 'Netatmo - processData', 'Saving kitchen room data');
    await saveDeviceData(dataValues);
    serviceHelper.log('info', 'Netatmo - processData', 'Saved kitchen room data');
  } catch (err) {
    serviceHelper.log('error', 'Netatmo - processData', err.message);
  }

  // Garden
  try {
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
    serviceHelper.log('trace', 'Netatmo - processData', 'Saving garden data');
    await saveDeviceData(dataValues);
    serviceHelper.log('info', 'Netatmo - processData', 'Saved garden data');
  } catch (err) {
    serviceHelper.log('error', 'Netatmo - processData', err.message);
  }

  // Living room
  try {
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
    serviceHelper.log('trace', 'Netatmo - processData', 'Saving living room data');
    await saveDeviceData(dataValues);
    serviceHelper.log('info', 'Netatmo - processData', 'Saved living room data');
  } catch (err) {
    serviceHelper.log('error', 'Netatmo - processData', err.message);
  }
}

exports.getNatemoData = function getNatemoData() {
  try {
    const api = new Netatmo(auth); // Connect to api service
    api.getStationsData((err, apiData) => { // Get data from device
      if (err) {
        serviceHelper.log('error', 'Netatmo - getNatemoData', err.message);
        cleanExit();
      }
      serviceHelper.log('trace', 'Netatmo - getNatemoData', 'Got data, now processing it');

      processData(apiData); // Process the device data
    });
  } catch (err) {
    serviceHelper.log('error', 'Netatmo - getNatemoData', err.message);
  }
};
