require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Environment variables for Batch Leads login credentials
const BATCHLEADS_EMAIL = process.env.BATCHLEADS_EMAIL; // Add your email in the environment variables
const BATCHLEADS_PASSWORD = process.env.BATCHLEADS_PASSWORD; // Add your password in the environment variables

// Function to get the Bearer Token
async function getBearerToken() {
    try {
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD
        });

        if (response.data && response.data.data && response.data.data.token) {
            return response.data.data.token;
        } else {
            throw new Error("Failed to retrieve token.");
        }
    } catch (error) {
        console.error("Error fetching Bearer Token:", error.response?.data || error.message);
        throw new Error("Invalid login credentials or expired plan.");
    }
}

// Endpoint to fetch property details
app.post('/property', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Address is required" });
    }

    try {
        // Get Bearer Token
        const token = await getBearerToken();

        // Fetch property data using the token
        const response = await axios.post(
            'https://api.batchleads.io/v1/properties',
            { address },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch property data" });
    }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
