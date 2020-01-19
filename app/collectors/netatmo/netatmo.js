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
async function saveDeviceData(SQLValues) {
  try {
    const SQL = 'INSERT INTO netatmo("time", sender, address, location, battery, temperature, humidity, pressure, co2) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    serviceHelper.log('trace', 'Connect to data store connection pool');
    const dbConnection = await serviceHelper.connectToDB('netatmo');
    const dbClient = await dbConnection.connect(); // Connect to data store
    serviceHelper.log('trace', 'Save sensor values');
    const results = await dbClient.query(SQL, SQLValues);
    serviceHelper.log('trace', 'Release the data store connection back to the pool');
    await dbClient.end(); // Close data store connection
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
        process.env.ENVIRONMENT,
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
        process.env.ENVIRONMENT,
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
        process.env.ENVIRONMENT,
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
        process.env.ENVIRONMENT,
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

exports.getNatemoData = async function getNatemoData() {
  try {
    const NetatmoClientKey = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, 'NetatmoClientKey');
    const NetatmoClientSecret = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, 'NetatmoClientSecret');
    const NetatmoUserName = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, 'NetatmoUserName');
    const NetatmoPassword = await serviceHelper.vaultSecret(process.env.ENVIRONMENT, 'NetatmoPassword');
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
        serviceHelper.log('error', err.message);
        return;
      }
      serviceHelper.log('trace', 'Got data, now processing it');
      processData(apiData); // Process the device data
    });
  } catch (err) {
    serviceHelper.log('error', err.message);
  }
};
