/**
 * Import external libraries
 */
const serviceHelper = require('alfred-helper');

/**
 * Import helper libraries
 */
const netatmo = require('./netatmo/netatmo.js');

const poolingInterval = 5 * 60 * 1000; // 5 minutes

exports.collectData = async function FnCollectData() {
  try {
    await netatmo.getNatemoData(); // Collect Netatmo device data
  } catch (err) {
    serviceHelper.log(
      'error',
      err.message,
    );
  }
  setTimeout(() => {
    FnCollectData();
  }, poolingInterval); // Wait then run function again
};
