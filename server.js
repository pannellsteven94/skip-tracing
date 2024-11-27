require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Load environment variables
const { BATCHLEADS_EMAIL, BATCHLEADS_PASSWORD } = process.env;

// Function to generate Bearer Token
const getBearerToken = async () => {
    try {
        const response = await axios.post('https://api-server.batchleadstacker.com/app/login', {
            email: BATCHLEADS_EMAIL,
            password: BATCHLEADS_PASSWORD
        });

        if (response.data?.data?.token) {
            console.log("Bearer Token generated successfully");
            return response.data.data.token;
        } else {
            throw new Error("Token generation failed: " + JSON.stringify(response.data));
        }
    } catch (error) {
        console.error("Error generating Bearer Token:", error.response?.data || error.message);
        throw new Error("Invalid credentials or expired plan. Check your Batch Leads account.");
    }
};

// Function to fetch property data
const fetchPropertyData = async (address, token) => {
    try {
        const response = await axios.post(
            'https://api.batchdata.com/api/v1/property/lookup/all-attributes',
            {
                requests: [
                    {
                        address: { street: address }
                    }
                ]
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
            return response.data.results.properties[0]; // Return the first property
        } else {
            throw new Error("No property data found for the given address.");
        }
    } catch (error) {
        console.error("Error fetching property data:", error.response?.data || error.message);
        throw error; // Let the caller handle the error
    }
};

// Endpoint to handle property lookups
app.post('/property', async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Address is required" });
    }

    try {
        console.log("Fetching property data for address:", address);

        // Step 1: Generate Bearer Token
        let token = await getBearerToken();

        try {
            // Step 2: Fetch property data using token
            const propertyData = await fetchPropertyData(address, token);
            return res.status(200).json({ property: propertyData });
        } catch (error) {
            // Step 3: Retry with a refreshed token if token is invalid
            if (error.response?.status === 401) {
                console.warn("Invalid token detected. Retrying with a new token...");
                token = await getBearerToken(); // Refresh the token
                const propertyData = await fetchPropertyData(address, token);
                return res.status(200).json({ property: propertyData });
            }

            // If not a token issue, propagate the error
            throw error;
        }
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch property data",
            details: error.response?.data || error.message,
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
