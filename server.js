require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Load credentials from environment variables
const { BATCHLEADS_EMAIL, BATCHLEADS_PASSWORD } = process.env;

// Function to fetch Bearer Token
const getBearerToken = async () => {
    try {
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD,
        });

        if (response.data?.data?.token) {
            console.log("Bearer Token generated successfully.");
            return response.data.data.token;
        } else {
            throw new Error("Token generation failed: " + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error("Error generating token:", error.response?.data || error.message);
        throw new Error("Failed to generate token. Verify your credentials or plan.");
    }
};

// Function to fetch property data from Batch Leads API
const fetchPropertyData = async (address, token) => {
    try {
        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [{ address: { street: address } }],
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
        );

        if (response.data?.results?.properties?.length) {
            return response.data.results.properties[0];
        } else {
            throw new Error("No property data found for the given address.");
        }
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        throw error;
    }
};

// Endpoint for handling property lookup
app.post('/property', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Address is required." });
    }

    try {
        console.log("Looking up property for address:", address);

        // Step 1: Fetch Bearer Token
        let token = await getBearerToken();

        // Step 2: Attempt property lookup
        try {
            const propertyData = await fetchPropertyData(address, token);
            return res.status(200).json({ property: propertyData });
        } catch (error) {
            // Retry if token is invalid
            if (error.response?.status === 401) {
                console.warn("Invalid token. Regenerating token...");
                token = await getBearerToken(); // Refresh the token
                const retryResponse = await fetchPropertyData(address, token);
                return res.status(200).json({ property: retryResponse });
            }

            throw error;
        }
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        return res.status(500).json({
            error: "Failed to fetch property data.",
            details: error.response?.data || error.message,
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on https://skip-tracing.onrender.com`));
