require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Environment variables
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
            console.log("Bearer Token generated successfully:", response.data.data.token);
            return response.data.data.token;
        } else {
            throw new Error("Token generation failed: " + JSON.stringify(response.data));
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

        // Log the address and token for debugging
        console.log("Fetching data for address:", address);
        console.log("Using Bearer Token:", token);

        // Request property data from Batch Data API
        const propertyResponse = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [
                    {
                        address: {
                            street: address
                        }
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`, // Use the token
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            }
        );

        // Check if properties exist in the response
        if (
            !propertyResponse.data ||
            !propertyResponse.data.results ||
            !propertyResponse.data.results.properties ||
            propertyResponse.data.results.properties.length === 0
        ) {
            console.warn("No property data found for address:", address);
            return res.status(404).json({ error: "No property data found." });
        }

        // Send back the first property result
        const propertyData = propertyResponse.data.results.properties[0];
        res.json({ property: propertyData });
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);

        // Handle specific API errors (e.g., invalid token or unauthorized access)
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ error: "Unauthorized", message: "Invalid token or expired session" });
        }

        res.status(500).json({
            error: "Failed to fetch property data",
            details: error.response?.data || error.message
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
