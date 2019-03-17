/**
 * Import helper libraries
 */
const serviceHelper = require('../lib/helper.js');

const poolingInterval = 5 * 60 * 1000; // 5 minutes

if (!process.env.Mock) {
  // eslint-disable-next-line global-require
  const netatmo = require('./netatmo/netatmo.js');
  exports.collectData = async function FnCollectData() {
    try {
      await netatmo.getNatemoData(); // Collect Netatmo device data
    } catch (err) {
      serviceHelper.log('error', 'Controller - CollectData - Netatmo', err.message);
    }
    setTimeout(() => { FnCollectData(); }, poolingInterval); // Wait then run function again
  };
};