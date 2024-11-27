require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

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
    const { street, city, state, zip } = req.body;

    if (!street || !city || !state || !zip) {
        return res.status(400).json({ error: "All address fields (street, city, state, zip) are required" });
    }

    try {
        // Fetch Bearer Token
        const token = await getBearerToken();

        // Batch Data API request
        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [
                    {
                        address: {
                            street,
                            city,
                            state,
                            zip
                        }
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json, application/xml'
                }
            }
        );

        // Send property data to the frontend
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch property data", details: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
