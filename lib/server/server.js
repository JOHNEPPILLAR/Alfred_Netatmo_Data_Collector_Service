/**
 * Import external libraries
 */
const { Service } = require('alfred-base');

// Setup service options
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const namespace = require('../../package.json').name;

const options = {
  serviceName,
  namespace,
  serviceVersion: version,
};

// Bind api functions to base class
Object.assign(Service.prototype, require('../api/netatmo/netatmo'));

// Bind data collector functions to base class
Object.assign(Service.prototype, require('../collectors/netatmo/netatmo'));

// Create base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Apply api routes
  service.restifyServer.get('/sensors/:roomID', (req, res, next) =>
    service._sensors(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added '/sensors/:roomID' api`,
  );

  service.restifyServer.get('/sensors/current', (req, res, next) =>
    service._current(req, res, next),
  );
  service.logger.trace(
    `${service._traceStack()} - Added '/sensors/current' api`,
  );

  // Listen for api requests
  service.listen();

  if (process.env.MOCK === 'true') {
    this.logger.info('Mocking enabled, will not collect netatmo sensor data');
  } else {
    service._getNetatmoData(); // Collect Netatmo device data
  }
}
setupServer();
