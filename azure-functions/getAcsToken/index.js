const { CommunicationIdentityClient } = require("@azure/communication-identity");

module.exports = async function (context, req) {
  const connectionString = process.env.ACS_CONNECTION_STRING;
  if (!connectionString) {
    context.res = { status: 500, body: { error: "ACS_CONNECTION_STRING not configured" } };
    return;
  }

  try {
    const client = new CommunicationIdentityClient(connectionString);
    const user = await client.createUser();
    const tokenResponse = await client.getToken(user, ["voip"]);

    context.res = {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: {
        token: tokenResponse.token,
        expiresOn: tokenResponse.expiresOn,
        userId: user.communicationUserId
      }
    };
  } catch (err) {
    context.log.error("Failed to generate ACS token:", err);
    context.res = {
      status: 500,
      body: { error: "Failed to generate token: " + err.message }
    };
  }
};
