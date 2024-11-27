require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Environment variables for authentication
const BATCHLEADS_EMAIL = process.env.BATCHLEADS_EMAIL;
const BATCHLEADS_PASSWORD = process.env.BATCHLEADS_PASSWORD;

// Function to fetch Bearer Token
async function getBearerToken() {
    try {
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD
        });

        if (response.data && response.data.data && response.data.data.token) {
            return response.data.data.token;
        } else {
            throw new Error("Failed to retrieve token. Response: " + JSON.stringify(response.data));
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
        // Fetch Bearer Token
        const token = await getBearerToken();

        // Send request to Batch Data API
        const propertyResponse = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [
                    {
                        address: {
                            street: address, // Assuming a single line input address
                        }
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            }
        );

        if (
            !propertyResponse.data ||
            !propertyResponse.data.results ||
            !propertyResponse.data.results.properties
        ) {
            return res.status(404).json({ error: "No property data found." });
        }

        // Send back the first property result
        const propertyData = propertyResponse.data.results.properties[0];
        res.json({ property: propertyData });
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch property data", details: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
