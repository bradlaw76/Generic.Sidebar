// Bundle entry - exposes ACS SDK globals for browser use
const { CallClient } = require('@azure/communication-calling');
const { AzureCommunicationTokenCredential } = require('@azure/communication-common');

window.AzureCommunicationCalling = { CallClient };
window.AzureCommunicationCommon = { AzureCommunicationTokenCredential };
