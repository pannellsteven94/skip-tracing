const axios = require('axios');

async function generateToken() {
    try {
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: process.env.API_EMAIL,
            password: process.env.API_PASSWORD,
        });

        if (response.data.status === 1 && response.data.data.token) {
            console.log("Token generated successfully.");
            return response.data.data.token;
        } else {
            throw new Error(
                response.data.message || "Failed to generate token. Verify your credentials."
            );
        }
    } catch (error) {
        console.error("Error generating token:", error.message);
        throw new Error("Token generation failed. Verify your credentials.");
    }
}

module.exports = generateToken;
